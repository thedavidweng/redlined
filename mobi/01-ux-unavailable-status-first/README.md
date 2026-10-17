# Unavailable status first

**Problem** Tap an unavailable station and the sheet opens on the distance and walking time. The "Station unavailable" row sits below that card, so the first thing a rider reads is a route to a station that has nothing to offer.

**Change** On an unavailable station the "Station unavailable" row moves up to sit directly under the title. The DOCK label and the route card follow it, and the route stays tappable. Stations that are available are unchanged.

**Caption**

> Tap an unavailable station and the sheet leads with distance and walking time; "Station unavailable" waits below. Now the status sits right under the station name, so you know before you read the route. The route button stays.

Clip for X: `uv run _tools/record.py mobi/01-ux-unavailable-status-first` writes `media/clip.mp4` (local, not committed).

Preview: [../index.html#01-ux-unavailable-status-first](../index.html#01-ux-unavailable-status-first)
Live: [../mock/index.html?redline=01-ux-unavailable-status-first](../mock/index.html?redline=01-ux-unavailable-status-first)
