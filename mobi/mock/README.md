# Mobi Mock

A full-screen map with fictional bike stations inside the shared iPhone frame, and the station sheet. Calibrated by eye against reference screenshots of the real app (`_tools/calibrate.py mobi home|selected|sheet-expanded`); not 1:1. All data is fictional: station names, bike and dock counts, distances, bike numbers and the 7-digit User Code. The camera is Yaletown by Pacific Boulevard (Vancouver), north up, about 1.1 km from where the references were taken.

Serve the `redlined` folder (`python3 _tools/serve.py`) and open http://127.0.0.1:4173/mobi/mock/, or double-click `index.html`. The map needs a network connection (OpenFreeMap tiles, OpenStreetMap data).

## States and flow

`?state=home` (default), `?state=selected` (Half screen detent over the red home sheet, walking route, camera framing rider and station), `?state=sheet-expanded` (Expanded detent), and `?state=station-unavailable` (Half screen for fictional Station Hamilton & Davie, unavailable marker and status row). Tap any station: the camera eases to frame rider and station, the red walking route appears and the sheet opens at Expanded; the unavailable Hamilton & Davie station keeps its route and shows only its title, DOCK label, distance/time card, and pale peach `Station unavailable` row. Tap the grabber or drag down: Half screen (inset 8 pt, over the red home sheet). Drag down further or tap the close button: home. Drag up from Half: Expanded. The Electric/Mechanical segment switches the bike list for available stations. The sheet is `../../_ios/sheet.js` with three detents (expanded, half, hidden); its `onMove` drives one CSS variable (`--p`, 0 Expanded to 1 Half) that insets and trims the sheet and slides its content, and moves the User Code card. Only transforms, custom properties and clip-path change: the map never repaints for it. `prefers-reduced-motion` jumps instead of animating. Animation durations (500 ms sheet, 600 ms camera) are estimates; there is no reference video.

Unavailable map taps open Half screen in this mock; the supplied screenshot proves that resting state, not the native opening transition. Full operational stations retain their normal red count marker and full occupancy ring: zero free docks does not imply station unavailability.

## Redline seam

Without query params the mock is plain. `?redline=<folder>&side=before|after` (default `after`) loads `../<folder>/patch.css` and `patch.js` for `after` and calls `redlinePatch.apply({ root, map, data })` once the map has loaded. There are no redlines yet.

## Where to change things

- `../_shared/stations.js`: `MobiData`: camera, 20 stations (names, counts, bike numbers), zones, User Code, `frame(n)` (the selected camera). `../_shared/routes.js`: `MobiRoutes`, the rider and a walking route to each station along real streets (shortest paths over OpenFreeMap road data, computed offline, committed as data).
- `app.js`: map, sheet, state seam. `style.js`: re-tints OpenFreeMap Bright to the light Mapbox look and cuts its 119 layers to 12. `markers.js`: images drawn once to canvas and added as layers; the station pins are `IosMapImages.draw` images on one symbol layer (`icon-image` from the station number), not DOM; the out-of-service zone is a `fill-pattern` (red diagonal hatching) with a red outline; the route is a line layer whose opacity is feature state, so a tap triggers no tiling or `setData`.
- `styles.css`, `index.html`: map buttons, filter chips, User Code card, home sheet, station sheet.

## Assets and font

- `Urbanist.ttf` + `OFL.txt`: Urbanist variable font (SIL OFL), from github.com/google/fonts (`ofl/urbanist`). It is listed in the app's UIAppFonts and matches the screenshots. Sizes were set by eye from text widths.
- `assets/*.png` and `assets.js` (the same glyphs as data URIs, because WebGL and CSS masks cannot read file:// images) are exported from the IPA asset catalog (`Assets` and `DesignSystemLibrary_DesignSystemLibrary_bundle_Assets`, @3x): `icon_available_bikes_in_station`, `icon_available_electric_bikes_in_station`, `icon_remaining_places_in_station`, `icon_diapason`, `icon_distance_station`, `icon_estimate_time_station`, `icon_estimate`, `icon_search`, `icon-24x24-cross-circle`, `fav_icon_home_dark`, `fav_icon_work_dark`, `fav_icon_default_dark`, `iconHamburger`, `iconChatQuestion`, `iconBtnRecenter`, `iconbtn_reorient`. Dock, route, search and the chip bikes are template glyphs recoloured with CSS masks. The station pin, rider dot and zone hatching are drawn in code (the catalog has no pin; `zoneForbidden` is a pin icon, not the hatch).
- No fonts or other IPA files are committed.
- `../_shared/icon.png`: the app icon (256 px), from the IPA asset catalog (`AppIconMobi`, 1024 px). The series home shows it on the product card.

## Known differences and gaps

- Map: Bright re-tinted, not Mapbox; label font Noto Sans, not the app's; road widths and casings are close, not equal; the rider dot has no heading wedge; the hatch is a plain red diagonal pattern (the reference looks red and lavender, probably a moire).
- No evidence for: a normal (in-service) bike item in the list (the reference shows one greyed item; the mock draws all items grey in that style), the Mechanical tab, a station with free docks, a selected pin variant, the sheet while dragging, the keyboard on the search field, scrolling a long list, any animation, or the treatment of all-gray available-bike rows. The unavailable station evidence is limited to the supplied screenshot: a gray dark disk with white no-entry bar and rim, retained route, and Half sheet with title/close, DOCK distance/time card and pale peach status row; counts, tabs and list are intentionally omitted.
