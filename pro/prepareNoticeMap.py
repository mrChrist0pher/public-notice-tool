"""Two-step vicinity map workflow for ArcGIS Pro. No mailing processing or run JSON."""
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import quote
from uuid import uuid4
import re
import shutil
import arcpy
import os
import runpy
from urllib.parse import urlparse

# Deployment values belong in an ignored local file or environment variables.
# Layer sources and authentication stay in the user's ArcGIS Pro project.
_config_path = Path(__file__).with_name('notice_config_local.py')
_LOCAL_CONFIG = runpy.run_path(str(_config_path)) if _config_path.exists() else {}
ARCHIVE_ROOT = Path(os.environ.get('PUBLIC_NOTICE_ARCHIVE_ROOT') or
                    _LOCAL_CONFIG.get('ARCHIVE_ROOT') or Path.home() / 'PublicNoticeOutputs')
PROPERTY_INFO_BASE_URL = os.environ.get('PUBLIC_NOTICE_PROPERTY_URL') or _LOCAL_CONFIG.get('PROPERTY_INFO_BASE_URL', '')
SUBJECT_FRAME_FRACTION = 0.25


def validate_case(value):
    # The CASE year controls the folder, not the computer's current year.
    value = str(value or '').strip().upper()
    match = re.fullmatch(r'[A-Z]{2,10}(\d{4})-\d{5}', value)
    if not match or not 1900 <= int(match.group(1)) <= 2199:
        raise ValueError('Enter a case such as LUR2026-00031 or HIS2026-00125.')
    return value, match.group(1)


def case_url(case):
    # Include the complete URL prefix through the case-number query parameter.
    # Fail explicitly instead of exporting a QR with a guessed destination.
    base = PROPERTY_INFO_BASE_URL.strip()
    parsed = urlparse(base)
    if parsed.scheme != 'https' or not parsed.netloc or not base.endswith('='):
        raise ValueError('Set PROPERTY_INFO_BASE_URL to an HTTPS URL ending in the case query parameter and =.')
    return base + quote(case, safe='')


def output_paths(case):
    case, year = validate_case(case)
    folder = ARCHIVE_ROOT / f'{year} PN'
    return folder / f'{case}_VM.pdf', folder / f'{case}_VM.aprx'


def _one(items, name):
    if len(items) != 1:
        raise ValueError(f'Expected one {name}; found {len(items)}.')
    return items[0]


def _context():
    p = arcpy.mp.ArcGISProject('CURRENT')
    m = _one([x for x in p.listMaps() if x.name == 'PublicNoticeMap'], 'PublicNoticeMap')
    layout = _one([x for x in p.listLayouts() if x.name == 'PublicNoticeLayout'], 'PublicNoticeLayout')
    frame = _one([x for x in layout.listElements('MAPFRAME_ELEMENT') if x.name == 'Layers Map Frame'], 'Layers Map Frame')
    subject = _one([x for x in m.listLayers() if x.name == 'Subject Area' and x.isFeatureLayer], 'Subject Area')
    if subject.isBroken or arcpy.Describe(subject).shapeType != 'Polygon':
        raise ValueError('Subject Area must be a working polygon layer.')
    if frame.map is None or frame.map.URI != m.URI:
        raise ValueError('Main map frame must display PublicNoticeMap.')
    if frame.camera.mode != 'MAP' or abs(frame.camera.heading) > .001:
        raise ValueError('Use an unrotated 2D main map frame.')
    if arcpy.Describe(subject).spatialReference.name == 'Unknown':
        raise ValueError('Subject Area needs a known coordinate system.')
    # ListFields may resolve a map Layer through its display name inside a
    # Python toolbox. Describe accesses this specific layer's schema directly.
    field = _one([f.name for f in arcpy.Describe(subject).fields
                  if f.name.rsplit('.', 1)[-1].upper() == 'CASENUMBER'], 'CASENUMBER field')
    def text(name):
        return _one([x for x in layout.listElements('TEXT_ELEMENT') if x.name == name], name)
    qr = _one([x for x in layout.listElements('PICTURE_ELEMENT') if x.name == 'QR'], 'QR')
    case_text, url_text = text('CaseNo'), text('URL')
    if qr.elementWidth <= 0 or qr.elementHeight <= 0 or abs(qr.elementWidth / qr.elementHeight - 1) > .02:
        raise ValueError('QR picture must be square with positive dimensions.')
    if not all(x.visible for x in (qr, case_text, url_text)):
        raise ValueError('Case number, QR and URL must be visible.')
    return SimpleNamespace(project=p, map=m, layout=layout, frame=frame, subject=subject,
                           case_field=field, case_text=case_text, url_text=url_text, qr=qr)


def _set_picture(qr, path):
    # Preserve authored QR placement and square dimensions when swapping images.
    x, y, width, height = qr.elementPositionX, qr.elementPositionY, qr.elementWidth, qr.elementHeight
    qr.sourceImage = str(path)
    qr.elementWidth, qr.elementHeight = width, height
    qr.elementPositionX, qr.elementPositionY = x, y


