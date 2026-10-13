# Find parking

**Problem** During a trip the map shows only Evo's own lots (the P signs). Members may also end a trip at City of Vancouver pay meters, but which ones is not on the map: evo.ca/parking lists the rules (no time-restricted meters or zones, no unmarked parkades, commercial lots or alleys), so members check street signs and the website by hand, in the busy areas where it matters most.

**Change** A white "Find parking" pill with a P sits above the trip sheet (trips only: the other states are unchanged). It opens parking mode: the trip sheet slides away, the buttons on the right fade, cars and chargers step aside, the Evo lots that are open now stay (a little larger) and every eligible meter shows as a small cyan dot under the pins. The nearest place by driving time is picked: its street route is drawn from your car as a black dotted line, the camera fits the route and the few next-nearest places between the mode pill and the bar, and a bar above the tab bar says what it is ("Pay meter · Burrard Street", or the lot's name), why a trip may end there in one green chip ("Meter, no rush-hour limits", "Evo reserved spots"), the drive ("1 min • 0.34 km", in the app's format) and a cyan Navigate button (Apple Maps or Google Maps, driving). Tapping another dot or lot picks it (route and bar update). The close button or Escape returns to the trip sheet and the camera you had.

**Caption**

> In an Evo trip the map only shows Evo's own lots; the City of Vancouver meters you may also end at are only on a web page. Now Find parking shows every place the trip may end, picks the nearest by drive time, and Navigate opens Apple or Google Maps.

## Data

Precomputed, so the page works from disk; the real app would query the city's data and a routing API live.

- `meters.js` (from `meters.py`): City of Vancouver Open Data, dataset [`parking-meters`](https://opendata.vancouver.ca/explore/dataset/parking-meters/), contains information licensed under the [Open Government Licence - Vancouver](https://opendata.vancouver.ca/pages/licence/). The meters within 800 m of the trip car, kept to the fields used (position, meter id, local area).
- `routes.js` (from `routes.py` and `_tools/walk_routes.py --profile car`): driving routes from the trip car, OSRM car profile on OpenStreetMap data (routing.openstreetmap.de), with the street name at the end of each route.
- Lots are the mock's parking spots, with their `hours`. A lot that is closed at the moment is not offered (and its sign is hidden in parking mode). The patch reads the clock, or `?now=<ISO local time>` (e.g. `2026-10-13T12:00`) so a clip does not depend on the recording hour.

## Which meters are eligible

[evo.ca/parking](https://evo.ca/parking) (Metro Vancouver, "End your trip here"): "City of Vancouver ... meters only unless it states no stopping", "Evo designated parking only". "Do not end trip here": "Don't end your trip in a time-restricted meter or zone", and no unmarked parkades, commercial lots or back alleys. A meter is eligible when the data says it is:

1. `service_status` is "In Service";
2. `vehicle_type` is "Any Vehicle" (not Motorcycle or Accessibility);
3. no `am_rush_hours` or `pm_rush_hours`, and no `prohibition_1_*` or `prohibition_2_*` (loading, passenger or commercial zones).

A car left at the end of a trip stays there, so any tow-away or prohibition window makes a meter unsafe, whatever the time is now. Meters that are not eligible are not shown at all: a grey dot would still look like a place to stop, and the point is a map you can trust.

Counts for the 800 m around the trip car: 472 meters; excluded: 152 out of service, 102 with rush-hour limits, 9 not for cars, 3 with a prohibition window; 206 eligible, drawn as 139 dots (twin heads on one post share a dot).

## What is simplified

- Only candidates can be picked: every Evo lot within 2.5 km and the 20 nearest eligible meters in a straight line have a precomputed route. Other meters are drawn paler and do nothing when tapped; the real app would route to any of them. The nearest is the one with the shortest drive among the candidates.
- The router has no live traffic, and its streets are OpenStreetMap's. The meter's street is the router's nearest street (a corner meter may show the cross street; without a name the local area is shown).
- "Time-restricted" is read as rush-hour and prohibition windows. Every meter also has a pay-by-time limit (usually 2 hours) that the data cannot turn into a yes or no for an Evo trip, so it is not used.
- The mock's Evo lots are invented, as is the trip. The meters and routes are real, around the mock's Kitsilano trip car.
- Navigate opens the real maps URLs in a new tab, to the place's coordinates.

Clip for X: `uv run _tools/record.py evo/02-feat-find-parking` writes `media/clip.mp4` (local, not committed). The clip opens both sides on `?state=in-trip` through `query` in `clip.js`.

Preview: [../index.html#02-feat-find-parking](../index.html#02-feat-find-parking)
Live: [../mock/index.html?redline=02-feat-find-parking&state=in-trip](../mock/index.html?redline=02-feat-find-parking&state=in-trip)
