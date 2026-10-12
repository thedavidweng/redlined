// Turns OpenFreeMap's Bright style into the look of Evo's Mapbox Streets map: saturated light-blue water, pale beige-grey land (blue-grey once zoomed in),
// green parks, white roads with yellow arterials, dark road labels, brown POI labels. Bright's 119 layers become about 17: only what shows around the
// demo area, with roads, street labels and POIs each merged into one layer, because every layer costs a frame on slow GPUs.
// The tiles, sprite and glyphs stay OpenFreeMap's own. Classic script (file://). The swap is the shared ../../_ios/map-style.js.
//   map.setStyle(IosMapStyle.BRIGHT, { transformStyle: EvoStyle.transform })  →  swaps the layers before the style loads
globalThis.EvoStyle = (() => {
  const SRC = 'openmaptiles';
  const LAND = ['#e4e4e0', '#cce0e0'], PARK = ['#b4e49c', '#a0e0a4'], WATER = ['#74ccf0', '#6accee'];
  const ROAD = ['#ffffff', '#e4f8fc'], EDGE = ['#d2d4d4', '#bfd3d6'];
  const YELLOW = ['#fae79a', '#e4f8fc'], YELLOW_EDGE = ['#e8cd6a', '#bfd3d6'];
  const LABEL = '#3b4044', POI = '#6b5645', POI_PARK = '#2e6d1a';
  const LINE = ['==', ['geometry-type'], 'LineString'];
  const name = ['coalesce', ['get', 'name_en'], ['get', 'name']];
  const ROADS = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service', 'track'];
  const POIS = ['restaurant', 'fast_food', 'cafe', 'bar', 'college', 'school', 'library', 'park', 'stadium', 'museum', 'attraction', 'harbor', 'grocery', 'hospital', 'lodging', 'theatre', 'cinema', 'zoo', 'camera'];

  // Colour that moves from the wide-view value to the close-up value between z14 and z15.5.
  const fade = ([far, near]) => ['interpolate', ['linear'], ['zoom'], 14, far, 15.5, near];
  // Width in pt: [z12, z16] per class, doubling per zoom in between.
  const WIDTH = { motorway: [1.6, 17], trunk: [1.5, 16], primary: [1.2, 15], secondary: [.9, 12], tertiary: [.7, 9.5], other: [.4, 6.5] };
  const widths = extra => {
    const at = i => ['match', ['get', 'class'],
      'motorway', WIDTH.motorway[i] + extra, 'trunk', WIDTH.trunk[i] + extra, 'primary', WIDTH.primary[i] + extra,
      'secondary', WIDTH.secondary[i] + extra, 'tertiary', WIDTH.tertiary[i] + extra, WIDTH.other[i] + extra * .8];
    return ['interpolate', ['exponential', 2], ['zoom'], 11.5, ['*', at(0), .6], 12, at(0), 16, at(1), 19, ['*', at(1), 6]];
  };
  const yellow = ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]];
  const onlyRoads = ['all', LINE, ['!=', ['get', 'brunnel'], 'tunnel'], ['in', ['get', 'class'], ['literal', ROADS]]];
  const order = ['+', ['match', ['get', 'class'], 'motorway', 6, 'trunk', 5, 'primary', 4, 'secondary', 3, 'tertiary', 2, 0], ['case', ['==', ['get', 'brunnel'], 'bridge'], 10, 0]];
  const road = (id, edge) => ({
    id, type: 'line', source: SRC, 'source-layer': 'transportation', minzoom: 11.5, filter: onlyRoads,
    layout: { 'line-cap': 'round', 'line-join': 'round', 'line-sort-key': order },
    paint: { 'line-color': ['interpolate', ['linear'], ['zoom'], 14, ['case', yellow, (edge ? YELLOW_EDGE : YELLOW)[0], (edge ? EDGE : ROAD)[0]], 15.5, ['case', yellow, (edge ? YELLOW_EDGE : YELLOW)[1], (edge ? EDGE : ROAD)[1]]], 'line-width': widths(edge ? 1.4 : 0) },
  });

  const layers = () => [
    { id: 'background', type: 'background', paint: { 'background-color': fade(LAND) } },
    { id: 'grass', type: 'fill', source: SRC, 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood']]], paint: { 'fill-color': fade(PARK) } },
    { id: 'park', type: 'fill', source: SRC, 'source-layer': 'park', paint: { 'fill-color': fade(PARK) } },
    { id: 'water', type: 'fill', source: SRC, 'source-layer': 'water', paint: { 'fill-color': fade(WATER) } },
    { id: 'plaza', type: 'fill', source: SRC, 'source-layer': 'transportation', filter: ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false], paint: { 'fill-color': fade(ROAD), 'fill-antialias': false } },
    road('road-edge', true),
    road('road', false),
    { id: 'path', type: 'line', source: SRC, 'source-layer': 'transportation', minzoom: 15, filter: ['all', LINE, ['==', ['get', 'class'], 'path'], ['!=', ['get', 'brunnel'], 'tunnel']],
      paint: { 'line-color': '#fff', 'line-dasharray': [1, 1.6], 'line-width': ['interpolate', ['linear'], ['zoom'], 15, 1, 19, 3] } },
    { id: 'road-label', type: 'symbol', source: SRC, 'source-layer': 'transportation_name', minzoom: 12, filter: ['in', ['get', 'class'], ['literal', [...ROADS]]],
      layout: { 'symbol-placement': 'line', 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-rotation-alignment': 'map', 'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10.5, 16, 15] },
      paint: { 'text-color': LABEL, 'text-halo-color': 'rgba(255,255,255,.7)', 'text-halo-width': 1.2 } },
    { id: 'poi', type: 'symbol', source: SRC, 'source-layer': 'poi', minzoom: 12, filter: ['all', ['<=', ['get', 'rank'], 8], ['in', ['get', 'class'], ['literal', POIS]]],
      layout: { 'icon-image': ['get', 'class'], 'icon-size': 1.1, 'text-anchor': 'top', 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-max-width': 7, 'text-offset': [0, .7], 'text-size': ['interpolate', ['linear'], ['zoom'], 12.5, 11, 16, 15] },
      paint: { 'text-color': ['match', ['get', 'class'], ['park', 'zoo'], POI_PARK, POI], 'text-halo-color': 'rgba(255,255,255,.55)', 'text-halo-width': 1.2 } },
  ];

  return { transform: IosMapStyle.transform(layers) };
})();
