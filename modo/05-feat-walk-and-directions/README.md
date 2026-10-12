# Walk and directions

**Problem** Selecting a car shows its station but not how far away it is. The Vehicle Information page shows the address as plain text: no quick way to copy it or to open it in a maps app and walk there.

**Change** The car card and the vehicle page show a walking line under the station ("3 min · 240 m") and the walking route is drawn on the map from your location to the car. Home Location gets Copy ("Address copied") and Directions (Apple Maps or Google Maps, walking). On selection the camera frames the walking route between the header and the Filter pill (zooming out at most to 15.2, so the small map strip never looks crowded). The walk line is a button (chevron): tapping it opens a route preview where the sheet slides away, Filter and locate fade, and a bar above the tab bar (car, walk, navy Directions, close) sits under a camera that fits the whole route in the large map. The close button, a tap on the map or another pin returns to the selected view. The route follows streets (precomputed OSRM foot routes, `routes.js`).

**Caption**

> Select a Modo car and it never says how far it is. Now: "3 min · 240 m" under the station. Tap it and the sheet drops away to show the whole walking route, with Directions in Apple Maps or Google Maps. No more guessing the walk.

Routes are precomputed (`routes.js`, from `routes.py` and `_tools/walk_routes.py`: OSRM foot routing on OpenStreetMap data), so the page works from disk; the real app would ask a routing API. Time and distance are the router's. Directions open the real maps URLs in a new tab.

![Walk and directions](media/clip.gif)

Upload `media/clip.mp4` to X. `clip.gif` is a fallback.

Preview: [../index.html#05-feat-walk-and-directions](../index.html#05-feat-walk-and-directions)
Live: [../mock/index.html?redline=05-feat-walk-and-directions](../mock/index.html?redline=05-feat-walk-and-directions)