def _create_qr(case, folder):
    # Local QR generation only. No third-party QR service or web request.
    import qrcode
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f'{case}_VM_QR_{uuid4().hex}.png'
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=4)
    qr.add_data(case_url(case))
    qr.make(fit=True)
    qr.make_image(fill_color='black', back_color='white').save(str(path))
    return path


def _subject_cursor(context, fields):
    """Query the source explicitly, avoiding GP resolution of a display name.

    The definition query is mandatory: using the source without it would read
    unrelated cases. Subject selections are cleared/rejected by the callers.
    """
    where = context.subject.definitionQuery
    if not where:
        raise ValueError('Subject Area has no case definition query.')
    return arcpy.da.SearchCursor(context.subject.dataSource, fields, where_clause=where)


def case_row_issue(expected, oid, value, shape):
    """Return a specific validation error, or an empty string for a valid row."""
    actual = str(value or '').strip().upper()
    if actual != expected:
        return f'Case query mismatch: feature OID {oid} returned CASENUMBER={value!r}; expected {expected}.'
    if shape is None:
        return f'Empty case geometry: {expected}, feature OID {oid} has NULL geometry.'
    if shape.pointCount == 0:
        return f'Empty case geometry: {expected}, feature OID {oid} has zero points.'
    return ''


def prepare_notice_map(case_number, open_view=True):
    """Find case, frame subject, update case/URL/QR, and open layout. No export."""
    case, _ = validate_case(case_number)
    c = _context()
    if not c.project.homeFolder or not Path(c.project.homeFolder).is_dir():
        raise ValueError('Set a valid project home folder first.')
    # Preflight QR before changing a previous case. This PNG is the only file
    # created by Prepare; PDF/APRX archive output belongs to the Export tool.
    path = _create_qr(case, Path(c.project.homeFolder) / 'notice_layout_assets')
    queries = c.subject.listDefinitionQueries()
    ids = list(c.subject.getSelectionSet() or [])
    old_visible = c.subject.visible
    old_case, old_url, old_qr = c.case_text.text, c.url_text.text, c.qr.sourceImage
    old_extent, old_scale = c.frame.camera.getExtent(), c.frame.camera.scale
    try:
        # Read EVERY polygon matching the case, not a selected subset.
        c.subject.setSelectionSet([], 'NEW')
        c.subject.definitionQuery = f"{arcpy.AddFieldDelimiters(c.subject.dataSource, c.case_field)} = '{case}'"
        # Validate each geometry while its cursor is open. Report the exact
        # feature and reason rather than conflating bad geometry with a query
        # mismatch. Never silently omit a case polygon from the notice map.
        rows = []
        with _subject_cursor(c, ['OID@', c.case_field, 'SHAPE@']) as cursor:
            for oid, value, shape in cursor:
                issue = case_row_issue(case, oid, value, shape)
                if issue:
                    raise ValueError(issue + ' Layer: ' + str(c.subject.dataSource)
                                     + '; query: ' + c.subject.definitionQuery)
                rows.append(oid)
        if not rows:
            raise ValueError(f'No case-history polygons found for {case}.')
        c.subject.visible = True
        c.case_text.text, c.url_text.text = case, case_url(case)
        _set_picture(c.qr, path)
        if c.case_text.isOverflowing or c.url_text.isOverflowing:
            raise ValueError('Case number or URL overflows its layout text box.')
        # Keep the tested 25% subject framing. Do not change context map, labels,
        # zoning, applicant text or any recipient selection method.
        extent = c.frame.getLayerExtent(c.subject, False, False)
        if extent.width <= 0 or extent.height <= 0:
            raise ValueError('Case has an invalid extent.')
        c.frame.camera.setExtent(extent)
        visible = c.frame.camera.getExtent()
        c.frame.camera.scale *= max(extent.width / visible.width, extent.height / visible.height) / SUBJECT_FRAME_FRACTION
    except Exception:
        c.subject.updateDefinitionQueries(queries)
        c.subject.setSelectionSet(ids, 'NEW')
        c.subject.visible = old_visible
        c.case_text.text, c.url_text.text = old_case, old_url
        _set_picture(c.qr, old_qr)
        c.frame.camera.setExtent(old_extent)
        c.frame.camera.scale = old_scale
        path.unlink(missing_ok=True)
        raise
    # Clear stale owner highlights after successful preparation.
    for layer in c.map.listLayers():
        if layer.isFeatureLayer and not layer.isBroken and layer.name.casefold() == 'parcels':
            layer.setSelectionSet([], 'NEW')
    if open_view:
        c.layout.openView()
    arcpy.AddMessage(f'Prepared {case}: {len(rows)} case polygons. Scale 1:{c.frame.camera.scale:,.0f}.')
    arcpy.AddMessage('Check subject location/layout and scan QR for the correct case. Then run Export Notice Map.')
    arcpy.AddMessage('No PDF/APRX exported. The open template has not been saved.')
    arcpy.AddMessage('Export destination: ' + str(output_paths(case)[0].parent))
    return case


