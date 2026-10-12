// Map content: modo pins, clusters, the user dot. Every marker is a symbol layer whose image is drawn once to a 3x canvas (IosMapImages.draw),
// never a DOM node, so panning costs the UI nothing. Classic script (file://).
//   ModoMarkers.add(map, ModoData)  →  Promise of { select(n), clear() }, resolves when the layers are on the map.
//   select(n) swaps pin n for the selected pin; clear() restores it. Feature state only: no tiling, no layout, no DOM.
globalThis.ModoMarkers = (() => {
  const { load, draw } = IosMapImages;
  const SPLIT = 16.9;  // clusters break into their pins from this zoom

  async function add(map, data) {
    await document.fonts.load('500 20px Roboto').catch(() => {});
    const [pin, selected, cluster] = await Promise.all([load(ModoAssets.pin), load(ModoAssets.pinSelected), load(ModoAssets.cluster)]);
    // The IPA marker is 129 x 159 px at 3x: 43 x 53 pt, tip at the bottom centre.
    draw(map, 'modo-pin', 43, 53, g => g.drawImage(pin, 0, 0, 43, 53));
    draw(map, 'modo-pin-selected', 43, 53, g => g.drawImage(selected, 0, 0, 43, 53));
    // Cluster: the IPA red disc (32 pt) with the count in white. One image per count.
    const disc = count => {
      const id = `modo-cluster-${count}`;
      if (!map.hasImage(id)) draw(map, id, 32, 32, g => {
        g.drawImage(cluster, 0, 0, 32, 32);
        g.fillStyle = '#fff'; g.font = '500 20px Roboto, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(count, 16, 16.6);
      });
      return id;
    };
    for (const f of data.clusters.features) f.properties.image = disc(f.properties.count);
    // The user: blue dot with a pale halo.
    draw(map, 'modo-user', 32, 32, g => {
      g.beginPath(); g.arc(16, 16, 14, 0, 2 * Math.PI); g.fillStyle = 'rgba(86,170,225,.28)'; g.fill();
      g.beginPath(); g.arc(16, 16, 7.4, 0, 2 * Math.PI); g.fillStyle = '#1ea0e6'; g.fill();
    });

    map.addSource('modo-pins', { type: 'geojson', data: data.pins });
    map.addSource('modo-clusters', { type: 'geojson', data: data.clusters });
    map.addSource('modo-user', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: data.user.coordinates } } });
    // The IPA pin's tip sits 11 pt above the bottom of its image (shadow room), hence the offset.
    const pinLayout = { 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-anchor': 'bottom', 'icon-offset': [0, 11] };
    const shown = (on = 1, off = 0) => ['case', ['boolean', ['feature-state', 'selected'], false], on, off];
    map.addLayer({ id: 'modo-user', type: 'symbol', source: 'modo-user', layout: { ...pinLayout, 'icon-anchor': 'center', 'icon-offset': [0, 0], 'icon-image': 'modo-user' } });
    map.addLayer({ id: 'clusters', type: 'symbol', source: 'modo-clusters', maxzoom: SPLIT, layout: { ...pinLayout, 'icon-anchor': 'center', 'icon-offset': [0, 0], 'icon-image': ['get', 'image'] } });
    map.addLayer({ id: 'pins', type: 'symbol', source: 'modo-pins', filter: ['==', ['get', 'group'], 0], layout: { ...pinLayout, 'icon-image': 'modo-pin' }, paint: { 'icon-opacity': shown(0, 1) } });
    map.addLayer({ id: 'pins-grouped', type: 'symbol', source: 'modo-pins', minzoom: SPLIT, filter: ['>', ['get', 'group'], 0], layout: { ...pinLayout, 'icon-image': 'modo-pin' }, paint: { 'icon-opacity': shown(0, 1) } });
    map.addLayer({ id: 'pin-selected', type: 'symbol', source: 'modo-pins', layout: { ...pinLayout, 'icon-image': 'modo-pin-selected' }, paint: { 'icon-opacity': shown() } });

    let chosen = null;
    const set = n => {
      if (chosen != null) map.setFeatureState({ source: 'modo-pins', id: chosen + 1 }, { selected: false });
      if (n != null) map.setFeatureState({ source: 'modo-pins', id: n + 1 }, { selected: true });
      chosen = n;
    };
    return { select: set, clear: () => set(null), SPLIT };
  }

  return { add };
})();
