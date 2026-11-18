# Public Notice Tool backlog

Last reconciled November 12, 2026. This is the planning backlog; proposed work below is not deployed unless explicitly marked complete.

## Accessibility review and remediation

Status: Open release concern, not implemented or certified. Added November 12, 2026.

Source-code review finds that current location PDFs have text/title metadata and a clickable QR annotation, but the generator does not build a tagged structure tree, semantic reading order, document language, or a map text alternative. Visual polish and selectable text do not establish accessibility conformance. No PAC or screen-reader audit has been completed.

- [ ] Confirm the City's applicable review/acceptance process with its accessibility lead. Boulder's published vendor guidance calls for WCAG A/AA and PDF/UA and identifies PAC as its preferred PDF checker: https://bouldercolorado.gov/digital-accessibility-vendors . This guidance is a reference, not a certification of this app.
- [ ] Check representative generated PDFs with PAC and manual assistive-technology review; save the findings.
- [ ] Choose a maintainable tagged-PDF generation or remediation approach; set language, logical headings/reading order, link semantics and correct treatment of decorative elements.
- [ ] Provide a meaningful text equivalent for the map's subject location and relevant spatial information; do not assume a QR or generic map caption is sufficient or invoke a blanket map exemption.
- [ ] Make the planned mailing-list PDF accessible from the start, including table headers, cell relationships and reading order across pages.
- [ ] Review keyboard/screen-reader operation of the web workflow separately. PDF checks do not certify the app, and a CSV is not automatically an equivalent version of the map PDF.
- [ ] Check accessibility of the combined PN2/PN3 package after assembly, not just its individual inputs.
- [ ] Document the approved remediation/accommodation route and acceptance evidence before calling the exports compliant.

## PDF mailing list alongside the CSV

Status: Requested for backlog only, not implemented. Added November 12, 2026. Do not change the export handler until implementation is separately authorized.

Need: Produce a printable record of exactly the cleaned mailing destinations exported by the web app, supporting the existing ML PDF and PN3 records workflow.

- Download CASE_ML.pdf and CASE_ML.csv as separate files to Downloads. No ZIP.
- Use the same cleaned snapshot, rows, ordering, and all eight CSV fields: NAME, NAME2, ADDRESS, ADDRESS2, CITY, STATE, ZIP, COUNTRY.
- Use readable pagination, repeated column headings, case number, generation date, cleaned address count, and page numbers. Preserve postal codes as text; wrap long names and international addresses without clipping.
- Include tagged table structure and accessibility validation as part of design and acceptance; see the accessibility item above.
- Do not restore raw-selection or review-flag downloads. No Excel export is implied.
- Handle an all-excluded selection explicitly and consistently with the CSV; confirm preferred PDF wording for zero destinations.
- Test PDF/CSV row parity and browser behavior for two separate downloads. An export does not prove mail was sent.
- Existing process: PN2 combines the notice letter and vicinity map; PN3 adds the ML PDF for EnerGov. Automated assembly and vendor/EnerGov delivery remain out of scope.

## Other product follow-up

- [ ] FBC support: define requirements before implementation. Current guide says FBC mailings are not supported.
- [ ] Recipient categories: find authoritative resident and business data, confirm notice rules, then add controls and separate processing modules. V1 remains owners only.
- [ ] Notification-area map: decide whether recipients should see their properties; current location PDF fits the subject, not the full buffer.
- [ ] Confirm whether case prefix, review type, or subtype determines distance. No automatic radius rule is approved or implemented.
- [x] November 17: version 10 adds a positive numeric Custom radius in feet, including decimals. Manual add/remove remains available.
- [ ] Grouped search: deferred. The original stock Search is retained at the user's request; duplicate polygon results remain possible. Do not reintroduce the rejected custom-search prototype.
- [ ] Compare generated outputs against approved historical cases and resolve selection discrepancies, rather than accepting count matches alone.
- [ ] Postcard generation/form: discuss EnerGov fields, manual inputs, template/color rules and business ownership with Lisa. Find a County postcard example. No automated postcard workflow is implemented.
- [ ] Suppressed-parcel notifications require an approved future process; do not add confidential data to this repository.
- [ ] Zoning text beneath the PDF legend remains deferred pending business feedback.
- [ ] Preserve existing printed QR links when Property Information migrates. Make the destination configurable in a future change; existing distributed links need continuity independently of new configuration.
- [ ] Establish a Git-based release workflow and supported deployment/rollback procedure. Current local package is not itself a Git checkout.
- [ ] Review PDF frame dimensions: deployed widget configuration uses 7.5 by 8 inches while the PDF draws an 8 by 8.5 inch image frame. Verify physical scale and alignment before changing either; source defaults differ. No scale adjustment is included in this documentation sync.
- [ ] Retire Pro only after web acceptance and representative comparisons. Pro remains available.

## Completed changes recorded for reference

- November 9: web export changed to one cleaned CSV, with blank-address exclusion and no ZIP/raw/review downloads.
- November 10: footer changed to Generated with City of Boulder Public Notice Web App, P&DS GIS.
- November 10: repeat PDF export fix deployed as version 9; original Search retained. Browser-tested case 00081 followed by 00082 without refreshing.
- November 12: live version 9 and deployed/build hashes rechecked; widget.tsx, pdf-layout.ts and cleanup.ts match installed source. No new behavior deployed during reconciliation.

## Save notification selections and activity records

Status: Proposed, not implemented. Added November 10, 2026.

