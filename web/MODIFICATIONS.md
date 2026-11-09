# What we built and what we changed

This guide separates custom source from stock Esri widgets and app/map configuration. We did not fork a community widget repository or modify Experience Builder core source.

## Custom code

| Component | Changes made for this project | Where to edit |
|---|---|---|
| Workflow widget | Steps 2–4, radius-first 300/600/Adjacent/Custom controls, Run button, manual add/remove, status, downloadable results | src/runtime/widget.tsx |
| Case handling | Observe stock Search selection, query every polygon for case, union geometries, display only Subject Area; cancel stale operations on new search | src/runtime/widget.tsx |
| Recipient query | Geodesic distance from full case geometry; ID-first queries and 400-feature batches; checked record totals; selected IDs linked to table | src/runtime/widget.tsx |
| Cleanup | Port Python rules: trim/null text, state codes, exact approved City exclusion, confirmed CU aliases, preserve legal entities/care-of/units, combine matching destinations including ZIP5/+4 variants, safe CSV | src/runtime/cleanup.ts |
| Mailing export | Cleaned ML CSV plus raw selection CSV in a case-named ZIP; hide diagnostic flags/counts/files in interface/download | src/runtime/widget.tsx |
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

Esri supplies Experience Builder, React/Jimu framework, Maps SDK and stock widgets. We wrote the workflow/PDF/cleanup integration for P&DS GIS. JSZip, pdf-lib and qrcode are upstream libraries, not our code. Install them from their packages rather than committing vendor source or node_modules. Retain their licenses in any deployment bundle. No license is assigned to this project's custom code or City artwork by this upload.
