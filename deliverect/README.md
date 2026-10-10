# Redlined · Deliverect

Deliverect is a SaaS platform for restaurants and food businesses. It connects online-ordering and delivery channels such as Uber Eats and DoorDash with the restaurant's point-of-sale (POS) system. The company was founded in 2018 and is headquartered in Ghent, Belgium.

These redlines cover the Pickup Manager, in its "Manage pickup orders" tab. They run on the replica in `mock/`.

| # | Folder | Type | Description |
| --- | --- | --- | --- |
| 1 | [`ux-swipe-to-confirm`](ux-swipe-to-confirm/) | ux | One stray tap on "Picked up" completes an order, with no undo. |
| 2 | [`ux-tap-twice-to-confirm`](ux-tap-twice-to-confirm/) | ux | Same stray-tap risk; an alternative to swiping that fits the existing button. |
| 3 | [`feat-order-symbols`](feat-order-symbols/) | feat | Near-identical customer names (Rohan, Ronan) make it easy to mix up bags. |
| 4 | [`feat-order-details`](feat-order-details/) | feat | Rows are not tappable, so staff cannot check a bag's contents from the list. |
| 5 | [`ux-picked-up-feedback`](ux-picked-up-feedback/) | ux | A picked-up order just vanishes; staff can't tell if it moved or finished. |
| 6 | [`ux-channel-tabs`](ux-channel-tabs/) | ux | Couriers name their platform first, but filtering by it takes a dropdown. |

Preview: double-click `index.html`, or http://127.0.0.1:4173/deliverect/ with `python3 _tools/serve.py`. Each redline plays its clip and opens live with "Try it live". Table order is posting order.
