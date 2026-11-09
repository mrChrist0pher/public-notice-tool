"""Offline checks for repository-local deployment settings."""
import importlib.util
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch
sys.modules.setdefault('arcpy', SimpleNamespace())
spec = importlib.util.spec_from_file_location('notice_config_test_impl', Path(__file__).with_name('prepareNoticeMap.py'))
impl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(impl)

class ConfigurationTests(unittest.TestCase):
    def test_missing_url_stops_export(self):
        with patch.object(impl, 'PROPERTY_INFO_BASE_URL', ''):
            with self.assertRaisesRegex(ValueError, 'PROPERTY_INFO_BASE_URL'):
                impl.case_url('LUR2026-00001')

    def test_configured_url_encodes_case(self):
        with patch.object(impl, 'PROPERTY_INFO_BASE_URL', 'https://example.org/case?caseno='):
            self.assertEqual(impl.case_url('TEST A&B'), 'https://example.org/case?caseno=TEST%20A%26B')

if __name__ == '__main__':
    unittest.main()
