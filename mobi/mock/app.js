// Classic script, not an ES module, so the mock also runs when opened straight from disk (file://).
(async () => {
  const { camera } = MobiData;
  const app = document.querySelector('#app'), $ = q => app.querySelector(q);
  IosDevice.mount(app, IosDevices['iphone-16e']);

  // Glyphs from the IPA catalog as data URIs (MobiAssets): plain images, or the shape of a recolourable one (CSS mask).
  app.querySelectorAll('[data-asset]').forEach(img => img.src = MobiAssets[img.dataset.asset]);
  app.querySelectorAll('[data-mask]').forEach(el => el.style.setProperty('--m', `url(${MobiAssets[el.dataset.mask]})`));
  $('[data-code]').textContent = MobiData.code;

  // REDLINE SEAM (inert without ?redline=): ?redline=<folder>&side=before|after (default after) loads
  // <folder>/patch.js + patch.css and, once the map has loaded, calls redlinePatch.apply({ root, map, data }). A folder without a patch is a no-op.
  const query = new URLSearchParams(location.search);
  const redline = /^[a-z0-9-]+$/.test(query.get('redline') ?? '') ? query.get('redline') : null;
  const after = redline && query.get('side') !== 'before';
  const loadScript = src => new Promise(resolve => document.head.append(Object.assign(document.createElement('script'), { src, onload: resolve, onerror: resolve })));
  if (after) await loadScript(`../${redline}/patch.js`);
  const patch = after ? globalThis.redlinePatch : null;
  if (patch) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `../${redline}/patch.css` }));

  // STATE SEAM (inert without ?state=): ?state=<name> opens straight into that state, for calibration. Station states open on
  // the nearest station, except station-unavailable which previews the independent unavailable station.
  const STATES = { home: {}, selected: { select: MobiData.nearest, sheet: 'half' }, 'sheet-expanded': { select: MobiData.nearest, sheet: 'expanded' }, 'station-unavailable': { select: MobiData.unavailable, sheet: 'half' } };
  const first = IosState.pick(STATES).state;
  const start = first.select == null ? camera : MobiData.frame(first.select);

  // Exposed for the test and calibration scripts (centre, zoom, idle), like DeliverectModel.
  const map = globalThis.MobiMap = new maplibregl.Map(IosMapPerf.options({
    container: 'map',
    center: start.center,
    zoom: start.zoom,
    bearing: camera.bearing,
  }));
  map.setStyle(IosMapStyle.BRIGHT, { transformStyle: MobiStyle.transform });
  IosMapPerf.attach(map);
  // The real app shows no OpenFreeMap credit, so it sits outside the mock: the device frame puts it in the page corner.
  IosDevice.credit('<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');

  const clamp = v => Math.min(1, Math.max(0, v));
  const code = $('.code'), sheetEl = $('.sheet');
  let markers, selected = null, kind = 'electric';

  // Moving the sheet drives the rest, all with transforms and custom properties on the sheet only: --p (0 Expanded, 1 Half screen) insets and trims
  // it and slides its content; the User Code card rides on its top edge and fades as it nears the top.
  const sheet = IosSheet.create(sheetEl, {
    detents: { expanded: () => 0, half: () => 428, hidden: () => sheetEl.offsetHeight },
    snaps: ['expanded', 'half', 'hidden'],
    onMove(y, at) {
      const p = clamp(y / at.half);
      sheetEl.style.setProperty('--p', p.toFixed(3));
      sheetEl.classList.toggle('compact', p > .5);
      code.style.transform = `translateY(${Math.min(0, 48 + y - 70 - 553)}px)`;
      code.style.opacity = clamp(y / 160);
      // Dragged or flung down to the bottom: back to home, the same as the close button.
      if (selected != null && sheet.state === 'hidden') deselect(false);
    },
  });
  const ease = { duration: 600, easing: t => 1 - (1 - t) ** 3 };

  function list() {
    const s = MobiData.stations[selected], ids = kind === 'electric' ? s.electricIds : s.mechanicalIds;
    const glyph = kind === 'electric' ? MobiAssets.ebike : MobiAssets.bike;
    $('.bikes').innerHTML = ids.map(id => `<li><i class="d" style="--m:url(${MobiAssets.dock})"></i><i class="b" style="--m:url(${glyph})"></i><span>${id}</span></li>`).join('');
  }
  function fill(n) {
    const s = MobiData.stations[n];
    selected = n;
    $('[data-title]').textContent = s.name;
    $('[data-ft]').textContent = s.ft;
    $('[data-min]').textContent = s.minutes;
    $('[data-bikes]').textContent = s.bikes;
    $('[data-docks]').textContent = s.docks;
    app.classList.toggle('is-unavailable', !s.operational);
    if (s.operational) list(); else $('.bikes').innerHTML = '';
    app.classList.add('is-selected');
  }
  function select(n) {
    const station = MobiData.stations[n];
    if (station.operational) {
      if (sheet.state === 'hidden') sheet.show('expanded');
    } else if (sheet.state === 'hidden') {
      sheet.show('half');
    } else {
      sheet.snap('half');
    }
    fill(n);
    markers?.select(n);
    map.easeTo({ ...MobiData.frame(n), ...ease });
  }
  function deselect(animate = true) {
    selected = null;
    app.classList.remove('is-selected', 'is-unavailable');
    markers?.clear();
    map.easeTo({ ...camera, ...ease });
    if (animate && sheet.state !== 'hidden') sheet.hide();
  }
  $('.close').addEventListener('click', () => deselect());
  // Grabber: a tap toggles between the two open detents.
  $('.grabber').addEventListener('click', () => sheet.snap(sheet.state === 'expanded' ? 'half' : 'expanded'));
  $('.route').addEventListener('click', () => sheet.snap('half'));
  $('.segment').addEventListener('click', e => {
    const b = e.target.closest('[data-kind]');
    if (!b || selected == null) return;
    kind = b.dataset.kind;
    $('.segment').dataset.kind = kind;
    $('.segment').querySelectorAll('[data-kind]').forEach(x => x.setAttribute('aria-selected', x === b));
    list();
  });

  if (first.select != null) {
    fill(first.select);
    sheet.snap(first.sheet, false);
  }

  map.on('load', async () => {
    markers = await MobiMarkers.add(map, MobiData);
    if (selected != null) markers.select(selected);
    // One bounded query on the stations layer, a thumb-sized box around the tap, nearest hit wins.
    map.on('click', e => {
      const r = 24, hits = map.queryRenderedFeatures([[e.point.x - r, e.point.y - r], [e.point.x + r, e.point.y + r + 20]], { layers: ['stations'] });
      if (hits.length) select(hits[0].properties.n);
    });
    if (matchMedia('(hover: hover)').matches) {
      const over = e => map.getCanvas().style.cursor = map.queryRenderedFeatures([[e.point.x - 14, e.point.y - 14], [e.point.x + 14, e.point.y + 14]], { layers: ['stations'] }).length ? 'pointer' : '';
      map.on('mousemove', over);
    }
    patch?.apply({ root: app, map, data: MobiData });
  });
})();
