# Redlines

## Naming

Name folders `<nn>-<type>-<slug>` in lowercase kebab-case. `<nn>` is the two-digit posting number, the same number the list assigns. The type is the segment after that number:

- `fix`: broken or missing
- `ux`: flow or error prevention
- `feat`: new capability
- `ui`: visual polish
- `a11y`: accessibility

## Add a redline

1. Copy a sibling folder. It contains `README.md`, `patch.js`, `patch.css`, `clip.py` and `media/`.
2. Add a row to the product README table. Its order is the posting order. The redline list (`<product>/_shared/redlines.js`) is generated from that table and the folders on disk by `_tools/sync.py`; `serve.py` and `record.py` run it for you. A folder missing from the table still appears, at the end; a deleted one disappears. Title and caption come from the folder's README (`# Title`, the `> ` line under `**Caption**`).
3. Preview: double-click `<product>/index.html`, or run `python3 _tools/serve.py` and open `/<product>/#<folder>`. It shows the caption above the clip, as on X, plays the clip, with Replay, and "Try it live" opens the interactive mock with the patch applied (`mock/index.html?redline=<folder>`). While building, use the stage for a live side-by-side: `/_tools/stage.html?product=<product>&redline=<folder>` (needs the server).

## Works from disk

Every page must work when opened straight from disk (`file://`), so: classic `<script src>` only, no ES modules, no `fetch`. Each script wraps itself in `(() => { … })()` and shares through a global: the mock exposes `DeliverectModel`/`DeliverectManage`, `_shared/` exposes `RedlineFixtures`/`RedlineMotion`, and each `patch.js` sets `globalThis.redlinePatch = { apply }`.

## Numbering

Every redline has a number: its 1-based position in the generated list (README table order, then unlisted folders). That number is also the two-digit prefix of the folder name, so `4` is `04-feat-order-details`. The README table's `#` column and the previewer show it as `<n>: <folder>`; the clip shows the number alone. The stage adds it to clips automatically. Reordering means renaming the folders whose number changed and re-recording those clips.

## Add a product

Create `<product>/` containing:

- `mock/`
- `_shared/` (copy the structure from `deliverect/`)
- a README with the company intro (its first sentence shows on the home page), an index table and a preview link
- `index.html` (copy `deliverect/index.html`)

`sync.py` then lists it in `products.js` (home page) and the root README. Pushing to main publishes it to GitHub Pages.

## Add an iOS product

Same layout as above, plus the device frame and a map. The `lime/` product is the worked example.

1. **Assets.** `uv run --with fonttools python _tools/ipa_inventory.py .scratch/IPA/<app>.ipa <product>` unpacks the IPA into `.scratch/<product>/ipa/` and writes `inventory.md`: Info.plist facts, tech stack, asset catalog PNGs, fonts, colours. It recovers assets, not layout. Nothing from it is committed except the few glyphs the mock needs; fonts are never committed (use an open lookalike). List sources in `<product>/mock/README.md`.
2. **Reference.** Capture each screen of the flow with mobile-mcp into `.scratch/<product>/reference/<state>/`: `screen.png` (native pixels) and `notes.md` (device model, `logical W×H @Nx`, accessibility elements with frames, notes). On a real phone never tap a button that acts on the real world (Reserve, Ring, Pay). Privacy: the mock uses neither the real location nor real names; move the camera to another district and invent plates, names and accounts.
3. **Frame and map.** The shared pieces are in `_ios/` (see its README): `devices.js`, `device.js`/`device.css`, vendored MapLibre, `map-perf.js`, `map-images.js`, `map-style.js`, `sheet.js`, `state.js`. Name the device in `<product>/_shared/stage.json` (`"device": "iphone-16e"`; add a model to `_ios/devices.js` if it is new) and mount with `IosDevice.mount(root, IosDevices[name])`; the data script reads the same entry, so a size is never written twice. Load the `_ios/` scripts as classic scripts (no modules, no fetch) before your own. Draw the map with MapLibre and OpenFreeMap: `setStyle(IosMapStyle.BRIGHT, { transformStyle: IosMapStyle.transform(build) })` with your own palette and layers, markers as images from `IosMapImages.draw` on symbol layers, the sheet from `IosSheet.create` with your own detents and markup, `?state=` through `IosState.pick`. Colours, marker looks, copy and data stay in the product. Data lives in a global (`LimeData`), not `.json`.
4. **Calibrate.** Give the mock a `?state=<name>` per reference state (see `docs/design.md`), then loop on `calibrate.py <product> <state>`: change the mock, rerun, look at `overlay.png`. List what still differs and which states have no evidence; never claim 1:1.
5. **Redline.** As in "Add a redline". The patch receives `{ root, map, data }`. Prove before and after with Playwright at the device size: with `?redline=<folder>&side=before` the screenshot must equal the plain mock pixel for pixel, and `side=after` must differ only where intended.
6. **Clip.** Map markers are layers, not DOM, so `d.box` cannot find them. Project the coordinates in the iframe (`LimeMap.project`), add the map container's offset, and convert with `d.to_stage(side, x, y)`, which applies the iframe's offset and scale. Wait until the map has loaded and stopped moving before the first frame, or tiles are blank. Keep the finger off what the clip is about (`d.lift()`).
7. **Record and publish.** `record.py` as usual (30 fps: two WebGL maps stay near 28 fps in headless Chromium, so 60 is not reachable). Then "Verify before reporting done", plus `python3 _tools/build.py` and `python3 -m http.server` in `_site/`: no 404s, tiles load, the credit shows, no API key in any request. Check the previewer and "Try it live" at 1440x900 and 390x844.

## Verify before reporting done

- No errors or 404s.
- The before side is unchanged.
- The after behaviour works.
- **Look at it.** DOM checks are not enough. Screenshot the after side in the stage (`/_tools/stage.html?product=<product>&redline=<folder>`) before and after each interaction, then open the images and check every new element: position, size, colour and contrast, overlap, clipping.
- **Look at the clip.** After recording, extract frames at the key moments (`ffmpeg -ss <t> -i media/clip.mp4 -frames:v 1 <out>.png`) and inspect them: the first frame, each interaction and its result, and the last frame. A bug that only shows in the stage (fonts loading, iframe scaling) only shows here.
- The previewer, opened by double-click (`file://`), switches to the new redline, plays and replays its clip, and "Try it live" opens a working interactive version.
- The mock tests pass.
