# Lime Mock

Tracer for the iOS pipeline: a full-screen map with mock vehicles inside the shared iPhone frame. Calibrated by eye against reference screenshots of the real app (`_tools/calibrate.py lime home|selected|sheet-expanded`); not 1:1, see tickets 05 and 06 for the remaining deviations. All data is fictional and the camera is the West End street grid by English Bay (Davie, Pacific, Beach Ave, Burrard), north up, about 1.2 km from where the references were taken.

Serve the `redlined` folder (`python3 ~/Development/redlined/_tools/serve.py`) and open http://127.0.0.1:4173/lime/mock/, or double-click `index.html`. The map needs a network connection (OpenFreeMap tiles, OpenStreetMap data).

## States

`?state=home` (default), `?state=selected` (nearest scooter as a balloon pin, camera eased to put it at x200 y385, sheet collapsed) and `?state=sheet-expanded`. Tapping a scooter selects it, the close button returns home. The sheet (`sheet.js`) is transform-only: pointer events (mouse and touch), rubber band past the detents, snap by velocity and position with a spring, `prefers-reduced-motion` jumps instead of animating. Animation durations (500 ms chrome and sheet, 600 ms camera) are estimates, there is no reference video.

## Redline seam

Without query params the mock is plain. `?redline=<folder>&side=before|after` (default `after`) loads `../<folder>/patch.css` and `patch.js` for `after` and calls `redlinePatch.apply({ root, map, data })` once the map has loaded.

## Where to change things

- `../../_ios/device.js`, `device.css`: shared iPhone frame (status bar, safe areas, Home indicator). `?cutout=none` hides the notch, for calibration only (the references never show it).
- `../../_ios/maplibre/`: vendored MapLibre GL JS 5.24.0 with its license.
- `../_shared/vehicles.js`: `LimeData`: camera, scooters, parking, zones, rider, walk route, authored in screen points. Keep the device size in step with `../_shared/stage.json`.
- `app.js`: map, seam. `style.js`: re-tints OpenFreeMap Bright and cuts its 119 layers to 13 (grey ground, white roads, pale green parks, pale blue water, small grey POIs; no one-way arrows). Symbol layers cost the most while panning, keep them few. `markers.js`: marker images drawn once to canvas and added as symbol layers (no DOM markers); selection is feature state (paint opacity), so a tap triggers no tiling or `setData`, which is what keeps taps and pans smooth at 4x CPU throttle. `sheet.js`: the bottom sheet.
- `styles.css`, `index.html`: Start ride button, account/menu capsule, locate button.

## Assets and font

- `Poppins-Medium.ttf` + `OFL.txt`: Poppins Medium (SIL OFL), from github.com/google/fonts. It is the app's UI font (matched on the "Start ride" label).
- `assets/*.png` and `assets.js` (the same glyphs as data URIs, because WebGL cannot read file:// images) are exported from the IPA asset catalog (Supreme_SupremeImages_bundle): `vehicles_scooter_24@3x`, `vehicles_bike_24@3x`, `ic_qr_scan_32@3x`, `user_32@3x`, `hamburger_nav_32@3x`, `map_orientation_fill_24@3x`, `ic_rider_map_annotation_man_walker@3x`. The marker discs, rider dot and cone, walk pill and zones are drawn in code.

- Body text uses the system font; Poppins Regular (google/fonts) was wider than the reference. Titles, buttons and promo text use Poppins Medium.
- `assets/scooter_4.1@3x.png`: the scooter photo, cropped from the IPA widget asset `scooter_4.1` with its logo fragment erased. It is low resolution and a 3/4 view (the reference is more upright).
