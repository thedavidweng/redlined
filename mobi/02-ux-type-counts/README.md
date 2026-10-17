# Bike types with counts

**Problem** The station sheet shows one total ("17 bikes available") and an Electric / Mechanical switch with no numbers, so a rider has to open each tab to learn how many e-bikes there are. The map filter calls the other type "Classic"; the sheet calls it "Mechanical".

**Change** The tabs carry their counts ("Electric · 5", "Classic · 12"), and the sheet uses the map's word, "Classic". The bike list underneath is unchanged.

**Caption**

> The station sheet gives one bike total and an Electric / Mechanical switch with no numbers, and the map calls the same type "Classic". Now each tab shows its count (Electric · 5, Classic · 12), and the bike type has one name.

Evidence: the Mobi iOS app (3.22.8) shows "Bikes available" and an "Electric" / "Mechanical" switch without counts on a station sheet, and "Electric" / "Classic" filter chips on the map. One station, captured once; whether the app shows counts on other screens is not checked.

Clip for X: `uv run _tools/record.py mobi/02-ux-type-counts` writes `media/clip.mp4` (local, not committed).

Preview: [../index.html#02-ux-type-counts](../index.html#02-ux-type-counts)
Live: [../mock/index.html?redline=02-ux-type-counts](../mock/index.html?redline=02-ux-type-counts)
