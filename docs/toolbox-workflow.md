# Public Notice toolbox — four-step workflow

## Files that stay together

PublicNoticeMap.pyt, prepareNoticeMap.py, notice_selection.py and notice_cleanup.py.
exportNoticeMap.py is an optional script-tool wrapper, not required by the toolbox.

## 1. Prepare Notice Map

Open the working template, run this tool and enter the case number. It filters Subject Area, frames the subject, updates CaseNo/URL/QR and opens the layout. Review the location, layout and QR. No PDF/APRX is exported and the template is not saved.

## 2. Export Notice Map

Confirm the map/layout and scanned QR are correct. The tool replaces the case's named VM PDF and APRX in:

    <archive root>\<case year> PN\<case>_VM.pdf
    <archive root>\<case year> PN\<case>_VM.aprx

The archived copy names the map and layout `<case> VM`. A separate `<case> Mailing Selection` map/layout is created for recipient work. The main mailing frame references the separate mailing map, so later selection, layer changes and zooms do not affect the reviewed VM frame. The master is not saved over. The case APRX is editable and references live GIS data; it is not a frozen database snapshot. Previous VM files are kept internally in _previous_versions for recovery while the canonical filenames are replaced.

Keep notice_layout_assets with the case project; it contains the archived QR.

## 3. Select Recipients

Open the exported `<case>_VM.aprx` and run step 3:

- **300 feet / 600 feet:** select County owner polygons within the geodesic distance of the complete case geometry. Subject owners are included.
- **Adjacent:** start with polygons within 2 geodesic feet of the subject (equivalent to intersecting that buffer). Remove parcels whose centers are inside the subject. This is only a starting selection; inspect City/County boundary differences and add across-street parcels as needed.
- **Custom:** preserve the current mailing-map selection exactly. The user selects however they prefer; no location operation runs.

The independent MAILING map frame fits the selected extent to about 50% of its limiting dimension. For an empty selection it frames the subject instead. The mailing map view opens for normal selection tools. Add/remove recipients, then run step 4. Selection changes are in the current Pro session; normal project Save is needed if closing before step 4.

## 4. Export Mailing List

Uses only the FINAL selected OIDs from the mailing map. It never reruns selection. Empty selection stops rather than exporting the whole layer.

The output folder defaults to the project home folder; choose another existing folder if needed. The raw feature class uses the project's default geodatabase.

- `<case>_ML_<method>` feature class and corresponding DBF: raw selected records before cleanup.
- `<case>_ML.xlsx`: cleaned candidate mailing fields, stored as text to retain postal zeros.
- `<case>_ML.csv`: cleaned candidates with MAIL_ID.
- `<case>_ML_REVIEW.csv`: one row per flagged mailing entry.
- `<case>_ML_AUDIT.csv`: original source values, account/parcel/OID links, exclusions, changes and output ZIP.
- `<case>_ML_SUMMARY.txt`: source/method/counts and review notes.

Reruns replace the same named outputs. Close the Excel file before exporting again. New outputs are staged and verified before replacing existing ones. Existing raw/file outputs are retained temporarily for failure recovery; a failed replacement restores them where possible. No additional workflow RUN.json is introduced in this four-step tool.

## Cleanup

Trim/collapse spaces; preserve owner and care-of, both delivery lines and postal text. Exclude exact City of Boulder identity and route reviewed CU/Regents aliases to the approved Planning address. CU Foundation/Health keep their source destination pending policy. Ambiguous name/address arrangements remain flagged; older approved parser repairs are not silently generalized.

Deduplication keeps distinct LLCs/trusts and different care-of/unit/destination values separate. When every other field matches and a domestic ZIP5 matches, combine ZIP5/ZIP+4 variants. Retain a sole supplied ZIP+4. If extensions conflict, output common ZIP5, flag the entry, and retain original postal values in the audit. Flagged candidates remain in the spreadsheet; review reports are separate. Vendor-specific formatting is still pending.

## First live UI test

Refresh/re-add the toolbox in Catalog. Prepare/export a case, reopen the case APRX, run selection, adjust it with normal map selection tools and export. Confirm the reviewed VM stays unchanged and the selection opens visibly at a useful extent. Headless tests verify data/frame behavior but cannot confirm window focus on every Pro installation.
