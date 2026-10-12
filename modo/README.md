# Redlined · Modo

Modo is a car-share co-operative in Vancouver, Canada: members book shared cars and bikes by the hour from a map in its iOS app.

There is no redline yet. This phase is the replica in `mock/`: the map home, a selected car with its sheet, and the pushed Vehicle Information page. The visuals are calibrated by eye against reference screenshots (`_tools/calibrate.py modo home|selected|vehicle`), not 1:1; see `mock/README.md` for what still differs and what has no evidence.

| # | Folder | Type | Description |
| --- | --- | --- | --- |

Preview: double-click `index.html`, or http://127.0.0.1:4173/modo/ with `python3 _tools/serve.py`. The map tiles need a network connection.
