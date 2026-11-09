# Explaining the mailing cleanup to the team

The tool starts with the owner records selected on the map. It creates a cleaned mailing list from that selection. It does not edit county parcel data or verify postal deliverability.

| Rule | What happens | Why |
|---|---|---|
| Clean text | Remove extra spaces and turn null fields into blank text. Preserve legal names, punctuation, care-of, units and postal zeros. | Standardize formatting without changing identity or destination. |
| State codes | Uppercase recognized abbreviations, such as co to CO. Keep unknown values. | Correct formatting without guessing geography. |
| City owner | Exclude the exact approved City of Boulder owner identity. Keep unrelated owners, County and Housing Authority. | Avoid loose name matching. |
| Confirmed CU aliases | Route the explicit confirmed University/Regents identities to the approved CU Planning destination. Keep Foundation/Health and unconfirmed aliases as supplied. | Apply an existing approved destination only to known identities. |
| No mailing address | If BOTH delivery lines are blank after text cleanup and the CU rule, leave the record out of the cleaned list. Null/space-only values count as blank. | There is no supplied delivery destination to mail to. Do not substitute the parcel's site address. |
| Valid delivery text | Keep PO boxes and records with either delivery line populated. Preserve the supplied care-of and second line. | A blank first line does not necessarily mean the entire mailing address is absent. |
| Other incomplete fields | Missing city, ZIP, unusual state or international text does not cause automatic removal under the new rule. Internal diagnostics preserve those conditions. | This change specifically addresses absent delivery lines, not every form of incomplete address. |
| Combine matches | Combine identical cleaned destinations when all mailing fields match; domestic ZIP5/+4 variants can merge. | Avoid duplicate notices to the same named destination. |
| Keep legal identities separate | Different LLCs, trusts, care-of names or unit numbers remain separate. Similar names plus the same address are insufficient to merge. | Different recipients can share an address. |
| ZIP variants | Keep the single supplied ZIP+4; if extensions conflict, use common ZIP5 and retain originals in the audit. | Avoid choosing an arbitrary extension. |
| Preserve evidence | Source attributes are not edited. The web download saves only the cleaned CSV. Pro separately preserves its raw selection and exclusion audit. | Distinguish cleaned output from the source and from Pro archive files. |
| Spreadsheet handling | Escape formula-like values in CSV. Import postal codes as text in Excel. | Prevent formula execution and preserve leading zeros. |

## The new rule in one sentence

“Records with no mailing address in either address line are excluded from the finished mailing list. The web tool downloads only that cleaned CSV; it does not save a raw selection file.”

This runs when generating a NEW list. Existing downloads are unchanged. The Pro workflow separately retains its raw selected feature class/DBF and audit; the web download has no raw file.
