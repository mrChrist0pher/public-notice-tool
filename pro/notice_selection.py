"""Steps 3/4: independent mailing map, editable selection, raw evidence and Excel.

No SDE edits; no selection is recalculated in Export Mailing List. All GP work
uses uniquely registered temporary layers, never a map layer's display name.
"""
from collections import Counter, defaultdict, deque
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4
import csv
import importlib.util
import json
import re
import shutil
import tempfile
import arcpy


def companion(name):
    path = Path(__file__).with_name(name + '.py')
    spec = importlib.util.spec_from_file_location('pds_' + name + '_' + uuid4().hex, str(path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def one(items, name):
    if len(items) != 1:
        raise ValueError(f'Expected one {name}; found {len(items)}.')
    return items[0]


def case_project_items(project, case):
    """Configure a STAGED case copy, never the open master/template.

    A separate map object prevents selection/layer visibility/symbology changes
    in the mailing workflow from propagating to the reviewed VM layout.
    """
    vm_name, mail_name = case + ' VM', case + ' Mailing Selection'
    vm_map = one([m for m in project.listMaps() if m.name in ('PublicNoticeMap', vm_name)], 'vicinity map')
    vm_layout = one([l for l in project.listLayouts() if l.name in ('PublicNoticeLayout', vm_name)], 'vicinity layout')
    vm_map.name, vm_layout.name = vm_name, vm_name
    mailing = [m for m in project.listMaps() if m.name.startswith(mail_name)]
    mail_map = one(mailing, 'mailing map') if mailing else project.copyItem(vm_map, mail_name)
    layouts = [l for l in project.listLayouts() if l.name == mail_name]
    mail_layout = one(layouts, 'mailing layout') if layouts else project.copyItem(vm_layout, mail_name)
    frame = one([f for f in mail_layout.listElements('MAPFRAME_ELEMENT') if f.name == 'Layers Map Frame'], 'mailing frame')
    # Reassigning the map must not change the reviewed camera.
    extent, scale = frame.camera.getExtent(), frame.camera.scale
    if frame.map is None or frame.map.URI != mail_map.URI:
        frame.map = mail_map
    frame.camera.setExtent(extent)
    frame.camera.scale = scale
    mail_map.defaultCamera = frame.camera
    return vm_map, vm_layout, mail_map, mail_layout, frame


def finish_case_copy(path, case):
    project = arcpy.mp.ArcGISProject(str(path))
    try:
        case_project_items(project, case)
        project.save()  # This is ONLY the newly staged case APRX.
    finally:
        del project


def selection_context(project=None):
    p = project or arcpy.mp.ArcGISProject('CURRENT')
    stem = Path(p.filePath).stem
    # Step 3 must start from a case copy, not the reusable master.
    match = re.fullmatch(r'([A-Z]{2,10}\d{4}-\d{5})_(?:VM|ML)', stem, re.I)
    if not match:
        raise ValueError('Open the exported CASE_VM.aprx before selecting recipients.')
    case = companion('prepareNoticeMap').validate_case(match.group(1))[0]
    vm_map, vm_layout, m, layout, frame = case_project_items(p, case)
    subject = one([l for l in m.listLayers() if l.isFeatureLayer and l.name == 'Subject Area'], 'mailing Subject Area')
    owners = one([l for l in m.listLayers() if l.isFeatureLayer and l.name == 'Parcels'], 'mailing Parcels')
    if subject.isBroken or owners.isBroken:
        raise ValueError('Fix broken Subject Area/Parcels data sources before continuing.')
    if owners.definitionQuery:
        raise ValueError('Mailing Parcels has a definition query. Remove it so intended recipients are not omitted.')
    field = one([f.name for f in arcpy.Describe(subject).fields if f.name.rsplit('.', 1)[-1].upper() == 'CASENUMBER'], 'CASENUMBER field')
    text = one([e for e in vm_layout.listElements('TEXT_ELEMENT') if e.name == 'CaseNo'], 'VM CaseNo')
    if text.text.strip().upper() != case:
        raise ValueError('VM layout case does not match the opened case APRX.')
    if not subject.definitionQuery:
        raise ValueError('Mailing Subject Area needs its case definition query.')
    n = 0
    with arcpy.da.SearchCursor(subject.dataSource, [field], where_clause=subject.definitionQuery) as rows:
        for (value,) in rows:
            if str(value).strip().upper() != case:
                raise ValueError('Mailing Subject Area contains another case; reopen the correct VM APRX.')
            n += 1
    if not n:
        raise ValueError('No case polygons found. Recheck the subject before selecting recipients.')
    return SimpleNamespace(project=p,case=case,map=m,layout=layout,frame=frame,subject=subject,owners=owners,case_field=field,vm_map=vm_map,vm_layout=vm_layout)


@contextmanager
def registered_layer(layer):
    # MakeFeatureLayer registers a unique GP layer, avoiding the display-name
    # lookup that caused "Subject Area does not exist" inside the old toolbox.
    temp = arcpy.management.MakeFeatureLayer(layer.dataSource, 'pn_' + uuid4().hex, layer.definitionQuery or None)[0]
    try:
        yield temp
    finally:
        arcpy.management.Delete(temp)


def subject_geometry(c):
    shape = None
    with arcpy.da.SearchCursor(c.subject.dataSource, ['OID@', c.case_field, 'SHAPE@'], where_clause=c.subject.definitionQuery) as rows:
        for oid, case, geometry in rows:
            issue = companion('prepareNoticeMap').case_row_issue(c.case, oid, case, geometry)
            if issue:
                raise ValueError(issue)
            shape = geometry if shape is None else shape.union(geometry)
    if shape is None:
        raise ValueError('No valid subject geometry.')
    return shape


def fit_selection(c, open_view=True):
    # 50% means the selected bounding box occupies half of the limiting map
    # frame dimension, not half of the page area. The VM frame is untouched.
    selected = bool(c.owners.getSelectionSet())
    extent = c.frame.getLayerExtent(c.owners if selected else c.subject, selected, False)
    if extent.width <= 0 or extent.height <= 0:
        raise ValueError('Cannot frame an empty or degenerate selection extent.')
    c.frame.camera.setExtent(extent)
    visible = c.frame.camera.getExtent()
    c.frame.camera.scale *= max(extent.width / visible.width, extent.height / visible.height) / .50
    c.map.defaultCamera = c.frame.camera
    if open_view:
        # Open the map for ordinary manual selection tools. Its default camera
        # matches the independent mailing layout frame; never set the VM camera.
        c.map.openView()
        view = c.project.activeView
        if view and getattr(view, 'map', None) and view.map.URI == c.map.URI:
            view.camera.setExtent(c.frame.camera.getExtent())


def select_recipients(method, project=None, open_view=True):
    if method not in ('300 feet','600 feet','Adjacent','Custom'):
        raise ValueError('Choose 300 feet, 600 feet, Adjacent or Custom.')
    c = selection_context(project)
    # RULE: Custom is a handoff to the user's normal selection tools. Preserve
    # their existing OIDs exactly; do not select all or run a location operation.
    if method != 'Custom':
        shape = subject_geometry(c)
        with arcpy.EnvManager(extent=None,addOutputsToMap=False), registered_layer(c.owners) as work:
            if method == 'Adjacent':
                # Intersecting a geodesic 2-foot buffer is equivalent to testing
                # distance <=2 feet. Seed only: users add across-street parcels.
                work = arcpy.management.SelectLayerByLocation(work, 'WITHIN_A_DISTANCE_GEODESIC', shape, '2 Feet', 'NEW_SELECTION')[0]
                # Exclude source parcels whose centers are inside the subject.
                # Do NOT remove every intersecting parcel: that drops neighbors
                # sharing edges. City/County offsets can still require edits.
                work = arcpy.management.SelectLayerByLocation(work, 'HAVE_THEIR_CENTER_IN', shape, selection_type='REMOVE_FROM_SELECTION')[0]
            else:
                feet = 300 if method == '300 feet' else 600
                work = arcpy.management.SelectLayerByLocation(work, 'WITHIN_A_DISTANCE_GEODESIC', shape, f'{feet} Feet', 'NEW_SELECTION')[0]
            # GP returns a NEW selected layer handle; the original _mp handle
            # may still have no selection. Always read the returned output.
            ids = list(work.getSelectionSet() or [])
            c.owners.setSelectionSet(ids, 'NEW')
    mode = {'300 feet':'300','600 feet':'600','Adjacent':'ADJ','Custom':'CUSTOM'}[method]
    c.map.name = c.case + ' Mailing Selection [' + mode + ']'
    fit_selection(c, open_view)
    count = len(c.owners.getSelectionSet() or [])
    arcpy.AddMessage(f'{c.case}: {method}; {count} owner records currently selected.')
    arcpy.AddMessage('Mailing map/frame fitted at approximately 50%. Reviewed VM map/layout unchanged.')
    if method == 'Adjacent':
        arcpy.AddWarning('Adjacent is a 2-foot starting selection with subject-centered parcels removed. Check boundaries and add across-street recipients as needed.')
    if method == 'Custom':
        arcpy.AddMessage('Custom preserved your existing selection. Select recipients however you prefer.')
    arcpy.AddMessage('Add/remove parcels, then run 4. Export Mailing List. It will use your FINAL selection without recalculating.')
    return count


def write_csv(path, fields, rows):
    with Path(path).open('w',encoding='utf-8-sig',newline='') as stream:
        writer=csv.DictWriter(stream,fieldnames=fields)
        writer.writeheader(); writer.writerows(rows)


def write_excel(rows, fields, destination):
    """Portable Excel export: literal text only, no hidden OID or formula coercion.

    ArcGIS TableToExcel includes its table's OID and interprets leading '=' as
    a formula, even for TEXT fields. A minimal standards-based XLSX avoids both
    behaviors without requiring users to install another Python/Node package.
    All source values remain in the separate CSV/audit. No Excel formulas exist.
    """
    import zipfile
    import xml.etree.ElementTree as ET
    import re
    ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
    def tag(name): return '{'+ns+'}'+name
    def col(index):
        value = ''
        while index:
            index, remainder = divmod(index-1,26)
            value = chr(65+remainder)+value
        return value
    def cell_text(value):
        value = str(value or '')
        if len(value)>32767:
            raise ValueError('A mailing value exceeds Excel cell capacity.')
        if re.search(r'[\x00-\x08\x0B\x0C\x0E-\x1F]',value):
            raise ValueError('A mailing field contains an unsupported control character; review the source.')
        return value
    sheet = ET.Element(tag('worksheet'))
    last = col(len(fields)) + str(len(rows)+1)
    ET.SubElement(sheet,tag('dimension'),ref='A1:'+last)
    views=ET.SubElement(sheet,tag('sheetViews'))
    view=ET.SubElement(views,tag('sheetView'),workbookViewId='0')
    ET.SubElement(view,tag('pane'),ySplit='1',topLeftCell='A2',activePane='bottomLeft',state='frozen')
    ET.SubElement(sheet,tag('sheetFormatPr'),defaultRowHeight='15')
    columns=ET.SubElement(sheet,tag('cols'))
    widths={'NAME':45,'NAME2':32,'ADDRESS':40,'ADDRESS2':30,'CITY':22,'STATE':10,'ZIP':16,'COUNTRY':24}
    for i,field in enumerate(fields,1):
        ET.SubElement(columns,tag('col'),min=str(i),max=str(i),width=str(widths.get(field,24)),customWidth='1')
    data=ET.SubElement(sheet,tag('sheetData'))
    for number,values in enumerate([list(fields)]+[[row.get(f,'') for f in fields] for row in rows],1):
        line=ET.SubElement(data,tag('row'),r=str(number))
        for i,value in enumerate(values,1):
            cell=ET.SubElement(line,tag('c'),r=col(i)+str(number),t='inlineStr',s='1' if number==1 else '0')
            inline=ET.SubElement(cell,tag('is'))
            text=ET.SubElement(inline,tag('t'),{'{http://www.w3.org/XML/1998/namespace}space':'preserve'})
            text.text=cell_text(value)
    ET.SubElement(sheet,tag('autoFilter'),ref='A1:'+last)
    ET.SubElement(sheet,tag('pageMargins'),left='.25',right='.25',top='.5',bottom='.5',header='.2',footer='.2')
    ET.SubElement(sheet,tag('pageSetup'),orientation='landscape',fitToWidth='1',fitToHeight='0')
    files={
      '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
      '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml': '<workbook xmlns="'+ns+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Mailing List" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      'xl/styles.xml': '<styleSheet xmlns="'+ns+'"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF234A65"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
      'xl/worksheets/sheet1.xml': ET.tostring(sheet,encoding='utf-8',xml_declaration=True)
    }
    with zipfile.ZipFile(destination,'w',compression=zipfile.ZIP_DEFLATED) as archive:
        for name,value in files.items(): archive.writestr(name,value)


def export_mailing_list(output_folder=None, project=None):
    c = selection_context(project)
    ids = tuple(sorted(c.owners.getSelectionSet() or []))
    if not ids:
        raise ValueError('Nothing selected. Select recipients first; an empty selection will NOT export every parcel.')
    mode_match = re.search(r'\[(300|600|ADJ|CUSTOM)\]$',c.map.name)
    if not mode_match:
        raise ValueError('Run Select Recipients first, then adjust the selection before exporting.')
    mode = mode_match.group(1)
    home = Path(output_folder or c.project.homeFolder)
    if not home.is_dir():
        raise ValueError('Choose an existing output folder.')
    gdb = c.project.defaultGeodatabase
    if not gdb or not arcpy.Exists(gdb):
        raise ValueError('Set a working project default geodatabase for the raw selection.')
    clean = companion('notice_cleanup')
    required = ('AccountNo','ParcelNo') + clean.OWNER_FIELDS
    fc_name = arcpy.ValidateTableName(c.case + '_ML_' + mode, gdb)
    final_fc = str(Path(gdb)/fc_name)
    # Produce and verify ALL new files before touching previous named outputs.
    stage = Path(tempfile.mkdtemp(prefix='_notice_export_',dir=str(home)))
    stage_gdb = stage/'selection.gdb'
    manifest = None
    try:
        arcpy.management.CreateFileGDB(str(stage),stage_gdb.name)
        raw_fc = str(stage_gdb/'owners')
        with arcpy.EnvManager(extent=None,addOutputsToMap=False,overwriteOutput=True), registered_layer(c.owners) as work:
            # Select on the registered GP layer and use its returned handle.
            # setSelectionSet on an _mp wrapper alone need not update the GP view.
            oid_field = arcpy.Describe(work).OIDFieldName
            clauses = []
            for start in range(0,len(ids),900):
                values = ','.join(str(int(oid)) for oid in ids[start:start+900])
                clauses.append(arcpy.AddFieldDelimiters(c.owners.dataSource,oid_field)+' IN ('+values+')')
            work = arcpy.management.SelectLayerByAttribute(work,'NEW_SELECTION',' OR '.join('('+clause+')' for clause in clauses))[0]
            fields = {f.name.rsplit('.',1)[-1].casefold():f.name for f in arcpy.Describe(work).fields}
            missing = [f for f in required if f.casefold() not in fields]
            if missing:
                raise ValueError('Owner layer lacks fields: ' + ', '.join(missing))
            records=[]
            with arcpy.da.SearchCursor(work,['OID@']+[fields[f.casefold()] for f in required]) as cursor:
                for row in cursor:
                    records.append(dict(zip(('SOURCE_OID',)+required,row)))
            if {r['SOURCE_OID'] for r in records} != set(ids):
                raise RuntimeError('Selected IDs differ from returned source rows; no output published.')
            records.sort(key=lambda r:r['SOURCE_OID'])
            arcpy.management.CopyFeatures(work,raw_fc)
            if int(arcpy.management.GetCount(raw_fc)[0]) != len(ids):
                raise RuntimeError('Raw snapshot count differs from final selection.')
            copied_fields={f.name.casefold():f.name for f in arcpy.ListFields(raw_fc)}
            with arcpy.da.SearchCursor(raw_fc,[copied_fields[f.casefold()] for f in required]) as cursor:
                snapshot=Counter(tuple(row) for row in cursor)
            del cursor  # Release the snapshot cursor object before cleanup.
            if snapshot != Counter(tuple(r[f] for f in required) for r in records):
                raise RuntimeError('Raw snapshot attributes differ from selected records.')
            arcpy.conversion.ExportTable(raw_fc,str(stage/(fc_name+'.dbf')))
        rows, review, audit = clean.clean_records(records)
        stem=c.case+'_ML'
        write_csv(stage/(stem+'.csv'),('MAIL_ID',)+clean.MAILING_FIELDS,rows)
        write_csv(stage/(stem+'_REVIEW.csv'),('MAIL_ID',)+clean.MAILING_FIELDS+('SOURCE_OIDS','ORIGINAL_ZIPS','REVIEW_FLAGS'),review)
        write_csv(stage/(stem+'_AUDIT.csv'),('SOURCE_OID','AccountNo','ParcelNo','MAIL_ID','EXCLUSION','CHANGES','REVIEW_FLAGS','RAW_JSON')+clean.MAILING_FIELDS+('OUTPUT_ZIP',),audit)
        write_excel(rows,clean.MAILING_FIELDS,stage/(stem+'.xlsx'))
        if tuple(sorted(c.owners.getSelectionSet() or [])) != ids:
            raise RuntimeError('User selection changed during export; no output published.')
        summary = [f'Case: {c.case}',f'Method seed: {mode}; final selection may include user edits.',
                   f'Selected records: {len(records)}',f'Mailing entries: {len(rows)}',
                   f'Excluded City rows: {sum(bool(r["EXCLUSION"]) for r in audit)}',f'Entries needing review: {len(review)}',
                   'ZIP5/ZIP+4 variants merge only when all other mailing fields match.',
                   'Distinct ZIP+4 conflicts output the common ZIP5 and require review.',
                   'Original values, parcel/account links and original ZIPs are retained in the audit.',
                   'This candidate list includes flagged entries. Check the review file before using it.',
                   f'Source: {c.owners.dataSource}',f'Raw selection: {final_fc}']
        (stage/(stem+'_SUMMARY.txt')).write_text('\n'.join(summary)+'\n',encoding='utf-8')
        # User requested stable filenames and replacement on rerun. Publish the
        # verified snapshot before companion files; no re-selection happens.
        # Stage previous named files and raw FC only for failure recovery.
        # A locked Excel file stops publication before an old raw FC is changed.
        # Successful reruns keep just the stable named outputs (no _v02 files).
        pending = [path for path in stage.iterdir() if path.is_file()]
        backup_dir = stage / 'previous'
        backup_dir.mkdir()
        previous_fc = str(stage_gdb / 'previous_owners')
        had_fc = bool(arcpy.Exists(final_fc))
        backups, published = [], []
        fc_attempted = False
        try:
            if had_fc:
                arcpy.management.CopyFeatures(final_fc, previous_fc)
            for path in pending:
                final = home/path.name
                if final.exists():
                    backup = backup_dir/path.name
                    final.replace(backup)
                    backups.append((final,backup))
            with arcpy.EnvManager(overwriteOutput=True,addOutputsToMap=False):
                fc_attempted = True
                arcpy.management.CopyFeatures(raw_fc,final_fc)
            for path in pending:
                final = home/path.name
                path.replace(final)
                published.append(final)
        except Exception:
            for final in published:
                final.unlink(missing_ok=True)
            for final,backup in reversed(backups):
                backup.replace(final)
            if fc_attempted:
                with arcpy.EnvManager(overwriteOutput=True,addOutputsToMap=False):
                    if had_fc:
                        arcpy.management.CopyFeatures(previous_fc,final_fc)
                    elif arcpy.Exists(final_fc):
                        arcpy.management.Delete(final_fc)
            raise
        manifest=dict(case=c.case,method=mode,selected=len(ids),mailing_entries=len(rows),review_entries=len(review),
                      raw_feature_class=final_fc,xlsx=str(home/(stem+'.xlsx')),csv=str(home/(stem+'.csv')))
        for message in summary[:9]:
            arcpy.AddMessage(message)
        arcpy.AddMessage('Excel mailing list: '+manifest['xlsx'])
        arcpy.AddMessage('Raw DBF, cleaned CSV, review CSV and audit saved beside the Excel file. Existing named outputs replaced.')
        if review:
            arcpy.AddWarning(f'{len(review)} mailing entries need review; see {stem}_REVIEW.csv.')
        return manifest
    finally:
        # Only the exact temporary directory created above is removed. Its path
        # is below the explicit output folder and never points at user sources.
        try:
            if stage.resolve().parent != home.resolve() or not stage.name.startswith('_notice_export_'):
                raise RuntimeError('Refusing cleanup outside the exact export staging folder.')
            # Drop lingering wrapper/cursor references before clearing locks.
            cursor = None
            work = None
            arcpy.management.ClearWorkspaceCache(str(stage_gdb))
            if arcpy.Exists(str(stage_gdb)):
                arcpy.management.Delete(str(stage_gdb))
            shutil.rmtree(stage)
        except Exception as cleanup_error:
            # Workspace caching can briefly retain a local GDB lock after a
            # successful export. Cleanup must not report published files as a
            # failed export or mask the original processing error.
            arcpy.AddWarning('Temporary export files retained at '+str(stage)+': '+str(cleanup_error))
