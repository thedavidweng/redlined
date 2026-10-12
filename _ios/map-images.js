// Draws map icons at 3x for MapLibre, and loads the PNGs they are made from. Classic script, works from file://.
//   IosMapImages.load(src)  →  Promise of an Image
//   IosMapImages.draw(map, id, w, h, paint)  →  map.addImage(id, ...) of a w x h pt canvas drawn at 3x; paint(g) gets a 2D context already scaled to points
//   IosMapImages.tint(img, color)  →  a canvas with the image's shape filled with color (one black glyph PNG serves any colour)
// Symbols are images, never DOM nodes, so panning costs the UI nothing.
// file://: WebGL cannot read a file:// image (the canvas is tainted), so give load() a data URI. Keep the PNGs in the product's assets.js
// as data URIs (see lime/mock/assets.js); an http(s) URL works too.
globalThis.IosMapImages = (() => {
  const PR = 3;

  const load = src => new Promise((resolve, reject) => Object.assign(new Image(), { src, onload() { resolve(this); }, onerror: () => reject(new Error(`Could not load image ${src.slice(0, 60)}`)) }));

  function draw(map, id, w, h, paint) {  // w, h in pt
    const canvas = Object.assign(document.createElement('canvas'), { width: w * PR, height: h * PR });
    const g = canvas.getContext('2d');
    g.scale(PR, PR);
    paint(g);
    map.addImage(id, g.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: PR });
  }

  function tint(img, color) {
    const c = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height }), g = c.getContext('2d');
    g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  return { load, draw, tint };
})();