Maintenance owner: Chris Deuchars, P&DS GIS. Prefer the smallest setup that fits a supported City hosting pattern. This proposal supersedes the earlier separate SQL logging-table preference; hosting and implementation still need confirmation.

### Need

Preserve which parcels were in the final notification selection, including manual additions and removals, and record who generated a location PDF or cleaned mailing list. Support questions about past notices and Finance reconciliation against the existing spreadsheet. Planners must retain Portal Viewer permissions and must not receive feature-creation or editing privileges.

Selected parcel records, cleaned mailing destinations, and actual mailers sent are different quantities. PDF or CSV generation does not prove a download was saved, a vendor received it, or notices were mailed.

### Proposed architecture

1. The existing Experience Builder app handles case search, subject confirmation, PDF generation, parcel selection, and mailing cleanup.
2. A small authenticated writer API, hosted using a City-supported pattern, verifies the planner's Portal identity and accepts narrowly defined recordkeeping requests. Being on gisintra alone is not authentication.
3. One feature service on gisintra contains a polygon layer for selected-parcel snapshots and a related notice-run table. A separate related event table within that same service can record repeated export attempts and outcomes if event history is required.
4. A restricted service identity writes through the API to the feature service. Its credentials remain on the server and are never embedded in the browser, app configuration, or repository. Planners have no direct write access to the service.

The proposed service can be hosted or backed by registered enterprise data; confirm which publication and relationship setup fits the City's environment before implementation. No separate ordinary SQL audit table is required by this design.

### Records

| Record | Proposed contents |
|---|---|
| Notice run | Unique Run ID, case number, verified planner identity, UTC creation time, selection method, distance in feet when applicable, selected-record count, distinct parcel count if needed, cleaned mailing-destination count, app/cleanup version, save status |
| Selected parcel snapshot | GlobalID, Run ID or related-run key, stable parcel/account identifiers, source dataset reference, polygon geometry as retrieved at save time |
| Activity event | Unique Event ID, Run ID, event type, UTC timestamp, outcome, relevant count, error category when applicable |

Use GlobalID/GUID relationship keys where required by the chosen ArcGIS relationship setup. Do not rely on service ObjectIDs as stable parcel identities. Count definitions and parcel deduplication need explicit agreement because multiple owner records may refer to the same parcel.

### Save and export behavior

- Capture the user's final adjusted selection, not just the radius buffer.
- The browser sends case identity, selection metadata, selected stable identifiers, and an idempotency key. The writer retrieves authoritative geometry and validates identifiers, request size, and access before saving.
- Retrieval saves geometry current at save time. If an exact snapshot of the geometry seen earlier is required, define source-version validation or a checked geometry-upload approach.
- Use a new run or selection revision when the selection changes. Associate repeated exports of the same unchanged selection with that run; never silently overwrite a historical selection.
- PDF generation can happen before recipient selection. Allow a run with no parcel snapshot yet, then link its later selection and CSV events to that run. A PDF made for a different subject revision must not be misrepresented as matching a later selection.
- Log successful PDF/CSV generation after generation succeeds. Record failures separately. Use labels such as PDF_GENERATED and CSV_GENERATED, not MAILED or DOWNLOAD_CONFIRMED.
- Store the authenticated planner identity explicitly; editor tracking may otherwise show only the writer's service account.
- Return a clear save confirmation. Keep generated-file success separate from record-save success, so a failed audit write is visible and can be retried.
- Repeated requests must be idempotent. Check feature-service edit results, handle partial failures, and mark a run complete only after its expected parcel snapshot is verified.

### Maintenance and security requirements

- Use supported City API hosting, HTTPS, Portal token validation, authorized membership/group checks, and least-privilege server credentials.
- Restrict writes to the approved service/layers and permitted event types; validate field values and counts. Do not accept an arbitrary destination service URL or a browser-supplied username as proof of identity.
- Define credential renewal, dependency updates, backups, retention, operational error logs, and recovery instructions that Chris can maintain.
- Use existing City monitoring/hosting capabilities where possible rather than introducing another platform.
- No change to public/internal sharing is implied. Keep notification records available only to approved audiences.

### Decisions and next steps

- [ ] Confirm recordkeeping and retention requirements with Planning and Finance; inspect the reconciliation spreadsheet.
- [ ] Confirm whether parcel geometry snapshots are required, or whether stable IDs and counts meet the need.
- [ ] Confirm a supported writer hosting/authentication pattern with Brett; Chris remains the maintenance owner.
- [ ] Choose hosted versus registered-data publication and configure the service's relationships and writer permissions.
- [ ] Define run/revision identity, event history, count definitions, and how early PDF events link to later mailing selections.
- [ ] Decide whether the cleaned CSV itself must be retained. Counts and polygons alone cannot reproduce historical mailed addresses after source data or cleanup rules change.
- [ ] Prototype authenticated saves without granting planners edit privileges.
- [ ] Test manual additions/removals, repeated exports, retries, duplicate requests, partial service failures, and Viewer access.
- [ ] Document deployment, credential renewal, backup, and recovery before rollout.

### Acceptance criteria

A planner with Viewer permissions can generate outputs and receive confirmation that a final selection and its events were recorded. An authorized reviewer can retrieve the run, its parcel geometry and identifiers, verified user, counts, and event history. Repeated requests do not create duplicate runs or events. Failed saves remain visibly incomplete and recoverable. No server write credentials are exposed to the browser.
