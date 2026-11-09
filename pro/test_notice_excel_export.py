import sys,importlib.util,tempfile
from pathlib import Path
from types import SimpleNamespace
from openpyxl import load_workbook
sys.modules['arcpy']=SimpleNamespace()
spec=importlib.util.spec_from_file_location('s','notice_selection.py');s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
with tempfile.TemporaryDirectory() as d:
 p=Path(d)/'test.xlsx';s.write_excel([dict(NAME='=LITERAL OWNER',ZIP='01234-0001')],('NAME','ZIP'),p)
 w=load_workbook(p,data_only=False);sheet=w.active
 assert sheet.max_column==2 and sheet.max_row==2
 assert sheet['A2'].value=='=LITERAL OWNER' and sheet['A2'].data_type=='s'
 assert sheet['B2'].value=='01234-0001' and sheet['B2'].data_type=='s'
 assert sheet.freeze_panes=='A2' and sheet.auto_filter.ref=='A1:B2'
 w.close()
 s.write_excel([],('NAME','ZIP'),p);w=load_workbook(p);assert w.active.max_row==1;w.close()
 print('Excel independent verification passed: exact columns, literal names, postal zeros, filters, frozen header, empty-list headers, overwrite.')
