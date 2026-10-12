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
  // selected opens on the nearest pin, vehicle on its Vehicle Information page, filter on the open Filters sheet, booked on that page with 12:15-12:45 set (this hour). An unknown state falls back to home (IosState.pick).
  const PIN = [80, 238];  // where the selected pin's tip sits: in the map strip between the header and the sheet, left of the Filter pill
  const STATES = { home: {}, selected: { select: ModoData.near }, vehicle: { select: ModoData.near, page: true }, filter: { filters: true }, time: { picker: 'start', open: true }, booked: { select: ModoData.near, page: true, book: true } };
  const first = IosState.pick(STATES).state, where = n => ModoData.pins.features[n].geometry.coordinates;
  const start = first.select == null ? camera.center : ModoData.frame(where(first.select), PIN);

  // Exposed for the test and calibration scripts (centre, zoom, idle), like LimeMap.
  const map = globalThis.ModoMap = new maplibregl.Map(IosMapPerf.options({
    container: 'map',
    center: start,
    zoom: camera.zoom,
    bearing: camera.bearing,
  }));
  map.setStyle(IosMapStyle.BRIGHT, { transformStyle: ModoStyle.transform });
  IosMapPerf.attach(map);
  // The real app shows no OpenFreeMap credit, so it sits outside the mock: the device frame puts it in the page corner.
  IosDevice.credit('<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
  const app = document.querySelector('#app'), $ = q => app.querySelector(q), $$ = q => app.querySelectorAll(q);

  // Text the data supplies. The car follows the selected pin (fill); station and plate are per pin too.
  function showCar(car) {
    $$('.name').forEach(e => e.textContent = car.name);
    $$('[data-plan]').forEach(e => e.textContent = car.plan);
    $$('[data-type]').forEach(e => e.textContent = car.type);
    $$('[data-seats]').forEach(e => e.textContent = car.seats);
    $$('[data-fuel]').forEach(e => e.textContent = car.fuel);
    $('[data-chips]').replaceChildren(...$('.card .chips').cloneNode(true).children);  // the page shows the same chips
  }
  showCar(ModoData.cars[ModoData.near]);
  $$('[data-member]').forEach(e => e.textContent = ModoData.member);
  $$('[data-parking]').forEach(e => e.textContent = ModoData.parking);
  $$('[data-address]').forEach(e => e.textContent = ModoData.address);

  // Availability strip: 24 hourly groups of four quarter-hour dots from the start of the current hour (ModoData.availability). Dot looks: available (light blue),
  // yours (navy, the chosen start..end) and unavailable (crossed grey). Redrawn by render() and fill(). Inline SVG (CSS masks are blocked from file://).
  const NOW = new Date(), HOUR0 = new Date(NOW).setMinutes(0, 0, 0), Q = 9e5;
  const DOT = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="4.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M2.2 7.8 7.8 2.2" stroke="currentColor" stroke-width="1.6"/></svg>';
  const ring = c => `<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="5" fill="${c}"/><circle cx="5" cy="5" r="4.4" fill="#fff"/><circle cx="5" cy="5" r="3.4" fill="${c}"/></svg>`;
  const FREE = ring('#8fbdd7'), MINE = ring('#476470');
  let selected = null;
  // The chosen range: an open return is marked for 12 h from the start (assumption: nothing in the reference shows it).
  const range = () => times.start && (openReturn ? [times.start, new Date(+times.start + 432e5)] : times.end && [times.start, times.end]);
  function drawStrip() {
    const busy = ModoData.availability(selected ?? ModoData.near, NOW), mine = range();
    const hours = Array.from({ length: 24 }, (_, i) => {
      const dots = Array.from({ length: 4 }, (_, k) => {
        const t = HOUR0 + (i * 4 + k) * Q;
        return busy.some(([a, b]) => t < b && t + Q > a) ? DOT : mine && t >= mine[0] && t < mine[1] ? MINE : FREE;
      }).join('');
      const h = (new Date(HOUR0).getHours() + i) % 24;
      return `<div class="hour"><div class="dots">${dots}</div><time>${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}</time></div>`;
    }).join('');
    $$('[data-strip]').forEach(e => e.innerHTML = hours);
  }

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

  // Filters: the Filter pill opens a modal sheet over the whole screen. Dragging the grabber or header down, the backdrop and APPLY close it.
  // APPLY only closes (the pins are not filtered); chips and checkboxes just toggle.
  const backdrop = $('.backdrop'), fsheetEl = $('.fsheet'), fscroll = $('.fscroll');
  const fsheet = IosSheet.create(fsheetEl, {
    detents: { open: () => 0, hidden: () => fsheetEl.offsetHeight },
    snaps: ['open', 'hidden'],
    shown: 'open',
    // The backdrop dims in step with the sheet's position and is out of the way once it is gone.
    onMove(y, { hidden }) { backdrop.style.opacity = .5 * Math.max(0, 1 - y / hidden); backdrop.style.visibility = y >= hidden ? '' : 'visible'; },
  });
  // The content scrolls on its own; only the grabber and, while scrolled to the top, the header drag the sheet.
  fscroll.addEventListener('pointerdown', e => { if (!(e.target.closest('.fhead') && fscroll.scrollTop <= 0)) e.stopPropagation(); });
  $('.filter').addEventListener('click', () => { fscroll.scrollTop = 0; fsheet.show(); });
  backdrop.addEventListener('click', () => fsheet.hide());
  $('.apply').addEventListener('click', () => fsheet.hide());
  $$('.fchip, .fsheet .row').forEach(b => b.addEventListener('click', () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true')));
  $('.fclear').addEventListener('click', () => $$('.fsheet [aria-pressed]').forEach(b => b.setAttribute('aria-pressed', 'false')));

  // Header: SET RETURN / OPEN RETURN. An open return has no end time, so the arrow and End Time fade out (CSS, .times.open) and the vehicle page drops its Return by row.
  const segs = [...$$('.seg > button')], timesEl = $('.times'), whens = [...$$('.when')];
  const times = { start: null, end: null }, PLACEHOLDER = ['Start Time', 'End Time'];
  let openReturn = false;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fmt = d => `${MON[d.getMonth()]} ${d.getDate()}, ${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
  const clock = d => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
  const pageDate = d => `${DAY[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${clock(d)}`;  // the page's own format, not the header's
  const atDate = d => `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} at ${clock(d)}`;
  function render() {
    segs.forEach((b, i) => { b.classList.toggle('on', !!i === openReturn); b.setAttribute('aria-pressed', !!i === openReturn); });
    timesEl.classList.toggle('open', openReturn);
    whens.forEach((b, i) => { const d = times[i ? 'end' : 'start']; b.lastChild.nodeValue = d ? fmt(d) : PLACEHOLDER[i]; b.classList.toggle('set', !!d); });
    $('[data-rtype]').textContent = openReturn ? 'Open Return' : 'Set Return';
    $('[data-pickup]').textContent = times.start ? pageDate(times.start) : 'Please set a time';
    $('[data-retby]').textContent = times.end ? pageDate(times.end) : 'Please set a time';
    $('[data-retrow]').hidden = openReturn;
    // BOOK VEHICLE and the Earliest/Latest box need a chosen range that is free on this car; otherwise the disabled look and the note stay. Booking itself is never done.
    const mine = range(), free = mine && ModoData.window(selected ?? ModoData.near, mine[0], mine[1], NOW);
    $('.book').disabled = !free; $('.note').hidden = !!free; $('.avail').hidden = !free;
    if (free) { $('[data-earliest]').textContent = `${atDate(free.earliest)}→`; $('[data-latest]').textContent = free.latest ? atDate(free.latest) : 'No limit'; }
    drawStrip();
  }
  segs.forEach((b, i) => b.addEventListener('click', () => { openReturn = !!i; render(); }));
  $('.clear').addEventListener('click', () => { times.start = times.end = null; render(); });

  // Time picker: an in-app sheet (same IosSheet as Filters) holding an inline wheel datetime picker. Each column is a scroll-snap list; the cylinder look is a per-row rotateX and fade set from the scroll position.
  const ROW = 32, COPIES = 40, PAST = 30, FUTURE = 60, pbd = $('.pbd'), psheetEl = $('.psheet'), cols = [...$$('.pcol')];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayLabel = i => { if (i === PAST) return 'Today'; const d = new Date(today); d.setDate(d.getDate() + i - PAST); return `${DAY[d.getDay()]} ${MON[d.getMonth()]} ${d.getDate()}`; };
  // n values; loop columns repeat them COPIES times and keep the view near the middle copy, like UIDatePicker.
  const wheels = [
    { n: PAST + FUTURE + 1, text: dayLabel }, { n: 12, text: i => i + 1, loop: true },
    { n: 4, text: i => String(i * 15).padStart(2, '0'), loop: true }, { n: 2, text: i => i ? 'PM' : 'AM' },
  ];
  wheels.forEach((w, k) => {
    const col = cols[k], total = w.loop ? w.n * COPIES : w.n;
    col.innerHTML = Array.from({ length: total }, (_, i) => `<div class="pi">${w.text(i % w.n)}</div>`).join('');
    col.items = col.children; col.raf = 0;
    const paint = () => {
      col.raf = 0;
      const t = col.scrollTop / ROW, c = Math.round(t);
      if (w.loop && (c < w.n * 3 || c > total - w.n * 3)) { col.scrollTop += Math.round((total / 2 - c) / w.n) * w.n * ROW; return paint(); }
      for (let i = Math.max(0, c - 5); i <= Math.min(total - 1, c + 5); i++) {
        const d = i - t, a = Math.abs(d), s = col.items[i].style;
        s.transform = `rotateX(${Math.max(-75, Math.min(75, -d * 24))}deg)`;
        s.opacity = a > 4 ? 0 : a < 1 ? 1 - .5 * a : Math.max(0, .5 - .1 * (a - 1));
      }
    };
    col.paint = paint;
    col.addEventListener('scroll', () => { col.raf ||= requestAnimationFrame(paint); });
    // A tap on another row brings it to the centre.
    col.addEventListener('click', e => {
      const i = Math.floor((e.clientY - col.getBoundingClientRect().top + col.scrollTop - 92) / ROW);
      if (i >= 0 && i < total) col.scrollTo({ top: i * ROW, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  });
  // The wheels scroll on their own; only the rest of the sheet drags it.
  $('.wheels').addEventListener('pointerdown', e => e.stopPropagation());

  const psheet = IosSheet.create(psheetEl, {
    detents: { open: () => 0, hidden: () => psheetEl.offsetHeight },
    snaps: ['open', 'hidden'],
    shown: 'open',
    onMove(y, { hidden }) { pbd.style.opacity = .5 * Math.max(0, 1 - y / hidden); pbd.style.visibility = y >= hidden ? '' : 'visible'; },
  });
  pbd.addEventListener('click', () => psheet.hide());
  $('.pclose').addEventListener('click', () => psheet.hide());

  let editing = 'start';
  const roundUp = d => new Date(Math.ceil(d / 9e5) * 9e5);
  function setWheels(v) {
    const h = v.getHours(), day = Math.min(PAST + FUTURE, Math.max(0, PAST + Math.round((new Date(v).setHours(0, 0, 0, 0) - today) / 864e5)));
    const at = [day, 12 * COPIES / 2 + (h % 12 || 12) - 1, 4 * COPIES / 2 + Math.round(v.getMinutes() / 15) % 4, h >= 12 ? 1 : 0];
    cols.forEach((c, k) => { c.scrollTop = at[k] * ROW; c.paint(); });
  }
  function openPicker(which, animate = true) {
    editing = which;
    $('.psub').hidden = !openReturn;
    setWheels(times[which] ?? (which === 'start' ? roundUp(new Date()) : times.start ? new Date(+times.start + 36e5) : roundUp(Date.now() + 36e5)));
    if (animate) psheet.show(); else psheet.snap('open', false);
    cols.forEach(c => c.paint());  // the sheet was hidden when the wheels were set; paint again once it has a size
  }
  $('[data-change]').addEventListener('click', () => openPicker('start'));  // assumption: the real Change Time was never tapped; it opens the start time sheet
  $('.psave').addEventListener('click', () => {
    const [day, hr, mi, ap] = cols.map(c => Math.round(c.scrollTop / ROW));
    const d = new Date(today); d.setDate(d.getDate() + day - PAST); d.setHours((hr % 12 + 1) % 12 + ap * 12, mi % 4 * 15);
    times[editing] = d;
    // An end at or before the start moves to an hour after it.
    if (times.start && times.end && times.end <= times.start) times.end = new Date(+times.start + 36e5);
    render(); psheet.hide();
  });
  whens.forEach((b, i) => b.addEventListener('click', () => openPicker(i ? 'end' : 'start')));
  render();

  let markers, home = null, pushed = false;
  const ease = t => 1 - (1 - t) ** 3;

  function fill(n) {
    const p = ModoData.pins.features[n].properties;
    $$('[data-station]').forEach(e => e.textContent = p.station);
    $$('[data-plate]').forEach(e => e.textContent = p.plate);
    showCar(ModoData.cars[n]); selected = n; render();
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

  if (first.book) { times.start = new Date(HOUR0 + 15 * 6e4); times.end = new Date(HOUR0 + 45 * 6e4); }
  if (first.filters) fsheet.snap('open', false);
  if (first.picker) { openReturn = !!first.open; render(); openPicker(first.picker, false); }  // the reference was taken with OPEN RETURN selected
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
