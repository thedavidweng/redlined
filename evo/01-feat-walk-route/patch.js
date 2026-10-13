// Walk route. The mock writes an estimate (1.25 x the straight line at 5 km/h) into [data-walk], [data-walk-short] and [data-minutes] on every selection and never
// draws a route. The patch swaps the figures for the street route's distance and time, draws the route on the map, frames it, and makes the walk row on the compact sheet
// a button that opens a route preview. Directions (the expanded card's button and the preview's) open an iOS action sheet with Apple Maps and Google Maps.
// The routes are PRECOMPUTED (routes.js, made by routes.py from OSRM foot routing on OpenStreetMap data): the pages must work from file://. The real app would ask a routing API live.
(() => {
  const CHEVRON = '<svg class="ew-go" width="8" height="13" viewBox="0 0 8 13" aria-hidden="true"><path d="M1.5 1.5 6.5 6.5 1.5 11.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const WALKER = '<svg aria-hidden="true"><use href="#i-walk"/></svg>';
  const CLOSE = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M1.500 1.500 10.500 10.500M10.500 1.500 1.500 10.500" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  // routes.js sits next to this file; the mock page loads patch.js from ../<folder>/, so resolve against the script, not the page.
  const here = document.currentScript?.src;
  const routesLoaded = here ? new Promise(done => document.head.append(Object.assign(document.createElement('script'), { src: new URL('routes.js', here).href, onload: done, onerror: done }))) : Promise.resolve();

  async function apply({ root, map, data }) {
    await routesLoaded;
    const routes = globalThis.EvoRoutes ?? [];
    const $ = q => root.querySelector(q), $$ = q => [...root.querySelectorAll(q)];
    const mapEl = map.getContainer(), sheetEl = $('.sheet');
    const scale = () => globalThis.IosDevice?.scale() ?? 1;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // The app's own format: "0.31 km • 4 min" on the sheet, one decimal on the expanded card. Converted from the route, never hard-coded.
    const figures = ({ distance, duration }) => ({ km: (distance / 1000).toFixed(2), kmShort: (distance / 1000).toFixed(1), minutes: Math.max(1, Math.round(duration / 60)) });
    const text = route => `${figures(route).km} km • ${figures(route).minutes} min`;

    // The walk row on the compact sheet is a button (chevron) that opens the route preview.
    const row = $('.pane-car .walk');
    row.insertAdjacentHTML('beforeend', CHEVRON);
    row.setAttribute('aria-label', 'Show walking route');
    row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enterPreview(); } });
    row.addEventListener('click', () => enterPreview());

    // The selected car, or null: only the car pane has a route (parking and trip panes are left alone). The plate identifies the car; the sheet fills it before the class changes.
    const selected = () => {
      if (root.dataset.kind !== 'car' || !root.classList.contains('is-selected')) return null;
      const n = data.vehicles.features.findIndex(f => f.properties.plate === $('[data-plate]').textContent);
      return n < 0 || !routes[n] ? null : n;
    };

    // The route: a black dotted line from the user dot to the car, under every marker, faded with a short ease-out.
    map.addSource('evo-walk', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'evo-walk', type: 'line', source: 'evo-walk', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#000', 'line-width': 4.5, 'line-dasharray': [0.01, 2], 'line-opacity': 0 } }, 'evo-charging');
    let fade = 0, opacity = 0;
    const fadeTo = (to, done, ms = still ? 0 : 300) => {
      cancelAnimationFrame(fade);
      const from = opacity, start = performance.now();
      const step = now => {
        const t = ms ? Math.max(0, Math.min(1, (now - start) / ms)) : 1;
        opacity = from + (to - from) * (1 - (1 - t) ** 3);
        map.setPaintProperty('evo-walk', 'line-opacity', opacity);
        if (t < 1) fade = requestAnimationFrame(step); else done?.();
      };
      step(start);
    };
    const show = route => {
      const set = () => { map.getSource('evo-walk').setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.coordinates } }); fadeTo(1); };
      if (opacity > 0.02) fadeTo(0, set, still ? 0 : 150); else set();  // another car: the old line goes before the new one comes
    };

    // Map pixels of an element's edges, measured live (the phone may be scaled on screen, and fonts and frames settle late).
    const edge = el => { const r = el.getBoundingClientRect(), m = mapEl.getBoundingClientRect(), k = scale(); return { top: (r.top - m.top) / k, bottom: (r.bottom - m.top) / k }; };
    const boundsOf = route => route.coordinates.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(route.coordinates[0], route.coordinates[0]));

    // Frame the walk between the mode pill and the top of the compact sheet. The pin hangs 42.5 pt above its tip, so the top padding makes room for it. Never zooms in past the
    // selected zoom. Below the floor (the strip is small, a very wide view looks empty) the car takes the edge of the strip on its side of the user dot and the dot falls where it may.
    const FLOOR = 14.6, PIN_H = 44, PAD = 28, GAP = 8;
    const frame = (route, animate) => {
      const height = mapEl.clientHeight, top = edge($('.mode')).bottom + GAP + PIN_H, bottom = height - sheetEl.offsetHeight - 12;
      const camera = map.cameraForBounds(boundsOf(route), { padding: { top, bottom: height - bottom, left: PAD, right: PAD }, maxZoom: data.SELECTED_ZOOM });
      let cam = camera, offset = [0, 0];
      if (!cam || cam.zoom < FLOOR) {
        const [start, end] = [route.coordinates[0], route.coordinates.at(-1)], tip = end[1] < start[1] ? bottom : top;
        cam = { center: end, zoom: FLOOR }; offset = [0, tip - height / 2];
      }
      map.easeTo({ center: cam.center, zoom: cam.zoom, offset, duration: animate && !still ? 700 : 0, easing: t => 1 - (1 - t) ** 3 });
    };

    // Route preview: the sheet slides out of the way (CSS `translate`, which composes with sheet.js's `transform`), the rail fades, a bar sits above the tab bar,
    // and the camera fits the whole route between the mode pill and the bar. Exit: the close button, the map, Escape or another car.
    const tabs = $('.tabs');
    const bar = Object.assign(document.createElement('div'), { className: 'ew-bar' });
    bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Walking route'); bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = `<div class="ew-info"><p class="ew-name"><b></b><span class="plate"></span></p><p class="ew-walk">${WALKER}<span></span></p></div><button class="ew-go-btn" type="button">Directions</button><button class="ew-x" type="button" aria-label="Close route">${CLOSE}</button>`;
    root.append(bar);
    let previewing = false, shown = null;
    const fitPreview = animate => {
      const route = routes[shown];
      if (!route) return;
      const height = mapEl.clientHeight, top = edge($('.mode')).bottom + 16 + PIN_H, barTop = edge(tabs).top - 12 - bar.offsetHeight;  // the bar's resting place (it may still be mid-transition)
      const cam = map.cameraForBounds(boundsOf(route), { padding: { top, bottom: height - barTop + 28, left: 48, right: 48 }, maxZoom: data.SELECTED_ZOOM });
      if (cam) map.easeTo({ center: cam.center, zoom: cam.zoom, duration: animate && !still ? 800 : 0, easing: t => 1 - (1 - t) ** 3 });
    };
    function enterPreview() {
      const route = routes[shown];
      if (previewing || !route) return;
      previewing = true;
      bar.querySelector('.ew-name b').textContent = $('.sheet .model').textContent;
      bar.querySelector('.ew-name .plate').textContent = $('.sheet .plate').textContent;
      bar.querySelector('.ew-walk span').textContent = text(route);
      root.classList.add('ew-on'); bar.setAttribute('aria-hidden', 'false');
      fitPreview(true);
    }
    // again: put the normal selected view back (camera included). Without it (the car was deselected or another one picked) the camera is not ours to move.
    function exitPreview(again, instant) {
      if (!previewing) return;
      previewing = false;
      if (instant) root.classList.add('ew-snap');
      root.classList.remove('ew-on'); bar.setAttribute('aria-hidden', 'true');
      if (instant) { root.getBoundingClientRect(); root.classList.remove('ew-snap'); }
      if (again && routes[shown]) frame(routes[shown], true);
    }
    bar.querySelector('.ew-x').addEventListener('click', () => exitPreview(true));
    bar.querySelector('.ew-go-btn').addEventListener('click', () => openDirections());
    // A tap on the map leaves the preview and nothing else (the mock would deselect the car); a tap on another car goes through and selects it. Same hit test as the mock.
    root.addEventListener('click', e => {
      if (!previewing || !mapEl.contains(e.target)) return;
      const r = mapEl.getBoundingClientRect(), k = scale(), x = (e.clientX - r.left) / k, y = (e.clientY - r.top) / k;  // screen px -> map px
      const hits = map.queryRenderedFeatures([[x - 22, y - 22], [x + 22, y + 22]], { layers: ['evo-cars', 'evo-parking'] });
      if (hits.some(f => f.layer.id === 'evo-cars' && f.properties.n !== shown)) return;
      e.stopPropagation();
      exitPreview(true);
    }, true);
    // Escape closes the action sheet first, then the preview, before the mock's own Escape (which would deselect the car).
    addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (actions.classList.contains('in')) { e.stopImmediatePropagation(); closeActions(); }
      else if (previewing) { e.stopImmediatePropagation(); exitPreview(true); }
    }, true);

    // Selection changes arrive as text writes (fill) and class / data-kind changes; one observer handles them all.
    let first = true;
    const update = () => {
      const n = selected(), route = n == null ? null : routes[n];
      if (route) {
        const f = figures(route);
        for (const [key, value] of [['walk', f.km], ['walk-short', f.kmShort], ['minutes', f.minutes]]) $$(`[data-${key}]`).forEach(e => e.textContent = value);
      }
      row.setAttribute('role', route ? 'button' : 'presentation'); row.tabIndex = route ? 0 : -1;
      row.classList.toggle('ew-live', !!route);
      if (n !== shown) {
        shown = n;
        exitPreview(false, n == null);
        if (route) {
          show(route);
          frame(route, !first);
        } else fadeTo(0);
      }
      first = false;
      observer.takeRecords();  // our own writes are not a new selection
    };
    const observer = new MutationObserver(update);
    $$('[data-walk], [data-walk-short], [data-minutes], [data-plate]').forEach(e => observer.observe(e, { childList: true, characterData: true, subtree: true }));
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'data-kind'] });
    update();  // a state opened already selected was filled before the patch ran

    // iOS-style action sheet, inside the frame: Apple Maps or Google Maps, walking, to the car's own coordinates.
    const bd = Object.assign(document.createElement('div'), { className: 'ew-bd' });
    const actions = document.createElement('div');
    actions.className = 'ew-as';
    actions.setAttribute('role', 'dialog'); actions.setAttribute('aria-label', 'Directions'); actions.setAttribute('aria-hidden', 'true');
    actions.innerHTML = '<div class="ew-group"><p class="ew-title"></p><button data-maps="apple">Apple Maps</button><button data-maps="google">Google Maps</button></div><button class="ew-cancel">Cancel</button>';
    root.append(bd, actions);
    const URLS = {
      apple: ([lng, lat]) => `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`,
      google: ([lng, lat]) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,
    };
    let carNow = null;
    function openDirections() {
      if (shown == null) return;
      carNow = data.vehicles.features[shown];
      actions.querySelector('.ew-title').textContent = `Walk to ${carNow.properties.address}`;
      actions.setAttribute('aria-hidden', 'false'); actions.classList.add('in'); bd.classList.add('in');
      actions.querySelector('[data-maps]').focus({ preventScroll: true });
    }
    function closeActions() {
      actions.setAttribute('aria-hidden', 'true'); actions.classList.remove('in'); bd.classList.remove('in');
    }
    // The expanded card's button did nothing in the mock; it opens the action sheet now (its tooltip said it was outside the mock).
    const go = $('.full-car .directions');
    go.removeAttribute('title');
    go.addEventListener('click', e => { e.stopPropagation(); openDirections(); });
    bd.addEventListener('click', closeActions);
    actions.querySelector('.ew-cancel').addEventListener('click', closeActions);
    actions.querySelectorAll('[data-maps]').forEach(b => b.addEventListener('click', () => {
      window.open(URLS[b.dataset.maps](carNow.geometry.coordinates), '_blank', 'noopener');
      closeActions();
    }));
  }

  globalThis.redlinePatch = { apply };
})();
