# Live count on Filters

**Problem** The Filters sheet gives no feedback. Riders toggle chips, tap APPLY, look at the map, then reopen the sheet to change something and check again. Every attempt costs a close and a reopen.

**Change** APPLY becomes a live count ("SHOW 9 CARS") that updates on every chip, checkbox and Clear All, and reads "NO CARS MATCH" (disabled) at zero. Tapping it closes the sheet and hides the other cars on the map, clusters included. The Filter pill shows how many options are on ("Filter · 2"). The mock's APPLY only closes the sheet; the real app filters, so the patch does too. Seat Sale has no data in the mock and is not counted. Seats chips mean "at least N", so choosing one clears the other. Closing the sheet any other way (backdrop, drag) discards the unapplied choices.

**Caption**

> Filters give no feedback. You toggle chips, tap APPLY, check the map, reopen, change, close, check again. Now the button counts as you tap: SUV, "SHOW 9 CARS"; add all-wheel drive, "SHOW 3 CARS". Tap it and the map shows just those cars.

![Live count on Filters](media/clip.gif)

Upload `media/clip.mp4` to X. `clip.gif` is a fallback.

Preview: [../index.html#06-ux-filter-live-count](../index.html#06-ux-filter-live-count)
Live: [../mock/index.html?redline=06-ux-filter-live-count](../mock/index.html?redline=06-ux-filter-live-count)
