"""Add this Python toolbox in ArcGIS Pro. Keep prepareNoticeMap.py beside it."""
from pathlib import Path
import importlib.util
import arcpy


def _implementation(name='prepareNoticeMap'):
    path = Path(__file__).with_name(name + '.py')
    spec = importlib.util.spec_from_file_location('pds_notice_map', str(path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Toolbox:
    def __init__(self):
        self.label = 'Public Notice Map'
        self.alias = 'pdsnoticemap'
        self.tools = [PrepareNoticeMap, ExportNoticeMap, SelectRecipients, ExportMailingList]


class PrepareNoticeMap:
    def __init__(self):
        self.label = '1. Prepare Notice Map'
        self.description = 'Find the case, frame the subject, and update case number, URL and QR. Review the layout before exporting.'
        self.canRunInBackground = False

    def getParameterInfo(self):
        case = arcpy.Parameter(displayName='Case number', name='case_number', datatype='GPString', parameterType='Required', direction='Input')
        return [case]

    def isLicensed(self):
        return True

    def updateMessages(self, parameters):
        if parameters[0].valueAsText:
            try:
                _implementation().validate_case(parameters[0].valueAsText)
            except ValueError as error:
                parameters[0].setErrorMessage(str(error))

    def execute(self, parameters, messages):
        try:
            _implementation().prepare_notice_map(parameters[0].valueAsText)
        except Exception as error:
            arcpy.AddError(str(error))
            raise


class ExportNoticeMap:
    def __init__(self):
        self.label = '2. Export Notice Map'
        self.description = 'After reviewing the layout and scanning the QR, save CASE_VM.pdf and CASE_VM.aprx to the case-year PN folder.'
        self.canRunInBackground = False

    def getParameterInfo(self):
        review = arcpy.Parameter(displayName='I checked the subject and layout, and scanned the QR to confirm the correct case', name='review_confirmed', datatype='GPBoolean', parameterType='Required', direction='Input')
        review.value = False
        pdf = arcpy.Parameter(displayName='Vicinity map PDF', name='output_pdf', datatype='DEFile', parameterType='Derived', direction='Output')
        aprx = arcpy.Parameter(displayName='Case APRX', name='output_aprx', datatype='DEFile', parameterType='Derived', direction='Output')
        return [review, pdf, aprx]

    def isLicensed(self):
        return True

    def execute(self, parameters, messages):
        try:
            # Read GP booleans as text: ArcPy may wrap Parameter.value.
            review = (parameters[0].valueAsText or '').lower() == 'true'
            pdf, aprx = _implementation().export_notice_map(review, True)
            parameters[1].value = pdf
            parameters[2].value = aprx
        except Exception as error:
            arcpy.AddError(str(error))
            raise

class SelectRecipients:
    def __init__(self):
        self.label = '3. Select Recipients'
        self.description = 'Open the case VM APRX. Start a 300/600-foot or 2-foot Adjacent seed, or use Custom without changing your selection. Adjust the selection before step 4.'
        self.canRunInBackground = False

    def getParameterInfo(self):
        method = arcpy.Parameter(displayName='Selection method',name='selection_method',datatype='GPString',parameterType='Required',direction='Input')
        method.filter.type = 'ValueList'
        method.filter.list = ['300 feet','600 feet','Adjacent','Custom']
        method.value = '600 feet'
        return [method]

    def isLicensed(self):
        return True

    def execute(self,parameters,messages):
        try:
            _implementation('notice_selection').select_recipients(parameters[0].valueAsText)
        except Exception as error:
            arcpy.AddError(str(error))
            raise


class ExportMailingList:
    def __init__(self):
        self.label = '4. Export Mailing List'
        self.description = 'Export the FINAL user-adjusted selection; no spatial recalculation. Saves raw FC/DBF, cleaned Excel/CSV, review and audit. Existing outputs are replaced.'
        self.canRunInBackground = False

    def getParameterInfo(self):
        folder = arcpy.Parameter(displayName='Output folder (blank uses project home folder)',name='output_folder',datatype='DEFolder',parameterType='Optional',direction='Input')
        excel = arcpy.Parameter(displayName='Cleaned mailing spreadsheet',name='output_excel',datatype='DEFile',parameterType='Derived',direction='Output')
        raw = arcpy.Parameter(displayName='Raw selected features',name='raw_features',datatype='DEFeatureClass',parameterType='Derived',direction='Output')
        return [folder,excel,raw]

    def isLicensed(self):
        return True

    def execute(self,parameters,messages):
        try:
            result = _implementation('notice_selection').export_mailing_list(parameters[0].valueAsText or None)
            parameters[1].value = result['xlsx']
            parameters[2].value = result['raw_feature_class']
        except Exception as error:
            arcpy.AddError(str(error))
            raise
