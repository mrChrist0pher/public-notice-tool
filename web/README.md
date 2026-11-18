# Experience Builder public notice widget

This is the custom web implementation, separate from the ArcGIS Pro Python toolbox. It runs selection, mailing cleanup, QR generation and PDF layout in the browser; it does not call Python or a geoprocessing service. The app is deployed internally on the City server. Version 14 removes the separate PDF download link; Generate mailing list initiates both downloads. Version 13 replaced Finish adjusting with a Pick parcels on map / Stop picking toggle and prepares CSV/PDF before requesting both downloads, deployed November 18, 2026. Version 12 added the tagged mailing-list PDF. Version 11 added Prepare vendor email. Version 10 added custom numeric radius entry. See [current behavior](../docs/current-behavior.md) and [backlog](../docs/backlog.md); deployment does not establish complete business-rule acceptance.

Start with [MODIFICATIONS.md](MODIFICATIONS.md) for exactly what we changed, [SETUP.md](SETUP.md) to install and wire an app, and [MAP-STYLING.md](MAP-STYLING.md) to recreate the underlying map. [SOURCE-SNAPSHOT.md](SOURCE-SNAPSHOT.md) records installed-source hashes and repository packaging differences.

## Current workflow

1. Use the stock Search widget to select a case. Search submission or explicit Clear resets the old buffer, selection and exports; typing/focus alone does not.
2. Confirm subject location and generate `CASE_VM.pdf`. The browser captures a separate north-up map view at 300 dpi, adds the City logo, legend, feet-only scale bar, north arrow and case-specific QR/link. The interactive map extent is preserved. A print service is not required for this implementation.
3. Choose 300 feet, 600 feet, Adjacent or Custom, then Run. Radius uses a geodesic buffer of the union of all matching case polygons. Radius selections include subject owners. Adjacent is a two-foot seed excluding subject-center parcels; manually add across-street recipients as appropriate. Custom accepts a positive numeric distance in feet; Run replaces the selection. Changing its value requires a new run. Manual add/remove remains available.
4. Download only cleaned eight-field `CASE_ML.csv`. Records with both mailing delivery lines blank are excluded after text cleanup and the approved CU destination rule. PO boxes and a populated second line stay. No ZIP, raw-selection file, review file or audit file is downloaded.

Changing method requires Run again before mailing export. An empty selection cannot export the entire layer. Table removals synchronize with the captured selection. Queries retrieve IDs first and features in batches of 400, checking completeness.

## Source files

| File | Purpose |
|---|---|
| src/runtime/widget.tsx | Workflow, Esri queries, buffers, selection synchronization, private print view, download assembly and dark-panel CSS |
| src/runtime/cleanup.ts | Browser port of Python cleanup rules, CSV formatting and internal diagnostic/audit objects |
| src/runtime/pdf-layout.ts | Letter PDF layout, feet scale, QR, clickable link, logo and footer |
| src/runtime/assets/city-logo.png | Existing City seal extracted from a Pro export; retained for this private project, no redistribution license asserted |
| config.json / manifest.json | Required Experience Builder widget metadata/default settings |
| icon.svg | Original envelope icon supplied during repository packaging |
| test-cleanup.cjs | Synthetic cleanup regression checks |
| test-pdf.cjs | Synthetic PDF page size and clickable case-link check |
| test-download.cjs | Actual handler check: matching CSV/PDF from the same cleaned rows, eight fields, no raw/ZIP, stale/error handling |

The web app necessarily uses TypeScript/React and Experience Builder JSON metadata. The `pro/` implementation and its local settings remain Python.

## Status and limits

- Tested development baseline: Developer Edition 1.17, separate Node 22 environment. Other versions require compatibility testing.
- Owners only. Owner/resident/business checkboxes and zoning text beneath the legend remain deferred.
- No vendor email, EnerGov upload/close-out, hosted selection archive, or production hosting is implemented.
- Current output is a single cleaned CSV, not native Excel. Import ZIP/postal fields as text in Excel to preserve leading zeros. CSV formula-like values are escaped.
- Cleanup retains some unresolved/ambiguous source values; internal diagnostic flags still exist but are not surfaced in the finished download. No flags does not prove address deliverability.
- Stock Search DOM selectors and sidebar IDs are prototype-specific, and there is no custom widget settings panel. See setup before using another app.
- The installed prototype retained legacy frame dimensions 7.5 x 8 inches while the PDF frame is 8 x 8.5 inches. The repository defaults align both to 8 x 8.5; recheck map framing/scale visually when adopting this copy.

Historical live checks before packaging included 300/600-foot parity with Pro and a downloaded test-case list comparison. Packaging validation covers cleanup and TypeScript; it is not a new live-browser or QR scan test. Scan an exported QR and verify the subject before operational use.

## November 9 cleanup/download update

Every cleanup rule has its own plain-English source comment. See [the team explanation](../docs/cleanup-team-guide.md). The finished web download is a cleaned CSV and matching tagged mailing-list PDF as separate files. The app does not archive the selected source records; cleanup audit objects are temporary working data. Existing downloaded files are not changed.
