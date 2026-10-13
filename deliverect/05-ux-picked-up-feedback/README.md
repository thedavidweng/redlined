# Picked up feedback

**Problem** Tapping "Picked up" removes the row instantly. Staff cannot tell whether the order finished or just moved, and have to scan the list to check.

**Change** Completion gets a moment of its own. The button turns into a green "✓ Picked up", the row plays a short completion effect, holds for about a second, then slides out as usual. The demo shows three candidate effects, one per tap: shine (green flash and a light sweep), ring (a green outline traces the row, then pulses, like a game objective ticking off) and strike through (crossed off like a to-do). The decision is to show completion; the exact effect is a detail.

**Caption**

> When an order disappears with zero feedback, staff second guess whether it actually went through. Showing a quick confirmation before the row leaves removes all doubt. Here are three ways to do it.

Clip for X: `uv run _tools/record.py deliverect/05-ux-picked-up-feedback` writes `media/clip.mp4` (local, not committed).

Preview: [../index.html#05-ux-picked-up-feedback](../index.html#05-ux-picked-up-feedback)
Live: [../mock/index.html?redline=05-ux-picked-up-feedback](../mock/index.html?redline=05-ux-picked-up-feedback)
