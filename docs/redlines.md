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

## Verify before reporting done

- No errors or 404s.
- The before side is unchanged.
- The after behaviour works.
- **Look at it.** DOM checks are not enough. Screenshot the after side in the stage (`/_tools/stage.html?product=<product>&redline=<folder>`) before and after each interaction, then open the images and check every new element: position, size, colour and contrast, overlap, clipping.
- **Look at the clip.** After recording, extract frames at the key moments (`ffmpeg -ss <t> -i media/clip.mp4 -frames:v 1 <out>.png`) and inspect them: the first frame, each interaction and its result, and the last frame. A bug that only shows in the stage (fonts loading, iframe scaling) only shows here.
- The previewer, opened by double-click (`file://`), switches to the new redline, plays and replays its clip, and "Try it live" opens a working interactive version.
- The mock tests pass.
