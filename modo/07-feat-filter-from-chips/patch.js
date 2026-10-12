// Filter from chips. Tapping a car's attribute chip (class, seats, electric/hybrid) filters the map to cars that share it and jumps to the nearest other one.
// Composition: 07 = 06 + chips. This file loads 06's patch.js and patch.css (paths resolve against this script, since the mock page loads it from ../<folder>/),
// takes 06's `redlinePatch` for itself and sets its own, and apply() runs 06's apply first. 06 is never edited and its internals are not reached into:
// 07 drives it through the DOM it already reacts to. It sets the chip or row in the Filters sheet (aria-pressed), then presses the sheet's APPLY button,
// so the live count, the Filter pill badge, the map filter and Clear All all stay 06's.
// Selecting the next car: the mock selects on a map click on a pin and the pin may be off screen, so 07 fires the map's own 'click' at the projected pin point
// and, for that one synchronous call, lets queryRenderedFeatures answer with the target pin (an off-screen pin cannot be hit-tested). The mock's own handler does the rest.
// "Nearest" is straight-line distance from ModoData.user, not walking distance. Gas has no matching Filters option, so the Gas chip stays a plain label.
(() => {
  const here = document.currentScript?.src;
  const from06 = here ? new URL('../06-ux-filter-live-count/', here).href : null;
  let base = null;  // 06's redlinePatch
  const baseLoaded = from06 ? new Promise(done => {
    document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: from06 + 'patch.css' }));
    document.head.append(Object.assign(document.createElement('script'), { src: from06 + 'patch.js', onload: () => { base = globalThis.redlinePatch; globalThis.redlinePatch = mine; done(); }, onerror: done }));
  }) : Promise.resolve();

  const PLURAL = { CAR: ['car', 'cars'], SUV: ['SUV', 'SUVs'], VAN: ['van', 'vans'], CARGO: ['cargo van', 'cargo vans'] };
  const FUEL = { 'Electric': 'electric vehicle', 'Hybrid': 'hybrid', 'Plug-in Hybrid': 'plug-in hybrid' };  // Gas: no option

  async function apply(handles) {
    await baseLoaded;
    base?.apply(handles);
    const { root, map, data } = handles;
    const $ = q => root.querySelector(q), $$ = q => [...root.querySelectorAll(q)];
    const backdrop = $('.backdrop'), sheetEl = $('.sheet'), page = $('.page');

    // The selected car's pin number, read back from the sheet (the mock does not expose it).
    const selected = () => {
      if (sheetEl.style.visibility !== 'visible') return null;
      const station = $('.card [data-station]').textContent, plate = $('[data-plate]').textContent;
      return data.pins.features.find(f => f.properties.station === station && f.properties.plate === plate)?.properties.n ?? null;
    };

    // ---- Chips ----------------------------------------------------------------------------------------------------------------------------
    // What a chip filters on: { chip: the Filters sheet button or row to press, label }, or null when there is nothing to filter by (Gas).
    const KINDS = ['type', 'seats', 'fuel'];  // the chips' order on the card and the page
    const seatChips = $$('.seats .fchip'), classChips = $$('.cls .fchip'), featRows = $$('.feat .row');
    const option = (kind, car) => {
      if (kind === 'type') { const chip = classChips.find(c => c.textContent.trim() === car.class); return chip && { chip, label: car.class, cls: car.class }; }
      if (kind === 'seats') {  // "N +" means at least N; a car with more seats than the largest chip uses the largest
        const chip = seatChips.filter(c => parseInt(c.textContent) <= car.seats).pop();
        return chip && { chip, label: `${parseInt(chip.textContent)}+ seats` };
      }
      const row = FUEL[car.fuel] && featRows.find(r => r.firstChild.textContent.trim() === FUEL[car.fuel]);
      return row && { chip: row, label: car.fuel === 'Plug-in Hybrid' ? 'Plug-in hybrid' : car.fuel };
    };
    // Tag the chips that can be tapped. The page's chips are re-cloned from the card on every selection, so both lists are re-tagged on any change.
    function tag() {
      for (const list of [$('.card .chips'), $('[data-chips]')]) [...list.children].forEach((c, i) => {
        const fuel = KINDS[i] === 'fuel' && !(c.textContent.trim() in FUEL);
        if (fuel) { for (const a of ['data-lf', 'role', 'tabindex', 'aria-label']) c.removeAttribute(a); return; }
        c.setAttribute('data-lf', KINDS[i]); c.setAttribute('role', 'button'); c.setAttribute('tabindex', '0');
        c.setAttribute('aria-label', `Show cars with ${c.textContent.trim()}`);
      });
    }
    tag();
    const watch = { childList: true, subtree: true, characterData: true };
    new MutationObserver(tag).observe($('.card .chips'), watch);
    new MutationObserver(tag).observe($('[data-chips]'), watch);

    // ---- Toast ----------------------------------------------------------------------------------------------------------------------------
    const toast = Object.assign(document.createElement('p'), { className: 'lf-toast' });
    toast.setAttribute('role', 'status');
    root.append(toast);
    let hide = 0;
    function say(text) {
      clearTimeout(hide);
      toast.textContent = text;
      toast.classList.add('on');
      hide = setTimeout(() => toast.classList.remove('on'), 3000);
    }

    // ---- Filter and jump --------------------------------------------------------------------------------------------------------------------
    const metres = ([lng, lat]) => { const [u, v] = data.user.coordinates; return Math.hypot((lng - u) * Math.cos(lat * Math.PI / 180), lat - v) * 111320; };
    function choose(n) {
      const lngLat = data.pins.features[n].geometry.coordinates, real = map.queryRenderedFeatures;
      map.queryRenderedFeatures = () => [{ layer: { id: 'pins' }, properties: { n } }];
      try { map.fire('click', { point: map.project(lngLat), lngLat: { lng: lngLat[0], lat: lngLat[1] } }); } finally { map.queryRenderedFeatures = real; }
    }

    function filterBy(kind) {
      const n = selected();
      if (n == null) return;
      const opt = option(kind, data.cars[n]);
      if (!opt) return;
      // One filter at a time: clear the sheet, set this option, press APPLY (06 filters the map and updates the badge).
      $$('.fsheet [aria-pressed]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      opt.chip.setAttribute('aria-pressed', 'true');
      const q = { classes: [], seats: 0, features: [] };
      if (kind === 'type') q.classes = [data.cars[n].class]; else if (kind === 'seats') q.seats = parseInt(opt.chip.textContent); else q.features = [opt.chip.firstChild.textContent.trim()];
      const keep = data.match(q);
      $('.apply').click();
      // The sheet was not open, so the mock's hide() changes nothing on the backdrop and 06 would still think it was just applied; nudge it.
      backdrop.setAttribute('style', backdrop.getAttribute('style') ?? '');

      const next = keep.filter(m => m !== n).sort((a, b) => metres(data.pins.features[a].geometry.coordinates) - metres(data.pins.features[b].geometry.coordinates))[0];
      const one = keep.length === 1;
      say(opt.cls ? `${keep.length} ${PLURAL[opt.cls][one ? 0 : 1]}` : `${opt.label} · ${keep.length} ${one ? 'car' : 'cars'}`);
      if (next == null) return;
      if (page.classList.contains('in')) $('.back').click();  // from Vehicle Information, pop back to the map first
      choose(next);
    }

    const chipOf = e => e.target.closest?.('[data-lf]');
    root.addEventListener('click', e => {
      const chip = chipOf(e);
      if (!chip) return;
      e.stopPropagation();  // capture phase: the card's own click (push the page) never sees it
      filterBy(chip.getAttribute('data-lf'));
    }, true);
    root.addEventListener('keydown', e => {
      const chip = chipOf(e);
      if (!chip || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault(); e.stopPropagation();
      filterBy(chip.getAttribute('data-lf'));
    }, true);
  }

  const mine = { apply };
  globalThis.redlinePatch = mine;
})();
