# Lime Mock

Tracer for the iOS pipeline: a full-screen map with mock vehicles inside the shared iPhone frame. Calibrated by eye against reference screenshots of the real app (`_tools/calibrate.py lime home|selected|sheet-expanded`); not 1:1, see tickets 05 and 06 for the remaining deviations. All data is fictional and the camera is the West End street grid by English Bay (Davie, Pacific, Beach Ave, Burrard), north up, about 1.2 km from where the references were taken.

Serve the `redlined` folder (`python3 ~/Development/redlined/_tools/serve.py`) and open http://127.0.0.1:4173/lime/mock/, or double-click `index.html`. The map needs a network connection (OpenFreeMap tiles, OpenStreetMap data).

## States

`?state=home` (default), `?state=selected`, and `?state=sheet-expanded` cover the parked scooter flow. `?state=in-trip` and `?state=in-trip-expanded` reproduce the collapsed and expanded ride-in-progress detents from `IMG_7688.PNG` and `IMG_7689.PNG` (1170x2532, logical 390x844). The trip fixture uses a deterministic `00:17` timer, 24.5 km range, and fictional existing plate; pause, end ride, helmet, payment, and pricing actions are intentionally outside this mock. The parking banner is retained at both detents. By default there is no promo: the known base rate shows alone, and the exact no-promo layout is unsourced. `?promo=25off` adds the captured promo ("Promo will apply: 25% off, up to $5" strip and the promo line in the sheet).

The sheet (`../../_ios/sheet.js`) supports dragging and grabber taps between detents. Trip details scroll above the fixed action bar. The timer is frozen across detents rather than simulating billing; the expanded screenshot's later `00:23` is not a separate ride state. Slow mode remains `7 mph` exactly as captured, despite the trip range using km. Helmet verification offers a 10% discount, not a completion percentage.

Trip geography and vehicle identity remain fictional. The supplied street-photo thumbnail is omitted rather than reusing private location imagery; map controls are visual-only and exact map styling is not calibrated. Only the visible unlock fee is reproduced: further pricing rows and pause/end/helmet flows have no evidence. The new trip UI is an evidence-based approximation, not a 1:1 calibration.

## Redline seam

Without query params the mock is plain. `?redline=<folder>&side=before|after` (default `after`) loads `../<folder>/patch.css` and `patch.js` for `after` and calls `redlinePatch.apply({ root, map, data })` once the map has loaded.

## Where to change things

- `../../_ios/device.js`, `device.css`: shared iPhone frame (status bar, safe areas, Home indicator). `?cutout=none` hides the notch, for calibration only (the references never show it).
- `../../_ios/maplibre/`: vendored MapLibre GL JS 5.24.0 with its license.
- `../_shared/vehicles.js`: `LimeData`: camera, scooters, parking, zones, rider, authored in screen points; `walk(i)` takes its route and time from `../_shared/walks.js`. The device size is `IosDevices['iphone-16e']` (`../../_ios/devices.js`), also named in `../_shared/stage.json`.
- `app.js`: map, seam. `style.js`: re-tints OpenFreeMap Bright and cuts its 119 layers to 13 (grey ground, white roads, pale green parks, pale blue water, small grey POIs; no one-way arrows). Symbol layers cost the most while panning, keep them few. `markers.js`: marker images drawn once to canvas and added as symbol layers (no DOM markers); selection is feature state (paint opacity), so a tap triggers no tiling or `setData`, which is what keeps taps and pans smooth at 4x CPU throttle. `sheet.js`: the bottom sheet.
- `styles.css`, `index.html`: Start ride button, account/menu capsule, locate button.

## Walking routes

`../_shared/walks.js` (`LimeWalks`) holds one street walking route per scooter from the rider, precomputed with the OSM foot router (routing.openstreetmap.de, speed about 4.5 km/h; minutes are its duration rounded, at least 1) so the page needs no fetch and works from file://. Regenerate after moving the rider or a scooter: dump `LimeData.user.coordinates` and the vehicle coordinates to a JSON (`{"from": [lng, lat], "to": [...]}`), then `uv run python _tools/walk_routes.py <in.json> lime/_shared/walks.js LimeWalks`. Only the selected scooter's route and pill show; with nothing selected, the nearest one's (feature state `away` on that feature, no `setData`).

## Assets and font

- `Poppins-Medium.ttf` + `OFL.txt`: Poppins Medium (SIL OFL), from github.com/google/fonts. It is the app's UI font (matched on the "Start ride" label).
- `assets/*.png` and `assets.js` (the same glyphs as data URIs, because WebGL cannot read file:// images) are exported from the IPA asset catalog (Supreme_SupremeImages_bundle): `vehicles_scooter_24@3x`, `vehicles_bike_24@3x`, `ic_qr_scan_32@3x`, `user_32@3x`, `hamburger_nav_32@3x`, `map_orientation_fill_24@3x`, `ic_rider_map_annotation_man_walker@3x`. The marker discs, rider dot and cone, walk pill and zones are drawn in code.
- `../_shared/icon.png`: the app icon (256 px), from the IPA asset catalog (`AppIcon`, 1024 px). The series home shows it on the product card.

- Body text uses the system font; Poppins Regular (google/fonts) was wider than the reference. Titles, buttons and promo text use Poppins Medium.
- `assets/scooter_4.1@3x.png`: the scooter photo, cropped from the IPA widget asset `scooter_4.1` with its logo fragment erased. It is low resolution and a 3/4 view (the reference is more upright).
