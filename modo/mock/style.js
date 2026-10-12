// Turns OpenFreeMap's Bright style into the light grey map the real app draws (Mapbox "light"): grey ground, white roads with a faint edge, soft green
// parks, pale blue water, small grey POI icons and grey labels. Bright's 119 layers become 12 (as in lime/mock/style.js): only what shows around the
// demo area, with roads, street labels and POIs each merged into one layer, because every layer costs a frame on slow GPUs.
// The tiles, sprite and glyphs stay OpenFreeMap's own. Classic script (file://). The swap and the sprite greying are the shared ../../_ios/map-style.js.
// This is a product-side copy of the idea (own palette, own layer list); there is no shared keep-list helper in _ios/ to reuse.
//   map.setStyle(IosMapStyle.BRIGHT, { transformStyle: ModoStyle.transform })  →  swaps the layers before the style loads
//   ModoStyle.mute(map)  →  greys the sprite icons, once the style has loaded
globalThis.ModoStyle = (() => {
  const GROUND = '#eff0f0', PARK = '#d9ead3', WATER = '#bfe0f3', ROAD = '#fff', EDGE = '#e4e5e5', LABEL = '#727679';
  const SRC = 'openmaptiles';
  const ROADS = ['minor', 'service', 'track', 'tertiary', 'secondary', 'primary', 'trunk'];
  const LINE = ['==', ['geometry-type'], 'LineString'];
  const onBridge = ['==', ['get', 'brunnel'], 'bridge'];
  const name = ['coalesce', ['get', 'name_en'], ['get', 'name']];
  const POIS = ['restaurant', 'lodging', 'school', 'college', 'library', 'park', 'harbor', 'museum', 'theatre', 'hospital', 'railway', 'cafe'];

  // Road width in pt by class at zoom 14 / 16 / 18 (Mapbox draws streets wider at this zoom than Bright does).
  const WIDTH = { minor: [1.5, 5, 18], tertiary: [3, 9, 24], secondary: [4, 11, 28], primary: [5, 13, 30], trunk: [5, 13, 30] };
  const byClass = (extra, stop) => ['match', ['get', 'class'],
    ['minor', 'service', 'track'], WIDTH.minor[stop] + extra, ['tertiary'], WIDTH.tertiary[stop] + extra, ['secondary'], WIDTH.secondary[stop] + extra,
    'primary', WIDTH.primary[stop] + extra, WIDTH.trunk[stop] + extra];
  const width = extra => ['interpolate', ['exponential', 1.6], ['zoom'], 13.5, 0, 14, byClass(extra, 0), 16, byClass(extra, 1), 18, byClass(extra, 2)];

  const layers = () => [
    { id: 'background', type: 'background', paint: { 'background-color': GROUND } },
    { id: 'grass', type: 'fill', source: SRC, 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'grass'], paint: { 'fill-color': PARK } },
    { id: 'park', type: 'fill', source: SRC, 'source-layer': 'park', paint: { 'fill-color': PARK } },
    { id: 'water', type: 'fill', source: SRC, 'source-layer': 'water', filter: ['!=', ['get', 'brunnel'], 'tunnel'], paint: { 'fill-color': WATER } },
    { id: 'plaza', type: 'fill', source: SRC, 'source-layer': 'transportation', filter: ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false], paint: { 'fill-color': ROAD, 'fill-antialias': false } },
    { id: 'road-edge', type: 'line', source: SRC, 'source-layer': 'transportation', minzoom: 14, layout: { 'line-cap': 'round', 'line-join': 'round' },
      filter: ['all', LINE, ['!', ['in', ['get', 'brunnel'], ['literal', ['bridge', 'tunnel']]]], ['in', ['get', 'class'], ['literal', ROADS]]], paint: { 'line-color': EDGE, 'line-width': width(1.5) } },
    { id: 'road', type: 'line', source: SRC, 'source-layer': 'transportation', minzoom: 14, layout: { 'line-cap': 'round', 'line-join': 'round' },
      filter: ['all', LINE, ['!', ['in', ['get', 'brunnel'], ['literal', ['bridge', 'tunnel']]]], ['in', ['get', 'class'], ['literal', ROADS]]], paint: { 'line-color': ROAD, 'line-width': width(0) } },
    { id: 'path', type: 'line', source: SRC, 'source-layer': 'transportation', minzoom: 15, filter: ['all', LINE, ['==', ['get', 'class'], 'path'], ['!=', ['get', 'brunnel'], 'tunnel']],
      paint: { 'line-color': ROAD, 'line-width': ['interpolate', ['exponential', 1.2], ['zoom'], 15, 1.2, 20, 4] } },
    { id: 'bridge-edge', type: 'line', source: SRC, 'source-layer': 'transportation', minzoom: 14, layout: { 'line-join': 'round' },
      filter: ['all', LINE, onBridge, ['in', ['get', 'class'], ['literal', ROADS]]], paint: { 'line-color': EDGE, 'line-width': width(1.5) } },
    { id: 'bridge', type: 'line', source: SRC, 'source-layer': 'transportation', minzoom: 14, layout: { 'line-join': 'round' },
      filter: ['all', LINE, onBridge, ['in', ['get', 'class'], ['literal', ROADS]]], paint: { 'line-color': ROAD, 'line-width': width(0) } },
    { id: 'road-label', type: 'symbol', source: SRC, 'source-layer': 'transportation_name', minzoom: 14.5, filter: ['in', ['get', 'class'], ['literal', [...ROADS, 'path']]],
      layout: { 'symbol-placement': 'line', 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-rotation-alignment': 'map', 'text-size': 13 },
      paint: { 'text-color': LABEL, 'text-halo-color': GROUND, 'text-halo-width': 1.5 } },
    { id: 'poi', type: 'symbol', source: SRC, 'source-layer': 'poi', minzoom: 15, filter: ['all', ['>=', ['get', 'rank'], 1], ['in', ['get', 'class'], ['literal', POIS]]],
      layout: { 'icon-image': ['get', 'class'], 'icon-size': .85, 'text-anchor': 'top', 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-max-width': 8, 'text-offset': [0, .6], 'text-size': 13 },
      paint: { 'icon-opacity': .8, 'text-color': LABEL, 'text-halo-color': GROUND, 'text-halo-width': 1.5 } },
  ];

  return { transform: IosMapStyle.transform(layers), mute: IosMapStyle.mute };
})();
