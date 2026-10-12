# _ios

Shared by every iOS product mock. Copied to the site as is (the build skips `.md`).

- `device.js`, `device.css`: the iPhone frame. `IosDevice.mount(appRoot, { width, height, radius, cutout, safe })` draws the status bar, the cutout (`'notch'` or `'island'`, default island) and Home indicator (`?cutout=none` in the URL hides the cutout, calibration only) and sets `--safe-top/-bottom/-left/-right` for the app. Inside the stage it is the exact device size with no shell; on desktop a phone window; on a narrow viewport full screen.
- `maplibre/`: vendored MapLibre GL JS (see `VERSION`) with its license.
- `map-perf.js`: `IosMapPerf.attach(map)` keeps a MapLibre map at full frame rate on weak GPUs by lowering the pixel ratio only while the camera moves, and only if frames run slow.
