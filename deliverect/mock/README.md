# Deliverect Mock

Standalone, editable browser demo of the signed-in Deliverect **Pickup screen** and **Manage pickup orders** tabs.
Source inspected read-only with ego-browser on 2026-10-09, at 1458 × 790 CSS pixels.
No production settings, orders, or statuses were changed.

Serve the `redlined` folder:

```sh
python3 ~/Development/redlined/_tools/serve.py
```

Open http://127.0.0.1:4173/deliverect/mock/. Refresh resets state.

```sh
node deliverect/mock/model.test.mjs
```

## Redline seam

Without query params the mock is the plain replica. `?redline=<folder>&side=before|after` (default `after`) opens Manage on `../_shared/fixtures.js`. With `after` it also loads `../<folder>/patch.css` and `patch.js`, and calls `redlinePatch.apply()` after each render.

All scripts are classic (no ES modules), so the mock also runs from `file://`.

## Where to change the UI

- `styles.css`: colors, dimensions, cards, responsive layout, settings panel. Card sizing uses `--card-font`.
- `index.html`: navigation shell, toolbar, modal frame.
- `app.js`: tab switching, shared filters, pickup cards, settings, font sizes, fullscreen.
- `manage.js`: management rows and local status buttons.
- `model.js`: separate frozen observations for both tabs, channels, location fixtures, filtering/search, status updates.
- `assets/`: local copies of the visible logos, SVG icons, and Proxima Nova font assets.
- `preview.png`: the local baseline at the same viewport size.

No build step, dependencies, credentials, API calls, or remote resources at runtime.

## Fidelity and demo boundaries

The baseline reproduces the sidebar, top bar, tabs, four filter controls, branding,
Ready ribbons, Preparing timers, card sizes, spacing, variable card widths, and settings
panel. Five ready orders and seven preparing orders are frozen from the observation;
Restaurant, customer, and courier names are fictionalized; order IDs are randomized fixed fixtures. Timers are deliberately fixed.
The lower order's timer is a fixture value; it was below the initial viewport.

Channel filtering is populated from fixture logos; the live dropdown returned “No options”.
Order types are inferred demo values. Location filtering uses restaurant names as fixture
locations; this is not a reconstruction of Deliverect's backend relationships.
Brand options include the restaurants represented by the fixture, rather than the full account.

Settings for Preparing, timer visibility, and order-tracker footer are local switches.
Enabling the queue shows its empty state because no queued orders were captured.
Customer check-in and sales booking are disabled. Sidebar destinations, account,
and support remain visual context and do not connect to services.
Fullscreen uses the browser's standard Fullscreen API.

Validated: fixture/filter assertions; rendered 12 cards and local asset loading; brand
filtering; settings timer/Preparing toggles; font-size cycle; fullscreen enter/exit;
keyboard Escape; desktop layout comparison; narrower viewport; all runtime resources served from localhost.

This is a local UI demo, not an authenticated client. The platform/channel logos and font assets still use their original brands.

## Manage pickup orders

Open http://127.0.0.1:4173/deliverect/mock/?view=manage directly, or switch tabs.
The management baseline uses its own later read-only observation: six Ready orders and
six Preparing orders. The 70px rows reproduce the channel/order ID, driver, brand,
customer, timer, and action columns. `manage-preview.png` shows the fictionalized local baseline.

Search matches order ID, driver, delivery channel, or customer (case insensitive),
and combines with the shared filters. “Ready for pickup” moves a preparing order to
Ready; “Picked up” removes it from the active list. Status changes also update matching
order IDs in the Pickup screen fixture. Refresh resets both observations. Because the
captures happened at different times, the two baseline datasets are intentionally distinct.

Management fixture locations for restaurants outside the initial location list are
assigned to Guild Kitchen - Pilot solely to keep demo filtering usable; no actual account
relationship is claimed. QR scanning opens the same informational Settings dialog seen
on the account; it does not activate scanning or request camera access.

Validated: search by ID, driver, channel and customer; combined location filters;
Preparing → Ready → Picked up; status sync for overlapping IDs; tab switching;
QR dialog/Escape; refresh reset; desktop screenshot comparison; original fixture tests.

Original reference screenshots were removed because they contained the real names and IDs. Random IDs are generated once in the fixture, so shared orders retain matching IDs across tabs and refreshes. Fictional naming does not itself establish legal clearance.
