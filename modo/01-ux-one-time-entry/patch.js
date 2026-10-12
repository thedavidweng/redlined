// One entry for the whole trip time. The two header rows (SET RETURN / OPEN RETURN, Start / End Time) collapse into one trip row that opens the time sheet,
// and the sheet grows a Pick up row, a Return row with a SET | OPEN switch, and a live line above SAVE. The vehicle page's Return Type row opens the same sheet.
//
// How it works with the mock (nothing in mock/ changes; the mock keeps its own state in closures, so the patch drives its controls and reads what it renders):
// - Header: the mock's `.seg` buttons, `.times` and `.when` stay in the DOM, hidden by patch.css. The new row mirrors them (MutationObserver on `.times`),
//   a tap calls `.when`.click(), which is the mock's own openPicker('start'), and the new X calls `.clear`.click().
// - Committed time: read from what the page rows print ([data-pickup], [data-retby], year included) and from `.seg > button.on`.
// - Sheet: the patch keeps a draft (pick up, return, SET|OPEN) while the sheet is open. The one wheel edits the active row; it is read like the mock's SAVE
//   reads it (scrollTop / row height per column) when it settles, and written the same way the mock's setWheels does. Row heights, the number of
//   days back and the loop copies are taken from the wheel's own items. The end time stays in the draft while OPEN is on, so it comes back.
// - SAVE: a capture listener on `.psheet` takes the click before the mock sees it, then replays the draft through the mock: `.seg` click for SET|OPEN,
//   then for each changed time `.when`.click() (sets the mock's `editing`), wheels written, `.psave`.click() (the mock's own handler), so header, rows,
//   strip and BOOK VEHICLE update exactly as today. Each .psave also hides the sheet; with two writes the sheet would pop shut, so the slide-out is replayed
//   with the Web Animations API (same ease, 500 ms, honours reduced motion).
// - Live line: ModoData.window over every pin (open return = start..start+12 h) on the map; on the vehicle page (.page.in) the one car, found by its plate.
(() => {
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const clock = d => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
  const long = d => `${DAY[d.getDay()]} ${MON[d.getMonth()]} ${d.getDate()}, ${clock(d)}`;
  const dayKey = d => new Date(d).setHours(0, 0, 0, 0);
  const parse = t => {  // "Mon, 12 Oct 2026, 12:15 PM" (the vehicle page's own format) -> Date, or null for "Please set a time"
    const m = /(\d+) (\w{3}) (\d{4}), (\d+):(\d+) (AM|PM)/.exec(t ?? '');
    return m && new Date(+m[3], MON.indexOf(m[2]), +m[1], +m[4] % 12 + (m[6] === 'PM' ? 12 : 0), +m[5]);
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const EASE = 'cubic-bezier(.32, .72, 0, 1)', H = 36e5;
  const FREE = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="5" fill="#8fbdd7"/><circle cx="5" cy="5" r="4.4" fill="#fff"/><circle cx="5" cy="5" r="3.4" fill="#8fbdd7"/></svg>';
  const BUSY = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="4.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M2.2 7.8 7.8 2.2" stroke="currentColor" stroke-width="1.6"/></svg>';

  function apply({ root, data }) {
    const $ = q => root.querySelector(q), $$ = q => [...root.querySelectorAll(q)];
    const head = $('.head'), segs = $$('.seg > button'), whens = $$('.when'), timesEl = $('.times'), clearBtn = $('.clear');
    const psheet = $('.psheet'), pbd = $('.pbd'), psave = $('.psave'), pclose = $('.pclose'), psub = $('.psub'), cols = $$('.pcol'), page = $('.page');
    const NOW = ModoData.now(), today = new Date(NOW).setHours(0, 0, 0, 0);

    // ---- Header: one row ------------------------------------------------------------------------------------------------------------------------
    const row = document.createElement('div');
    row.className = 'otr-row';
    row.innerHTML = '<button class="otr-trip" aria-label="Trip time"><span class="otr-a"></span><span class="otr-b"></span></button><button class="otr-x" aria-label="Clear"></button>';
    const trip = row.firstChild, a = trip.firstChild, b = trip.lastChild;
    trip.prepend(whens[0].firstElementChild.cloneNode(true));
    a.after($('.to').cloneNode(true));
    row.lastChild.append($('.clear svg').cloneNode(true));
    head.prepend(row);
    const syncHead = () => {
      const open = segs[1].classList.contains('on');
      a.textContent = whens[0].lastChild.nodeValue; a.classList.toggle('set', whens[0].classList.contains('set'));
      b.textContent = open ? 'Open return' : whens[1].lastChild.nodeValue; b.classList.toggle('set', open || whens[1].classList.contains('set'));
    };
    new MutationObserver(syncHead).observe(timesEl, { subtree: true, childList: true, characterData: true, attributes: true });
    syncHead();
    row.lastChild.addEventListener('click', () => clearBtn.click());

    // ---- Sheet: rows and live line --------------------------------------------------------------------------------------------------------------
    const rows = document.createElement('div');
    rows.className = 'otr-rows';
    rows.innerHTML = `<div class="otr-r" data-row="start" role="button" tabindex="0"><span class="otr-l">Pick up</span><span class="otr-v"></span></div>
      <div class="otr-r" data-row="end" role="button" tabindex="0"><span class="otr-l">Return</span>
        <span class="otr-seg"><button data-open="0" aria-pressed="true">SET</button><button data-open="1" aria-pressed="false">OPEN</button></span><span class="otr-v"></span></div>`;
    const live = document.createElement('p');
    live.className = 'otr-live';
    live.setAttribute('aria-live', 'polite');
    psheet.querySelector('.wheels').before(rows);
    psave.before(live);
    const rowEl = { start: rows.children[0], end: rows.children[1] }, val = { start: rowEl.start.lastElementChild, end: rowEl.end.lastElementChild };
    const swatches = [...rows.querySelectorAll('.otr-seg button')];

    // Wheel geometry from the mock's own items: row height, which row is Today, and the loop copies.
    const ROW = cols[0].firstElementChild.offsetHeight || 32;
    const PAST = [...cols[0].children].findIndex(e => e.textContent === 'Today');
    const readWheels = () => {
      const [day, hr, mi, ap] = cols.map(c => Math.round(c.scrollTop / ROW));
      const d = new Date(today); d.setDate(d.getDate() + day - PAST); d.setHours((hr % 12 + 1) % 12 + ap * 12, mi % 4 * 15);
      return d;
    };
    const writeWheels = v => {
      const h = v.getHours(), day = Math.min(cols[0].children.length - 1, Math.max(0, PAST + Math.round((dayKey(v) - today) / 864e5)));
      const at = [day, cols[1].children.length / 2 + (h % 12 || 12) - 1, cols[2].children.length / 2 + Math.round(v.getMinutes() / 15) % 4, h >= 12 ? 1 : 0];
      cols.forEach((c, k) => { c.scrollTop = at[k] * ROW; c.paint?.(); });
    };

    // What the mock has committed, from what it prints.
    const committed = () => ({ open: segs[1].classList.contains('on'), start: parse($('[data-pickup]').textContent), end: parse($('[data-retby]').textContent) });
    const roundUp = d => new Date(Math.ceil(d / 9e5) * 9e5);

    // The draft while the sheet is open.
    let draft = null, timer = 0, allow = false;
    const normalise = () => { if (draft.end <= draft.start) draft.end = new Date(+draft.start + H); };

    function refresh(animate = true) {
      const { open, active } = draft;
      val.start.textContent = long(draft.start);
      val.end.textContent = open ? '' : long(draft.end);
      rowEl.start.classList.toggle('on', active === 'start');
      rowEl.end.classList.toggle('on', active === 'end');
      rowEl.end.classList.toggle('off', open);
      swatches.forEach(s => { const on = !!+s.dataset.open === open; s.classList.toggle('on', on); s.setAttribute('aria-pressed', on); });
      psheet.classList.toggle('otr-open', open);
      psub.hidden = !open;
      status(animate);
    }

    // "N cars free for this time" (map) or the one car's answer (vehicle page).
    let last = '';
    function status(animate = true) {
      const start = draft.start, end = draft.open ? new Date(+start + 432e5) : draft.end;
      const plate = page.classList.contains('in') && $('.page [data-plate]').textContent;
      const pin = plate && data.pins.features.find(f => f.properties.plate === plate);
      let html;
      if (pin) {
        const clash = data.availability(pin.properties.n, NOW).find(([from, to]) => start < to && end > from);
        const when = clash && clash[0] > start && (dayKey(clash[0]) === dayKey(start) ? clock(clash[0]) : `${MON[clash[0].getMonth()]} ${clash[0].getDate()}, ${clock(clash[0])}`);
        html = clash ? `${BUSY}<span>This car is booked ${when ? `from ${when}` : 'at this time'}</span>` : `${FREE}<span>This car is free for this time</span>`;
      } else {
        const n = data.pins.features.filter(f => data.window(f.properties.n, start, end, NOW)).length;
        html = `${n ? FREE : BUSY}<span>${n ? `${n} car${n === 1 ? '' : 's'} free` : 'No cars free'} for this time</span>`;
      }
      if (html === last) return;
      last = html; live.innerHTML = html;
      if (animate && !reduced.matches) live.animate([{ opacity: .35, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EASE });
    }

    // Read the wheel into the active row (called when it settles).
    function settle() {
      clearTimeout(timer);
      if (!draft) return;
      const v = readWheels(), key = draft.active;
      if (+v !== +draft[key]) {
        draft[key] = v;
        if (key === 'end') draft.touched = true;
        normalise();
        if (key === 'end' && +draft.end !== +v) writeWheels(draft.end);  // an end at or before the start becomes start + 1 h, as on SAVE
      }
      refresh();
    }
    cols.forEach(c => c.addEventListener('scroll', () => { if (draft) { clearTimeout(timer); timer = setTimeout(settle, 110); } }));

    function activate(key) {
      if (!draft || draft.open && key === 'end') return;
      settle();
      draft.active = key;
      writeWheels(draft[key]);
      refresh();
    }
    function toggle(open) {
      settle();
      draft.open = open;
      draft.active = open ? 'start' : 'end';  // choosing SET asks for the return time next
      writeWheels(draft[draft.active]);
      refresh();
    }
    rowEl.start.addEventListener('click', () => activate('start'));
    rowEl.end.addEventListener('click', () => activate('end'));
    for (const r of Object.values(rowEl)) r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); r.click(); } });
    swatches.forEach(s => s.addEventListener('click', e => { e.stopPropagation(); toggle(!!+s.dataset.open); }));
    swatches.forEach(s => s.addEventListener('pointerdown', e => e.stopPropagation()));  // a tap on the switch must not start a sheet drag

    // The mock has just run its own openPicker (the sheet is opening); take over what it shows.
    function begin(active = 'start') {
      [psheet, pbd].forEach(el => el.getAnimations().forEach(x => x.cancel()));
      const c = committed(), start = c.start ?? roundUp(NOW);
      draft = { open: c.open, start, end: c.end ?? new Date(+start + H), active: !c.open && active === 'end' ? 'end' : 'start', touched: false };
      normalise();
      writeWheels(draft[draft.active]);
      last = '';
      refresh(false);
    }

    // Entries: the header row, Change Time (the mock opens it itself) and the vehicle page's Return Type row.
    trip.addEventListener('click', () => { whens[0].click(); begin('start'); });
    $('[data-change]').addEventListener('click', () => begin('start'));
    const typeRow = $('[data-rtype]').parentElement;
    typeRow.classList.add('otr-type'); typeRow.setAttribute('role', 'button'); typeRow.tabIndex = 0;
    typeRow.addEventListener('click', () => { whens[0].click(); begin(committed().open ? 'start' : 'end'); });
    typeRow.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); typeRow.click(); } });

    // SAVE: replay the draft through the mock's own controls.
    const same = (x, y) => x && y && +x === +y;
    psheet.addEventListener('click', e => {
      if (allow || !draft || !e.target.closest('.psave')) return;
      e.stopPropagation(); e.preventDefault();
      settle();
      const c = committed(), jobs = [];
      if (draft.open !== c.open) segs[+draft.open].click();
      if (!same(draft.start, c.start)) jobs.push(['start', draft.start]);
      if ((!draft.open || draft.touched) && !same(draft.end, c.end)) jobs.push(['end', draft.end]);
      const height = psheet.offsetHeight;
      for (const [key, v] of jobs) {
        whens[key === 'end' ? 1 : 0].click();  // the mock's openPicker: sets which time SAVE writes
        writeWheels(v);
        allow = true; psave.click(); allow = false;
      }
      if (!jobs.length) pclose.click();
      draft = null;
      if (jobs.length > 1 && !reduced.matches) {  // the second openPicker re-placed the sheet; replay the slide-out the first SAVE started
        const opt = { duration: 500, easing: EASE };
        psheet.animate([{ transform: 'translate3d(0, 0, 0)', visibility: 'visible' }, { transform: `translate3d(0, ${height}px, 0)`, visibility: 'visible' }], opt);
        pbd.animate([{ opacity: .5, visibility: 'visible' }, { opacity: 0, visibility: 'visible' }], opt);
      }
    }, true);
    for (const el of [pclose, pbd]) el.addEventListener('click', () => { draft = null; });

    // A state that opens with the sheet already up (?state=time).
    if (psheet.style.visibility === 'visible') begin('start');
  }

  globalThis.redlinePatch = { apply };
})();
