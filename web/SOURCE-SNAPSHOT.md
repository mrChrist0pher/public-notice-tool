# Source snapshot

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
