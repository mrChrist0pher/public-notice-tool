# Web map configuration changed outside the widget

The underlying web map was edited separately in Map Viewer using Add from URL. The widget source does not recreate those edits. Supply approved service URLs locally; there is no endpoint inventory here. Existing case/owner layer IDs were preserved; only display titles were renamed.

| Order | Layer title | Appearance / filtering |
|---|---|---|
| 1 | Subject Area | Case polygons; fill #B2B2B2, outline #343434 2 pt; runtime filters chosen case |
| 2 | Zoning District | Transparent fill, outline #9C9C9C 5 pt; label ZONING, Noto Sans Bold |
| 3 | Street | Centerlines, #CCCCCC 2 pt; STREETCLASS <> 'Alley' |
| 4 | Parcels | County owner polygons, white fill, #828282 outline .25 pt |
| 5 | City Limits | #E1E1E1 fill, no outline; TYPE = 'City' |

Address Points was removed at the user's request. Business Locations was not added. Confidential/suppressed source records are not included or reconstructed. Zoning reference labels are separate from the deferred computed zoning text beneath the PDF legend.

## Street labels

The original mistaken boolean LABEL field produced Yes/No labels. It was replaced with direction/name/type/suffix text. Final accepted thinning uses object IDs ending in 0, 3, 6 or 9:

```arcade
var digit = $feature.OBJECTID % 10;
if (digit != 0 && digit != 3 && digit != 6 && digit != 9) { return ""; }
var parts = [$feature.PREDIR, $feature.STREETNAME, $feature.STREETTYPE, $feature.SUFFIX];
var words = [];
for (var i = 0; i < Count(parts); i++) {
  if (!IsEmpty(parts[i])) { Push(words, Trim(parts[i])); }
}
return Concatenate(words, " ");
```

This controls label candidates only, not road features or mailing selection. It is approximate segment sampling, not one-label-per-street placement: some streets may disappear or repeat, and a service republish that changes IDs can change density. Remove the first two lines to label all eligible segments. Save the web map separately from saving the Experience Builder app.
