// Live count on the Filters button. APPLY becomes "SHOW 9 CARS": every chip, checkbox and Clear All recounts with ModoData.match over ModoData.cars,
// and tapping it closes the sheet and filters the map. The Filter pill shows how many options are on ("Filter · 2").
// Seat Sale (Category) has no data on the cars, so it is left out of the count and never narrows the map; it still counts as an option on the pill.
// Nothing in the mock changes: the patch reads aria-pressed (which the mock toggles) and works through the `map` handle.
(() => {
  const EASE = 'cubic-bezier(.32,.72,0,1)';
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function apply({ root, map, data }) {
    const $ = q => root.querySelector(q), $$ = q => [...root.querySelectorAll(q)];
    const sheet = $('.fsheet'), button = $('.apply'), pill = $('.filter'), backdrop = $('.backdrop');
    const classChips = $$('.cls .fchip'), seatChips = $$('.seats .fchip'), featRows = $$('.feat .row'), all = $$('.fsheet [aria-pressed]');
    const on = el => el.getAttribute('aria-pressed') === 'true';

    // ---- Count ----------------------------------------------------------------------------------------------------------------------------
    // Chips and rows -> a ModoData.match query. Seats chips read "N +" (at least N).
    const query = () => ({
      classes: classChips.filter(on).map(c => c.textContent.trim()),
      seats: Math.max(0, ...seatChips.filter(on).map(c => parseInt(c.textContent))),
      features: featRows.filter(on).map(r => r.firstChild.textContent.trim()),
    });
    const options = () => all.filter(on).length;  // shown on the pill

    // ---- Button ---------------------------------------------------------------------------------------------------------------------------
    button.innerHTML = '<span class="lc-n"></span>';
    const num = button.firstChild;
    let shown = null;  // the count on the button now (0 = "NO CARS MATCH")
    function setLabel(n) {
      button.disabled = n === 0;
      if (n === shown) return;
      const prev = num.lastElementChild, dir = n > (shown ?? 0) ? 1 : -1;
      const next = Object.assign(document.createElement('span'), { textContent: n === 0 ? 'NO CARS MATCH' : `SHOW ${n} ${n === 1 ? 'CAR' : 'CARS'}` });
      num.append(next);
      shown = n;
      if (!prev || still()) { prev?.remove(); return; }
      // Roll: the old label lifts out and the new one comes up from below (8 px and a fade, no clipping).
      const opt = { duration: 260, easing: EASE, fill: 'both' };
      prev.animate([{ transform: 'none', opacity: 1 }, { transform: `translateY(${-8 * dir}px)`, opacity: 0 }], opt).finished.then(() => prev.remove());
      next.animate([{ transform: `translateY(${8 * dir}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], opt);
    }

    function pillLabel() {
      const k = applied.options;
      pill.querySelector('.lc-pill')?.remove();
      if (k) pill.append(Object.assign(document.createElement('span'), { className: 'lc-pill', textContent: k }));
      pill.classList.toggle('lc-on', k > 0);
    }

    // ---- Map filter (kept small: redline 07 reuses it) -------------------------------------------------------------------------------------
    // Show only the cars in `keep` (an array of pin numbers n), or everything when `keep` is null.
    // Pins: each layer's own filter AND n in keep. Clusters: the source is re-fed with the count of kept members; an empty cluster is filtered out.
    const LAYERS = ['pins', 'pins-grouped'];  // the selected pin stays visible: its sheet is open
    const original = Object.fromEntries(LAYERS.map(id => [id, map.getFilter(id)]));
    const disc = count => {  // the mock only drew discs for its own counts (2, 3); a filtered cluster can drop to 1
      const id = `modo-cluster-${count}`;
      if (!map.hasImage(id)) IosMapImages.load(ModoAssets.cluster).then(img => {
        IosMapImages.draw(map, id, 32, 32, g => { g.drawImage(img, 0, 0, 32, 32); g.fillStyle = '#fff'; g.font = '500 20px Roboto, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(count, 16, 16.6); });
        feed();  // feed again, now the image exists
      });
      return id;
    };
    let members = () => 0;
    const feed = () => map.getSource('modo-clusters').setData({
      type: 'FeatureCollection',
      features: data.clusters.features.filter(f => members(f.properties.k) > 0).map(f => {
        const count = members(f.properties.k);
        return { ...f, properties: { ...f.properties, count, image: disc(count) } };
      }),
    });
    function filterMap(keep) {
      const set = keep && new Set(keep);
      for (const id of LAYERS) map.setFilter(id, set ? ['all', original[id], ['in', ['get', 'n'], ['literal', keep]]] : original[id]);
      members = k => data.pins.features.filter(f => f.properties.group === k && (!set || set.has(f.properties.n))).length;
      feed();
    }

    // ---- Wiring ---------------------------------------------------------------------------------------------------------------------------
    let applied = { options: 0, chips: all.map(on) }, applying = false;
    const total = data.cars.length;
    const recount = () => setLabel(data.match(query()).length);

    // Seats read "at least N", so only one can be on: turning one on turns the others off.
    new MutationObserver(records => {
      for (const r of records) if (seatChips.includes(r.target) && on(r.target)) seatChips.forEach(c => { if (c !== r.target && on(c)) c.setAttribute('aria-pressed', 'false'); });
      recount();
    }).observe(sheet, { attributes: true, attributeFilter: ['aria-pressed'], subtree: true });

    button.addEventListener('click', () => {
      const keep = options() ? data.match(query()) : null;  // nothing chosen restores everything
      filterMap(keep && keep.length < total ? keep : null);
      applied = { options: options(), chips: all.map(on) };
      applying = true;
      pillLabel();
    });
    // Closed any other way (backdrop, drag): the choices were not applied, so the sheet goes back to what the map shows.
    new MutationObserver(() => {
      if (backdrop.style.visibility === 'visible') return;
      if (!applying) { all.forEach((b, i) => b.setAttribute('aria-pressed', applied.chips[i])); recount(); }
      applying = false;
    }).observe(backdrop, { attributes: true, attributeFilter: ['style'] });

    setLabel(data.match(query()).length);
  }

  globalThis.redlinePatch = { apply };
})();
