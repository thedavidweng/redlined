# _ios

Shared by every iOS product mock. Copied to the site as is (the build skips `.md`).

- `device.js`, `device.css`: the iPhone frame. `IosDevice.mount(appRoot, { width, height, radius, cutout, safe })` draws the status bar, the cutout (`'notch'` or `'island'`, default island) and Home indicator (`?cutout=none` in the URL hides the cutout, calibration only) and sets `--safe-top/-bottom/-left/-right` for the app. Inside the stage it is the exact device size with no shell; on desktop a phone window; on a narrow viewport full screen.
- `maplibre/`: vendored MapLibre GL JS (see `VERSION`) with its license.
- `map-perf.js`: `IosMapPerf.attach(map)` keeps a MapLibre map at full frame rate on weak GPUs by lowering the pixel ratio only while the camera moves, and only if frames run slow.
- `devices.js`: `IosDevices['iphone-16e']`, the one place a device size is written. Products name it in `stage.json` (`"device": "iphone-16e"`) and pass it to `IosDevice.mount`. Add a model here when a product needs one.
- `sheet.js`: `IosSheet.create(el, { detents, snaps, shown, spring, onMove(y, at) })`, a draggable bottom sheet. `detents` is `{ name: () => px }` (translateY, 0 = fully open; one must be `hidden`, the sheet's own height), `snaps` the names a release can settle on (default all but `hidden`, top to bottom), `shown` where `show()` goes (default the last snap). Returns `show(to?)`, `hide(done?)`, `snap(name, animate)`, `state`. Springs on release, rubber-bands past the outer snaps, adds `.dragging` while a finger is down. The product owns the markup and CSS.
- `map-images.js`: `IosMapImages.draw(map, id, w, h, paint)` adds a MapLibre icon drawn at 3x from points, `load(src)` loads a PNG, `tint(img, colour)` recolours a glyph. On `file://` WebGL cannot read a PNG file, so keep the glyphs as data URIs in the product's `assets.js` (see `lime/mock/assets.js`).
- `map-style.js`: `IosMapStyle.BRIGHT` (the style URL), `transform(build)` (use as `setStyle(BRIGHT, { transformStyle })`, `build(next)` returns the layer list), `mute(map)` (grey the sprite icons). The product owns the palette and which layers stay.
- `state.js`: `IosState.pick(STATES)` reads `?state=`, returns `{ name, state }`; the first key is the default, an unknown name falls back to it with a console warning. The product applies the state.
