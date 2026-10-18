# Kilometres, not miles

**Problem** The scooter sheet quotes the price in CAD but the range in miles ("13 mi range"). During the ride, the sheet shows the range in km ("24.5 km") and Slow mode in mph ("up to 7 mph") on the same screen. Canada uses the metric system, so riders have to convert.

**Change** The range shows in kilometres, converted from the same figure ("21 km range"), and Slow mode reads "up to 11 km/h". Nothing else on either sheet changes.

**Caption**

> The price on this sheet is in Canadian dollars, but the range is in miles. Canada measures in kilometres, so 13 mi becomes 21 km. Slow mode on the ride sheet gets the same fix: 7 mph becomes 11 km/h.

Evidence: "13 mi range" is from the pre-ride sheet; "24.5 km" and "7 mph" appear together on the ride sheet screenshot. 11 km/h is a conversion; Lime's own metric figure for Slow mode is not checked. The clip shows the pre-ride sheet only; the ride sheet change is in Try it live with `?state=in-trip-expanded`.

Clip for X: `uv run _tools/record.py lime/01-fix-range-in-km` writes `media/clip.mp4` (local, not committed).

Preview: [../index.html#01-fix-range-in-km](../index.html#01-fix-range-in-km)
Live: [../mock/index.html?redline=01-fix-range-in-km](../mock/index.html?redline=01-fix-range-in-km)
