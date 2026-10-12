// Classic script, not an ES module, so the mock also runs when opened straight from disk (file://).
(async () => {
  const { camera } = ModoData;
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

  // STATE SEAM (extends the one above; inert without ?state=): ?state=<name> opens straight into that state, for calibration.
  // selected opens on the nearest pin, vehicle on its Vehicle Information page. An unknown state falls back to home (IosState.pick).
  const PIN = [80, 238];  // where the selected pin's tip sits: in the map strip between the header and the sheet, left of the Filter pill
  const STATES = { home: {}, selected: { select: ModoData.near }, vehicle: { select: ModoData.near, page: true } };
  const first = IosState.pick(STATES).state, where = n => ModoData.pins.features[n].geometry.coordinates;
  const start = first.select == null ? camera.center : ModoData.frame(where(first.select), PIN);

  // Exposed for the test and calibration scripts (centre, zoom, idle), like LimeMap.
  const map = globalThis.ModoMap = new maplibregl.Map({
    container: 'map',
    center: start,
    zoom: camera.zoom,
    bearing: camera.bearing,
    fadeDuration: 0,  // symbol fades repaint at full pixel ratio; without them a tap costs one render, not three
    attributionControl: false,
  });
  map.setStyle(IosMapStyle.BRIGHT, { transformStyle: ModoStyle.transform });
  IosMapPerf.attach(map);
  // The real app shows no OpenFreeMap credit, so it sits outside the mock: the device frame puts it in the page corner.
  IosDevice.credit('<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
  const app = document.querySelector('#app'), $ = q => app.querySelector(q), $$ = q => app.querySelectorAll(q);

  // Text the data supplies (the car is the same on every pin; station and plate change).
  const car = ModoData.car;
  $$('.name').forEach(e => e.textContent = car.name);
  $$('[data-plan]').forEach(e => e.textContent = car.plan);
  $$('[data-type]').forEach(e => e.textContent = car.type);
  $$('[data-seats]').forEach(e => e.textContent = car.seats);
  $$('[data-fuel]').forEach(e => e.textContent = car.fuel);
  $('[data-chips]').replaceChildren(...$('.card .chips').cloneNode(true).children);  // the page shows the same chips
  $$('[data-member]').forEach(e => e.textContent = ModoData.member);
  $$('[data-parking]').forEach(e => e.textContent = ModoData.parking);
  $$('[data-address]').forEach(e => e.textContent = ModoData.address);

  // Availability: 24 hourly groups of four dots, every one unavailable (the reference was taken when the car was out).
  const DOT = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="4.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M2.2 7.8 7.8 2.2" stroke="currentColor" stroke-width="1.6"/></svg>';
  const hours = Array.from({ length: 24 }, (_, h) => `<div class="hour"><div class="dots">${DOT.repeat(4)}</div><time>${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}</time></div>`).join('');
  $$('[data-strip]').forEach(e => e.innerHTML = hours);

  const sheetEl = $('.sheet'), float = $('.float'), cardEl = $('.card'), page = $('.page');
  const sheet = IosSheet.create(sheetEl, {
    detents: { open: () => 0, hidden: () => sheetEl.offsetHeight },
    snaps: ['open', 'hidden'],  // one detent: letting go past halfway drops it to hidden, which returns home (below)
    shown: 'open',
    // Filter and locate ride the sheet's top edge: home at its hidden position, 22 pt above the sheet once it is open.
    onMove(y, { hidden }) { float.style.transform = `translateY(${y - hidden}px)`; },
  });
  // The scrolling content is not a drag handle: only the grabber and the "1 option" line are.
  $('.scroll').addEventListener('pointerdown', e => e.stopPropagation());

  let markers, selected = null, home = null, pushed = false;
  const ease = t => 1 - (1 - t) ** 3;

  function fill(n) {
    const p = ModoData.pins.features[n].properties;
    $$('[data-station]').forEach(e => e.textContent = p.station);
    $$('[data-plate]').forEach(e => e.textContent = p.plate);
    selected = n;
  }
  function select(n) {
    if (n === selected) return;
    home ??= { center: map.getCenter().toArray(), zoom: map.getZoom() };
    fill(n);
    markers?.select(n);
    map.easeTo({ center: ModoData.frame(where(n), PIN, map.getZoom()), duration: 600, easing: ease });
    if (sheet.state === 'hidden') sheet.show();
  }
  function deselect() {
    if (selected == null) return;
    selected = null;
    markers?.clear();
    if (home) map.easeTo({ ...home, duration: 600, easing: ease });
    home = null;
    if (sheet.state !== 'hidden') sheet.hide();
  }
  // Dragging the sheet down past halfway (sheet.js settles on 'hidden') is the same as tapping the empty map.
  const released = () => { if (sheet.state === 'hidden') deselect(); };
  sheetEl.addEventListener('pointerup', released);
  sheetEl.addEventListener('pointercancel', released);

  function push() {
    pushed = true;
    page.setAttribute('aria-hidden', 'false'); page.classList.add('in');
    page.querySelector('.body').scrollTop = 0;
  }
  function pop() {
    pushed = false;
    page.setAttribute('aria-hidden', 'true'); page.classList.remove('in');
  }
  cardEl.addEventListener('click', push);
  cardEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); push(); } });
  $('.back').addEventListener('click', pop);

  if (first.select != null) {
    fill(first.select);
    sheet.snap('open', false);
    if (first.page) { page.style.transition = 'none'; push(); page.getBoundingClientRect(); page.style.transition = ''; }
  }

  map.on('load', async () => {
    ModoStyle.mute(map);
    markers = await ModoMarkers.add(map, ModoData);
    if (selected != null) { markers.select(selected); home = { center: camera.center, zoom: camera.zoom }; }
    // One bounded query on the pin layers, a thumb-sized box around the tap (pins hang above their tip), nearest hit wins.
    const hit = p => {
      const r = 22, pin = map.queryRenderedFeatures([[p.x - 20, p.y - 50], [p.x + 20, p.y + 6]], { layers: ['pins', 'pins-grouped'] });
      return pin[0] ?? map.queryRenderedFeatures([[p.x - r, p.y - r], [p.x + r, p.y + r]], { layers: ['clusters'] })[0];
    };
    map.on('click', e => {
      if (pushed) return;
      const f = hit(e.point);
      if (!f) return deselect();
      if (f.layer.id === 'clusters') map.easeTo({ center: f.geometry.coordinates, zoom: markers.SPLIT + .3, duration: 600, easing: ease });
      else select(f.properties.n);
    });
    if (matchMedia('(hover: hover)').matches) map.on('mousemove', e => map.getCanvas().style.cursor = hit(e.point) ? 'pointer' : '');
    patch?.apply({ root: app, map, data: ModoData });
  });
})();
