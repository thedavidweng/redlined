# _tools

- `serve.py`: dev server on :4173 for the whole repo. No caching; re-runs `sync.py` whenever a page asks for the redline list.
- `stage.html`: 1920x1080 before/after stage, the one scene shared by the product pages and the recorder. Config from `<product>/_shared/redlines.js` (`mock`, and an optional `device`, a model name from `_ios/devices.js` such as `"iphone-16e"`, for two portrait phones at device size); on screen: Redlined wordmark, product label, number, Before/After. Manual view: `stage.html?product=deliverect&redline=<folder>` (add `&once=1` to stop after one pass instead of looping). Without `redline` it waits for `postMessage({ redlined: 'play', redline })` / `({ redlined: 'stop' })`. API for scripts: `stage.play(redline)`, `stage.stop()`, `stage.marks`, `stage.finished`.
- `play.js`: included by every mock; inert unless the URL has `play=still|live` and the mock is framed. It runs the storyboard inside the mock, so nothing crosses frames except `postMessage({ redlined: type, ... }, '*')` (works from `file://`). Mock to stage: `ready`, `frozen`, `done`, `finger`, `press`, `ring`, `receipt`, `credit`; stage to mock: `run`, `freeze`.
- `previewer.css`, `previewer.js`: the product page (`<product>/index.html` is a short shell). It embeds `stage.html?product=<product>` at 1920x1080 scaled to fit, plays and loops the selected redline, and stops when the tab is hidden or scrolled away (it replays from the start when visible again). Replay button and `r` restart; arrows and `#<folder>` switch redline.
- `calibrate.py`: compares a mock state with the real app's reference screenshot. Reads `.scratch/<product>/reference/<state>/{screen.png,notes.md}`, opens `<product>/mock/index.html?state=<state>` from disk at the reference logical size and scale (in an iframe, so the device frame draws the status bar as in the stage, without the notch: `?cutout=none`), waits for fonts and the map's `idle`, screenshots until two shots match, and writes `.scratch/<product>/calibration/<state>/`: `side-by-side.png`, `overlay.png` (50%), `diff.png` (heat map), `mock.png`, `report.md` (difference by status bar, UI and map region). Needs network for tiles, no server. Same input gives the same files. Pixel difference only shows where to look; judge by eye on the overlay.
- `ipa_inventory.py`: unpacks an iOS IPA into `.scratch/<product>/ipa/` (raw files, asset catalog PNGs, fonts, Lottie, colours, Info.plist, tech stack) and writes `inventory.md`. Local reference only, never published. `uv run _tools/ipa_inventory.py .scratch/IPA/<app>.ipa <product>` (macOS: needs `otool`, `nm`, `xcrun assetutil`, `swiftc`).
- `brand.css`, `logo.svg`: Redlined brand (palette, wordmark, logo backdrop, favicon), linked by the stage and each product's `index.html`.
- `sync.py`: writes `products.js` and the product table in the root `README.md` (the series index), and `<product>/_shared/redlines.js` (numbered redline list: README table order, then unlisted folders; title and caption from each README). Classic script, so it loads from `file://`.
- `record.py`: opens `stage.html?product=<p>&redline=<folder>&once=1` over `serve.py`, screencasts one pass, and writes only `<path>/media/clip.mp4` (gitignored): 1920x1080, H.264, yuv420p, 60 fps if the capture keeps up, else 30, under 60 s. No GIF, no cover. Needs the server and `ffmpeg`.
- `build.py`: builds `_site/` for GitHub Pages (`.github/workflows/pages.yml`, on every push to main). It copies the static site; clips are not part of it, the pages run the stage live.

```sh
uv run _tools/record.py deliverect/<folder> [...]
```

The home page cover is `<product>/_shared/cover.webp`, a 1280x720 still refreshed by hand from a clip frame:

```sh
ffmpeg -ss <t> -i <folder>/media/clip.mp4 -frames:v 1 -vf scale=1280:720 -quality 85 <product>/_shared/cover.webp
```

```sh
uv run _tools/calibrate.py lime home
```

## clip.js and the Director

Each redline has `<folder>/clip.js`, a classic script that sets `globalThis.redlineClip = { query?, ready?(side), before(d), after(d) }`. `before` and `after` are async storyboards run inside that side's mock; `d` is the Director from `play.js`. A redline without `clip.js` just loads both sides and holds about 3 s. `query` is extra URL parameters for the mock (for example `'state=booked'`); the stage loads `clip.js` itself to read it. `ready(side)` is an extra condition for "the mock is settled" (stylesheets, images, animations and maps are always awaited).

Director: `x`, `y`, `wait(s)`, `until(fn)`, `find(selector, text)` (first match containing `text`, like Playwright's `has-text`), `box(selector, text)` (waits for the element, returns its rect), `center(rect, dx, dy)`, `glide(x, y, dur)`, `down()`, `up()`, `tap()`, `drag(x0, y0, x1, y1, dur)`, `lift()` (finger off the glass), `ring(selector, tone)` (`'hl'`, `'bad'`, `'good'`; `null` removes), `receipt(html)`, `scroll(selector, { top, left }, ms)`. Coordinates are the mock's own viewport, so map markers (layers, not DOM) are projected in the mock (`LimeMap.project`) plus the container's offset. The Director fakes pointer and mouse events and `:hover`/`:active` (as `.rl-hover`/`.rl-active` twin rules). Keep the finger off what the redline is about (`d.lift()`).

Pass order: curtain on; After is loaded frozen (`play=still`: map snapshot, animations paused, WebGL context released) and Before runs live; when Before is done it is frozen, After goes live under it and runs; then the finger leaves, a pause, curtain, and either loop or `stage.finished`. Only one mock is ever live, so only one WebGL map renders.

`walk_routes.py`: precomputes foot routes from one point to many (public OSRM foot router, sequential) into a classic script, so a mock draws real walking routes without a runtime fetch: `uv run python _tools/walk_routes.py <in.json> <out.js> <GlobalName>`, with `in.json` = `{"from": [lng, lat], "to": [[lng, lat], ...]}`.
