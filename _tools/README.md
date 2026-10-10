# _tools

- `serve.py`: dev server on :4173 for the whole repo. No caching; re-runs `sync.py` whenever a page asks for the redline list.
- `stage.html`: 1920x1080 before/after stage. Config from `<product>/_shared/stage.json`; the title shows `<n>: <folder>`. Manual view: `stage.html?product=deliverect&redline=<folder>`.
- `sync.py`: writes `<product>/_shared/redlines.js` (numbered redline list: README table order, then unlisted folders; title and problem from each README). Classic script, so it loads from `file://`.
- `record.py`: plays `<path>/clip.py`, writes `<path>/media/clip.mp4` and `clip.gif`. Needs the server and `ffmpeg`.

```sh
uv run --with playwright python _tools/record.py deliverect/<folder> [...]
```
