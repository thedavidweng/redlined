# Evo Mock

An interactive replica of the Evo iOS app's map flow inside the shared iPhone frame: `home` (cars, parking, charging, the rider), tap a car for `selected` (compact sheet), tap the chevron for `sheet-expanded` (black full-screen card, fees and rates). Calibrated by eye with `_tools/calibrate.py evo home|selected|sheet-expanded`; not 1:1. All data is fictional: the camera is Kitsilano (more than 1 km from where the references were taken), and plates, addresses and walking distances are invented. The public prices are reused.

Serve the `redlined` folder (`python3 _tools/serve.py`) and open http://127.0.0.1:4173/evo/mock/, or double-click `index.html`. The map needs a network connection (OpenFreeMap tiles, OpenStreetMap data).

## States

`?state=home` (default), `?state=selected` (nearest car, camera at z16, compact sheet) and `?state=sheet-expanded`. Tapping a car selects it, the chevron expands, the top-left chevron collapses back to `selected`, and tapping empty map (or Escape) goes home: there is no evidence of a close control, so this is a choice. The compact sheet uses `../../_ios/sheet.js` for the slide and spring but has one resting place: the real sheet only grows with its chevron (swiping up did not expand it), so a pull rubber-bands back. The expanded card is a separate layer that fades in. BOOK NOW and the directions button do nothing. `prefers-reduced-motion` removes the animations. Durations are estimates, there is no reference video. `?redline=none` is accepted and loads nothing (the seam is the same as Lime's).

## Map

OpenFreeMap Bright re-tinted toward Mapbox Streets by `style.js` (light-blue water, pale beige-grey land, green parks, white roads, yellow arterials; colours fade to pale cyan between z14 and z15.5, as in the selected reference). Markers are symbol layers (`markers.js`); selection is feature state. The Mapbox wordmark is not imitated and is left out; the data credit goes through `IosDevice.credit`.

## Assets and font

- The text font is the system font (San Francisco). The real app's face looks more humanist and narrower, so font sizes were set from measured text widths, not from the real values.
- The IPA's `car_*`, `parking_*` and `charging_station_*` PNGs (flutter_assets/resources/builds/flutter/assets/png/) are a fallback set (Evo logo on the pin, bike parking), not what the live app shows, so no IPA file is used. Pins, signs, plug, rider dot and every icon are drawn in code (canvas and inline SVG). The app's icon font is reference only and is not committed.
- The Prius photo is a drawn SVG, not a photo.
- `../_shared/icon.png`: the app icon (256 px), from the IPA asset catalog (`AppIcon`, 1024 px). The series home shows it on the product card.

## Remaining deviations and gaps

- No evidence for pressed states, the enabled BOOK NOW colour (Evo cyan with white text, unverified), the real way back to home, animation timing, or the expanded card's scrolling behaviour.
- The account banner ("There's an issue...") is deliberately left out, so the expanded fees start higher than in the reference.
- Road names are not abbreviated; no POI icons at z13; the car glyph is a simplified outline.
