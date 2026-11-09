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

## Web prototype

A separate custom Experience Builder widget handles the web workflow in JavaScript. It does not execute these Python tools. It has case search, owner-only geodesic selection, manual adjustments, local cleanup/CSV generation and browser-generated PDF with QR. Current interface includes a dark left panel. Street labels include type/direction and are thinned to segment IDs ending in 0,3,6,9. Deployment-specific web source/config is not bundled in this Python-only initial repository.

## What remains manual or pending

- Vendor email and follow-up, PN package assembly, EnerGov upload and workflow close-out.
- Decide whether official selection records belong in a central feature service; current web raw CSV has attributes but no geometry.
- Confirm vendor format and remaining cleanup policy questions with the business team.
- Owner / resident / business options are V2; current web selection is owners only.
- Zoning overlay text under the PDF legend is deferred pending discussion. Zoning is a reference map layer, not an implemented PDF attribute calculation.
- Handle withheld/suppressed records through an approved future process; no confidential addresses or data are included here.

## Packaging boundary

This initial repository contains source, offline synthetic tests and fresh documentation. It deliberately excludes deployment credentials, endpoint inventories, local paths, source-layer extracts, internal project notes, source documents, case files, artwork and proprietary ArcGIS runtime files. Local configuration is ignored. No permission changes or production publishing are performed by this code.

No claim is made that this packaging change alone is a full live Pro regression test. An organization-supplied template and local configuration are required for live verification.
