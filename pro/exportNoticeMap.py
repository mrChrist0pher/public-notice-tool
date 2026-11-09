"""Optional standalone script-tool export wrapper; normal use is the .pyt."""
import arcpy
from prepareNoticeMap import export_notice_map
if __name__ == '__main__':
    reviewed = (arcpy.GetParameterAsText(0) or '').lower() == 'true'
    pdf, aprx = export_notice_map(reviewed, True)
    arcpy.SetParameterAsText(1,pdf)
    arcpy.SetParameterAsText(2,aprx)
