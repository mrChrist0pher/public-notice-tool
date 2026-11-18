# Public Notice Web App current behavior

Updated November 17, 2026 for deployed version 12, the installed production bundle, and the three installed runtime source modules. Deployment on the internal City server is established; organizational acceptance and complete legal/recipient-rule validation are separate work.

## Workflow

1. Use the original stock Search widget to find a case, including partial-number searches. Results are polygon records and may repeat a case number. Grouping is not implemented. Search submission or explicit Clear resets old notice work; typing and focus alone do not.
2. Confirm the gray Subject Area. The workflow queries all case polygons sharing the chosen case number, unions their geometry, and uses that geometry for selection and framing.
3. Generate CASE_VM.pdf. The browser creates a Letter portrait PDF with a north-up map, City logo, subject/parcels legend, feet scale bar, case number/date, and case-specific QR. The QR is clickable. Test the QR and confirm the destination case before using the PDF.
4. Choose 300 feet, 600 feet, Adjacent, or Custom. Radius buffers use geodesic ground distance. Radius selections include subject owners; Adjacent is a 2-foot seed excluding parcels whose centroids are contained in the subject geometry. The user can add across-street parcels. Custom accepts a positive numeric radius in feet, including decimals. Run replaces the previous selection using a geodesic buffer of the full case geometry. Changing the custom value requires a new run. Manual add/remove remains available for all modes.
5. Adjust parcels or remove table selections, finish adjusting, then generate CASE_ML.csv and CASE_ML.pdf as separate downloads. Both use the same cleaned snapshot and eight mailing fields in the same order. No ZIP or raw/audit/review downloads. A PDF link remains available if the browser blocks the second automatic download. PDF failure leaves the CSV available and shows an error; it does not claim both files succeeded.
6. After generating a non-empty cleaned list, Prepare vendor email requests a draft through the default email app using a mailto link. It preloads case, cleaned destination count and selection method. Attachments, mailing date, billing details, review and Send remain manual. No automatic attachment, Microsoft Graph integration or background tracking is implemented. An optional local mailingVendorEmail setting supplies a single vendor address; otherwise To is blank.
7. Mailed quantities, PDF package assembly, EnerGov attachment and close-out remain manual.

## PDF implementation and limits

The custom widget creates a private map view, captures a map image at 300 dpi, then uses pdf-lib and qrcode. No Python or geoprocessing/print service is called by this PDF workflow.

The subject is initially framed at approximately 20 percent of the map width; scale has a default minimum denominator of 2400 and rounds upward in steps of 1200. This does not fit the full 600-foot notification area. Very tall subjects can trigger a layout error.

Deployment configuration currently specifies frameWidth 7.5 and frameHeight 8; pdf-layout.ts draws an 8 by 8.5 inch image frame on the Letter page. Repository default configuration uses 8 by 8.5. This discrepancy is recorded in the backlog for physical-scale/layout review; documentation reconciliation does not change runtime configuration.

Footer: Generated with City of Boulder Public Notice Web App, P&DS GIS. Source attribution remains separate. No personal contact footer is added.

Each export reconstructs a private basemap from JSON, clones operational layers, and destroys its temporary view/container afterward. Version 9 fixes the repeated-export destroyed-vector-tile-layer failure. Rendering waits are bounded at 90 seconds; failures show an error/retry message. November 10 browser validation exported LUR2026-00081 then LUR2026-00082 without refresh. November 12 verification compared stored files, not a fresh full live regression.

## Cleanup and scope

See [cleanup rules](cleanup-rules.md) and the individually commented web cleanup module. Missing both delivery lines after normalization/confirmed CU routing excludes a destination; second-line-only addresses and PO boxes remain. Distinct legal entities remain separate. Web downloads do not expose diagnostic flags.

V1 is owners only. FBC mailings are unsupported; use the existing FBC process. Residents/businesses, saved parcel snapshots, usage/Finance logging, postcard generation, mailing-list PDF, automatic case-type radius, and zoning extraction are not implemented.

## Authority and documentation

PDF accessibility is not certified. The current generator draws a map image and text but does not construct PDF accessibility tags, logical reading order, language or a map text alternative. A clickable QR does not establish conformance. PAC and manual assistive-technology review/remediation are open backlog items. See Boulder's published guidance at https://bouldercolorado.gov/digital-accessibility-vendors .

- Repository: code, behavior, cleanup rules, setup, tests and [backlog](backlog.md).
- GIS Work: project purpose, stakeholders, business decisions and open questions; link to the repository for technical behavior.
- Historical snapshots remain historical. They do not override this verified behavior record.
- App settings, internal service inventory, credentials and real mailing data stay outside this source package.

## Mailing list PDF version 12

PDFKit 0.17.2 standalone creates a Letter landscape table with an embedded Noto Sans font, case number, Denver generation date/time, selection method, count, repeated headings and page numbers. Logical structure is Document, H1, P, Table, TR, TH and TD. Column headers have Scope Column; repeated visual headers, borders and footers are artifacts. All eight original cleaned field values are retained as cell ActualText, including blanks and leading-zero postal codes. Long cells wrap and can continue across pages. Names unsupported by this font cause an explicit PDF error; the CSV still preserves their values.

Structural tests and visual pagination checks passed. PAC and manual screen-reader review remain open; this release is not certified PDF/UA. The location map PDF is unchanged and still has its separate accessibility gaps. No assembled notice package, background tracking, automatic email attachment or mail sending is added.
