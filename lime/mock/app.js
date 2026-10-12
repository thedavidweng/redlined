// Classic script, not an ES module, so the mock also runs when opened straight from disk (file://).
(async () => {
  const { device, camera } = LimeData;
  IosDevice.mount(document.querySelector('#app'), device);

  // REDLINE SEAM (inert without ?redline=): ?redline=<folder>&side=before|after (default after) loads
  // <folder>/patch.js + patch.css and, once the map has loaded, calls redlinePatch.apply({ root, map, data }). A folder without a patch is a no-op.
  const query = new URLSearchParams(location.search);
  const redline = /^[a-z0-9-]+$/.test(query.get('redline') ?? '') ? query.get('redline') : null;
  const after = redline && query.get('side') !== 'before';
  const loadScript = src => new Promise(resolve => document.head.append(Object.assign(document.createElement('script'), { src, onload: resolve, onerror: resolve })));
  if (after) await loadScript(`../${redline}/patch.js`);
  const patch = after ? globalThis.redlinePatch : null;
  if (patch) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `../${redline}/patch.css` }));

  // STATE SEAM (extends the one above; inert without ?state=): ?state=<name> opens straight into that state, for calibration.
  // selected and sheet-expanded open on the nearest scooter. An unknown state falls back to home.
  const PIN = [200, 385];  // where the selected scooter sits on screen: above the collapsed sheet
  const STATES = { home: {}, selected: { select: LimeData.nearest }, 'sheet-expanded': { select: LimeData.nearest, sheet: 'expanded' } };
  const asked = query.get('state');
  const state = Object.hasOwn(STATES, asked) ? asked : 'home';
  if (asked && !Object.hasOwn(STATES, asked)) console.warn(`Unknown state "${asked}"; showing home. Known: ${Object.keys(STATES).join(', ')}`);
  const first = STATES[state], where = n => LimeData.vehicles.features[n].geometry.coordinates;
  const start = first.select == null ? camera.center : LimeData.frame(where(first.select), PIN);

  // Exposed for the test and calibration scripts (centre, zoom, idle), like DeliverectModel.
  const map = globalThis.LimeMap = new maplibregl.Map({
    container: 'map',
    center: start,
    zoom: camera.zoom,
    bearing: camera.bearing,
    fadeDuration: 0,  // symbol fades repaint at full pixel ratio; without them a tap costs one render, not three
    attributionControl: false,
  });
  map.setStyle('https://tiles.openfreemap.org/styles/bright', { transformStyle: LimeStyle.transform });
  IosMapPerf.attach(map);
  // The real app shows no OpenFreeMap credit, so it sits outside the mock: the device frame puts it in the page corner.
  IosDevice.credit('<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
  const app = document.querySelector('#app'), $ = q => app.querySelector(q);
  const locate = $('.locate');
  const clamp = v => Math.min(1, Math.max(0, v));
  // The locate button rides the sheet (271 pt above its home spot once the sheet has settled) and fades out as the sheet fills the screen.
  const sheet = LimeSheet.create($('.sheet'), {
    probe: $('.sheet-probe'),
    onMove(y, collapsed, hidden) {
      const lift = -271 * clamp((hidden - y) / (hidden - collapsed)) + Math.min(0, y - collapsed);
      locate.style.transform = `translateY(${lift}px)`;
      locate.style.opacity = clamp((y - collapsed * .5) / (collapsed * .4));
    },
  });
  let markers, selected = null;

  function fill(n) {
    const f = LimeData.vehicles.features[n].properties;
    app.querySelectorAll('[data-plate]').forEach(e => e.textContent = f.plate);
    $('[data-range]').textContent = f.range;
    selected = n;
    app.classList.add('is-selected');
  }
  function select(n) {
    fill(n);
    markers?.select(n);
    map.easeTo({ center: LimeData.frame(where(n), PIN), duration: 600, easing: t => 1 - (1 - t) ** 3 });
    sheet.show();
  }
  function deselect() {
    selected = null;
    app.classList.remove('is-selected');
    markers?.clear();
    map.easeTo({ center: camera.center, duration: 600, easing: t => 1 - (1 - t) ** 3 });
    sheet.hide();
  }
  $('.close').addEventListener('click', deselect);

  if (first.select != null) {
    fill(first.select);
    sheet.snap(first.sheet ?? 'collapsed', false);
  }

  map.on('load', async () => {
    LimeStyle.mute(map);
    markers = await LimeMarkers.add(map, LimeData);
    if (selected != null) markers.select(selected);
    // One bounded query on the vehicles layer, a thumb-sized box around the tap, nearest hit wins.
    map.on('click', e => {
      const r = 22, hits = map.queryRenderedFeatures([[e.point.x - r, e.point.y - r], [e.point.x + r, e.point.y + r]], { layers: ['vehicles'] });
      if (hits.length) select(hits[0].properties.n);
    });
    if (matchMedia('(hover: hover)').matches) {
      const over = e => map.getCanvas().style.cursor = map.queryRenderedFeatures([[e.point.x - 12, e.point.y - 12], [e.point.x + 12, e.point.y + 12]], { layers: ['vehicles'] }).length ? 'pointer' : '';
      map.on('mousemove', over);
    }
    patch?.apply({ root: app, map, data: LimeData });
  });
})();
