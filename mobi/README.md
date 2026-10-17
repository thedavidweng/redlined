# Redlined · Mobi by Rogers

Mobi by Rogers is Vancouver's public bike share, sponsored by Rogers. Riders find a station on a map in its iOS app and see how many bikes and free docks it has.

Redlines run on the replica in `mock/`: the map with fictional stations, the home sheet, the station sheet at its Expanded and Half screen detents, and the unavailable-station Half sheet state. The visuals are calibrated by eye against reference screenshots (`_tools/calibrate.py mobi home|selected|sheet-expanded`); the supplied unavailable-station screenshot is represented as `?state=station-unavailable` with its retained route, gray no-entry marker and peach status row. The map content differs on purpose and is not 1:1 (see `mock/README.md`).

| # | Folder | Type | Description |
| --- | --- | --- | --- |
| 1 | [`01-ux-unavailable-status-first`](01-ux-unavailable-status-first/) | ux | On an unavailable station, "Station unavailable" moves up under the title. |
| 2 | [`02-ux-type-counts`](02-ux-type-counts/) | ux | Bike-type tabs show their counts; one name for the non-electric type. |

Preview: double-click `index.html`, or http://127.0.0.1:4173/mobi/ with `python3 _tools/serve.py`. The map tiles need a network connection.
