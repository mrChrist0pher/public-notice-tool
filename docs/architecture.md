# Architecture and current status

## Python components

| File | Responsibility |
|---|---|
| PublicNoticeMap.pyt | Pro tool parameters, review confirmation and dispatch |
| prepareNoticeMap.py | Resolve current project/template; case validation; extent; QR; paired VM PDF/APRX export |
| notice_selection.py | Independent mailing-map context, geodesic selections, final-selection snapshot, DBF/CSV/XLSX exports |
| notice_cleanup.py | ArcPy-independent text cleanup, exclusions, institutional mapping, deduplication and provenance |
| exportNoticeMap.py | Optional script-tool wrapper |

Layers are inputs, not copies embedded in code. The template owns the authenticated sources. The toolbox discovers required layers/elements by names and checks their geometry/schema. Renaming required Pro objects can break it; this differs from the web app, which connects by layer/data-source IDs.

The exported case APRX separates the reviewed VM map/frame from a mailing-work map/frame. Later mailing navigation does not change the VM frame, but the APRX still references live source data. The raw selected feature class is the geometry-and-attributes snapshot; a raw CSV/DBF alone does not preserve geometry.

## Deployed web application

A separate custom Experience Builder widget handles the web workflow in JavaScript. It does not execute these Python tools. It has the original stock case Search, owner-only geodesic selection, manual adjustments, local cleanup/CSV generation and browser-generated PDF with QR. Version 9 is deployed internally and was reconciled November 12, 2026; see [current behavior](current-behavior.md). The dark panel and separately maintained web map remain part of the app wiring. See web/MODIFICATIONS.md for custom versus Esri code, web/SETUP.md for wiring and web/MAP-STYLING.md for map styling. Authenticated app JSON and internal service URLs remain local.

Proposed recordkeeping uses one feature service containing selected-parcel polygons and related notice-run/event records, plus a small authenticated server writer so planners remain Viewers. Chris maintains the setup. No writer or storage service has been implemented. See [backlog architecture](backlog.md#save-notification-selections-and-activity-records).

## What remains manual or pending

- Vendor email and follow-up, PN package assembly, EnerGov upload and workflow close-out.
- Decide whether official selection records belong in a central feature service; the current web download saves only the cleaned CSV, with no selection archive.
- Confirm vendor format and remaining cleanup policy questions with the business team.
- Owner / resident / business options are V2; current web selection is owners only.
- Zoning overlay text under the PDF legend is deferred pending discussion. Zoning is a reference map layer, not an implemented PDF attribute calculation.
- Handle withheld/suppressed records through an approved future process; no confidential addresses or data are included here.

## Packaging boundary

This initial repository contains source, offline synthetic tests and fresh documentation. It deliberately excludes deployment credentials, endpoint inventories, local paths, source-layer extracts, internal project notes, source documents, case files and proprietary ArcGIS runtime files. The existing City seal is included in the private web source snapshot, with no redistribution license asserted. Local configuration is ignored. No permission changes or production publishing are performed by this code.

No claim is made that this packaging change alone is a full live Pro regression test. An organization-supplied template and local configuration are required for live verification.
