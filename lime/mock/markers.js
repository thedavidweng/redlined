// Home-screen map content: scooters, parking, zones, the rider, the walk. Every marker is a symbol layer whose image is drawn
// once to a 3x canvas (IosMapImages.draw), never a DOM node, so panning costs the UI nothing. Classic script (file://).
//   LimeMarkers.add(map, LimeData)  →  Promise of { select(n), clear() }, resolves when the layers are on the map.
//   select(n) turns scooter n into the balloon pin and shows only its walk (the home walk to the nearest one hides); clear() restores the home look. Feature state only: no tiling, no layout, no DOM.
globalThis.LimeMarkers = (() => {
  const GREEN = '#00dd00', RED = '#f23a34', SLATE = '#363d42';
  const { load, draw, tint: tinted } = IosMapImages;
  const disc = (g, x, y, r, fill) => { g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.fillStyle = fill; g.fill(); };
  const roundRect = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  // flip: the IPA scooter glyph faces right; the map pins show it with the handlebar on the left.
  const glyph = (g, img, cx, cy, size, flip) => {
    g.save(); g.translate(cx, cy); if (flip) g.scale(-1, 1);
    g.drawImage(img, -size / 2, -size / 2, size, size); g.restore();
  };

  async function add(map, data) {
    await document.fonts.load('500 13px Poppins').catch(() => {});
    const [scooter, bike, walker] = await Promise.all([load(LimeAssets.scooter), load(LimeAssets.bike), load(LimeAssets.walker)]);

    // Scooter: white disc, green ring, black glyph. The nearest one is larger.
    for (const [id, d, glyphSize] of [['lime-scooter', 32, 21.6], ['lime-scooter-near', 40, 27.4]]) {
      draw(map, id, d, d, g => { disc(g, d / 2, d / 2, d / 2, GREEN); disc(g, d / 2, d / 2, d / 2 - 2.3, '#fff'); glyph(g, scooter, d / 2, d / 2 + .3, glyphSize, true); });
    }
    // Selected: the same disc as a balloon pin, 40 pt, tail pointing at the scooter (anchor: bottom).
    draw(map, 'lime-pin', 40, 50, g => {
      g.fillStyle = g.strokeStyle = GREEN; g.lineJoin = 'round'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(12.5, 34); g.lineTo(20, 47.5); g.lineTo(27.5, 34); g.closePath(); g.fill(); g.stroke();
      disc(g, 20, 20, 20, GREEN); disc(g, 20, 20, 17.4, '#fff'); glyph(g, scooter, 20, 20.3, 27.4, true);
    });
    draw(map, 'lime-parking', 16, 16, g => {
      roundRect(g, 0, 0, 16, 16, 4); g.fillStyle = '#616c5f'; g.fill();
      glyph(g, tinted(bike, '#fff'), 8, 8.3, 14.4);
    });
    // The rider: blue dot with a white edge and a soft shadow; the heading cone is a separate image so it can rotate.
    draw(map, 'lime-user', 32, 32, g => {
      g.shadowColor = '#0004'; g.shadowBlur = 4; g.shadowOffsetY = 1;
      disc(g, 16, 16, 10.8, '#fff'); g.shadowColor = 'transparent';
      disc(g, 16, 16, 8.3, '#3c83f7');
    });
    draw(map, 'lime-cone', 112, 112, g => {
      const fade = g.createRadialGradient(56, 56, 0, 56, 56, 52);
      fade.addColorStop(0, 'rgba(60,131,247,.55)'); fade.addColorStop(1, 'rgba(60,131,247,0)');
      g.beginPath(); g.moveTo(56, 56); g.arc(56, 56, 52, -Math.PI / 2 - .5, -Math.PI / 2 + .5); g.closePath();
      g.fillStyle = fade; g.fill();
    });
    // The walk pill, one image per minute count.
    const pill = minutes => {
      const id = `lime-walk-${minutes}`, text = `${minutes} min`;
      if (map.hasImage(id)) return id;
      const g0 = document.createElement('canvas').getContext('2d');
      g0.font = '500 13px Poppins, system-ui, sans-serif';
      const w = Math.round(25.5 + g0.measureText(text).width + 11);
      draw(map, id, w, 23, g => {
        roundRect(g, 0, 0, w, 23, 8); g.fillStyle = SLATE; g.fill();
        glyph(g, tinted(walker, '#fff'), 15.3, 11.5, 16);
        g.fillStyle = '#fff'; g.font = '500 13px Poppins, system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText(text, 25.5, 12);
      });
      return id;
    };

    const beforeLabels = map.getStyle().layers.find(l => l.type === 'symbol')?.id;
    map.addSource('zones', { type: 'geojson', data: data.zones });
    map.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones', paint: { 'fill-color': RED, 'fill-opacity': .35 } }, beforeLabels);
    map.addLayer({ id: 'zones-line', type: 'line', source: 'zones', layout: { 'line-join': 'round' }, paint: { 'line-color': RED, 'line-width': 3 } }, beforeLabels);

    // Selecting must cost no tiling: every scooter's walk (route, pill, pin) is in the sources from the start, and a tap only flips
    // feature state, which changes paint opacity. A setData or setPaintProperty per tap drops frames on slow GPUs.
    const walks = data.vehicles.features.map((f, i) => ({ id: f.id, w: data.walk(i) }));
    const near = data.nearest;
    map.addSource('lime-parking', { type: 'geojson', data: data.parking });
    map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: walks.map(({ id, w }, i) => ({ ...w.route, id, properties: { n: i } })) } });
    map.addSource('lime-walks', { type: 'geojson', data: { type: 'FeatureCollection', features: walks.map(({ id, w }, i) => ({ type: 'Feature', id, properties: { n: i, image: pill(w.minutes) }, geometry: { type: 'Point', coordinates: w.coordinates } })) } });
    map.addSource('lime-user', { type: 'geojson', data: { type: 'Feature', properties: { heading: data.user.heading }, geometry: { type: 'Point', coordinates: data.user.coordinates } } });
    map.addSource('vehicles', { type: 'geojson', data: data.vehicles });
    const pin = { 'icon-allow-overlap': true, 'icon-ignore-placement': true };
    const shown = (on = 1, off = 0) => ['case', ['boolean', ['feature-state', 'selected'], false], on, off];
    // The home route and pill (nearest scooter) show only while nothing is selected: `away` is set on that one feature whenever any scooter is selected.
    const home = ['case', ['any', ['boolean', ['feature-state', 'selected'], false], ['boolean', ['feature-state', 'away'], false]], 0, 1];
    const dots = { 'line-width': 3.4, 'line-dasharray': [0.01, 2.4] }, round = { 'line-cap': 'round', 'line-join': 'round' };
    map.addLayer({ id: 'lime-parking', type: 'symbol', source: 'lime-parking', layout: { ...pin, 'icon-image': 'lime-parking' } });
    map.addLayer({ id: 'route-home', type: 'line', source: 'route', filter: ['==', ['get', 'n'], near], layout: round, paint: { ...dots, 'line-color': '#5d6770', 'line-opacity': home } });
    map.addLayer({ id: 'route', type: 'line', source: 'route', layout: round, paint: { ...dots, 'line-color': GREEN, 'line-opacity': shown() } });
    map.addLayer({ id: 'lime-cone', type: 'symbol', source: 'lime-user', layout: { ...pin, 'icon-image': 'lime-cone', 'icon-rotate': ['get', 'heading'], 'icon-rotation-alignment': 'map' } });
    map.addLayer({ id: 'vehicles', type: 'symbol', source: 'vehicles', layout: { ...pin, 'icon-image': ['case', ['get', 'near'], 'lime-scooter-near', 'lime-scooter'] }, paint: { 'icon-opacity': shown(0, 1) } });
    map.addLayer({ id: 'lime-selected', type: 'symbol', source: 'vehicles', layout: { ...pin, 'icon-image': 'lime-pin', 'icon-anchor': 'bottom' }, paint: { 'icon-opacity': shown() } });
    map.addLayer({ id: 'lime-user', type: 'symbol', source: 'lime-user', layout: { ...pin, 'icon-image': 'lime-user' } });
    map.addLayer({ id: 'lime-walk', type: 'symbol', source: 'lime-walks', filter: ['==', ['get', 'n'], near], layout: { ...pin, 'icon-image': ['get', 'image'], 'icon-offset': [0, -42.5] }, paint: { 'icon-opacity': home } });
    map.addLayer({ id: 'lime-walk-selected', type: 'symbol', source: 'lime-walks', layout: { ...pin, 'icon-image': ['get', 'image'], 'icon-offset': [0, -67] }, paint: { 'icon-opacity': shown() } });

    let chosen = null;
    const set = n => {
      for (const source of ['vehicles', 'route', 'lime-walks']) {
        if (chosen != null) map.setFeatureState({ source, id: chosen + 1 }, { selected: false });
        if (n != null) map.setFeatureState({ source, id: n + 1 }, { selected: true });
      }
      for (const source of ['route', 'lime-walks']) map.setFeatureState({ source, id: near + 1 }, { away: n != null });
      chosen = n;
    };
    return { select: set, clear: () => set(null) };
  }

  return { add };
})();
