// Turns OpenFreeMap's Bright style into the light Mapbox look of the real app: near-white land, white roads with a thin grey-lilac edge,
// pale grey blocks with a hairline outline, pale green parks, no sidewalk dashes, no POI icons, orange-brown labels for food and grey-brown for the rest.
// Bright's 119 layers become 12. The tiles and glyphs stay OpenFreeMap's own. Classic script (file://).
//   map.setStyle(IosMapStyle.BRIGHT, { transformStyle: MobiStyle.transform })  →  swaps the layers before the style loads
globalThis.MobiStyle = (() => {
  const GROUND = '#f9fafb', PARK = '#f1faf1', WATER = '#e6eef5', BLOCK = '#f1f3f4', BLOCK_EDGE = '#d9dce1', ROAD = '#fff', EDGE = '#d2d5e2';
  const STREET = '#2b2b2b', FOOD_TEXT = '#b44b0c', TEXT = '#60544c';
  const SRC = 'openmaptiles';
  const ROADS = ['minor', 'service', 'track', 'tertiary', 'secondary', 'primary', 'trunk'];
  const LINE = ['==', ['geometry-type'], 'LineString'];
  const onBridge = ['==', ['get', 'brunnel'], 'bridge'];
  const name = ['coalesce', ['get', 'name_en'], ['get', 'name']];
  const FOOD = ['restaurant', 'fast_food', 'cafe', 'bar', 'ice_cream', 'bakery', 'pub'];
  const POIS = [...FOOD, 'lodging', 'school', 'college', 'library', 'park', 'harbor', 'grocery', 'shop', 'dentist', 'fitness_centre', 'museum', 'theatre', 'cinema', 'bank', 'hospital', 'clothing_store'];

  // Width in pt at zoom z for a road class, from Bright's own two-stop curves (exponential 1.2): [zoom, width, zoom, width].
  const FAT = 1.05;
  const grow = ([z0, w0, z1, w1]) => z => FAT * (w0 + (w1 - w0) * (1.2 ** (z - z0) - 1) / (1.2 ** (z1 - z0) - 1));
  const WIDTH = { minor: [14, 2.5, 20, 11.5], secondary: [8, .5, 20, 13], primary: [9, .5, 20, 18], trunk: [7, .5, 20, 18] };
  const EDGE_WIDTH = { minor: [14, 3.6, 20, 13.5], secondary: [8, 1.3, 20, 15], primary: [9, 1.3, 20, 20], trunk: [7, 1.3, 20, 20] };
  const byClass = (table, z) => ['match', ['get', 'class'],
    ['minor', 'service', 'track'], grow(table.minor)(z), ['secondary', 'tertiary'], grow(table.secondary)(z),
    'primary', grow(table.primary)(z), grow(table.trunk)(z)];
  const width = table => ['interpolate', ['exponential', 1.2], ['zoom'], 13.5, 0, 14, byClass(table, 14), 20, byClass(table, 20)];
  const noTunnel = ['!', ['in', ['get', 'brunnel'], ['literal', ['bridge', 'tunnel']]]];

  const layers = () => [
    { id: 'background', type: 'background', paint: { 'background-color': GROUND } },
    { id: 'grass', type: 'fill', source: SRC, 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'grass'], paint: { 'fill-color': PARK } },
    { id: 'park', type: 'fill', source: SRC, 'source-layer': 'park', paint: { 'fill-color': PARK } },
    { id: 'water', type: 'fill', source: SRC, 'source-layer': 'water', filter: ['!=', ['get', 'brunnel'], 'tunnel'], paint: { 'fill-color': WATER } },
    { id: 'building', type: 'fill', source: SRC, 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': BLOCK, 'fill-outline-color': BLOCK_EDGE } },
    { id: 'plaza', type: 'fill', source: SRC, 'source-layer': 'transportation', filter: ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false], paint: { 'fill-color': ROAD, 'fill-antialias': false } },
    { id: 'road-edge', type: 'line', source: SRC, 'source-layer': 'transportation', minzoom: 14, layout: { 'line-cap': 'round', 'line-join': 'round' },
      filter: ['all', LINE, noTunnel, ['in', ['get', 'class'], ['literal', ROADS]]], paint: { 'line-color': EDGE, 'line-width': width(EDGE_WIDTH) } },
    { id: 'road', type: 'line', source: SRC, 'source-layer': 'transportation', minzoom: 14, layout: { 'line-cap': 'round', 'line-join': 'round' },
      filter: ['all', LINE, noTunnel, ['in', ['get', 'class'], ['literal', ROADS]]], paint: { 'line-color': ROAD, 'line-width': width(WIDTH) } },
    { id: 'bridge-edge', type: 'line', source: SRC, 'source-layer': 'transportation', minzoom: 14, layout: { 'line-join': 'round' },
      filter: ['all', LINE, onBridge, ['in', ['get', 'class'], ['literal', ROADS]]], paint: { 'line-color': EDGE, 'line-width': width(EDGE_WIDTH) } },
    { id: 'bridge', type: 'line', source: SRC, 'source-layer': 'transportation', minzoom: 14, layout: { 'line-join': 'round' },
      filter: ['all', LINE, onBridge, ['in', ['get', 'class'], ['literal', ROADS]]], paint: { 'line-color': ROAD, 'line-width': width(WIDTH) } },
    { id: 'road-label', type: 'symbol', source: SRC, 'source-layer': 'transportation_name', minzoom: 15, filter: ['in', ['get', 'class'], ['literal', ROADS]],
      layout: { 'symbol-placement': 'line', 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-rotation-alignment': 'map', 'text-size': 12 },
      paint: { 'text-color': STREET, 'text-halo-color': GROUND, 'text-halo-width': 1.5 } },
    // No POI icons in the real app: text only, orange-brown for food and drink.
    { id: 'poi', type: 'symbol', source: SRC, 'source-layer': 'poi', minzoom: 15.5, filter: ['all', ['>=', ['get', 'rank'], 1], ['in', ['get', 'class'], ['literal', POIS]]],
      layout: { 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-max-width': 7, 'text-size': 11.5, 'text-padding': 10 },
      paint: { 'text-color': ['match', ['get', 'class'], FOOD, FOOD_TEXT, TEXT], 'text-halo-color': GROUND, 'text-halo-width': 1.5 } },
  ];

  return { transform: IosMapStyle.transform(layers) };
})();
