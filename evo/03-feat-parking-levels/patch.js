// Parking levels. Every Evo lot is the same P sign, and whether it is underground, an above-ground parkade or a surface lot is only in the free-text title.
// The patch redraws the sign per `kind` (a level badge for parkades, the plain sign for ground-level spots) and adds one structured pill to the parking
// sheet and card. Kind and level come from EvoData.parking, never from the text. Kinds in the data: parkade-underground, parkade-above, lot, street.
(() => {
  const ARROWS = { 'parkade-underground': 'down', 'parkade-above': 'up' };  // kinds with a level badge; lot and street keep the plain sign
  const GLYPHS = {
    'parkade-underground': 'M2 3h10M7 5.500v6.500M4.500 9.500 7 12l2.500-2.500',
    'parkade-above': 'M2 12h10M7 9V2.500M4.500 5 7 2.500 9.500 5',
    lot: 'M3.500 2h7a1.500 1.500 0 0 1 1.500 1.500v7a1.500 1.500 0 0 1-1.500 1.500h-7A1.500 1.500 0 0 1 2 10.500v-7A1.500 1.500 0 0 1 3.500 2zM5.700 10V4.500h2a1.600 1.600 0 0 1 0 3.200h-2',
    street: 'M3.500 1.500 2 12.500M10.500 1.500 12 12.500M7 2v2M7 6v2M7 10v2',
  };
  const pill = (kind, level) => {
    const num = level.replace(/^L/, '');
    return {
      'parkade-underground': ['Underground', level && `Level ${level}`],
      'parkade-above': ['Parkade', num && `Level ${num}`],
      lot: ['Surface lot'],
      street: ['Street'],
    }[kind]?.filter(Boolean).join(' · ');
  };

  function apply({ root, map, data }) {
    const { draw } = IosMapImages;
    const cyan = '#00b5e6';

    // The map images are copies of markers.js's parking and parkingSelected, with the car replaced by a pill badge: an arrow (down below ground, up above) and the level.
    const sign = (g, selected) => {
      const w = 26, h = 40;
      g.beginPath(); g.roundRect(1, 1, w - 2, h - 6, 5);
      g.fillStyle = selected ? '#000' : '#c9ecf8'; g.fill(); g.lineWidth = selected ? 1.800 : 1.500; g.strokeStyle = selected ? cyan : '#000'; g.stroke();
      g.fillStyle = selected ? cyan : '#000'; g.fillRect(w / 2 - 1.200, h - 5.500, 2.400, 5.500);
      g.beginPath(); g.arc(13, 11, 7.500, 0, 2 * Math.PI); g.fillStyle = selected ? cyan : '#000'; g.fill();
      g.fillStyle = selected ? '#000' : '#fff'; g.font = '600 11px -apple-system, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', 13, 11.500);
    };
    const badge = (g, arrow, level, selected) => {
      const ink = selected ? '#000' : '#fff';
      g.beginPath(); g.roundRect(3, 21, 20, 12, 4); g.fillStyle = selected ? cyan : '#000'; g.fill();
      // the arrow: 5 pt wide, a stem and a chevron
      const x = 8, y = 27, s = arrow === 'down' ? 1 : -1;
      g.beginPath(); g.moveTo(x, y - 2.600 * s); g.lineTo(x, y + 2.400 * s); g.moveTo(x - 2.400, y + 0.100 * s); g.lineTo(x, y + 2.600 * s); g.lineTo(x + 2.400, y + 0.100 * s);
      g.strokeStyle = ink; g.lineWidth = 1.400; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
      g.fillStyle = ink; g.font = '700 9px -apple-system, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(level, 16.500, 27.500);
    };
    // Ground-level spots (lot, street) keep the mock's own images, so they are not redrawn.

    // One image per kind and level present in the data: "evo-parking-<kind>-<level>".
    const seen = new Set();
    for (const { properties: { kind, level } } of data.parking.features) {
      const arrow = ARROWS[kind], id = `${kind}-${level}`;
      if (!arrow || !level || seen.has(id)) continue;
      seen.add(id);
      draw(map, `evo-parking-${id}`, 26, 40, g => { sign(g, false); badge(g, arrow, level, false); });
      draw(map, `evo-parking-selected-${id}`, 26, 40, g => { sign(g, true); badge(g, arrow, level, true); });
    }
    const image = prefix => ['match', ['get', 'kind'], Object.keys(ARROWS), ['concat', prefix, '-', ['get', 'kind'], '-', ['get', 'level']], prefix];
    map.setLayoutProperty('evo-parking', 'icon-image', image('evo-parking'));
    map.setLayoutProperty('evo-parking-selected', 'icon-image', image('evo-parking-selected'));

    // The card: a second pill next to the hours pill, on the compact sheet and on the full card. The hours pill moves into a flex row with it, so CSS lays them out.
    const spot = () => {
      const name = root.querySelector('.pane-parking [data-pname]').textContent;
      return data.parking.features.find(f => f.properties.name === name)?.properties;
    };
    const pills = [...root.querySelectorAll('.pane-parking, .full-parking .card')].map(host => {
      const hours = host.querySelector('.open'), row = Object.assign(document.createElement('div'), { className: 'ep-row' }), el = Object.assign(document.createElement('span'), { className: 'ep-level' });
      hours.before(row); row.append(hours, el);
      return el;
    });
    const update = () => {
      const p = spot(), text = p && pill(p.kind, p.level);
      for (const el of pills) {
        el.hidden = !text;
        if (!text) { el.replaceChildren(); continue; }
        el.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="${GLYPHS[p.kind]}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        el.append(text);
      }
      observer.takeRecords();  // our own writes are not a new selection
    };
    const observer = new MutationObserver(update);
    root.querySelectorAll('[data-pname]').forEach(e => observer.observe(e, { childList: true, characterData: true, subtree: true }));
    update();  // a state opened already selected was filled before the patch ran
  }

  globalThis.redlinePatch = { apply };
})();
