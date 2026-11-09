"""Blank-address regression checks; no ArcGIS or real recipients needed."""
import copy
import json
import unittest
from notice_cleanup import clean_records

def record(oid, **values):
    row=dict(SOURCE_OID=oid,AccountNo='001',ParcelNo='002',OwnerName='TEST LLC',
             CareOf='',MailAddr1='10 MAIN ST',MailAddr2='',MailCity='BOULDER',
             MailState='CO',MailZip='80301',MailCountry='')
    row.update(values)
    return row

class BlankAddressTests(unittest.TestCase):
    def test_blank_excluded_but_raw_preserved(self):
        inputs=[record(1,MailAddr1=None,MailAddr2=None),record(2,MailAddr1=' \t ',MailAddr2='\r\n')]
        before=copy.deepcopy(inputs)
        rows,review,audit=clean_records(inputs)
        self.assertEqual(rows,[])
        self.assertEqual(review,[])
        self.assertEqual(len(audit),2)
        for source,entry in zip(inputs,audit):
            self.assertEqual(entry['EXCLUSION'],'No mailing address: both delivery lines are blank')
            self.assertEqual(entry['MAIL_ID'],'')
            self.assertEqual(json.loads(entry['RAW_JSON']),source)
        self.assertEqual(inputs,before)

    def test_second_line_and_po_box_kept(self):
        for changes in [dict(MailAddr1='',MailAddr2='PO BOX 123'),dict(MailAddr1='PO BOX 456')]:
            with self.subTest(changes=changes):
                rows,_,audit=clean_records([record(1,**changes)])
                self.assertEqual(len(rows),1)
                self.assertEqual(audit[0]['EXCLUSION'],'')

    def test_cu_override_before_exclusion(self):
        rows,_,audit=clean_records([record(1,OwnerName='UNIVERSITY OF COLORADO',MailAddr1='')])
        self.assertEqual(rows[0]['ADDRESS'],'453 UCB')
        self.assertEqual(audit[0]['EXCLUSION'],'')

    def test_other_missing_fields_do_not_exclude(self):
        rows,_,_=clean_records([record(1,MailCity='',MailZip='')])
        self.assertEqual(len(rows),1)

if __name__=='__main__':
    unittest.main()
