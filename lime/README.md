# Redlined · Lime

Lime is a micro-mobility company that rents shared electric scooters and bikes in cities around the world. Riders find and unlock vehicles from a map in its iOS app.

These redlines cover the map home screen and the scooter sheet. They run on the replica in `mock/`: the map, fictional vehicles, the selected state and the sheet. The visuals are calibrated by eye against reference screenshots, not 1:1 (see `mock/README.md`).

| # | Folder | Type | Description |
| --- | --- | --- | --- |
| 1 | [`01-fix-range-in-km`](01-fix-range-in-km/) | fix | The sheet prices in CAD but gives the range in miles. |

Preview: double-click `index.html`, or http://127.0.0.1:4173/lime/ with `python3 _tools/serve.py`. The map tiles need a network connection.
