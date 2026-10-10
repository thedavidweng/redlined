# Presentation

## Thread

- **Main post:** the product logo, the title `Redlined — <Product>`, and one line about improving the product's UI/UX.
- **Replies:** one redline per reply. Each reply has a clip and a caption of 280 characters or fewer. Draft the caption in the redline README.

## Clip

- Side by side: the before state on the left, the after state on the right. Show the problem first, then the fix.
- The only text on screen is the redline number and folder (`1: feat-order-details`, added by the stage), the Before/After tags and one short note per side. Explanations go in the caption.
- The clip loops seamlessly, and the finger must never hide the confirmation.
- Record it with `uv run --with playwright python _tools/record.py <product>/<folder>`. Details are in `_tools/README.md`.

## Media

- `clip.mp4` is the file to upload: 1920×1080, H.264, yuv420p, tv range, 30fps, CRF 16 or lower, faststart.
- `clip.gif` must stay under 15 MB.
