# Walk route

**Problem** Selecting a car shows "0.31 km • 4 min" under it, but nothing says where that figure comes from, and the app never draws the way to the car. The directions button on the full card is the only hint that a route exists.

**Change** The walk figures are the street route's distance and time, in the app's own format ("0.31 km • 4 min" on the sheet, one decimal on the full card), and the route is drawn on the map from your dot to the car as a black dotted line under the markers. On selection the camera frames the route between the mode pill and the sheet (zooming out at most to 14.6, so the strip never looks empty). The walk row on the sheet is a button (chevron): tapping it opens a route preview where the sheet slides away, the buttons on the right fade, and a bar above the tab bar (model, plate, walk, cyan Directions, close) sits under a camera that fits the whole route. The close button, a tap on the map, Escape or another car returns to the selected view. Directions, on the bar and on the full card, offers Apple Maps or Google Maps (walking). Parking and trips are unchanged. The route follows streets (precomputed OSRM foot routes, `routes.js`).

**Caption**

> Select an Evo car and the app says "0.31 km • 4 min" with no hint where it comes from, and never shows the way. Now the figure is the real street walk, the route is on the map, and one tap opens the whole route with Directions in Apple Maps or Google Maps.

Routes are precomputed (`routes.js`, from `routes.py` and `_tools/walk_routes.py`: OSRM foot routing on OpenStreetMap data), so the page works from disk; the real app would ask a routing API. Time and distance are the router's (the foot profile walks about 4.5 km/h; the mock's old estimate was 1.25 times the straight line at 5 km/h). Directions open the real maps URLs in a new tab, to the car's coordinates.

Clip for X: `uv run _tools/record.py evo/01-feat-walk-route` writes `media/clip.mp4` (local, not committed).

Preview: [../index.html#01-feat-walk-route](../index.html#01-feat-walk-route)
Live: [../mock/index.html?redline=01-feat-walk-route](../mock/index.html?redline=01-feat-walk-route)
