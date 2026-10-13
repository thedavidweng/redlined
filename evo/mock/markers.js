// Home-screen map content: cars, parking, charging stations and the rider. Every marker is a symbol layer whose image is drawn once to a 3x canvas
// (IosMapImages.draw) from the IPA's pin PNGs, never a DOM node, so panning costs the UI nothing. Classic script (file://).
//   EvoMarkers.add(map, EvoData)  →  Promise of { select(n), clear() }, resolves when the layers are on the map.
//   select(n) swaps car n for the selected pin; clear() restores the home look. selectParking(n) / clearParking() do the same for a parking sign. Feature state only: no tiling, no layout, no DOM.
globalThis.EvoMarkers = (() => {
  const { draw } = IosMapImages;
  // The IPA's PNGs are a fallback set (the Evo logo on the pin, bike parking); the live app draws a car glyph, so every marker is drawn here from the reference crops.
  const CAR = new Path2D('M1 8.2V6.4c0-.8.5-1.4 1.3-1.6L5 4l2-2.2C7.300 1.400 7.800 1.200 8.300 1.200h5c.5 0 1 .2 1.300.6L16.500 4l2.700.7c.8.2 1.300.8 1.300 1.600v1.800c0 .5-.4.8-.8.8h-1.100a2.300 2.300 0 0 0-4.500 0H7.400a2.300 2.300 0 0 0-4.500 0H1.800c-.4 0-.8-.3-.8-.8z');
  function car(g, x, y, scale, color, rack = true) {  // the car glyph, 21 x 11 units at scale, with the roof rack
    g.save(); g.translate(x, y); g.scale(scale, scale);
    g.strokeStyle = color; g.lineWidth = 1.1; g.lineJoin = 'round'; g.lineCap = 'round';
    g.stroke(CAR);
    for (const cx of [5.200, 15.800]) { g.beginPath(); g.arc(cx, 9.100, 2.200, 0, 2 * Math.PI); g.fillStyle = 'rgba(0,0,0,0)'; g.stroke(); }
    if (rack) { g.beginPath(); g.moveTo(7.500, 0); g.lineTo(14, 0); g.moveTo(8.500, 0); g.lineTo(8.500, 1.200); g.moveTo(13, 0); g.lineTo(13, 1.200); g.stroke(); }
    g.restore();
  }
  function balloon(g, fill, ink) {
    g.beginPath(); g.moveTo(17, 42); g.bezierCurveTo(17, 42, 1.200, 28, 1.200, 17); g.arc(17, 17, 15.800, Math.PI, 0); g.bezierCurveTo(32.800, 28, 17, 42, 17, 42); g.closePath();
    g.fillStyle = fill; g.fill(); g.lineWidth = 1; g.strokeStyle = '#000'; g.stroke();
    car(g, 6.500, 12.500, 1.050, ink);
  }
  function sign(g, w, h) {
    g.beginPath(); g.roundRect(1, 1, w - 2, h - 6, 5); g.fillStyle = '#c9ecf8'; g.fill(); g.lineWidth = 1.500; g.strokeStyle = '#000'; g.stroke();
    g.fillStyle = '#000'; g.fillRect(w / 2 - 1.200, h - 5.500, 2.400, 5.500);
  }
  function parking(g) {
    sign(g, 26, 40);
    g.beginPath(); g.arc(13, 11, 7.500, 0, 2 * Math.PI); g.fillStyle = '#000'; g.fill();
    g.fillStyle = '#fff'; g.font = '600 11px -apple-system, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', 13, 11.500);
    car(g, 3.500, 22, .95, '#000');
  }
  function parkingSelected(g) {  // the tapped sign, as the reference shows it: black with a cyan edge, stem, P disc and car
    const w = 26, h = 40, cyan = '#00b5e6';
    g.beginPath(); g.roundRect(1, 1, w - 2, h - 6, 5); g.fillStyle = '#000'; g.fill(); g.lineWidth = 1.800; g.strokeStyle = cyan; g.stroke();
    g.fillStyle = cyan; g.fillRect(w / 2 - 1.200, h - 5.500, 2.400, 5.500);
    g.beginPath(); g.arc(13, 11, 7.500, 0, 2 * Math.PI); g.fill();
    g.fillStyle = '#000'; g.font = '600 11px -apple-system, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', 13, 11.500);
    car(g, 3.500, 22, .95, cyan);
  }
  function charging(g) {  // a plug, pale cyan with a cyan edge, and a black bolt
    g.beginPath(); g.roundRect(4, 11, 18, 14, 7); g.moveTo(8, 12); g.lineTo(8, 2); g.moveTo(18, 12); g.lineTo(18, 2);
    g.lineWidth = 6.500; g.strokeStyle = '#00b9e3'; g.lineCap = 'round'; g.stroke(); g.lineWidth = 4.300; g.strokeStyle = '#c9ecf8'; g.stroke();
    g.beginPath(); g.moveTo(14.500, 8); g.lineTo(9.500, 18); g.lineTo(13, 18); g.lineTo(11.500, 27); g.lineTo(17, 15.500); g.lineTo(13, 15.500); g.lineTo(15.500, 8); g.closePath(); g.fillStyle = '#000'; g.fill();
  }


  async function add(map, data) {
    for (const [id, w, h, paint] of [['evo-car', 34, 42.5, g => balloon(g, '#000', '#00b9e3')], ['evo-car-selected', 34, 42.5, g => balloon(g, '#00b5e6', '#000')],
      ['evo-parking', 26, 40, parking], ['evo-parking-selected', 26, 40, parkingSelected], ['evo-charging', 26, 36, charging]]) draw(map, id, w, h, paint);
    // The rider: Mapbox's puck, a blue dot with a white edge and a soft shadow, no heading cone.
    draw(map, 'evo-user', 32, 32, g => {
      const disc = (r, fill) => { g.beginPath(); g.arc(16, 16, r, 0, 2 * Math.PI); g.fillStyle = fill; g.fill(); };
      g.shadowColor = '#0004'; g.shadowBlur = 4; g.shadowOffsetY = 1;
      disc(11.5, '#fff'); g.shadowColor = 'transparent';
      disc(8.5, '#4285f4');
    });

    map.addSource('evo-charging', { type: 'geojson', data: data.charging });
    map.addSource('evo-parking', { type: 'geojson', data: data.parking });
    map.addSource('evo-user', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: data.user.coordinates } } });
    map.addSource('evo-cars', { type: 'geojson', data: data.vehicles });
    // Pins overlap, as on the real map: no collision, and nothing taken out of the way. The lower pin draws on top (viewport-y order).
    const pin = { 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-anchor': 'bottom' };
    const shown = (on = 1, off = 0) => ['case', ['boolean', ['feature-state', 'selected'], false], on, off];
    map.addLayer({ id: 'evo-charging', type: 'symbol', source: 'evo-charging', layout: { ...pin, 'icon-image': 'evo-charging' } });
    map.addLayer({ id: 'evo-parking', type: 'symbol', source: 'evo-parking', layout: { ...pin, 'icon-image': 'evo-parking' }, paint: { 'icon-opacity': shown(0, 1) } });
    map.addLayer({ id: 'evo-parking-selected', type: 'symbol', source: 'evo-parking', layout: { ...pin, 'icon-image': 'evo-parking-selected' }, paint: { 'icon-opacity': shown() } });
    map.addLayer({ id: 'evo-user', type: 'symbol', source: 'evo-user', layout: { ...pin, 'icon-anchor': 'center', 'icon-image': 'evo-user' } });
    map.addLayer({ id: 'evo-cars', type: 'symbol', source: 'evo-cars', layout: { ...pin, 'icon-image': 'evo-car' }, paint: { 'icon-opacity': shown(0, 1) } });
    map.addLayer({ id: 'evo-car-selected', type: 'symbol', source: 'evo-cars', layout: { ...pin, 'icon-image': 'evo-car-selected' }, paint: { 'icon-opacity': shown() } });

    // One feature-state setter per source: cars and parking spots each have at most one selected.
    const chosen = {}, setter = source => n => {
      if (chosen[source] != null) map.setFeatureState({ source, id: chosen[source] + 1 }, { selected: false });
      if (n != null) map.setFeatureState({ source, id: n + 1 }, { selected: true });
      chosen[source] = n;
    };
    const set = setter('evo-cars'), setParking = setter('evo-parking');
    return { select: set, clear: () => set(null), selectParking: setParking, clearParking: () => setParking(null) };
  }

  return { add };
})();
