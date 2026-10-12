// Walk and directions. The mock writes the station into every [data-station] on each selection; the patch reads it back, finds the pin and writes
// a walking line under it, and draws the walking route on the map. The vehicle page's Home Location gets Copy and Directions (an action sheet inside the device frame).
// The routes are PRECOMPUTED (routes.js, made by routes.py from OSRM foot routing on OpenStreetMap data): the pages must work from file://. The real app would ask a routing API live.
// Time and distance come from the route: the foot profile's duration (about 75 m/min) is used as is.
(() => {
  const WALKER = '<svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true"><circle cx="7.4" cy="2.1" r="1.7" fill="currentColor"/><path d="M7 5.4 5.6 9.2 8 11.6V15M5.6 9.2 3.6 15M7 5.4l3 2.6M7 5.4 4 6.6 3.2 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const COPY = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 5.5h8v8h-8zM3.5 10.5h-1v-8h8v1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  const GO = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 14.5 8 8 14.5 1.5 8zM5.4 10V7.6a.8.8 0 0 1 .8-.8h3.4M8.4 5l1.8 1.8-1.8 1.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/></svg>';

  // routes.js sits next to this file; the mock page loads patch.js from ../<folder>/, so resolve against the script, not the page.
  const here = document.currentScript?.src;
  const routesLoaded = here ? new Promise(done => document.head.append(Object.assign(document.createElement('script'), { src: new URL('routes.js', here).href, onload: done, onerror: done }))) : Promise.resolve();

  const label = ({ distance, duration }) => {
    const m = Math.round(distance / 10) * 10;
    return `${Math.max(1, Math.round(duration / 60))} min · ${m < 1000 ? `${m} m` : `${(distance / 1000).toFixed(1)} km`}`;
  };

  async function apply({ root, map, data }) {
    await routesLoaded;
    const routes = globalThis.ModoRoutes ?? [];
    const $ = q => root.querySelector(q), $$ = q => [...root.querySelectorAll(q)];

    // Walk line: under the station on the card and on the vehicle page.
    const lines = $$('[data-station].where').map(station => {
      const p = Object.assign(document.createElement('p'), { className: 'walk', hidden: true });
      p.setAttribute('data-walk', '');
      p.innerHTML = `${WALKER}<span></span>`;
      station.after(p);
      return p;
    });
    // The pin that is selected, or null: the sheet is only shown while a pin is selected (sheet.js sets its inline visibility).
    const sheetEl = $('.sheet');
    const selected = () => {
      if (sheetEl.style.visibility !== 'visible') return null;
      const station = $('.card [data-station]').textContent, plate = $('[data-plate]').textContent;
      return (data.pins.features.find(f => f.properties.station === station && f.properties.plate === plate) ?? data.pins.features.find(f => f.properties.station === station))?.properties.n ?? null;
    };

    // The route: a dotted navy line from the user dot to the pin, under the markers, faded in with the mock's own ease (out-cubic).
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.addSource('walk-route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'walk-route', type: 'line', source: 'walk-route', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#26505e', 'line-width': 4.5, 'line-dasharray': [0.01, 2], 'line-opacity': 0 } }, 'modo-user');
    let fade = 0, opacity = 0;
    const fadeTo = to => {
      cancelAnimationFrame(fade);
      const from = opacity;
      const start = performance.now(), ms = still ? 0 : 350;
      const step = now => {
        const t = ms ? Math.max(0, Math.min(1, (now - start) / ms)) : 1;
        opacity = from + (to - from) * (1 - (1 - t) ** 3);
        map.setPaintProperty('walk-route', 'line-opacity', opacity);
        if (t < 1) fade = requestAnimationFrame(step);
      };
      step(start);
    };

    // Frame the walk: the whole route (user dot to pin) inside the map strip between the header and the Filter pill (the selected pin must never sit under it), measured live.
    // The pill's resting place once the sheet is open is its layout top minus the sheet height (app.js moves it by y - hidden). Never zooms in past the home zoom;
    // the floor is 14.6: below that the route is framed against the sheet top instead, so the pin and the user dot both stay visible (the pin may then be near the pill).
    const FLOOR = 14.6, PIN_H = 44, PAD = 24, GAP = 8;
    const frame = (route, animate) => {
      const mapBox = map.getContainer().getBoundingClientRect(), head = $('.head').getBoundingClientRect();
      const pill = $('.float').offsetTop - sheetEl.offsetHeight - mapBox.top, top = head.bottom - mapBox.top + GAP + PIN_H;
      const bounds = route.coordinates.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(route.coordinates[0], route.coordinates[0]));
      const camera = bottom => map.cameraForBounds(bounds, { padding: { top, bottom: mapBox.height - bottom, left: PAD, right: PAD }, maxZoom: data.camera.zoom });
      let cam = camera(pill - 8);
      let offset = [0, 0];
      if (!cam || cam.zoom < FLOOR) {  // floor zoom: the pin is what matters, so it takes the edge of the strip on its side of the dot (above the pill, or under the header); the dot goes where it falls
        const [start, end] = [route.coordinates[0], route.coordinates.at(-1)], tip = end[1] < start[1] ? pill - 8 : top;
        cam = { center: end, zoom: FLOOR }; offset = [0, tip - mapBox.height / 2];
      }
      map.easeTo({ center: cam.center, zoom: cam.zoom, offset, duration: animate && !still ? 600 : 0, easing: t => 1 - (1 - t) ** 3 });
    };
    let shown = null, first = true, pinNow = null;
    const update = () => {
      const n = selected(), route = n == null ? null : routes[n];
      lines.forEach(p => {
        p.hidden = !route;
        if (route) p.lastChild.textContent = label(route);
      });
      if (n !== shown) {
        shown = n; pinNow = n == null ? null : data.pins.features[n];
        if (route) {
          map.getSource('walk-route').setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.coordinates } });
          fadeTo(1);
          frame(route, !first);
        } else fadeTo(0);
      }
      first = false;
      observer.takeRecords();  // our own writes are not a new selection
    };
    const observer = new MutationObserver(update);
    $$('[data-station]').forEach(e => observer.observe(e, { childList: true, characterData: true, subtree: true }));
    new MutationObserver(update).observe(sheetEl, { attributes: true, attributeFilter: ['style'] });  // selection ends when the sheet is gone
    update();  // a state opened already selected was filled before the patch ran

    // Home Location: Copy and Directions under the address.
    const address = $('[data-address]'), text = () => address.textContent.trim();
    const row = Object.assign(document.createElement('div'), { className: 'addr-actions' });
    row.innerHTML = `<button class="addr-btn" data-copy>${COPY}Copy</button><button class="addr-btn" data-directions>${GO}Directions</button>`;
    address.after(row);

    const toast = Object.assign(document.createElement('div'), { className: 'toast', textContent: 'Address copied' });
    toast.setAttribute('role', 'status');
    let timer = 0;
    const flash = () => {
      toast.classList.add('on');
      clearTimeout(timer);
      timer = setTimeout(() => toast.classList.remove('on'), 1800);
    };
    async function copy() {
      try { await navigator.clipboard.writeText(text()); return true; } catch { /* file:// or no permission: use the old way */ }
      const area = Object.assign(document.createElement('textarea'), { value: text() });
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      root.append(area); area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { /* ignore */ }
      area.remove();
      return ok;
    }
    row.querySelector('[data-copy]').addEventListener('click', async () => { if (await copy()) flash(); });

    // iOS-style action sheet, inside the frame.
    const bd = Object.assign(document.createElement('div'), { className: 'as-bd' });
    const sheet = document.createElement('div');
    sheet.className = 'as';
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'Directions'); sheet.setAttribute('aria-hidden', 'true');
    sheet.innerHTML = '<div class="as-group"><p class="as-title"></p><button data-maps="apple">Apple Maps</button><button data-maps="google">Google Maps</button></div><button class="as-cancel">Cancel</button>';
    root.append(bd, sheet, toast);
    const URLS = {  // the pin's own coordinates: the mock's address text is the same for every car
      apple: ([lng, lat]) => `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`,
      google: ([lng, lat]) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,
    };
    const open = () => {
      sheet.querySelector('.as-title').textContent = `Walk to ${pinNow?.properties.station ?? text()}`;
      sheet.setAttribute('aria-hidden', 'false'); sheet.classList.add('in'); bd.classList.add('in');
      sheet.querySelector('[data-maps]').focus({ preventScroll: true });
    };
    const close = () => {
      sheet.setAttribute('aria-hidden', 'true'); sheet.classList.remove('in'); bd.classList.remove('in');
    };
    row.querySelector('[data-directions]').addEventListener('click', open);
    bd.addEventListener('click', close);
    sheet.querySelector('.as-cancel').addEventListener('click', close);
    sheet.querySelectorAll('[data-maps]').forEach(b => b.addEventListener('click', () => {
      window.open(URLS[b.dataset.maps](pinNow.geometry.coordinates), '_blank', 'noopener');
      close();
    }));
    root.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet.classList.contains('in')) close(); });
  }

  globalThis.redlinePatch = { apply };
})();
