# Public Notice Tool

ArcGIS Pro Python toolbox for preparing a case vicinity map, selecting owner recipients, and generating a mailing list. The larger project also has a separate Experience Builder web prototype; this initial repository contains the Python implementation and process documentation.

## Start here

- [Requirements and setup](docs/requirements.md)
- [Manual process](docs/manual-process.md)
- [Process maps](docs/process-maps.md) — left-to-right diagrams with **P&DS GIS** steps outlined
- [Toolbox workflow and outputs](docs/toolbox-workflow.md)
- [Cleanup rules](docs/cleanup-rules.md)
- [Architecture and status](docs/architecture.md)

Keep all files in `pro/` together. Add `pro/PublicNoticeMap.pyt` to ArcGIS Pro Catalog. It offers:

1. **Prepare Notice Map** — find the case, frame its polygons, update case text and QR.
2. **Export Notice Map** — after map/QR confirmation, save the VM PDF and case APRX.
3. **Select Recipients** — 300 feet, 600 feet, Adjacent starting selection, or Custom.
4. **Export Mailing List** — use the final adjusted selection; save raw records and cleaned Excel/CSV.

The tools operate on layers already present in the open Pro project. No REST endpoint inventory, database connection files, credentials, production project files, or recipient data are included. A working template and authorized source access must be supplied locally.

## Local configuration

Copy `pro/notice_config.example.json` to `pro/notice_config.local.json` and set the archive folder and public Property Information URL prefix. The local file is ignored by Git. An example URL is deliberately nonfunctional. Create the archive root before running the export.

This repository copy externalizes deployment settings; the installed working tools were not changed. Current Python output/report behavior is documented separately from the newer web interface.

## Validation

From `pro/`, using a Python environment with development requirements:

```console
python -m unittest test_notice_map_toolbox test_notice_four_step
python test_notice_excel_export.py
```

These are offline tests with ArcPy stubs. They verify logic and output handling, not live GIS access, print appearance, notice compliance, or successful delivery. Test the full workflow in Pro with an approved local template before adopting this repository copy.

No open-source license has been assigned in this initial private repository.
