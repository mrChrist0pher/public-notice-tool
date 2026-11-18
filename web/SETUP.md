# Install and connect the web prototype

## Requirements

- Official ArcGIS Experience Builder Developer Edition 1.17, with its server/client dependencies installed and development server running. Do not commit the Esri distribution.
- Node 22 was used for this local prototype. Confirm the official supported Node version when upgrading Developer Edition.
- Authorized Portal sign-in, an OAuth application registered in that same Portal, and allowed local redirect URL. Client ID/Portal deployment settings are supplied locally; no secret belongs in this repository.
- A 2D web map containing the case polygon and county owner polygon layers; working authenticated service access from the browser. A web map item is not included here.
- County fields: OwnerName, CareOf, MailAddr1, MailAddr2, MailCity, MailState, MailZip, MailCountry, plus a stable object ID. Case field: CASENUMBER. AccountNo/ParcelNo are useful raw provenance fields. Geometry must be available to the signed-in user.

## Copy and build

1. Copy this `web` directory's `src`, `config.json`, `manifest.json` and `icon.svg` into `<EXB>/client/your-extensions/widgets/pds-public-notice/`. Preserve `src/runtime/assets/city-logo.png` exactly. Use a copy of your app and back up existing widget/config first.
2. In `<EXB>/client`, add the packages used by custom code:

```console
npm install --save-exact pdf-lib@1.17.1 qrcode@1.5.4
npm install --save-dev --save-exact @types/qrcode@1.5.5
npm run build:dev
```

These commands modify the local Esri client's package manifests/lockfile. They are not instructions to replace its package.json with a standalone one. React, jimu-core, jimu-arcgis and Maps SDK come from the Esri environment. Restart the client watcher if the new widget does not appear.

3. Start the Developer Edition server and client as required by the vendor setup. Open the local builder and sign into the correct Portal. Existing local app ID `0` is not part of the repository.

## App wiring

This widget has no custom settings UI yet. Place the widget and use the builder's supported map/data-source controls where available; custom config fields/bindings may require editing a backed-up draft configuration with the builder closed. Do not paste this partial example over the entire app config. IDs differ between apps.

```json
{
  "uri": "widgets/pds-public-notice/",
  "useMapWidgetIds": ["YOUR_MAP_WIDGET_ID"],
  "useDataSources": [
    {"dataSourceId": "YOUR_STANDALONE_CASE_DS", "mainDataSourceId": "YOUR_STANDALONE_CASE_DS", "fields": ["CASENUMBER"]},
    {"dataSourceId": "YOUR_OWNER_LAYER_DS", "mainDataSourceId": "YOUR_OWNER_LAYER_DS", "rootDataSourceId": "YOUR_WEBMAP_DS", "fields": ["*"]}
  ],
  "config": {
    "caseLayerId": "YOUR_WEBMAP_CASE_LAYER_ID",
    "ownerLayerId": "YOUR_WEBMAP_OWNER_LAYER_ID",
    "caseField": "CASENUMBER",
    "caseServiceUrl": "",
    "frameWidth": 8,
    "frameHeight": 8.5,
    "scaleStep": 1200,
    "minPrintScale": 2400
  }
}
```

The data-source order is significant: case first, owners second. Layer IDs are the web map's layer IDs, not REST sublayer numbers. The owner Table must use the same owner data source. Set Search to the standalone case feature data source, search/display CASENUMBER, enable filtering and auto-select first result. Supply its authorized full URL locally. Optional `caseServiceUrl` repairs a case map layer whose short host is unreachable; use a complete layer URL (including sublayer number), not a server root.

In widget.tsx, adapt the prototype Search `widget_18` and sidebar `layout_7` DOM/CSS hooks to your actual IDs. Keep the Search submit/Clear behavior, not keystroke/focus resets. Configure sidebar Search above workflow; repeat layout placement for tablet/mobile. The logo URL now resolves relative to `document.baseURI` so exported app subfolders work; it still assumes the widget name `pds-public-notice`. Adapt that name if renamed. The PDF's public destination prefix remains in `pdf-layout.ts` (`propertyInfoUrl`); change it for another jurisdiction.

The actual Portal web map, OAuth registration, full app JSON and authenticated data sources are intentionally local. This source package can rebuild the custom widget; it is not a self-contained exported Experience Builder app. Recreate app wiring and map styling using these guides, then save/export the app through your approved process.

## Validation

From this repository's `web` directory, set `EXB_CLIENT` to your installed client directory, then run:

```console
node test-cleanup.cjs
node test-pdf.cjs
node test-download.cjs
node test-repeat-export.cjs
```

The PDF check creates an in-memory synthetic Letter page and checks the clickable case link. It does not decode the QR or verify live map scale. Packaging checks passed for cleanup, synthetic PDF and TypeScript against the installed 1.17 client.

Build within the installed client after copying the source. Then use a known case and verify: typing works; submitting a second case clears old work; full multi-polygon case is used; 300/600 results match a trusted geodesic selection; adjacent/manual/table changes synchronize; no empty/full-layer accidental export; correct single cleaned CSV naming and blank-address exclusions; logo and square frame; feet scale; QR opens the chosen case; no recipient buffer in the location PDF.

Production hosting, deployment base paths, authorization/CORS and widget registration must be tested separately. No live service or production app is published by adding this folder to GitHub.

## Optional vendor email configuration

Set `mailingVendorEmail` in the workflow widget configuration to a confirmed single vendor email address. Blank or absent leaves To blank. The button uses mailto and the default email handler, not Microsoft Graph. It never attaches files or sends mail. Add recipients locally; no historical vendor address is assumed. Run `node test-vendor-email.cjs` and `node test-radius.cjs` alongside the existing checks.
