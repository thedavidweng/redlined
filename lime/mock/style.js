// Turns OpenFreeMap's Bright style into the light, quiet map the real app uses: pale grey ground, white roads with a thin grey edge,
// soft green parks, pale blue water, grey blocks, small grey POI icons with grey labels. Bright's 119 layers become 13: only what
// shows around the demo area, and roads, street labels and POIs each merged into one layer, because every layer costs a frame on slow GPUs.
// The tiles, sprite and glyphs stay OpenFreeMap's own. Classic script (file://). The swap and the sprite greying are the shared ../../_ios/map-style.js.
//   map.setStyle(IosMapStyle.BRIGHT, { transformStyle: LimeStyle.transform })  →  swaps the layers before the style loads
//   LimeStyle.mute(map)  →  greys the sprite icons, once the style has loaded
globalThis.LimeStyle = (() => {
  const GROUND = '#f7f7f7', PARK = '#cef8ce', WATER = '#cee4fd', BLOCK = '#e0e0e0', ROAD = '#fff', EDGE = '#e6e6e6', LABEL = '#7b8387';
  const SRC = 'openmaptiles';
  const ROADS = ['minor', 'service', 'track', 'tertiary', 'secondary', 'primary', 'trunk'];
  const LINE = ['==', ['geometry-type'], 'LineString'];
  const onBridge = ['==', ['get', 'brunnel'], 'bridge'];
  const name = ['coalesce', ['get', 'name_en'], ['get', 'name']];
  // POI classes the real app shows at this size: food, lodging, school, library, parks, harbour, a few shops.
  const POIS = ['restaurant', 'fast_food', 'cafe', 'bar', 'lodging', 'school', 'college', 'library', 'park', 'harbor', 'grocery', 'shop', 'dentist', 'fitness_centre'];

  // Width in pt at zoom z for a road class, from Bright's own two-stop curves (exponential 1.2): [zoom, width, zoom, width].
  const FAT = 1.15;  // the real app draws streets a little wider than Bright does
  const grow = ([z0, w0, z1, w1]) => z => FAT * (w0 + (w1 - w0) * (1.2 ** (z - z0) - 1) / (1.2 ** (z1 - z0) - 1));
  const WIDTH = { minor: [14, 2.5, 20, 11.5], secondary: [8, .5, 20, 13], primary: [9, .5, 20, 18], trunk: [7, .5, 20, 18] };
  const EDGE_WIDTH = { minor: [14, 4, 20, 15], secondary: [8, 1.5, 20, 17], primary: [9, 1.5, 20, 22], trunk: [7, 1.5, 20, 22] };
  const byClass = (table, z) => ['match', ['get', 'class'],
    ['minor', 'service', 'track'], grow(table.minor)(z), ['secondary', 'tertiary'], grow(table.secondary)(z),
    'primary', grow(table.primary)(z), grow(table.trunk)(z)];
  const width = table => ['interpolate', ['exponential', 1.2], ['zoom'], 13.5, 0, 14, byClass(table, 14), 20, byClass(table, 20)];

  const layers = () => [
    { id: 'background', type: 'background', paint: { 'background-color': GROUND } },
    { id: 'grass', type: 'fill', source: SRC, 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'grass'], paint: { 'fill-color': PARK } },
    { id: 'park', type: 'fill', source: SRC, 'source-layer': 'park', paint: { 'fill-color': PARK } },
    { id: 'water', type: 'fill', source: SRC, 'source-layer': 'water', filter: ['!=', ['get', 'brunnel'], 'tunnel'], paint: { 'fill-color': WATER } },
    { id: 'building', type: 'fill', source: SRC, 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': BLOCK, 'fill-antialias': false } },
    { id: 'plaza', type: 'fill', source: SRC, 'source-layer': 'transportation', filter: ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false], paint: { 'fill-color': ROAD, 'fill-antialias': false } },
    { id: 'road-edge', type: 'line', source: SRC, 'source-layer': 'transportation', minzoom: 14, layout: { 'line-cap': 'round', 'line-join': 'round' },
      filter: ['all', LINE, ['!', ['in', ['get', 'brunnel'], ['literal', ['bridge', 'tunnel']]]], ['in', ['get', 'class'], ['literal', ROADS]]], paint: { 'line-color': EDGE, 'line-width': width(EDGE_WIDTH) } },
    { id: 'road', type: 'line', source: SRC, 'source-layer': 'transportation', minzoom: 14, layout: { 'line-cap': 'round', 'line-join': 'round' },
      filter: ['all', LINE, ['!', ['in', ['get', 'brunnel'], ['literal', ['bridge', 'tunnel']]]], ['in', ['get', 'class'], ['literal', ROADS]]], paint: { 'line-color': ROAD, 'line-width': width(WIDTH) } },
    { id: 'path', type: 'line', source: SRC, 'source-layer': 'transportation', minzoom: 15, filter: ['all', LINE, ['==', ['get', 'class'], 'path'], ['!=', ['get', 'brunnel'], 'tunnel']],
      paint: { 'line-color': ROAD, 'line-dasharray': [1.1, 1.1], 'line-width': ['interpolate', ['exponential', 1.2], ['zoom'], 15, 1.2, 20, 4] } },
    { id: 'bridge-edge', type: 'line', source: SRC, 'source-layer': 'transportation', minzoom: 14, layout: { 'line-join': 'round' },
      filter: ['all', LINE, onBridge, ['in', ['get', 'class'], ['literal', ROADS]]], paint: { 'line-color': EDGE, 'line-width': width(EDGE_WIDTH) } },
    { id: 'bridge', type: 'line', source: SRC, 'source-layer': 'transportation', minzoom: 14, layout: { 'line-join': 'round' },
      filter: ['all', LINE, onBridge, ['in', ['get', 'class'], ['literal', ROADS]]], paint: { 'line-color': ROAD, 'line-width': width(WIDTH) } },
    { id: 'road-label', type: 'symbol', source: SRC, 'source-layer': 'transportation_name', minzoom: 15, filter: ['in', ['get', 'class'], ['literal', [...ROADS, 'path']]],
      layout: { 'symbol-placement': 'line', 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-rotation-alignment': 'map', 'text-size': 13 },
      paint: { 'text-color': LABEL, 'text-halo-color': GROUND, 'text-halo-width': 1.5 } },
    { id: 'poi', type: 'symbol', source: SRC, 'source-layer': 'poi', minzoom: 15.5, filter: ['all', ['>=', ['get', 'rank'], 1], ['in', ['get', 'class'], ['literal', POIS]]],
      layout: { 'icon-image': ['get', 'class'], 'icon-size': .85, 'text-anchor': 'top', 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-max-width': 9, 'text-offset': [0, .6], 'text-size': 12 },
      paint: { 'icon-opacity': .8, 'text-color': LABEL, 'text-halo-color': GROUND, 'text-halo-width': 1.5 } },
  ];

  return { transform: IosMapStyle.transform(layers), mute: IosMapStyle.mute };
})();
