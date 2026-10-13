# Trip times together

**Problem** With a time set, the Vehicle Information page shows the trip's times in four places: the hourly strip, a "View Full Availability" button, rows of numbers under BOOK VEHICLE, and, far down, a Change Time row and a grey Earliest/Latest box. Buttons and other rows sit between related times, and changing the time means scrolling past all of them.

**Change** One block under the car: the strip, Pick up at and Return by (Return Type folds in as "Return / Open Return" for an open return), one line for the free window ("Free today 12:00 PM – Thu 8:30 AM") and View Full Availability as its last row. Each row opens the time sheet. BOOK VEHICLE and Membership follow. The Change Time row and the grey box are gone. With no time, the rows read "Please set a time" with a Set time cue.

**Caption**

> Four places on one page show your trip's times, split by a button, BOOK and a row of numbers. To change the time you scroll past all of it. Now the strip, pick up, return and free window sit in one block, and each time opens its editor.

Clip for X: `uv run _tools/record.py modo/02-ux-trip-times-together` writes `media/clip.mp4` (local, not committed).

Preview: [../index.html#02-ux-trip-times-together](../index.html#02-ux-trip-times-together)
Live: [../mock/index.html?redline=02-ux-trip-times-together&state=booked](../mock/index.html?redline=02-ux-trip-times-together&state=booked)
