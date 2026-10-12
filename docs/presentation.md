# Presentation

## Thread

- **Main post:** the product logo, the title `Redlined — <Product>`, and one line about improving the product's UI/UX.
- **Replies:** one redline per reply. Each reply has a clip and a caption of 280 characters or fewer. Draft the caption in the redline README.

## Clip

- Side by side: the before state on the left, the after state on the right. Show the problem first, then the fix.
- The clip is a wordless demo. The only text on screen is the Redlined wordmark, the product label, the redline number and the Before/After tags, all added by the stage. Everything to read, including what the clip shows, goes in the caption.
- The clip loops seamlessly, and the finger must never hide the confirmation.
- The page is neutral black, white and gray. The logo pattern and tokens live in `_tools/brand.css`. A clip's own backdrop is the solid plate in `_tools/stage.html` (no pattern, no colour cast), so the demo stays readable on the page. Change either, then re-record every clip.
- Record it with `uv run --with playwright python _tools/record.py <product>/<folder>`. Details are in `_tools/README.md`.

## Media

- `clip.mp4` is the file to upload: 1920×1080, H.264, yuv420p, tv range, 30fps, CRF 16 or lower, faststart.
- `clip.gif` must stay under 15 MB.

## Placeholder

- Wherever a cover or clip would show and none exists yet (a product card on the home page, a previewer without a clip or without redlines), show the brand placeholder: `.brand-placeholder` in `_tools/brand.css`, the Redlined mark at 7% opacity, centred at 22% of the width, on a soft radial lift of `--bg-raise`.
- Never a blank box, a stand-in screenshot or the product's own logo. The element must be positioned; when it holds text (such as "No clip yet"), add `.with-text` so the mark rises and the text sits under it.
