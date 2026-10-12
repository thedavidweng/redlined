# _tools

- `serve.py`: dev server on :4173 for the whole repo. No caching; re-runs `sync.py` whenever a page asks for the redline list.
- `stage.html`: 1920x1080 before/after stage. Config from `<product>/_shared/stage.json` (an optional `device`, a model name from `_ios/devices.js` such as `"iphone-16e"`, switches to two portrait phones at device size); on screen: Redlined wordmark, product label, number, Before/After. Manual view: `stage.html?product=deliverect&redline=<folder>`.
- `calibrate.py`: compares a mock state with the real app's reference screenshot. Reads `.scratch/<product>/reference/<state>/{screen.png,notes.md}`, opens `<product>/mock/index.html?state=<state>` from disk at the reference logical size and scale (in an iframe, so the device frame draws the status bar as in the stage, without the notch: `?cutout=none`), waits for fonts and the map's `idle`, screenshots until two shots match, and writes `.scratch/<product>/calibration/<state>/`: `side-by-side.png`, `overlay.png` (50%), `diff.png` (heat map), `mock.png`, `report.md` (difference by status bar, UI and map region). Needs network for tiles, no server. Same input gives the same files. Pixel difference only shows where to look; judge by eye on the overlay.
- `ipa_inventory.py`: unpacks an iOS IPA into `.scratch/<product>/ipa/` (raw files, asset catalog PNGs, fonts, Lottie, colours, Info.plist, tech stack) and writes `inventory.md`. Local reference only, never published. `uv run --with fonttools python _tools/ipa_inventory.py .scratch/IPA/<app>.ipa <product>` (macOS: needs `otool`, `nm`, `xcrun assetutil`, `swiftc`).
- `brand.css`, `logo.svg`: Redlined brand (palette, wordmark, logo backdrop, favicon), linked by the stage and each product's `index.html`.
- `sync.py`: writes `products.js` and the product table in the root `README.md` (the series index), and `<product>/_shared/redlines.js` (numbered redline list: README table order, then unlisted folders; title and caption from each README). Classic script, so it loads from `file://`.
- `record.py`: plays `<path>/clip.py`, writes `<path>/media/clip.mp4`, `clip.gif` and `cover.webp` (the home page still). Needs the server and `ffmpeg`. `record.py --covers` redoes only the stills.
- `build.py`: builds `_site/` for GitHub Pages (`.github/workflows/pages.yml`, on every push to main). Same paths as the repo minus tooling, docs and GIFs; clips re-encoded to ~1 MB, cached by hash in `.cache/`.

```sh
uv run --with playwright python _tools/record.py deliverect/<folder> [...]
```

```sh
uv run --with playwright --with pillow python _tools/calibrate.py lime home
```

`Director.drag(x0, y0, x1, y1, dur)` moves the finger hint along a path while pressing (for sheets and maps). `Director.box(selector, text)` is generic: the first element matching `selector` that contains `text`; scope row-specific clips in the selector (`.manage-row:has-text("X") .btn`).

`Director.ring(side, selector, tone)` (`stage.ring` in the stage) draws a stage-side outline around any element of the mock, tracking it while it moves; `tone` is `'hl'`, `'bad'` or `'good'`, and `None` removes it.

`Director.to_stage(side, x, y)` turns a point in the mock's own viewport into stage coordinates (the iframe is offset and scaled). Use it for things that are not DOM, such as map markers: project their coordinates inside the iframe, then convert. See `lime/01-fix-range-in-km/clip.py`. Wait for the map to be loaded and idle before `d.intro()`.

`walk_routes.py`: precomputes foot routes from one point to many (public OSRM foot router, sequential) into a classic script, so a mock draws real walking routes without a runtime fetch: `uv run python _tools/walk_routes.py <in.json> <out.js> <GlobalName>`, with `in.json` = `{"from": [lng, lat], "to": [[lng, lat], ...]}`.
