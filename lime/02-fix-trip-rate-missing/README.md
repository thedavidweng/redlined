# Trip rate missing

**Problem** Before the ride, the sheet shows the rate: "25% off, up to $5, then CAD $0 to unlock, CAD $0.15/min". During the ride, Pricing is the last block, below Slow mode, Helmet verification and Learn, and it lists only the CAD $0 unlock fee. The per-minute rate is not on the ride sheet.

**Change** The rate from the pre-ride sheet sits under the timer, in the summary that stays visible: "CAD $0.15/min" (with "25% off, up to $5, then" first when the promo applies). It is the same fixed figure, not a running cost. The Pricing block stays where it was.

**Caption**

> Before the ride, Lime shows the price per minute. Once the timer starts, the ride sheet's Pricing lists only the $0 unlock fee. Here the rate sits under the timer.

Evidence: the trip layout comes from two screenshots (collapsed and expanded); Pricing there shows only the unlock fee. The rate and promo come from the pre-ride sheet. Whether the real app shows the rate elsewhere during a ride, or whether the promo still applies mid-ride, is unconfirmed. The position and wording are a proposal.

Clip for X: `uv run _tools/record.py lime/02-fix-trip-rate-missing` writes `media/clip.mp4` (local, not committed).

Preview: [../index.html#02-fix-trip-rate-missing](../index.html#02-fix-trip-rate-missing)
Live: [../mock/index.html?state=in-trip-expanded&redline=02-fix-trip-rate-missing](../mock/index.html?state=in-trip-expanded&redline=02-fix-trip-rate-missing)
