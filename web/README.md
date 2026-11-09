# Experience Builder public notice widget

This is the custom web implementation, separate from the ArcGIS Pro Python toolbox. It runs selection, mailing cleanup, QR generation and PDF layout in the browser; it does not call Python or a geoprocessing service. This is a local Developer Edition prototype, not a production deployment.

Start with [MODIFICATIONS.md](MODIFICATIONS.md) for exactly what we changed, [SETUP.md](SETUP.md) to install and wire an app, and [MAP-STYLING.md](MAP-STYLING.md) to recreate the underlying map. [SOURCE-SNAPSHOT.md](SOURCE-SNAPSHOT.md) records installed-source hashes and repository packaging differences.

## Current workflow

1. Use the stock Search widget to select a case. Search submission or explicit Clear resets the old buffer, selection and exports; typing/focus alone does not.
2. Confirm subject location and generate `CASE_VM.pdf`. The browser captures a separate north-up map view at 300 dpi, adds the City logo, legend, feet-only scale bar, north arrow and case-specific QR/link. The interactive map extent is preserved. A print service is not required for this implementation.
3. Choose 300 feet, 600 feet, Adjacent or Custom, then Run. Radius uses a geodesic buffer of the union of all matching case polygons. Radius selections include subject owners. Adjacent is a two-foot seed excluding subject-center parcels; manually add across-street recipients as appropriate. Custom keeps the current selection and allows manual add/remove.
4. Generate `CASE_ML.zip`, containing cleaned eight-field `CASE_ML.csv` and raw selected-attribute `CASE_ML_300.csv`, `_600.csv`, `_ADJ.csv` or `_CUSTOM.csv`. There is no separate review download or review count. The raw CSV has attributes, not geometry.

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

The web app necessarily uses TypeScript/React and Experience Builder JSON metadata. The `pro/` implementation and its local settings remain Python.

## Status and limits

- Tested development baseline: Developer Edition 1.17, separate Node 22 environment. Other versions require compatibility testing.
- Owners only. Owner/resident/business checkboxes and zoning text beneath the legend remain deferred.
- No vendor email, EnerGov upload/close-out, hosted selection archive, or production hosting is implemented.
- Current output is CSV inside ZIP, not native Excel. Import ZIP/postal fields as text in Excel to preserve leading zeros. CSV formula-like values are escaped.
- Cleanup retains some unresolved/ambiguous source values; internal diagnostic flags still exist but are not surfaced in the finished download. No flags does not prove address deliverability.
- Stock Search DOM selectors and sidebar IDs are prototype-specific, and there is no custom widget settings panel. See setup before using another app.
- The installed prototype retained legacy frame dimensions 7.5 x 8 inches while the PDF frame is 8 x 8.5 inches. The repository defaults align both to 8 x 8.5; recheck map framing/scale visually when adopting this copy.

Historical live checks before packaging included 300/600-foot parity with Pro and a downloaded test-case list comparison. Packaging validation covers cleanup and TypeScript; it is not a new live-browser or QR scan test. Scan an exported QR and verify the subject before operational use.
