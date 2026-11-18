# Source snapshot

## Picking toggle and paired downloads November 18 2026

Production version 13 removes Finish adjusting. Pick parcels on map toggles to Stop picking and exposes aria-pressed. Stopping restores navigation and keeps selected parcels. Generate mailing list prepares the PDF before initiating CSV and PDF downloads together. The browser controls the destination folder and multiple-download permission. Stale cases cancel both; a PDF failure retains CSV-only output with an error.

Bundle SHA-256: 861c0089d175faadc27b552723f057ac4bdd72c63c44711cbc64822cf87d7d28

Eight offline tests and production build passed. Live browser verified Pick parcels on map changes to Stop picking (pressed true), then returns to Pick parcels on map (pressed false) with a stopped message. Existing production configuration and font assets copied unchanged; version 12 retained for rollback. No changes to cleanup rules, geodesic radii, PDF layout, authentication, tracking or mail-send behavior.



## Mailing list PDF release

Production version 12 adds CASE_ML.pdf alongside CASE_ML.csv, generated from one cleaned snapshot with the same eight fields and order. Letter landscape (792 by 612 points), embedded Noto Sans fonts, language/title metadata, tagged table/header scopes, repeated visual headings and page numbers. The CSV remains available if PDF creation fails; the UI provides a PDF download fallback. The location-map PDF is unchanged.

Bundle SHA-256: 996e5d58362439a9c04a4bcf74b7ddc4ee5784c7e6275bc44b7e37035c9ead35

Version 11 retained for rollback. Configurations, authentication, 2400 minimum scale and 1200 scale steps preserved. Seven offline tests passed, including exact field/order parity, long-row continuation, blank and unsupported-font cases, stale results and CSV survival after PDF failure. Synthetic PDFs were rendered and inspected. Live LUR1960-00005 test: 26 owner records selected at 300 feet; 20 cleaned destinations; both files generated successfully according to app status. The browser download-event helper stalled; automatic saving of the PDF to Windows Downloads was not established by that helper. CSV reached Downloads; the PDF manual link is present when generated.

PAC and manual screen-reader acceptance remain open. Tags are not a conformance certification. The Noto Sans font has limited script coverage; unsupported characters produce an error rather than silent replacement. No notification tracking writer or automatic email attachment/send is included.



## Prepare vendor email release November 17 2026

Deployed bundle SHA-256: 88c73dc48c4ea628c2ae8cb560ce298b296d056a8f554dd214e66295af6e756b

Version 11 adds a mailto draft button after generating a non-empty cleaned list. No automatic mail send or attachments. No vendor recipient is supplied until confirmed; optional deployment setting mailingVendorEmail leaves To blank if absent. All previous application configuration, including 2400 minimum scale and 1200 steps, is preserved. Version 10 retained for rollback. Six offline tests and the production build passed. No authenticated Outlook draft or send is asserted by these checks.

Repository source hashes with LF line endings:
- widget.tsx: 93f7e43ad18ba188104d9d4a2202ae17c916e21614ef37770480c72165277591
- vendor-email.ts: 5e17c4dc0d185da906256e191be96680e292779f1b220aa920539b35d96a499e



## Custom radius release November 17 2026

Production now selects version 10. Custom accepts positive numeric feet and buffers the full case geometry geodesically. Invalid distances are rejected; changing the input invalidates the previous selection run. Standard radii, Adjacent and manual Add/Remove remain available. CSV and PDF output formats are unchanged.

Repository widget source SHA-256 (LF line endings): 961903317d6e83f05e441b117bff44e9aeae0a290591e5db79ac64064e17cd5e

Deployed and installed production bundle SHA-256: 096e15ec7a14308d88ccc006ca316fde01eb9f63c69541f1dda4acb640845120

Production configuration was copied unchanged from version 9, including explicit minimum scale 2400 and step 1200. Version 9 is retained for rollback. All five offline tests passed, including the real selection-handler custom-radius tests; production build passed. Browser verified Custom exposes an editable numeric field and accepts 450. Real-case browser selection was not tested because the session requires Portal sign-in. Fonts downloaded for the separate accessibility prototype are not part of this release.



## Live verification November 17 2026

The deployed index selects `cdn/9/`. The live custom-widget bundle and the installed Developer Edition production bundle match byte for byte:

