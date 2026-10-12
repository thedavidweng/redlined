# Drag the booking

**Problem** The strip already shows your booking as dark quarter-hour dots, but to change it you leave the strip for a separate time sheet with wheels, twice: once for the start, once for the end. The thing you see is not the thing you edit.

**Change** The booked quarters become one navy block with a grip at each end. Drag the middle to move the trip, drag an end to change pick up or return. It snaps to 15 minutes, keeps at least 15, and stops at unavailable times and at the current hour. The strip still scrolls sideways, and scrolls itself when you drag near its edge. The Pick up and Return rows update at every step; on release the header, rows and BOOK VEHICLE follow. For an open return only the start moves, and the 12-hour mark goes with it. It builds on 02 (the trip block); the rows still open the sheet.

**Caption**

> Your booking already shows as dark dots on the strip, but changing it sends you through a sheet of wheels, twice. Now the dots are one block: drag it to move the trip, drag an end to change pick up or return. It snaps to 15 minutes and stops at unavailable times.

![Drag the booking](media/clip.gif)

Upload `media/clip.mp4` to X. `clip.gif` is a fallback.

Preview: [../index.html#03-feat-drag-booking](../index.html#03-feat-drag-booking)
Live: [../mock/index.html?redline=03-feat-drag-booking&state=booked](../mock/index.html?redline=03-feat-drag-booking&state=booked)
