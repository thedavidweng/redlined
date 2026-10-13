# Redlined · Evo

Evo is a car-sharing service in Vancouver: members find a Prius on a map in the iOS app and book it for the minute, the hour or the day.

This folder holds the replica in `mock/` (the map home, the selected car with its sheet and its full-screen card, a selected parking lot with its card, and a trip in progress). The visuals are calibrated by eye against reference screenshots, not 1:1 (see `mock/README.md`).

| # | Folder | Type | Description |
| --- | --- | --- | --- |
| 1 | [`01-feat-walk-route`](01-feat-walk-route/) | feat | The walk figure is an unexplained estimate and the route is never drawn. |
| 2 | [`02-feat-find-parking`](02-feat-find-parking/) | feat | During a trip the map hides the city meters where it may also end. |
| 3 | [`03-feat-parking-levels`](03-feat-parking-levels/) | feat | Every parking sign looks the same; underground or parkade level is buried in text. |

Preview: double-click `index.html`, or http://127.0.0.1:4173/evo/ with `python3 _tools/serve.py`. The map tiles need a network connection.