`652ec267103a158fd6af575e571851de6df4110450414297cdc27cf1248fe7fd`

The repository's `widget.tsx`, `pdf-layout.ts` and `cleanup.ts` also match installed source byte for byte, with the same hashes listed in the November 12 reconciliation below. No application code or deployment was changed. This is a file comparison, not a new browser regression test or a clean rebuild proving source-to-bundle reproducibility.

Deployment-specific configuration remains separate from reusable repository defaults. This verification does not claim that Portal web-map content, authentication settings or all configuration files are identical to the repository templates. The recorded frame-dimension discrepancy remains open. Recent process-map and project-note changes are separate from this application-source verification.

## Current reconciliation November 12 2026

Deployed app version: 9. The deployed widget.js hash matches the installed dist-prod widget.js. The following local source-package files match their installed Developer Edition copies byte for byte:

| File | Verified SHA-256 |
|---|---|
| src/runtime/widget.tsx | 70231a1ab2dd9a4f3458ac011c3bc826c5f164c50477046bb7c6b303e04f7f5d |
| src/runtime/pdf-layout.ts | e79c2c0556d9514aa8b56ab33719c86a24c5bb10754b7036a5fdfacda7aff833 |
| src/runtime/cleanup.ts | ac5ace841ae1e89dfaab11753510f2f9fe4bd578bcc410277fbb9410c7eac0ad |

This verifies source copies and the deployed/built bundle; it does not reconstruct a historical Git commit for the deployment. No runtime changes were made by the November 12 documentation sync. Configuration remains intentionally deployment-specific, including a recorded frame-dimension discrepancy; see current-behavior.md and the backlog.

## Historical baseline November 8 2026

Captured November 8, 2026 from the installed Developer Edition 1.17 widget. The installed app was not edited by this repository packaging. Hashes identify the exact baseline; this is not a commit history of earlier edits.

| File | Installed SHA-256 | Repository SHA-256 |
|---|---|---|
| `src/runtime/widget.tsx` | `c88aeb71e11174330ee6d11214b5bb2953d807d6d517d501454ee69dfaac3f7f` | `2a4269a1a99ab60aea6199df9e78e62051432fbb20f6dbbd7e36be9ea39f6a36` |
| `src/runtime/cleanup.ts` | `c490da6ff22e7dc0e03043adaf88e8c8fa462dfbf184f6d171356c8137476c8c` | `c490da6ff22e7dc0e03043adaf88e8c8fa462dfbf184f6d171356c8137476c8c` |
| `src/runtime/pdf-layout.ts` | `71b0011a68bcd0cab1484b3cea85c968706b8014b85118d65538a5201e0aa753` | `71b0011a68bcd0cab1484b3cea85c968706b8014b85118d65538a5201e0aa753` |
| `src/runtime/assets/city-logo.png` | `69e034f789b5dd37a3c1a9fb87282356d71414dbbf583e8dbde5e8ea1f3dea41` | `69e034f789b5dd37a3c1a9fb87282356d71414dbbf583e8dbde5e8ea1f3dea41` |
| `config.json` | `094baebeefd10109d6b459f9548d75cbd65f2a9406af6343bfa61b1c85bf6464` | `81ef98a14990488626edb5470bafd5db3ba06a7bbd0c5a0090bd4eda585ba54a` |
| `manifest.json` | `6f7e39ad193516c5bf39e3538933a609654dffac8b4c16b41ee722e94585eba2` | `6f7e39ad193516c5bf39e3538933a609654dffac8b4c16b41ee722e94585eba2` |

Intentional packaging differences: widget service-host repair is configurable; config has placeholder layer IDs, no obsolete print-service URL, and frame dimensions matching the PDF. See MODIFICATIONS.md. Cleanup, PDF layout, logo and manifest are byte-for-byte snapshots. The test resolves TypeScript from EXB_CLIENT instead of a personal path. An original envelope icon replaces the stock sample icon.

## Later changes

The historical table describes the November 8 baseline, not current files. November 9 added the blank-address rule and individual comments, CSV-only download and hosted logo fix. November 10 changed the footer and fixed repeat PDF exports while retaining original Search. The current hashes above identify the reconciled source; see MODIFICATIONS.md for changes. No mailing-list PDF is implemented.
