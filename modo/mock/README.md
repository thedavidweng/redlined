# Modo Mock

A full-screen map with fictional cars inside the shared iPhone frame. Calibrated by eye against reference screenshots of the real app (`_tools/calibrate.py modo home|selected|vehicle|filter`); not 1:1. All data is fictional (stations, plates, member number and name, parking text) and the camera is in Fairview, Vancouver, north up, more than 1 km from where the references were taken.

Serve the `redlined` folder (`python3 _tools/serve.py`) and open http://127.0.0.1:4173/modo/mock/, or double-click `index.html`. The map needs a network connection (OpenFreeMap tiles, OpenStreetMap data).

## States

`?state=home` (default), `?state=selected` (tap a pin: camera recentres on it, selected marker, sheet "1 option" with a scrolling car card) and `?state=vehicle` (tap the card: Vehicle Information pushes from the right; the back chevron pops) and `?state=filter` (tap the Filter pill: the Filters sheet slides over the whole screen with a 50% backdrop; chips and checkboxes toggle, Clear All resets, APPLY only closes it and does not filter pins; the grabber, header (at the top of the scroll), backdrop and APPLY dismiss it). Tapping empty map or dragging the sheet down returns home. Tapping a cluster zooms in. Header, Filter, locate and tab bar are static; BOOK VEHICLE stays disabled ("Please set a time"). The sheet has a single detent (`../../_ios/sheet.js` with snaps open/hidden). Durations are estimates, there is no reference video. `prefers-reduced-motion` removes the push animation and jumps the sheet.

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
- Status bar time, battery and notch come from the shared frame and differ by design. Small text offsets (tab bar, a few POI labels, header baseline) remain.
