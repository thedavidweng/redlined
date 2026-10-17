// Map content: the stations as red count pins, the rider, the out-of-service zones and the walking route. Every marker is a symbol, fill or line layer whose
// image is drawn once to a 3x canvas (IosMapImages.draw), never a DOM node, so panning costs the UI nothing. Classic script (file://).
//   MobiMarkers.add(map, MobiData)  →  Promise of { select(n), clear() }, resolves when the layers are on the map.
//   select(n) shows the walking route to station n; clear() hides it. Feature state only: no tiling, no layout, no DOM.
globalThis.MobiMarkers = (() => {
  const RED = '#da291c', BLUE = '#3c83f7';
  const { draw } = IosMapImages;

  // Station pin, 50 x 56 pt, anchor bottom: red disc with a white edge, a rim track in dark red, and a white arc over it for the share of docks holding a bike.
  function pin(map, id, count, share) {
    draw(map, id, 55, 62, g => {
      g.scale(1.1, 1.1);
      const cx = 25, cy = 25;
      g.lineJoin = 'round';
      g.beginPath(); g.moveTo(19.5, 44); g.lineTo(25, 54.5); g.lineTo(30.5, 44); g.closePath();
      g.fillStyle = g.strokeStyle = '#fff'; g.lineWidth = 4; g.fill(); g.stroke();
      g.beginPath(); g.arc(cx, cy, 23, 0, 2 * Math.PI); g.fillStyle = '#fff'; g.fill();
      g.beginPath(); g.moveTo(20.5, 43); g.lineTo(25, 52); g.lineTo(29.5, 43); g.closePath(); g.fillStyle = RED; g.fill();
      g.beginPath(); g.arc(cx, cy, 21, 0, 2 * Math.PI); g.fillStyle = RED; g.fill();
      g.lineCap = 'round'; g.lineWidth = 2.6;
      g.beginPath(); g.arc(cx, cy, 18, 0, 2 * Math.PI); g.strokeStyle = '#b3211a'; g.stroke();
      if (share > 0) { g.beginPath(); g.arc(cx, cy, 18, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * share); g.strokeStyle = '#fff'; g.stroke(); }
      g.fillStyle = '#fff'; g.font = '700 23px Urbanist, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillText(String(count), cx, cy + 8);
    });
  }

  // Unavailable station marker: dark disc with a white rim and horizontal no-entry bar, with no count.
  function unavailable(map, id) {
    draw(map, id, 55, 62, g => {
      g.scale(1.1, 1.1);
      const cx = 25, cy = 25;
      g.beginPath(); g.arc(cx, cy, 22, 0, 2 * Math.PI); g.fillStyle = '#fff'; g.fill();
      g.beginPath(); g.arc(cx, cy, 19.5, 0, 2 * Math.PI); g.fillStyle = '#5c6469'; g.fill();
      g.lineCap = 'butt'; g.lineWidth = 6; g.strokeStyle = '#fff';
      g.beginPath(); g.moveTo(cx - 13, cy); g.lineTo(cx + 13, cy); g.stroke();
    });
  }

  // Out-of-service hatching: thin red diagonals on a pale pink ground, tiled by the fill-pattern.
  function hatch(map, id) {
    draw(map, id, 4, 4, g => {
      g.fillStyle = 'rgba(218,41,28,.07)'; g.fillRect(0, 0, 4, 4);
      g.strokeStyle = 'rgba(218,41,28,.6)'; g.lineWidth = .8;
      g.beginPath();
      for (const o of [-4, 0, 4]) { g.moveTo(o, 4); g.lineTo(o + 4, 0); }
      g.stroke();
    });
  }

  async function add(map, data) {
    await document.fonts.load('700 23px Urbanist').catch(() => {});
    data.stations.forEach(s => s.operational ? pin(map, `mobi-pin-${s.n}`, s.bikes, s.bikes / (s.bikes + s.docks)) : unavailable(map, `mobi-pin-${s.n}`));
    draw(map, 'mobi-user', 24, 24, g => {
      g.beginPath(); g.arc(12, 12, 8.5, 0, 2 * Math.PI); g.fillStyle = BLUE; g.fill();
    });
    hatch(map, 'mobi-hatch');

    const beforeLabels = map.getStyle().layers.find(l => l.type === 'symbol')?.id;
    map.addSource('zones', { type: 'geojson', data: data.zones });
    map.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones', paint: { 'fill-pattern': 'mobi-hatch' } }, beforeLabels);
    map.addLayer({ id: 'zones-line', type: 'line', source: 'zones', layout: { 'line-join': 'round' }, paint: { 'line-color': RED, 'line-width': 1.2 } }, beforeLabels);

    // Selecting costs no tiling: every walk is in the source from the start and a tap only flips feature state (paint opacity).
    map.addSource('mobi-routes', { type: 'geojson', data: data.routes });
    map.addSource('mobi-user', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: data.user } } });
    map.addSource('stations', { type: 'geojson', data: data.stationPoints });
    const keep = { 'icon-allow-overlap': true, 'icon-ignore-placement': true };
    map.addLayer({ id: 'mobi-route', type: 'line', source: 'mobi-routes', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': RED, 'line-width': 3.2, 'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 1, 0] } });
    map.addLayer({ id: 'mobi-user', type: 'symbol', source: 'mobi-user', layout: { ...keep, 'icon-image': 'mobi-user' } });
    map.addLayer({ id: 'stations', type: 'symbol', source: 'stations', layout: { ...keep, 'icon-anchor': 'bottom', 'icon-image': ['concat', 'mobi-pin-', ['get', 'n']] } });

    let chosen = null;
    const set = n => {
      if (chosen != null) map.setFeatureState({ source: 'mobi-routes', id: chosen + 1 }, { selected: false });
      if (n != null) map.setFeatureState({ source: 'mobi-routes', id: n + 1 }, { selected: true });
      chosen = n;
    };
    return { select: set, clear: () => set(null) };
  }

  return { add };
})();
