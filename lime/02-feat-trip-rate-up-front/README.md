# Trip rate up front

**Problem** The captured ride summary shows time and range but no rate. Pricing sits below Slow mode, Helmet verification and Learn. The screenshots do not show the complete Pricing section, so they do not establish that the rate is missing from the app.

**Change** Propose a per-minute rate under the timer, visible at both sheet heights. The demo uses CAD $0.15/min from the pre-ride fixture, not a verified current-trip price or a running cost. It does not carry the pre-ride promotion into the trip. The Pricing block stays where it was.

**Caption**

> The ride summary shows time and range. What if it kept the per-minute rate beside them, without opening Pricing? This mock puts a sample rate under the timer.

Evidence: two screenshots establish the ride layout and the summary's visible fields. Only the unlock-fee row of Pricing is visible; further rows are unverified. CAD $0.15/min is a demo value from a separate pre-ride capture, not proof of this trip's tariff. A real implementation must use the active trip's confirmed rate and applicable discounts.

Clip for X: `uv run _tools/record.py lime/02-fix-trip-rate-up-front` writes `media/clip.mp4` (local, not committed).

Preview: [../index.html#02-fix-trip-rate-up-front](../index.html#02-fix-trip-rate-up-front)
Live: [../mock/index.html?state=in-trip-expanded&redline=02-fix-trip-rate-up-front](../mock/index.html?state=in-trip-expanded&redline=02-fix-trip-rate-up-front)
