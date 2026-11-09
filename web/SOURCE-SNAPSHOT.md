# Source snapshot

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

These hashes describe the November 8 baseline, not the current files after later edits. November 9 adds the blank-address rule and individual comments, changes the web handler to cleaned CSV only, and fixes the hosted logo URL. See MODIFICATIONS.md and the Git history for subsequent changes.
