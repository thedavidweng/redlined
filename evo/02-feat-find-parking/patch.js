// Find parking. In a trip the map shows only Evo's own lots; the City of Vancouver meters a member may also end a trip at are only on evo.ca/parking. The patch adds a
// "Find parking" pill above the trip sheet. Tapping it enters parking mode: every place the trip may end nearby (open Evo lots, the eligible meters as cyan dots), the nearest
// one picked by driving time with its route drawn, and a bar with what it is, why it is allowed, the drive and Navigate (Apple Maps or Google Maps, driving).
// The data is PRECOMPUTED (meters.js from meters.py: City of Vancouver Open Data; routes.js from routes.py: OSRM car routing on OpenStreetMap data): the pages must work
// from file://. The real app would query the city's data and a routing API live. Only a trip has the pill: in every other state the patch does nothing.
(() => {
  const CLOSE = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M1.500 1.500 10.500 10.500M10.500 1.500 1.500 10.500" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const CAR = '<svg viewBox="0 0 22 12" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M1 8.2V6.4c0-.8.5-1.4 1.3-1.6L5 4l2-2.2C7.3 1.4 7.8 1.2 8.3 1.2h5c.5 0 1 .2 1.3.6L16.5 4l2.7.7c.8.2 1.3.8 1.3 1.6v1.8c0 .5-.4.8-.8.8h-1.1a2.3 2.3 0 0 0-4.5 0H7.4a2.3 2.3 0 0 0-4.5 0H1.8c-.4 0-.8-.3-.8-.8z"/><circle cx="5.200" cy="9.100" r="2.200"/><circle cx="15.800" cy="9.100" r="2.200"/></g></svg>';

  // meters.js and routes.js sit next to this file; the mock page loads patch.js from ../<folder>/, so resolve against the script, not the page.
  const here = document.currentScript?.src;
  const load = name => here ? new Promise(done => document.head.append(Object.assign(document.createElement('script'), { src: new URL(name, here).href, onload: done, onerror: done }))) : Promise.resolve();
  const loaded = Promise.all([load('meters.js'), load('routes.js')]);

  // A lot's hours ("Open 24/7", "Open 6am–11pm") against the clock. ?now=<ISO local time> freezes it, like Modo, so a clip does not depend on the recording hour.
  const hour = (n, ap) => (+n % 12) + (/pm/i.test(ap) ? 12 : 0);
  const span = hours => { const m = /(\d+)\s*(am|pm)\W+(\d+)\s*(am|pm)/i.exec(hours); return m ? { from: hour(m[1], m[2]), to: hour(m[3], m[4]), until: `${m[3]}${m[4].toLowerCase()}` } : null; };
  function openAt(hours, date) {
    const s = span(hours), t = date.getHours() + date.getMinutes() / 60;
    return !s || (t >= s.from && t < s.to);
  }

  async function apply({ root, map, data }) {
    await loaded;
    if (root.dataset.kind !== 'trip') return;  // the pill is for a trip only; any other state is left exactly as the mock draws it
    const found = globalThis.EvoMeters ?? { meters: [] }, routes = globalThis.EvoParkingRoutes ?? { lots: {}, meters: {} };
    const $ = q => root.querySelector(q);
    const mapEl = map.getContainer(), tabs = $('.tabs');
    const scale = () => globalThis.IosDevice?.scale() ?? 1;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ease = t => 1 - (1 - t) ** 3;
    const stamp = new URLSearchParams(location.search).get('now');
    const now = () => stamp && !isNaN(new Date(stamp)) ? new Date(stamp) : new Date();

    // Where a trip may end: the Evo lots that are open now and the eligible meters, each only if it has a precomputed route (the candidates).
    const places = () => {
      const at = now(), out = [];
      for (const f of data.parking.features) {
        const p = f.properties, route = routes.lots[p.n];
        if (!route || !openAt(p.hours, at)) continue;
        const s = span(p.hours);
        out.push({ key: `lot${p.n}`, lot: p.n, route, coordinates: f.geometry.coordinates, title: p.name.split(':')[0],
          why: s ? `Evo reserved, until ${s.until}` : 'Evo reserved spots' });
      }
      for (const m of found.meters) {
        const route = routes.meters[m[2]];
        if (route) out.push({ key: `meter${m[2]}`, meter: m[2], route, coordinates: [m[0], m[1]], title: `Pay meter · ${route.name || m[3]}`, why: 'Meter, no rush-hour limits' });
      }
      return out;
    };

    // Layers. The route is a black dotted line (as in 01-feat-walk-route) under the meters; the meters are cyan dots under every pin; the picked meter is a larger dot with a black edge.
    const first = 'evo-charging', zoomed = (...stops) => ['interpolate', ['linear'], ['zoom'], ...stops];
    map.addSource('ef-route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addSource('ef-meters', { type: 'geojson', data: { type: 'FeatureCollection', features: found.meters.map((m, i) => ({ type: 'Feature', id: i + 1,
      properties: { id: m[2], near: routes.meters[m[2]] ? 1 : 0 }, geometry: { type: 'Point', coordinates: [m[0], m[1]] } })) } });
    map.addSource('ef-pick', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    const hidden = { visibility: 'none' };
    map.addLayer({ id: 'ef-route', type: 'line', source: 'ef-route', layout: { ...hidden, 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#000', 'line-width': 4.5, 'line-dasharray': [0.01, 2], 'line-opacity': 0 } }, first);
    map.addLayer({ id: 'ef-meters', type: 'circle', source: 'ef-meters', layout: hidden,
      paint: { 'circle-color': '#00bce2', 'circle-radius': zoomed(13, 2.5, 15, 4.5, 16, 6.5, 18, 9), 'circle-stroke-color': '#fff', 'circle-stroke-width': zoomed(13, 1, 16, 1.6),
        'circle-opacity': 0, 'circle-stroke-opacity': 0 } }, first);
    map.addLayer({ id: 'ef-pick', type: 'circle', source: 'ef-pick', layout: hidden,
      paint: { 'circle-color': '#00bce2', 'circle-radius': zoomed(13, 5.5, 16, 10, 18, 13), 'circle-stroke-color': '#000', 'circle-stroke-width': 2.5 } }, first);

    // One tween helper: the route, the dots and the pick fade with a short ease-out (instant for reduced motion).
    const fades = new Map();
    const tween = (name, from, to, ms, set, done) => {
      cancelAnimationFrame(fades.get(name));
      const start = performance.now(), run = t => {
        const k = ms && !still ? Math.max(0, Math.min(1, (t - start) / ms)) : 1;
        set(from + (to - from) * ease(k));
        if (k < 1) fades.set(name, requestAnimationFrame(run)); else done?.();
      };
      run(start);
    };
    let route = 0, dots = 0;
    const setRoute = v => { route = v; map.setPaintProperty('ef-route', 'line-opacity', v); };
    const setDots = v => {
      dots = v;
      map.setPaintProperty('ef-meters', 'circle-opacity', ['case', ['==', ['get', 'near'], 1], v, v * .5]);  // meters without a precomputed route are not offered: paler
      map.setPaintProperty('ef-meters', 'circle-stroke-opacity', ['case', ['==', ['get', 'near'], 1], v, v * .5]);
      map.setPaintProperty('ef-pick', 'circle-opacity', v); map.setPaintProperty('ef-pick', 'circle-stroke-opacity', v);
    };

    // The pill: a white round-cornered button in the mock's own style, above the trip sheet.
    const pill = Object.assign(document.createElement('button'), { className: 'ef-find', type: 'button' });
    pill.innerHTML = '<svg aria-hidden="true"><use href="#i-pcircle"/></svg>Find parking';
    pill.setAttribute('aria-label', 'Find parking to end your trip');
    // The bar: what the place is, why a trip may end there, the drive, Navigate and close. It rises above the tab bar.
    const bar = Object.assign(document.createElement('div'), { className: 'ef-bar' });
    bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Parking'); bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = `<p class="ef-name"></p><p class="ef-why"></p><p class="ef-drive">${CAR}<span></span></p><button class="ef-go" type="button">Navigate</button><button class="ef-x" type="button" aria-label="Close parking">${CLOSE}</button>`;
    root.append(pill, bar);
    const text = q => bar.querySelector(q);

    // Frame the route between the mode pill and the bar. The car's pin hangs above its tip, so the top padding makes room for it.
    const edge = el => { const r = el.getBoundingClientRect(), m = mapEl.getBoundingClientRect(), k = scale(); return { top: (r.top - m.top) / k, bottom: (r.bottom - m.top) / k }; };
    const PIN_H = 44, NEAR = 6;
    const fit = animate => {
      if (!picked) return;
      // The route and the few other places closest by driving time, so the alternatives are in view (at most the zoom of a selected car).
      const line = picked.route.coordinates, bounds = line.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(line[0], line[0]));
      for (const p of [...open].sort((a, b) => a.route.duration - b.route.duration).slice(0, NEAR)) bounds.extend(p.coordinates);
      const height = mapEl.clientHeight, top = edge($('.mode')).bottom + 16 + PIN_H, barTop = edge(tabs).top - 12 - bar.offsetHeight;  // the bar's resting place (it may still be mid-transition)
      const cam = map.cameraForBounds(bounds, { padding: { top, bottom: height - barTop + 28, left: 56, right: 56 }, maxZoom: data.SELECTED_ZOOM });
      if (cam) map.easeTo({ center: cam.center, zoom: cam.zoom, duration: animate && !still ? 800 : 0, easing: ease });
    };

    // Parking mode. The trip sheet slides away (CSS), the rail fades, cars and chargers step aside, the Evo lots stay (a little larger) and the dots come in.
    const LOTS = ['evo-parking', 'evo-parking-selected'];
    let active = false, picked = null, saved = null, open = [];
    const minutes = r => Math.max(1, Math.round(r.duration / 60));
    function pick(place, animate = true) {
      if (picked?.lot != null) map.setFeatureState({ source: 'evo-parking', id: picked.lot + 1 }, { selected: false });
      picked = place;
      const f = place.route.coordinates;
      text('.ef-name').textContent = place.title;
      text('.ef-why').textContent = place.why;
      text('.ef-drive span').textContent = `${minutes(place.route)} min • ${(place.route.distance / 1000).toFixed(2)} km`;
      if (place.lot != null) map.setFeatureState({ source: 'evo-parking', id: place.lot + 1 }, { selected: true });
      map.getSource('ef-pick').setData({ type: 'FeatureCollection', features: place.meter ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: place.coordinates } }] : [] });
      const set = () => { map.getSource('ef-route').setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: f } }); tween('route', route, 1, 300, setRoute); };
      if (route > 0.02) tween('route', route, 0, 150, setRoute, set); else set();  // another place: the old line goes before the new one comes
      fit(animate);
    }
    function enter() {
      if (active) return;
      open = places();
      if (!open.length) return;
      active = true;
      saved = { center: map.getCenter().toArray(), zoom: map.getZoom() };
      for (const id of ['ef-route', 'ef-meters', 'ef-pick']) map.setLayoutProperty(id, 'visibility', 'visible');
      for (const id of ['evo-cars', 'evo-charging']) map.setLayoutProperty(id, 'visibility', 'none');
      const ok = ['in', ['get', 'n'], ['literal', open.filter(p => p.lot != null).map(p => p.lot)]];
      for (const id of LOTS) { map.setFilter(id, ok); map.setLayoutProperty(id, 'icon-size', 1.2); }
      root.classList.add('ef-on'); bar.setAttribute('aria-hidden', 'false');
      tween('dots', 0, 1, 400, setDots);
      pick(open.reduce((a, b) => b.route.duration < a.route.duration ? b : a));  // the nearest by driving time
    }
    function exit() {
      if (!active) return;
      active = false;
      root.classList.remove('ef-on'); bar.setAttribute('aria-hidden', 'true');
      if (picked?.lot != null) map.setFeatureState({ source: 'evo-parking', id: picked.lot + 1 }, { selected: false });
      picked = null;
      tween('route', route, 0, 150, setRoute);
      tween('dots', dots, 0, 200, setDots, () => {
        if (active) return;
        for (const id of ['ef-route', 'ef-meters', 'ef-pick']) map.setLayoutProperty(id, 'visibility', 'none');
      });
      for (const id of ['evo-cars', 'evo-charging']) map.setLayoutProperty(id, 'visibility', 'visible');
      for (const id of LOTS) { map.setFilter(id, null); map.setLayoutProperty(id, 'icon-size', 1); }
      if (saved) map.easeTo({ ...saved, duration: still ? 0 : 700, easing: ease });
      pill.focus({ preventScroll: true });
    }
    pill.addEventListener('click', enter);
    text('.ef-x').addEventListener('click', exit);
    text('.ef-go').addEventListener('click', () => openDirections());
    // Parking mode owns the map: a tap picks the nearest place under the finger (same hit test as the mock) or does nothing; it never drops back to the trip sheet or opens a
    // lot's card. Only candidates (places with a precomputed route) can be picked.
    root.addEventListener('click', e => {
      if (!active || !mapEl.contains(e.target)) return;
      e.stopPropagation();
      const r = mapEl.getBoundingClientRect(), k = scale(), x = (e.clientX - r.left) / k, y = (e.clientY - r.top) / k;  // screen px -> map px
      let best = null, away = 1e9;
      for (const hit of map.queryRenderedFeatures([[x - 22, y - 22], [x + 22, y + 22]], { layers: ['ef-meters', ...LOTS] })) {
        const place = open.find(p => hit.layer.id === 'ef-meters' ? p.meter === hit.properties.id : p.lot === hit.properties.n);
        if (!place) continue;
        const p = map.project(place.coordinates), d = Math.hypot(p.x - x, p.y - (place.lot != null ? 20 : 0) - y);
        if (d < away) { best = place; away = d; }
      }
      if (best && best !== picked) pick(best);
    }, true);
    if (matchMedia('(hover: hover)').matches) {
      map.on('mousemove', e => {
        if (!active) return;
        const hits = map.queryRenderedFeatures([[e.point.x - 12, e.point.y - 12], [e.point.x + 12, e.point.y + 12]], { layers: ['ef-meters', ...LOTS] });
        map.getCanvas().style.cursor = hits.some(h => open.some(p => h.layer.id === 'ef-meters' ? p.meter === h.properties.id : p.lot === h.properties.n)) ? 'pointer' : '';
      });
    }
    // Escape closes the action sheet first, then parking mode, before the mock's own Escape.
    addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (actions.classList.contains('in')) { e.stopImmediatePropagation(); closeActions(); }
      else if (active) { e.stopImmediatePropagation(); exit(); }
    }, true);
    // Fonts and frame size settle late (the bar's height changes the fit): keep the picked place framed.
    new ResizeObserver(() => { if (active) fit(false); }).observe(bar);
    document.fonts?.ready.then(() => { if (active) fit(false); });

    // iOS-style action sheet, inside the frame: Apple Maps or Google Maps, driving, to the place.
    const bd = Object.assign(document.createElement('div'), { className: 'ef-bd' });
    const actions = document.createElement('div');
    actions.className = 'ef-as';
    actions.setAttribute('role', 'dialog'); actions.setAttribute('aria-label', 'Navigate'); actions.setAttribute('aria-hidden', 'true');
    actions.innerHTML = '<div class="ef-group"><p class="ef-title"></p><button data-maps="apple">Apple Maps</button><button data-maps="google">Google Maps</button></div><button class="ef-cancel">Cancel</button>';
    root.append(bd, actions);
    const URLS = {
      apple: ([lng, lat]) => `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`,
      google: ([lng, lat]) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
    };
    let target = null;
    function openDirections() {
      if (!picked) return;
      target = picked;
      actions.querySelector('.ef-title').textContent = `Drive to ${picked.title}`;
      actions.setAttribute('aria-hidden', 'false'); actions.classList.add('in'); bd.classList.add('in');
      actions.querySelector('[data-maps]').focus({ preventScroll: true });
    }
    function closeActions() {
      actions.setAttribute('aria-hidden', 'true'); actions.classList.remove('in'); bd.classList.remove('in');
    }
    bd.addEventListener('click', closeActions);
    actions.querySelector('.ef-cancel').addEventListener('click', closeActions);
    actions.querySelectorAll('[data-maps]').forEach(b => b.addEventListener('click', () => {
      window.open(URLS[b.dataset.maps](target.coordinates), '_blank', 'noopener');
      closeActions();
    }));
  }

  globalThis.redlinePatch = { apply };
})();
