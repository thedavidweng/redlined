# Evo Mock

An interactive replica of the Evo iOS app's map flow inside the shared iPhone frame: `home` (cars, parking, charging, the rider), tap a car for `selected` (compact sheet), tap the chevron for `sheet-expanded` (black full-screen card, fees and rates); tap a parking sign for `parking-selected` and `parking-expanded`; `in-trip` and `in-trip-expanded` show a trip in progress. Calibrated by eye with `_tools/calibrate.py evo <state>` (all states below except `in-trip`); not 1:1. All data is fictional: the camera is Kitsilano (more than 1 km from where the references were taken), and plates, addresses and walking distances are invented. The public prices are reused.

Serve the `redlined` folder (`python3 _tools/serve.py`) and open http://127.0.0.1:4173/evo/mock/, or double-click `index.html`. The map needs a network connection (OpenFreeMap tiles, OpenStreetMap data).

## States

`?state=home` (default), `?state=selected` (nearest car, camera at z16, compact sheet) and `?state=sheet-expanded`. Tapping a car selects it, the chevron expands, the top-left chevron collapses back to `selected`, and tapping empty map (or Escape) goes home: there is no evidence of a close control, so this is a choice. The compact sheet uses `../../_ios/sheet.js` for the slide and spring but has one resting place: the real sheet only grows with its chevron (swiping up did not expand it), so a pull rubber-bands back. The expanded card is a separate layer that fades in. BOOK NOW and the directions button do nothing. `prefers-reduced-motion` removes the animations. Durations are estimates, there is no reference video. `?redline=none` is accepted and loads nothing (the seam is the same as Lime's).

### Parking and trip states

- `?state=parking-selected`: the nearest parking spot (`EvoData.nearestParking`) is tapped. Its sign is redrawn black with a cyan edge, stem, P disc and car (as in the reference, not a cyan fill), through feature state on a second layer (`evo-parking-selected`, `markers.js`). The compact sheet has the title, the opening-hours pill, the straight-line distance (`> 1.00 km`, `EvoData.distance`) and the one-line description. `?state=parking-expanded` adds the full card: the same rows plus "Parking details" (long description, "View parking photos", hours). No tab bar and no BOOK NOW. Calibrated against `parking-selected` and `parking-expanded` (the reference is a UBC lot, so only layout and type are compared).
- `?state=in-trip`: a trip in the nearest car (Prius): the same compact sheet as `selected`, holding the trip card (model, plate, Stopover, the car with a Bluetooth glyph, Lock and end trip). `?state=in-trip-expanded` adds the full card with the rates, the GST/PST note, Expense details (No notes added, Edit) and Call the call center. Calibrated against `in-trip-expanded` only. In-trip is reachable only through the URL: BOOK NOW does nothing. The buttons do nothing.
- Taps: one bounded query on the cars and parking layers, the pin nearest the finger wins. A car tap shows the car sheet, a parking tap the parking sheet, empty map goes home. In a trip only parking is tappable (the trip car and other cars are not); a parking tap shows the parking sheet and a tap on empty map (or Escape) brings the trip sheet back, so empty map never leaves the trip. This is a choice, there is no evidence.

## Map

OpenFreeMap Bright re-tinted toward Mapbox Streets by `style.js` (light-blue water, pale beige-grey land, green parks, white roads, yellow arterials; colours fade to pale cyan between z14 and z15.5, as in the selected reference). Markers are symbol layers (`markers.js`); selection is feature state. The Mapbox wordmark is not imitated and is left out; the data credit goes through `IosDevice.credit`.

## Assets and font

- The text font is the system font (San Francisco). The real app's face looks more humanist and narrower, so font sizes were set from measured text widths, not from the real values.
- The IPA's `car_*`, `parking_*` and `charging_station_*` PNGs (flutter_assets/resources/builds/flutter/assets/png/) are a fallback set (Evo logo on the pin, bike parking), not what the live app shows, so no IPA file is used. Pins, signs, plug, rider dot and every icon are drawn in code (canvas and inline SVG). The app's icon font is reference only and is not committed.
- The Prius photo is a drawn SVG, not a photo.
- `../_shared/icon.png`: the app icon (256 px), from the IPA asset catalog (`AppIcon`, 1024 px). The series home shows it on the product card.

## Remaining deviations and gaps

- No screenshot of the collapsed trip sheet: it is the car sheet's position and chevron with the trip card inside (confirmed, not seen). Whether other cars stay on the map during a trip is unknown; the map is as in `selected`, with the trip car shown as the selected pin.
- The reference trip card shows BCAA strikethrough discounts and a "BCAA Member Discount" line; the mock shows the plain public prices, so everything below the rates sits about 15 pt higher than in the reference.
- Parking data is fictional (names, descriptions, hours, kinds, levels; Kitsilano street names). "View parking photos" opens a web gallery in the real app and does nothing here. Distances are straight lines, as in the app.
- Text in the new cards was sized from measured widths (about 0.8 to 0.9 of the first guess); the real face is narrower. Line breaks differ because the copy differs.
- No evidence for pressed states, the enabled BOOK NOW colour (Evo cyan with white text, unverified), the real way back to home, animation timing, or the expanded card's scrolling behaviour.
- The account banner ("There's an issue...") is deliberately left out, so the expanded fees start higher than in the reference.
- Road names are not abbreviated; no POI icons at z13; the car glyph is a simplified outline.
