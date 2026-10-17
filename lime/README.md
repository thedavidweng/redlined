# Redlined · Lime

Lime is a micro-mobility company that rents shared electric scooters and bikes in cities around the world. Riders find and unlock vehicles from a map in its iOS app.

These redlines cover the map home screen and the scooter sheet. They run on the replica in `mock/`: fictional vehicles, selection, optional promotion, and collapsed/expanded ride-in-progress states. Trip screenshots show range in km and slow-mode speed in mph; the existing range redline concerns the pre-ride sheet only. The visuals are approximations, not 1:1 (see `mock/README.md`).

| # | Folder | Type | Description |
| --- | --- | --- | --- |
| 1 | [`01-fix-range-in-km`](01-fix-range-in-km/) | fix | The sheet prices in CAD but gives the range in miles. |
| 2 | [`02-fix-trip-rate-missing`](02-fix-trip-rate-missing/) | fix | During the ride, the sheet lists only the unlock fee, not the per-minute rate. |

Preview: double-click `index.html`, or http://127.0.0.1:4173/lime/ with `python3 _tools/serve.py`. The map tiles need a network connection.
