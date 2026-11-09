# Requirements and setup

## Runtime

- Windows with a licensed ArcGIS Pro installation and its bundled Python/ArcPy. The code uses `arcpy.mp.ArcGISProject("CURRENT")` and must run inside Pro for normal toolbox use.
- A cloned Pro Python environment with `qrcode` and Pillow (`qrcode[pil]`). Select that environment in Pro and restart Pro after changing environments.
- No pip installation of ArcPy. No pandas or Excel installation is needed to write the mailing workbook: the tool writes XLSX using Python's ZIP/XML libraries.
- `openpyxl` is only needed for independent workbook verification tests.
- Authorized, working case and county owner layers; the project holds their source connections and sign-in state.
- Writable project home folder, writable default file geodatabase, and writable archive folder. Close output workbooks before rerunning exports.

The repository does not bundle Pro or a proprietary template. Exact minimum Pro version has not been established; validate against the organization's deployed Pro version. The source snapshot comes from the working November 2026 tools.

## Template contract

| Object | Required name / property |
|---|---|
| Map | `PublicNoticeMap` |
| Layout | `PublicNoticeLayout` |
| Main map frame | `Layers Map Frame`, displaying PublicNoticeMap; 2D, north-up |
| Case polygon layer | `Subject Area`, not broken, known spatial reference, `CASENUMBER` field |
| Owner polygon layer | `Parcels` in the mailing map |
| Text elements | `CaseNo`, `URL` |
| Picture element | `QR`, visible, square, positive dimensions |

Case number, URL and QR must be visible. Map/layout names are functional dependencies, not cosmetic in the Pro toolbox.

Owner fields required for list export: `AccountNo`, `ParcelNo`, `OwnerName`, `CareOf`, `MailAddr1`, `MailAddr2`, `MailCity`, `MailState`, `MailZip`, `MailCountry`. Preserve multiple owner records on the same parcel.

## Configuration

The repository copy reads `pro/notice_config_local.py` beside the tools. Environment variables `PUBLIC_NOTICE_ARCHIVE_ROOT` and `PUBLIC_NOTICE_PROPERTY_URL` override those values. Without an archive setting, the default is `PublicNoticeOutputs` under the user's home directory; create it first. Missing or invalid QR URL configuration stops QR generation.

The Property Information URL setting must be a complete HTTPS prefix ending with its case-number parameter and `=`. The script appends the URL-encoded case number. It is a public link destination, not a REST/data-service connection.

Output layout: `<archive root>/<case year> PN/<case>_VM.pdf` and `.aprx`. The case year controls the folder. Actual deployment paths stay local.

## Installation

1. Clone/download the repository and keep `pro/` files together.
2. Install requirements in a cloned Pro environment using Pro's environment/package tools.
3. Configure the two local values and prepare the required template/layers.
4. Add `PublicNoticeMap.pyt` through Catalog > Toolboxes > Add Toolbox.
5. Run steps 1–4 on a test case, checking map location, QR destination, selected records and output files.

Do not commit connection files, live data extracts, case APRX files or filled local configuration. The `.gitignore` excludes common deployment/output formats; it is not a substitute for reviewing files before committing.
