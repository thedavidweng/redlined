# _tools

- `serve.py`: dev server on :4173 for the whole repo. No caching; re-runs `sync.py` whenever a page asks for the redline list.
- `stage.html`: 1920x1080 before/after stage. Config from `<product>/_shared/stage.json`; on screen: Redlined wordmark, product label, number, Before/After. Manual view: `stage.html?product=deliverect&redline=<folder>`.
- `brand.css`, `logo.svg`: Redlined brand (palette, wordmark, logo backdrop, favicon), linked by the stage and each product's `index.html`.
- `sync.py`: writes `products.js` and the product table in the root `README.md` (the series index), and `<product>/_shared/redlines.js` (numbered redline list: README table order, then unlisted folders; title and caption from each README). Classic script, so it loads from `file://`.
- `record.py`: plays `<path>/clip.py`, writes `<path>/media/clip.mp4`, `clip.gif` and `cover.webp` (the home page still). Needs the server and `ffmpeg`. `record.py --covers` redoes only the stills.
- `build.py`: builds `_site/` for GitHub Pages (`.github/workflows/pages.yml`, on every push to main). Same paths as the repo minus tooling, docs and GIFs; clips re-encoded to ~1 MB, cached by hash in `.cache/`.

```sh
uv run --with playwright python _tools/record.py deliverect/<folder> [...]
```
