# Modo Mock

A full-screen map with fictional cars inside the shared iPhone frame. Calibrated by eye against reference screenshots of the real app (`_tools/calibrate.py modo home|selected|vehicle|filter|time`); not 1:1. All data is fictional (stations, plates, member number and name, parking text) and the camera is in Fairview, Vancouver, north up, more than 1 km from where the references were taken.

Serve the `redlined` folder (`python3 _tools/serve.py`) and open http://127.0.0.1:4173/modo/mock/, or double-click `index.html`. The map needs a network connection (OpenFreeMap tiles, OpenStreetMap data).

## States

`?state=home` (default), `?state=selected` (tap a pin: camera recentres on it, selected marker, sheet "1 option" with a scrolling car card) and `?state=vehicle` (tap the card: Vehicle Information pushes from the right; the back chevron pops) and `?state=filter` (tap the Filter pill: the Filters sheet slides over the whole screen with a 50% backdrop; chips and checkboxes toggle, Clear All resets, APPLY only closes it and does not filter pins; the grabber, header (at the top of the scroll), backdrop and APPLY dismiss it). SET RETURN / OPEN RETURN are tappable (OPEN RETURN fades out the arrow and End Time, and the vehicle page shows Return Type "Open Return" without its Return by row). Start Time and End Time open the time sheet, `?state=time` (OPEN RETURN selected, as in the reference): a white sheet like Filters (50% backdrop, grabber, backdrop or CLOSE dismiss) with title, an Open Returns subtitle (open return only) and an inline wheel (date -30..+60 days, hour, minute in 15-min steps, AM/PM; hours and minutes loop, tap a row to centre it); SAVE writes "Oct 12, 4:00 PM" into the header and the vehicle page (an end at or before the start becomes start + 1 h), the ✕ clears both. Filter chips and checkboxes animate. Tapping empty map or dragging the sheet down returns home. Tapping a cluster zooms in. Filter, locate, the ? help and tab bar are static; BOOK VEHICLE stays disabled ("Please set a time"). The sheet has a single detent (`../../_ios/sheet.js` with snaps open/hidden). Durations are estimates, there is no reference video. `prefers-reduced-motion` removes the push animation and jumps the sheet.

## Where to change things

- `../_shared/data.js`: `ModoData`: camera, pins, clusters, car, member.
- `style.js`: re-tints OpenFreeMap Bright to the reference's grey Mapbox-light look (12 layers). Modo has its own style helper; there is no shared keep-list helper in `_ios/`. `markers.js`: marker images as symbol layers, selection by feature state. `app.js`: map, sheet, push/pop.
- `../../_tools/calibrate.py` reads the map handle as `<Product>Map` (`ModoMap`).

## Assets and fonts

- `Poppins-Regular.woff2`, `Poppins-Medium.woff2` (titles) and `Roboto.woff2` (body), SIL OFL, from github.com/google/fonts, with `OFL-Poppins.txt` and `OFL-Roboto.txt`. The app's own fonts are not committed.
- `assets/*.png` and `assets.js` (the same as data URIs, since WebGL cannot read file:// images) are exported from the IPA asset catalog: `availableMarker@3x`, `selectedMarker@3x`, `availableCluster@3x`, and `car@3x` (the car half of `car_bike@3x`; it is a generic hatchback, not a Corolla photo, and is mirrored).
- Drawn in code: availability dots (inline SVG; Chrome blocks CSS masks from file://), icons, user dot.

## Differences and gaps

- The Mapbox wordmark and the attribution (i) button are omitted; credit is OpenFreeMap/OSM via `IosDevice.credit`.
- The selected pin is visible in the map strip; in the reference it sits under the sheet.
- All availability dots are unavailable (no reference for the available look). Pins are 15 solo plus 2 clusters; their layout beyond the references is invented.
- Vehicle page: only the top (to Change Time) is seen in the reference; Home Location, Vehicle Details and Contact Modo are estimated from the accessibility tree.
- Filters: the selected chip and checked box styles are invented (navy fill, white label or tick; nothing was toggled in the reference). The sheet's open and close motion is an estimate, and the filter map behind the backdrop is the fictional camera.
- Time sheet: measured from the reference (`time`); End Time opens the same sheet (same title), as on the device. Estimates: no subtitle in SET RETURN (none was captured), open/close and wheel motion, the wheel's fade and 3D curve. The date range starts 30 days back as seen; the end of the range (+60 days) and past times being selectable are assumptions. The wheel uses the system SF font (native scroll-snap lists, not the real UIDatePicker).
- OPEN RETURN hiding End Time is from the reference; hiding the Return by row on the vehicle page and the "Open Return" value are assumptions.
- Status bar time, battery and notch come from the shared frame and differ by design. Small text offsets (tab bar, a few POI labels, header baseline) remain.
