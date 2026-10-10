# Design rules

- The mock is truth. Never redesign `mock/`. The only hook it may contain is the `?redline=` seam. Names stay fictional.
- Each redline is one minimal change, layered on the original through `patch.js`/`patch.css`.
- Match the product's existing colours, type, spacing and components. The result should look like the company's own next release. Restyle only when asked.
- Motion should be restrained and feel native. Use the shared ease `cubic-bezier(.32,.72,0,1)` and honour reduced motion. Shared helpers live in `<product>/_shared/`.
- Never position overlays from a single measurement taken at render time. Fonts and frame sizes settle later, especially in the stage. Re-measure with `ResizeObserver` and `document.fonts.ready`, or let CSS lay it out.
