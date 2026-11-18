# What we built and what we changed

This guide separates custom source from stock Esri widgets and app/map configuration. We did not fork a community widget repository or modify Experience Builder core source.

## Custom code

| Component | Changes made for this project | Where to edit |
|---|---|---|
| Workflow widget | Steps 2–4, radius-first 300/600/Adjacent/Custom controls, Run button, manual add/remove, status, downloadable cleaned CSV | src/runtime/widget.tsx |
| Case handling | Observe stock Search selection, query every polygon for case, union geometries, display only Subject Area; cancel stale operations on new search | src/runtime/widget.tsx |
| Recipient query | Geodesic distance from full case geometry; ID-first queries and 400-feature batches; checked record totals; selected IDs linked to table | src/runtime/widget.tsx |
| Cleanup | Port Python rules: trim/null text, state codes, exact approved City exclusion, confirmed CU aliases, preserve legal entities/care-of/units, combine matching destinations including ZIP5/+4 variants, safe CSV | src/runtime/cleanup.ts |
| Mailing export | One case-named cleaned CSV; exclude records with both delivery lines blank; no ZIP or raw/audit/review download | src/runtime/widget.tsx |
| Map capture | Separate cloned print MapView, north up, 20% maximum subject width, tall-subject guard, 300 dpi; minimum scale 2400 rounded upward in 1200 steps; suppress city/place basemap labels in private print view | src/runtime/widget.tsx |
| PDF layout | Letter portrait, 8 x 8.5-inch frame, larger legend patches/text, logo bottom right, arrow/feet bar above sources, URL under QR at left, tool credit bottom right, remove personal contact attribution | src/runtime/pdf-layout.ts |
| QR | Dynamic case URL, QR quiet zone/error correction, same printed and clickable PDF destination | src/runtime/pdf-layout.ts |
| Dark panel | Dark workflow controls, teal actions, keyboard focus; scoped stock Search CSS and sidebar background | src/runtime/widget.tsx |

## Stock components configured, not rewritten

| Component | Configuration changed |
|---|---|
| Search | Retained stock Search implementation; case-number field, filtering enabled, auto-select first result, standalone case data source using locally supplied full service URL |
| Map | Retained stock Map widget; connected existing web map; case and owner layer IDs preserved |
| Table | Retained stock Table; connected owner data source so selected IDs and row removals synchronize |
| Layout | Search above custom workflow in left panel; stacked workflow on medium/small layouts; dark sidebar background |
| App config | Custom widget URI and map/data-source bindings; Search standalone data source; responsive layout changes |
| Web map | Layer display names/order, gray symbology, street/zoning labeling and filters; see MAP-STYLING.md |

Local prototype IDs were Search `widget_18`, Map `widget_11`, workflow `widget_44`, sidebar `layout_7`, case data source `dataSource_notice_cases`. These IDs are not reusable assumptions for a new app. The Search DOM/reset and CSS hooks currently reference the prototype IDs in source; change them deliberately when wiring another app.

## Repository packaging differences from installed widget

1. Internal short-host replacement became optional `config.caseServiceUrl`, a complete locally supplied case layer URL. Blank uses the existing map layer. No internal service endpoint is committed.
2. Default case/owner layer IDs are placeholders; local bindings remain deployment configuration. Obsolete PrintingTools URL/layout settings were omitted because PDF generation is now browser-side.
3. Default frame is 8 x 8.5 inches to match the PDF. The installed app retained older dimensions; this is a documented adoption change needing visual validation.
4. The cleanup test resolves TypeScript from `EXB_CLIENT`/current directory rather than an individual Windows path.
5. An original envelope icon replaces the stock sample icon; City seal and three custom source modules otherwise follow the snapshot hashes, with the widget URL change above.
6. Fresh documentation supersedes the older chronological README containing outdated QR, print-service, search-reset and review-download descriptions.

These changes apply only to this repository copy. No installed widget, local app or Portal map was changed during packaging. See SOURCE-SNAPSHOT.md for hashes; earlier development history is not reconstructed as fictitious Git commits.

## Dependencies and ownership

Esri supplies Experience Builder, React/Jimu framework, Maps SDK and stock widgets. We wrote the workflow/PDF/cleanup integration for P&DS GIS. pdf-lib and qrcode are upstream libraries, not our code. Install them from their packages rather than committing vendor source or node_modules. Retain their licenses in any deployment bundle. No license is assigned to this project's custom code or City artwork by this upload.

## November 9 follow-up

- Added individually commented blank-address exclusion in web and Pro cleanup. Check after whitespace and confirmed CU routing; retain PO boxes and populated second lines.
- Web Generate now downloads only CASE_ML.csv. Removed JSZip from the custom widget and removed raw-file wording. Pro retains its separately documented archive/audit workflow.
- Added synthetic checks for exclusions and the actual single-CSV download handler.
- Hosted PDF logo URL now resolves relative to document.baseURI, not the server root.

## November 10 PDF follow-up

- Retained the original stock Search UI. Grouped/custom search is not included.
- PDF exports now reconstruct a private basemap from JSON on every run, so print-view destruction cannot destroy a shared basemap layer needed by the next export.
- Added bounded rendering waits, failure cleanup, captured case identity, and operation-aware busy-state cleanup.
- Case service resolution uses the optional widget override, then the configured standalone case data-source URL, then the map layer URL. No internal endpoint is added to source.
- Added test-repeat-export.cjs and verified two different real cases export sequentially without refreshing in the browser preview. Deployed as version 9; version 6 retained for rollback. Source and documentation are being reconciled to GitHub on November 12.


## November 17 vendor email follow-up

Added vendor-email.ts and Prepare vendor email after a non-empty cleaned list is generated. A mailto draft includes the case, cleaned destination count and selection method. It uses the default email application, not an Outlook-specific API. Optional mailingVendorEmail is supplied in local deployment configuration; no recipient is assumed. Attachments, requested mailing date, billing information and Send remain manual. Existing result invalidation prevents preparing an email from an outdated selection. No background tracking or automatic mail delivery is included.
