// Helpers for turning OpenFreeMap's Bright style into a product's own quiet map. The tiles, sprite and glyphs stay OpenFreeMap's.
// Classic script, works from file://. The palette and which layers to keep belong to the product (see lime/mock/style.js).
//   IosMapStyle.BRIGHT  →  the style URL
//   map.setStyle(IosMapStyle.BRIGHT, { transformStyle: IosMapStyle.transform(next => layers) })
//     swaps the style's layers before it loads; build(next) returns the layer list (next is the incoming style).
//   IosMapStyle.mute(map)  →  desaturates the sprite icons once the style has loaded (for apps whose map icons are grey)
globalThis.IosMapStyle = (() => {
  const BRIGHT = 'https://tiles.openfreemap.org/styles/bright';

  const transform = build => (previous, next) => ({ ...next, layers: build(next) });

  // Grey the sprite's coloured icons in place (alpha untouched).
  function mute(map) {
    for (const id of map.listImages()) {
      const { data } = map.getImage(id) ?? {};
      if (!data) continue;
      const px = new Uint8ClampedArray(data.data);
      for (let i = 0; i < px.length; i += 4) px[i] = px[i + 1] = px[i + 2] = px[i] * .3 + px[i + 1] * .59 + px[i + 2] * .11;
      try { map.updateImage(id, { width: data.width, height: data.height, data: px }); } catch {}
    }
  }

  return { BRIGHT, transform, mute };
})();
