# Redlined · Modo

Modo is a car-share co-operative in Vancouver, Canada: members book shared cars and bikes by the hour from a map in its iOS app.

These redlines cover booking a car: choosing a time, the Vehicle Information page and the filters. They run on the replica in `mock/`: the map home, a selected car with its sheet, the pushed Vehicle Information page (with and without a time set), the Filters sheet and the time sheet. The visuals are calibrated by eye against reference screenshots (`_tools/calibrate.py modo home|selected|vehicle`), not 1:1; see `mock/README.md` for what still differs and what has no evidence.

| # | Folder | Type | Description |
| --- | --- | --- | --- |
| 1 | [`01-ux-one-time-entry`](01-ux-one-time-entry/) | ux | Return type is picked apart from the time, and can't be changed on the vehicle page. |
| 2 | [`02-ux-trip-times-together`](02-ux-trip-times-together/) | ux | The vehicle page scatters the trip's times between the button, rows and a box. |
| 3 | [`03-feat-drag-booking`](03-feat-drag-booking/) | feat | Changing the booked range means leaving the strip for a separate sheet. |
| 4 | [`04-feat-day-view`](04-feat-day-view/) | feat | The hourly strip can't show a long booking or the whole free window. |
| 5 | [`05-ux-filter-live-count`](05-ux-filter-live-count/) | ux | Filters only show their effect after closing the sheet. |
| 6 | [`06-feat-walk-and-directions`](06-feat-walk-and-directions/) | feat | No walking distance, no way to copy the address or open it in a maps app. |
| 7 | [`07-feat-filter-from-chips`](07-feat-filter-from-chips/) | feat | A car's features can't be used to find similar cars. |

Preview: double-click `index.html`, or http://127.0.0.1:4173/modo/ with `python3 _tools/serve.py`. The map tiles need a network connection.
