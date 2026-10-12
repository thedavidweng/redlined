# Day view

**Problem** The hourly strip shows about five of its 24 hours at a time. A long booking, such as an open return (12 h), runs off the screen, and the free window (today until Thursday morning) cannot be seen at all. So the page needs a separate "View Full Availability" button and a box of Earliest and Latest dates.

**Change** The strip becomes a day view: one row per day, today and the next three, each a 24-hour bar that fits the page with no sideways scroll. Unavailable time is grey hatch, past time is dimmed, free time is pale blue, and a tick marks now. Your booking is the navy block from 03: drag it to move, drag an end to resize, 15-minute snap, stopping at unavailable time and the current quarter hour. It wraps into the next row when it crosses midnight and follows the finger between rows. View Full Availability stays as the block's last row; the free-window line from 02 stays too, as text for scanning. It builds on 03 and 02.

**Caption**

> A 12-hour open return runs off the edge of the hourly strip, and you can't see the free window at all. Now each day is one row, so the whole booking and everything free around it fit on screen. Drag it across midnight and it carries on in the next row.

![Day view](media/clip.gif)

Upload `media/clip.mp4` to X. `clip.gif` is a fallback.

Preview: [../index.html#04-feat-day-view](../index.html#04-feat-day-view)
Live: [../mock/index.html?redline=04-feat-day-view&state=booked](../mock/index.html?redline=04-feat-day-view&state=booked)
