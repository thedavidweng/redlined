# Redlined · Mobi by Rogers

Mobi by Rogers is Vancouver's public bike share, sponsored by Rogers. Riders find a station on a map in its iOS app and see how many bikes and free docks it has.

There is no redline yet. This is the replica in `mock/`: the map with fictional stations, the home sheet, and the station sheet at its Expanded and Half screen detents. The visuals are calibrated by eye against reference screenshots (`_tools/calibrate.py mobi home|selected|sheet-expanded`), covering the chrome, buttons, chips, sheets and typography; the map content differs on purpose and is not 1:1 (see `mock/README.md`).

| # | Folder | Type | Description |
| --- | --- | --- | --- |

Preview: double-click `index.html`, or http://127.0.0.1:4173/mobi/ with `python3 _tools/serve.py`. The map tiles need a network connection.
