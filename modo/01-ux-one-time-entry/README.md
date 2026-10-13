# One entry for the trip time

**Problem** Return type (SET RETURN / OPEN RETURN) and the time (Start / End) are two entries in the map header. You pick the return type before the time, and its effect is invisible: you can't tell which cars are free for an open return, which holds the car for up to 12 hours. On a car's Vehicle Information page there is no way to switch return type at all. You go back to the map, switch, and reopen the car.

**Change** The header is one row: the trip's start and end ("Oct 12, 4:00 PM → Open return"). Tapping it opens the time sheet, now with a Pick up row and a Return row with a SET | OPEN switch. The wheel edits the active row, and the end time is kept while OPEN is on. A live line above SAVE counts the cars free for that time (or says whether this car is free). The vehicle page's Return Type row and Change Time open the same sheet.

**Caption**

> Return type and time lived in two places, and you chose the type blind. Now one tap on the trip opens one sheet: pick up, return, SET or OPEN. A live line shows how many cars are free for it. On a car's page, the same sheet changes the return type in place.

Clip for X: `uv run _tools/record.py modo/01-ux-one-time-entry` writes `media/clip.mp4` (local, not committed).

Preview: [../index.html#01-ux-one-time-entry](../index.html#01-ux-one-time-entry)
Live: [../mock/index.html?redline=01-ux-one-time-entry](../mock/index.html?redline=01-ux-one-time-entry)
