"""Offline checks for naming, review gate and safe paired export; no live GIS edits."""
import importlib.util
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace as NS
import unittest
from unittest.mock import patch

sys.modules['arcpy'] = NS(AddMessage=lambda text: None)
spec = importlib.util.spec_from_file_location('notice', Path(__file__).with_name('prepareNoticeMap.py'))
n = importlib.util.module_from_spec(spec)
spec.loader.exec_module(n)

class Layer:
    isFeatureLayer = True
    isBroken = False
    def __init__(self): self.ids = [7]
    def getSelectionSet(self): return self.ids
    def setSelectionSet(self, ids, method): self.ids = list(ids)

class ExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.case = 'LUR2026-00031'
        self.image = self.root / (self.case + '_VM_QR_local.png')
        self.image.write_bytes(b'qr')
        self.layer = Layer()
        self.qr = NS(sourceImage=str(self.image), elementPositionX=1, elementPositionY=1, elementWidth=1, elementHeight=1)
        self.fail = False
        def save(path):
            if self.fail: raise RuntimeError('simulated APRX failure')
            Path(path).write_bytes(b'aprx')
        self.context = NS(project=NS(filePath=str(self.root/'master.aprx'),saveACopy=save), layout=NS(exportToPDF=lambda path, **kw: Path(path).write_bytes(b'pdf')), qr=self.qr, map=NS(listLayers=lambda: [self.layer]))
        self.patches = [patch.object(n, 'ARCHIVE_ROOT', self.root), patch.object(n, '_finalize_case_copy'), patch.object(n, '_context', return_value=self.context), patch.object(n, '_prepared_case', return_value=self.case)]
        for p in self.patches: p.start(); self.addCleanup(p.stop)

    def test_year_and_name(self):
        pdf, aprx = n.output_paths(' lur2024-00001 ')
        self.assertEqual(pdf.relative_to(self.root), Path('2024 PN/LUR2024-00001_VM.pdf'))
        self.assertEqual(aprx.suffix, '.aprx')
        for value in ('../case', 'LUR2026-1', 'LUR9999-00001'):
            with self.assertRaises(ValueError): n.validate_case(value)

    def test_review_required(self):
        with self.assertRaises(ValueError): n.export_notice_map()
        self.assertFalse((self.root/'2026 PN').exists())

    def test_export_restores_template(self):
        pdf, aprx = map(Path, n.export_notice_map(True))
        self.assertEqual(pdf.read_bytes(), b'pdf')
        self.assertEqual(aprx.read_bytes(), b'aprx')
        self.assertEqual(self.qr.sourceImage, str(self.image))
        self.assertEqual(self.layer.ids, [7])
        self.assertEqual(len(list(pdf.parent.glob('notice_layout_assets/*.png'))), 1)
        self.assertFalse(list(self.root.rglob('*RUN*')))

    def test_existing_protected_and_backed_up(self):
        pdf, aprx = map(Path, n.export_notice_map(True))
        pdf.write_bytes(b'previous pdf')
        with self.assertRaises(FileExistsError): n.export_notice_map(True, False)
        n.export_notice_map(True, True)
        self.assertTrue(any(p.read_bytes() == b'previous pdf' for p in (pdf.parent/'_previous_versions').iterdir()))

    def test_failed_pair_preserves_originals(self):
        pdf, aprx = map(Path, n.export_notice_map(True))
        self.fail = True
        with self.assertRaises(RuntimeError): n.export_notice_map(True, True)
        self.assertEqual(pdf.read_bytes(), b'pdf')
        self.assertEqual(aprx.read_bytes(), b'aprx')
        self.assertEqual(self.qr.sourceImage, str(self.image))
        self.assertEqual(self.layer.ids, [7])
        self.assertEqual(len(list(pdf.parent.glob('notice_layout_assets/*.png'))), 1)
        self.assertFalse(list(pdf.parent.glob('_LUR*')))

    def test_open_archive_protected(self):
        self.context.project.filePath = str(n.output_paths(self.case)[1])
        with self.assertRaises(ValueError): n.export_notice_map(True, True)

if __name__ == '__main__': unittest.main(verbosity=2)