def _prepared_case(c):
    # Derive the case from actual map/layout state. No workflow log is required.
    case, _ = validate_case(c.case_text.text)
    if not c.subject.definitionQuery or c.subject.getSelectionSet():
        raise ValueError('Run Prepare Notice Map first; Subject Area must be filtered without a partial selection.')
    with _subject_cursor(c, [c.case_field]) as cursor:
        values = [str(row[0]).strip().upper() for row in cursor]
    if not values or any(value != case for value in values):
        raise ValueError('Subject Area and layout case do not agree. Prepare again.')
    if c.url_text.text != case_url(case) or c.case_text.isOverflowing or c.url_text.isOverflowing:
        raise ValueError('Case URL/text changed or overflows. Prepare again.')
    image = Path(c.qr.sourceImage)
    if not image.is_file() or not image.name.startswith(case + '_VM_QR_'):
        raise ValueError('QR image does not match this prepared case. Prepare again.')
    return case


def _finalize_case_copy(path, case):
    # Only edit the staged output copy: name the VM and detach mailing work.
    import importlib.util
    script = Path(__file__).with_name('notice_selection.py')
    spec = importlib.util.spec_from_file_location('pds_case_archive', str(script))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.finish_case_copy(path, case)


def export_notice_map(review_confirmed=False, replace_existing=True):
    """Export canonical CASE_VM.pdf + CASE_VM.aprx; preserve open template."""
    if review_confirmed is not True:
        raise ValueError('Check the subject/layout and scan QR for the correct case, then check the confirmation box.')
    c = _context()
    case = _prepared_case(c)
    pdf, aprx = output_paths(case)
    if not ARCHIVE_ROOT.is_dir():
        raise ValueError(f'Archive root unavailable: {ARCHIVE_ROOT}. Configure and connect the archive folder before exporting.')
    if c.project.filePath and Path(c.project.filePath).resolve() == aprx.resolve():
        raise ValueError('The archive APRX is currently open. Open the master/working template before replacing that case copy.')
    if not replace_existing and (pdf.exists() or aprx.exists()):
        raise FileExistsError('VM output already exists. Check Replace existing outputs to keep backups and replace it.')
    folder = pdf.parent
    folder.mkdir(exist_ok=True)
    token = uuid4().hex
    staged = [folder / f'_{case}_VM_{token}{suffix}' for suffix in ('.pdf', '.aprx')]
    assets = folder / 'notice_layout_assets'
    assets.mkdir(exist_ok=True)
    archived_qr = assets / f'{case}_VM_QR_{token}.png'
    old_qr = c.qr.sourceImage
    selections = [(l, list(l.getSelectionSet() or [])) for l in c.map.listLayers()
                  if l.isFeatureLayer and not l.isBroken]
    backups, published = [], []
    committed = False
    try:
        # Archive the case QR before saving the APRX, so the case copy does not
        # depend on disposable local home-folder images. Other GIS sources remain
        # live references; a saved APRX is not a frozen database snapshot.
        shutil.copy2(old_qr, archived_qr)
        _set_picture(c.qr, archived_qr)
        for layer, _ in selections:
            layer.setSelectionSet([], 'NEW')
        c.layout.exportToPDF(str(staged[0]), resolution=300)
        c.project.saveACopy(str(staged[1]))
        _finalize_case_copy(staged[1], case)
        if any(not path.is_file() or path.stat().st_size == 0 for path in staged):
            raise RuntimeError('Export did not produce a complete PDF/APRX pair.')
        # Stage both first. Replacement keeps prior canonical files in
        # _previous_versions; failure rolls them back. Never call project.save().
        existing = [path for path in (pdf, aprx) if path.exists()]
        if existing:
            if not replace_existing:
                raise FileExistsError('Another export created this output. Recheck before replacing.')
            archive = folder / '_previous_versions'
            archive.mkdir(exist_ok=True)
            stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            for path in existing:
                backup = archive / f'{path.stem}_{stamp}_{token[:8]}{path.suffix}'
                path.replace(backup)
                backups.append((path, backup))
        for stage, final in zip(staged, (pdf, aprx)):
            stage.replace(final)
            published.append(final)
        committed = True
    except Exception:
        for path in published:
            path.unlink(missing_ok=True)
        for original, backup in reversed(backups):
            backup.replace(original)
        raise
    finally:
        _set_picture(c.qr, old_qr)
        for layer, ids in selections:
            layer.setSelectionSet(ids, 'NEW')
        for path in staged:
            path.unlink(missing_ok=True)
        if not committed:
            archived_qr.unlink(missing_ok=True)
    arcpy.AddMessage('Saved vicinity map: ' + str(pdf))
    arcpy.AddMessage('Saved case project: ' + str(aprx))
    arcpy.AddMessage('Open template was not saved or overwritten.')
    if backups:
        arcpy.AddMessage('Previous outputs retained in: ' + str(folder / '_previous_versions'))
    return str(pdf), str(aprx)


if __name__ == '__main__':
    prepare_notice_map(arcpy.GetParameterAsText(0))

