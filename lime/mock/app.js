// Classic script, not an ES module, so the mock also runs when opened straight from disk (file://).
(async () => {
  const { camera } = LimeData;
  IosDevice.mount(document.querySelector('#app'), IosDevices['iphone-16e']);

  // REDLINE SEAM (inert without ?redline=): ?redline=<folder>&side=before|after (default after) loads
  // <folder>/patch.js + patch.css and, once the map has loaded, calls redlinePatch.apply({ root, map, data }). A folder without a patch is a no-op.
  const query = new URLSearchParams(location.search);
  const redline = /^[a-z0-9-]+$/.test(query.get('redline') ?? '') ? query.get('redline') : null;
  const after = redline && query.get('side') !== 'before';
  const loadScript = src => new Promise(resolve => document.head.append(Object.assign(document.createElement('script'), { src, onload: resolve, onerror: resolve })));
  if (after) await loadScript(`../${redline}/patch.js`);
  const patch = after ? globalThis.redlinePatch : null;
  if (patch) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `../${redline}/patch.css` }));

  const state = query.get('state');
  const trip = state === 'in-trip' || state === 'in-trip-expanded';
  const promo = query.get('promo');
  const PIN = [200, 385];
  const STATES = { home: {}, selected: { select: LimeData.nearest }, 'sheet-expanded': { select: LimeData.nearest, sheet: 'expanded' } };
  const first = trip ? { select: LimeData.nearest } : IosState.pick(STATES).state, where = n => LimeData.vehicles.features[n].geometry.coordinates;
  const start = trip ? LimeData.frame(LimeData.user.coordinates, [200, 342]) : first.select == null ? camera.center : LimeData.frame(where(first.select), PIN);

  // Exposed for the test and calibration scripts (centre, zoom, idle), like DeliverectModel.
  const map = globalThis.LimeMap = new maplibregl.Map(IosMapPerf.options({
    container: 'map',
    center: start,
    zoom: camera.zoom,
    bearing: camera.bearing,
  }));
  map.setStyle(IosMapStyle.BRIGHT, { transformStyle: LimeStyle.transform });
  IosMapPerf.attach(map);
  // The real app shows no OpenFreeMap credit, so it sits outside the mock: the device frame puts it in the page corner.
  IosDevice.credit('<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
  const app = document.querySelector('#app'), $ = q => app.querySelector(q);
  if (trip) app.classList.add('is-trip');
  if (promo !== '25off') {
    app.classList.add('no-promo');
    $('.price').textContent = 'CAD $0 to unlock, CAD $0.15/min';
    $('.body').textContent = 'CAD $0 to unlock, CAD $0.15/min';
  }
  const locate = $('.locate');
  const clamp = v => Math.min(1, Math.max(0, v));
  // The locate button rides the sheet (271 pt above its home spot once the sheet has settled) and fades out as the sheet fills the screen.
  const sheet = IosSheet.create(trip ? $('.trip-sheet') : $('.home-sheet'), {
    detents: trip
      ? { expanded: () => 0, collapsed: () => app.clientHeight - 314, hidden: () => $('.trip-sheet').offsetHeight }
      : { expanded: () => 0, collapsed: () => $('.sheet-probe').offsetHeight, hidden: () => $('.home-sheet').offsetHeight },
    onMove(y, { collapsed, hidden }) {
      if (trip) {
        $('.trip-sheet').style.setProperty('--trip-y', `${y}px`);
        $('.trip-grabber').setAttribute('aria-expanded', String(y < collapsed / 2));
        app.classList.toggle('trip-expanded', y < collapsed / 2);
        return;
      }
      const lift = -271 * clamp((hidden - y) / (hidden - collapsed)) + Math.min(0, y - collapsed);
      locate.style.transform = `translateY(${lift}px)`;
      locate.style.opacity = clamp((y - collapsed * .5) / (collapsed * .4));
    },
  });
  $('.trip-scroll')?.addEventListener('pointerdown', e => e.stopPropagation());
  $('.trip-grabber').addEventListener('click', () => sheet.snap(sheet.state === 'expanded' ? 'collapsed' : 'expanded'));
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
    sheet.snap(trip && state === 'in-trip-expanded' ? 'expanded' : (first.sheet ?? 'collapsed'), false);
  }

  map.on('load', async () => {
    LimeStyle.mute(map);
    markers = await LimeMarkers.add(map, LimeData);
    if (selected != null) markers.select(selected);
    if (trip) {
      for (const id of ['vehicles', 'lime-selected', 'route-home', 'route', 'lime-cone', 'lime-user', 'lime-walk', 'lime-walk-selected']) map.setLayoutProperty(id, 'visibility', 'none');
      IosMapImages.draw(map, 'trip-rider', 44, 44, g => {
        g.fillStyle = '#a0f19b'; g.strokeStyle = '#fff'; g.lineWidth = 2;
        g.beginPath(); g.arc(22, 22, 20, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#000'; g.beginPath(); g.moveTo(17, 11); g.lineTo(33, 27); g.lineTo(12, 30); g.lineTo(18, 23); g.closePath(); g.fill();
      });
      map.addLayer({ id: 'trip-rider', type: 'symbol', source: 'lime-user', layout: { 'icon-image': 'trip-rider', 'icon-allow-overlap': true } });
    }
    // One bounded query on the vehicles layer, a thumb-sized box around the tap, nearest hit wins.
    map.on('click', e => {
      if (trip) return;
      const r = 22, hits = map.queryRenderedFeatures([[e.point.x - r, e.point.y - r], [e.point.x + r, e.point.y + r]], { layers: ['vehicles'] });
      if (hits.length) select(hits[0].properties.n);
    });
    if (!trip && matchMedia('(hover: hover)').matches) {
      const over = e => map.getCanvas().style.cursor = map.queryRenderedFeatures([[e.point.x - 12, e.point.y - 12], [e.point.x + 12, e.point.y + 12]], { layers: ['vehicles'] }).length ? 'pointer' : '';
      map.on('mousemove', over);
    }
    patch?.apply({ root: app, map, data: LimeData });
  });
})();
