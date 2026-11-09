# Implemented mailing cleanup rules

Source of truth: `pro/notice_cleanup.py`. These are the current four-step toolbox rules, not the older experimental address-parser rules in historical notes.

1. Clean whitespace/null values; preserve spelling, punctuation, legal owner identity, care-of lines, units and both delivery lines.
2. Uppercase recognized US state abbreviations. Preserve postal codes as text, including leading zeros and supplied ZIP+4; do not invent missing addresses or countries.
3. Exclude only exact configured City-owner identities. Do not remove unrelated owners, Housing Authority or County by loose name matching.
4. Route the explicit reviewed University/Regents aliases to the configured-in-code approved institutional destination. Foundation/Health or uncertain aliases retain their source information; current Python diagnostics may flag them.
5. Combine identical cleaned destinations after selection. For domestic addresses, treat matching ZIP5 and ZIP+4 variants as the same destination only when every other mailing field matches. Retain one supplied extension; if extensions conflict, use common ZIP5 and retain the original values in the audit.
6. Keep different LLCs, trusts, care-of names, units and other differing mailing fields separate, even if names are similar and addresses match.
7. Preserve ambiguous or incomplete entries; do not drop them simply because a diagnostic is present. Do not generalize older name-continuation or address-line repairs into this helper.

Mailing fields: NAME, NAME2, ADDRESS, ADDRESS2, CITY, STATE, ZIP, COUNTRY. Account/parcel/source identifiers belong in raw records and audit outputs.

## Pro and web output differences

The Python toolbox still produces separate review/audit/summary files and keeps diagnostic flags internally. The web UI was subsequently changed at the user's request to produce a cleaned ML CSV plus a raw selection CSV, with no review-file download or flag counts. That interface change has not been backported to the Python toolbox. This repository preserves the existing Python behavior rather than silently changing it during packaging.

Vendor-specific formatting and exceptional recipients still need business input. Formatting and deduplication do not verify postal delivery or recipient eligibility.
