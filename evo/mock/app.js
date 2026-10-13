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
  // selected and sheet-expanded open on the nearest car; parking-selected and parking-expanded on the nearest parking spot; in-trip and in-trip-expanded
  // on a trip in the nearest car (the only way into a trip: BOOK NOW does nothing). An unknown state falls back to home (IosState.pick).
  const { nearest, nearestParking } = EvoData;
  const STATES = { home: {}, selected: { select: nearest }, 'sheet-expanded': { select: nearest, expanded: true },
    'parking-selected': { parking: nearestParking }, 'parking-expanded': { parking: nearestParking, expanded: true },
    'in-trip': { select: nearest, trip: true }, 'in-trip-expanded': { select: nearest, trip: true, expanded: true } };
  const first = IosState.pick(STATES).state, where = n => EvoData.vehicles.features[n].geometry.coordinates, spotAt = n => EvoData.parking.features[n].geometry.coordinates;
  const trip = !!first.trip;  // in a trip the car's sheet is the trip card and empty map does not go home
  const aim = first.parking != null ? spotAt(first.parking) : first.select != null ? where(first.select) : null;
  const start = aim == null ? { center: camera.center, zoom: camera.zoom } : { center: EvoData.frame(aim), zoom: EvoData.SELECTED_ZOOM };

  // Exposed for the test and calibration scripts (centre, zoom, idle), like DeliverectModel.
  const map = globalThis.EvoMap = new maplibregl.Map(IosMapPerf.options({
    container: 'map',
    ...start,
    bearing: camera.bearing,
  }));
  map.setStyle(IosMapStyle.BRIGHT, { transformStyle: EvoStyle.transform });
  IosMapPerf.attach(map);
  // The real app shows no OpenFreeMap credit (nor Mapbox's wordmark, which this mock does not imitate), so the credit sits outside the mock: the device frame puts it in the page corner.
  IosDevice.credit('<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
  const app = document.querySelector('#app'), $ = q => app.querySelector(q), device = document.querySelector('.ios-device');
  const money = v => `$${v.toFixed(2)}`;
  const { price } = EvoData;
  $('[data-access]').textContent = money(price.accessFee);
  app.querySelectorAll('[data-rates]').forEach(e => e.innerHTML = price.rates.map(([label, value]) => `<p class="rate-row"><span>${label}</span><b>${money(value)}</b></p>`).join(''));

  // The compact sheet slides in and out (IosSheet, which also gives the spring). The real one only grows with its chevron, never by swipe, so
  // it has one resting place: a pull springs back. The expanded card is a separate full-screen layer that fades in.
  const sheet = IosSheet.create($('.sheet'), { detents: { collapsed: () => 0, hidden: () => $('.sheet').offsetHeight }, snaps: ['collapsed'] });
  let markers, selected = null, spot = null, before = null;
  const idle = () => selected == null && spot == null;
  app.dataset.kind = trip ? 'trip' : 'car';  // which content the sheet and the full card show: car, parking or trip (styles.css)

  function fill(n) {
    const f = EvoData.vehicles.features[n].properties, w = EvoData.walk(n);
    const text = { model: f.model, plate: f.plate, fuel: f.fuel, walk: w.km.toFixed(2), 'walk-short': w.km.toFixed(1), minutes: w.minutes, address: f.address };
    for (const [key, value] of Object.entries(text)) app.querySelectorAll(`[data-${key}]`).forEach(e => e.textContent = value);
    selected = n;
    app.classList.add('is-selected');
  }
  function fillParking(n) {
    const f = EvoData.parking.features[n].properties;
    const text = { pname: f.name, phours: f.hours, pdist: `> ${EvoData.distance(n).toFixed(2)} km`, pshort: f.short, pdetails: f.details };
    for (const [key, value] of Object.entries(text)) app.querySelectorAll(`[data-${key}]`).forEach(e => e.textContent = value);
    spot = n;
    app.classList.add('is-selected');
  }
  const view = () => ({ center: map.getCenter().toArray(), zoom: map.getZoom() });
  const fly = to => map.flyTo({ ...to, duration: 1200, curve: 1.2, essential: false });
  function select(n) {
    if (idle()) before = view();
    if (spot != null) { markers?.clearParking(); spot = null; }
    fill(n);
    markers?.select(n);
    app.dataset.kind = 'car';
    fly({ center: EvoData.frame(where(n)), zoom: EvoData.SELECTED_ZOOM });
    sheet.show();
  }
  // A parking tap shows the parking sheet. In a trip the trip car stays selected underneath and the trip sheet comes back when the spot is dropped.
  function selectSpot(n) {
    if (idle()) before = view();
    if (!trip && selected != null) { markers?.clear(); selected = null; }
    if (spot != null) markers?.clearParking();
    fillParking(n);
    markers?.selectParking(n);
    app.dataset.kind = 'parking';
    fly({ center: EvoData.frame(spotAt(n)), zoom: EvoData.SELECTED_ZOOM });
    sheet.show();
  }
  function deselect() {
    if (idle() || (trip && spot == null)) return;
    collapse();
    if (spot != null) { markers?.clearParking(); spot = null; }
    if (trip) { app.dataset.kind = 'trip'; fly({ center: EvoData.frame(where(selected)), zoom: EvoData.SELECTED_ZOOM }); return; }
    selected = null;
    app.classList.remove('is-selected');
    markers?.clear();
    fly(before ?? { center: camera.center, zoom: camera.zoom });
    sheet.hide();
  }
  function setExpanded(on) {
    app.classList.toggle('is-expanded', on);
    app.querySelectorAll('.full').forEach(e => e.setAttribute('aria-hidden', String(!on || !e.classList.contains(`full-${app.dataset.kind}`))));
    device.style.setProperty('--status-ink', on ? '#fff' : '#000');
  }
  const expand = () => setExpanded(true), collapse = () => setExpanded(false);
  $('.expand').addEventListener('click', expand);
  app.querySelectorAll('.collapse').forEach(e => e.addEventListener('click', collapse));
  $('.locate').addEventListener('click', () => map.easeTo({ center: EvoData.user.coordinates, zoom: Math.max(14, Math.min(map.getZoom(), 15)), duration: 700 }));
  addEventListener('keydown', e => { if (e.key === 'Escape') { if (app.classList.contains('is-expanded')) collapse(); else deselect(); } });

  if (first.select != null || first.parking != null) {
    if (first.select != null) fill(first.select);
    if (first.parking != null) { fillParking(first.parking); app.dataset.kind = 'parking'; }
    sheet.snap('collapsed', false);
    if (first.expanded) expand();
  }

  map.on('load', async () => {
    markers = await EvoMarkers.add(map, EvoData);
    if (selected != null) markers.select(selected);
    if (spot != null) markers.selectParking(spot);
    // One bounded query on the cars and parking layers (parking only in a trip: the trip car is not a target), a thumb-sized box around the tap, nearest hit wins
    // (distance to the middle of the pin). A tap on empty map goes back to home; in a trip it only drops a parking spot and shows the trip sheet again.
    const layers = trip ? ['evo-parking'] : ['evo-cars', 'evo-parking'];
    map.on('click', e => {
      const r = 22, hits = map.queryRenderedFeatures([[e.point.x - r, e.point.y - r], [e.point.x + r, e.point.y + r]], { layers });
      const away = f => { const p = map.project(f.geometry.coordinates); return Math.hypot(p.x - e.point.x, p.y - 20 - e.point.y); };
      const hit = hits.sort((a, b) => away(a) - away(b))[0];
      if (!hit) deselect();
      else if (hit.layer.id === 'evo-parking') { if (hit.properties.n !== spot) selectSpot(hit.properties.n); }
      else if (hit.properties.n !== selected) select(hit.properties.n);
    });
    if (matchMedia('(hover: hover)').matches) {
      const over = e => map.getCanvas().style.cursor = map.queryRenderedFeatures([[e.point.x - 12, e.point.y - 12], [e.point.x + 12, e.point.y + 12]], { layers }).length ? 'pointer' : '';
      map.on('mousemove', over);
    }
    patch?.apply({ root: app, map, data: EvoData });
  });
})();
