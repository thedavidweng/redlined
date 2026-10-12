// Classic script, not an ES module, so the mock also runs when opened straight from disk (file://).
(async () => {
  const { camera } = EvoData;
  IosDevice.mount(document.querySelector('#app'), IosDevices['iphone-16e']);

  // REDLINE SEAM (inert without ?redline=): ?redline=<folder>&side=before|after (default after) loads
  // <folder>/patch.js + patch.css and, once the map has loaded, calls redlinePatch.apply({ root, map, data }). A folder without a patch is a no-op.
  // The stage opens a product that has no redline yet with ?redline=none, which loads nothing.
  const query = new URLSearchParams(location.search);
  const redline = /^[a-z0-9-]+$/.test(query.get('redline') ?? '') && query.get('redline') !== 'none' ? query.get('redline') : null;
  const after = redline && query.get('side') !== 'before';
  const loadScript = src => new Promise(resolve => document.head.append(Object.assign(document.createElement('script'), { src, onload: resolve, onerror: resolve })));
  if (after) await loadScript(`../${redline}/patch.js`);
  const patch = after ? globalThis.redlinePatch : null;
  if (patch) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `../${redline}/patch.css` }));

  // STATE SEAM (extends the one above; inert without ?state=): ?state=<name> opens straight into that state, for calibration.
  // selected and sheet-expanded open on the nearest car. An unknown state falls back to home (IosState.pick).
  const STATES = { home: {}, selected: { select: EvoData.nearest }, 'sheet-expanded': { select: EvoData.nearest, expanded: true } };
  const first = IosState.pick(STATES).state, where = n => EvoData.vehicles.features[n].geometry.coordinates;
  const start = first.select == null ? { center: camera.center, zoom: camera.zoom } : { center: EvoData.frame(where(first.select)), zoom: EvoData.SELECTED_ZOOM };

  // Exposed for the test and calibration scripts (centre, zoom, idle), like DeliverectModel.
  const map = globalThis.EvoMap = new maplibregl.Map({
    container: 'map',
    ...start,
    bearing: camera.bearing,
    fadeDuration: 0,  // symbol fades repaint at full pixel ratio; without them a tap costs one render, not three
    attributionControl: false,
  });
  map.setStyle(IosMapStyle.BRIGHT, { transformStyle: EvoStyle.transform });
  IosMapPerf.attach(map);
  // The real app shows no OpenFreeMap credit (nor Mapbox's wordmark, which this mock does not imitate), so the credit sits outside the mock: the device frame puts it in the page corner.
  IosDevice.credit('<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
  const app = document.querySelector('#app'), $ = q => app.querySelector(q), device = document.querySelector('.ios-device');
  const money = v => `$${v.toFixed(2)}`;
  const { price } = EvoData;
  $('[data-access]').textContent = money(price.accessFee);
  $('[data-rates]').innerHTML = price.rates.map(([label, value]) => `<p class="rate-row"><span>${label}</span><b>${money(value)}</b></p>`).join('');

  // The compact sheet slides in and out (IosSheet, which also gives the spring). The real one only grows with its chevron, never by swipe, so
  // it has one resting place: a pull springs back. The expanded card is a separate full-screen layer that fades in.
  const sheet = IosSheet.create($('.sheet'), { detents: { collapsed: () => 0, hidden: () => $('.sheet').offsetHeight }, snaps: ['collapsed'] });
  let markers, selected = null, before = null;

  function fill(n) {
    const f = EvoData.vehicles.features[n].properties, w = EvoData.walk(n);
    const text = { model: f.model, plate: f.plate, fuel: f.fuel, walk: w.km.toFixed(2), 'walk-short': w.km.toFixed(1), minutes: w.minutes, address: f.address };
    for (const [key, value] of Object.entries(text)) app.querySelectorAll(`[data-${key}]`).forEach(e => e.textContent = value);
    selected = n;
    app.classList.add('is-selected');
  }
  const fly = to => map.flyTo({ ...to, duration: 1200, curve: 1.2, essential: false });
  function select(n) {
    if (selected == null) before = { center: map.getCenter().toArray(), zoom: map.getZoom() };
    fill(n);
    markers?.select(n);
    fly({ center: EvoData.frame(where(n)), zoom: EvoData.SELECTED_ZOOM });
    sheet.show();
  }
  function deselect() {
    if (selected == null) return;
    collapse();
    selected = null;
    app.classList.remove('is-selected');
    markers?.clear();
    fly(before ?? { center: camera.center, zoom: camera.zoom });
    sheet.hide();
  }
  function setExpanded(on) {
    app.classList.toggle('is-expanded', on);
    $('.full').setAttribute('aria-hidden', String(!on));
    device.style.setProperty('--status-ink', on ? '#fff' : '#000');
  }
  const expand = () => setExpanded(true), collapse = () => setExpanded(false);
  $('.expand').addEventListener('click', expand);
  $('.collapse').addEventListener('click', collapse);
  $('.locate').addEventListener('click', () => map.easeTo({ center: EvoData.user.coordinates, zoom: Math.max(14, Math.min(map.getZoom(), 15)), duration: 700 }));
  addEventListener('keydown', e => { if (e.key === 'Escape') app.classList.contains('is-expanded') ? collapse() : deselect(); });

  if (first.select != null) {
    fill(first.select);
    sheet.snap('collapsed', false);
    if (first.expanded) expand();
  }

  map.on('load', async () => {
    markers = await EvoMarkers.add(map, EvoData);
    if (selected != null) markers.select(selected);
    // One bounded query on the cars layer, a thumb-sized box around the tap, nearest hit wins. A tap on empty map goes back to home.
    map.on('click', e => {
      const r = 22, hits = map.queryRenderedFeatures([[e.point.x - r, e.point.y - r], [e.point.x + r, e.point.y + r]], { layers: ['evo-cars'] });
      if (hits.length) { if (hits[0].properties.n !== selected) select(hits[0].properties.n); } else deselect();
    });
    if (matchMedia('(hover: hover)').matches) {
      const over = e => map.getCanvas().style.cursor = map.queryRenderedFeatures([[e.point.x - 12, e.point.y - 12], [e.point.x + 12, e.point.y + 12]], { layers: ['evo-cars'] }).length ? 'pointer' : '';
      map.on('mousemove', over);
    }
    patch?.apply({ root: app, map, data: EvoData });
  });
})();
