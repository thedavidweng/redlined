// Day view. 04 = 03 + 02 + a day view: the 24 h hourly strip on the Vehicle Information page is replaced by one row per day (today + 3), each a full 24 h bar that fits the page.
// The booking is a capsule on those bars, drawn and dragged like 03's (move, resize from either end, 15-min snap), and it wraps to the next row when it crosses midnight.
//
// STACKING: as 03 (see its patch.js): our apply waits for 03's patch (which waits for 02's), runs base.apply(ctx), then builds on the DOM they left. 03 keeps working on the mock's own strip,
// which this patch only hides (patch.css keeps it laid out, so 03's measuring does not break); the day view reads the same mock rows and writes through the same sheet.
//
// WHAT IS COPIED FROM 03: its drag and commit code lives in a closure and exposes nothing, so setTime/commit (drive the mock's time sheet) and the date helpers are copied here, unchanged
// in behaviour. Everything about geometry is new (quarters are counted from today 00:00 over 4 rows of 96, not along one strip).
//
// SOURCE OF TRUTH is never ours. Pin: found from the plate on the page (the mock keeps its selection in a closure). Hour 0: the mock's strip starts at the hour it loaded in, read from its
// first label like 03. Busy time: ModoData.availability(pin, that hour). Booking: parsed from the mock's Pick up / Return by rows ("Mon, 12 Oct 2026, 12:15 PM"; an open return is 12 h, as the mock marks it).
// A booking that is not on the 15-min grid, is before the current quarter, past the 4 days or overlaps busy time gets no capsule. The mock redraws its strip on every render (pin, times, OPEN RETURN),
// which is our cue to re-read everything (MutationObserver on the strip).
//
// DRAG. One pointer capture on the day view (the segments come and go as the capsule moves between rows). A pointer position maps to a quarter boundary: the row is the bar nearest to y,
// the boundary is x as a fraction of that bar times 96. Move keeps the grab offset; a grip keeps the offset to its edge. Clamps: the free run around the booking, bounded by busy quarters,
// the current hour (the mock's earliest) and the end of the last row. While dragging, only the Pick up / Return by rows' text and our capsule change; on release the mock is driven (COMMIT in 03).
(() => {
  const BASE = '../03-feat-drag-booking/';
  const head = document.head;
  head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}patch.css` }));
  let base = null;
  const ready = new Promise(resolve => {
    const tag = Object.assign(document.createElement('script'), { src: `${BASE}patch.js` });
    tag.onload = tag.onerror = () => { if (globalThis.redlinePatch !== mine) base = globalThis.redlinePatch; globalThis.redlinePatch = mine; resolve(); };
    head.append(tag);
  });

  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MIN = 14;  // narrowest capsule, px
  const Q = 9e5, PER = 96, ROWS = 4, N = PER * ROWS, OPEN = 48;  // quarter in ms, quarters per row, rows (today + 3), quarters on the grid, the 12 h open return mark
  const AXIS = ['12a', '6a', '12p', '6p'];
  const clock = d => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
  const pageDate = d => `${DAY[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${clock(d)}`;  // the mock's page format
  function parse(text) {
    const m = /^\w{3}, (\d+) (\w{3}) (\d{4}), (\d+):(\d+) ([AP]M)$/.exec(text);
    return m && new Date(+m[3], MON.indexOf(m[2]), +m[1], +m[4] % 12 + (m[6] === 'PM' ? 12 : 0), +m[5]);
  }
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const el = (tag, cls, html = '') => Object.assign(document.createElement(tag), { className: cls, innerHTML: html });

  function dayView(root, data) {
    const $ = q => root.querySelector(q);
    const strip = $('.trip-strip [data-strip]');
    const pick = $('[data-pickup]'), ret = $('[data-retby]'), rtype = $('[data-rtype]'), plate = $('.page [data-plate]');
    const whens = root.querySelectorAll('.when'), cols = [...root.querySelectorAll('.pcol')], save = $('.psave');

    // DOM: one row per day (label + bar), the hour axis under the first. Each bar: .dv-bg (clipped: free tint, busy hatch, past dim, ticks), .dv-cap (booking), .dv-hit (grips), .dv-now.
    const dv = el('div', 'dv');
    dv.setAttribute('role', 'group'); dv.setAttribute('aria-label', 'Availability for the next four days');
    const rowEls = Array.from({ length: ROWS }, () => el('div', 'dv-row', '<span class="dv-day"></span><div class="dv-bar"><div class="dv-bg"></div><i class="dv-cap" hidden></i><div class="dv-hit" hidden><i class="dv-h l"></i><i class="dv-h r"></i></div></div>'));
    const axis = el('div', 'dv-axis', AXIS.map(t => `<span>${t}</span>`).join(''));
    axis.setAttribute('aria-hidden', 'true');
    rowEls.forEach((r, i) => { dv.append(r); if (!i) dv.append(axis); });
    const bars = rowEls.map(r => r.querySelector('.dv-bar')), bgs = rowEls.map(r => r.querySelector('.dv-bg'));
    const caps = rowEls.map(r => r.querySelector('.dv-cap')), hits = rowEls.map(r => r.querySelector('.dv-hit'));
    const tip = el('div', 'dv-tip'); tip.hidden = true; tip.setAttribute('aria-hidden', 'true'); dv.append(tip);
    const nowTick = el('i', 'dv-now');
    nowTick.setAttribute('aria-hidden', 'true');
    bars[0].append(nowTick);
    strip.before(dv);

    let hour0 = 0, starts = [], hq = 0, pin = -1, busy = [], st = null, run = null, barW = 0;

    // Time <-> quarter. Rows start at each day's midnight (a DST day has 23 or 25 h; quarters past 96 in a row are not drawn).
    const toMs = q => starts[Math.floor(q / PER)] + (q % PER) * Q;
    function toQ(ms) {
      let r = starts.length - 1; while (r > 0 && starts[r] > ms) r--;
      const k = (ms - starts[r]) / Q;
      return ms < starts[0] || k % 1 || k >= PER && r < ROWS ? null : r * PER + k;
    }
    function readHour0() {
      const label = strip.querySelector('.hour time')?.textContent;
      if (!label) return hour0 || ModoData.now().setMinutes(0, 0, 0);
      const h = +label.split(' ')[0] % 12 + (label.endsWith('PM') ? 12 : 0), t = ModoData.now(); t.setHours(h, 0, 0, 0);
      if (t - ModoData.now() > 36e5) t.setDate(t.getDate() - 1);  // the label is the mock's load hour; across midnight that was yesterday's
      return +t;
    }
    function geometry(h) {
      hour0 = h;
      const d = new Date(h);
      starts = Array.from({ length: ROWS + 1 }, (_, r) => +new Date(d.getFullYear(), d.getMonth(), d.getDate() + r));
      hq = toQ(Math.floor(+ModoData.now() / Q) * Q);  // the current quarter: the mock crosses out earlier ones, the current one is the earliest start
      rowEls.forEach((row, r) => { const day = new Date(starts[r]); row.querySelector('.dv-day').textContent = r ? `${DAY[day.getDay()]} ${day.getDate()}` : 'Today'; });
    }

    // Busy quarters of the selected pin (ModoData, the same call the mock's strip makes), drawn once per pin / hour: hatch for busy runs, a dim for the time before the current hour.
    function paint() {
      const iv = data.availability(pin, new Date(hour0));
      busy = Array.from({ length: N }, (_, q) => { const t = toMs(q); return iv.some(([a, b]) => t < b && t + Q > a); });
      bgs.forEach((bg, r) => {
        const parts = [], at = q => `left:${(q - r * PER) / PER * 100}%`, run1 = (a, b, cls) => parts.push(`<i class="${cls}" style="${at(a)};width:${(b - a) / PER * 100}%"></i>`);
        for (let q = r * PER, end = q + PER; q < end;) {
          if (!busy[q]) { q++; continue; }
          let b = q; while (b < end && busy[b]) b++;
          run1(q, b, 'dv-busy'); q = b;
        }
        const past = clamp(hq, r * PER, (r + 1) * PER);
        if (past > r * PER) run1(r * PER, past, 'dv-past');
        bg.innerHTML = parts.join('');
      });
    }
    const blocked = q => busy[q] || q < hq;

    function read() {
      if (!pick.textContent || pick.textContent === 'Please set a time') return null;
      const a = parse(pick.textContent), open = rtype.textContent === 'Open Return', b = a && (open ? new Date(+a + OPEN * Q) : parse(ret.textContent));
      if (!a || !b) return null;
      const s = toQ(+a), e = toQ(+b);
      if (s == null || e == null || e <= s || s < hq || e > N || busy.slice(s, e).some(Boolean)) return null;
      return { s, e, open };
    }

    // The capsule over quarters [s, e): each row gets the part of it that falls inside. Grips only at the real ends.
    function place(s, e) {
      rowEls.forEach((_, r) => {
        const a = Math.max(s, r * PER), b = Math.min(e, (r + 1) * PER), show = a < b;
        caps[r].hidden = hits[r].hidden = !show;
        if (!show) return;
        // Px, not %: a capsule that is both ends of the booking is never narrower than MIN (centred on its real span), so its grips stay apart.
        let l = (a - r * PER) / PER * barW, w = (b - a) / PER * barW;
        const first = a === s, last = b === e;
        if (first && last && w < MIN) { l -= (MIN - w) / 2; w = MIN; }
        for (const x of [caps[r], hits[r]]) { Object.assign(x.style, { left: `${l}px`, width: `${w}px` }); x.classList.toggle('first', first); x.classList.toggle('last', last); }
        hits[r].classList.toggle('open', !!st?.open);
      });
    }
    function tick() {
      const f = (ModoData.now() - starts[0]) / (starts[1] - starts[0]);
      nowTick.hidden = f < 0 || f > 1;
      nowTick.style.left = `${f * 100}%`;
    }

    function sync() {
      const h = readHour0();
      if (h !== hour0) { geometry(h); pin = -1; }
      const idx = data.pins.features.findIndex(f => f.properties.plate === plate.textContent);
      if (idx !== pin) { pin = idx < 0 ? data.near : idx; paint(); }
      barW = bars[0].offsetWidth;
      if (!run) { st = read(); if (st) place(st.s, st.e); else place(0, 0); }
      tick();
    }
    const mo = new MutationObserver(sync);
    mo.observe(strip, { childList: true });
    new ResizeObserver(() => { if (!run) sync(); }).observe(dv);
    document.fonts?.ready.then(() => { if (!run) sync(); });
    setInterval(tick, 3e4);

    // Floating time over the edge being dragged (the start for a move), so the quarter is readable without looking down at the rows.
    function showTip() {
      const q = run.mode === 'end' ? run.e : run.s, r = clamp(Math.floor((run.mode === 'end' ? q - 1 : q) / PER), 0, ROWS - 1);
      const k = dv.getBoundingClientRect().width / dv.offsetWidth || 1, d = dv.getBoundingClientRect(), b = bars[r].getBoundingClientRect();
      tip.textContent = clock(new Date(toMs(q)));
      tip.hidden = false;
      const half = tip.offsetWidth / 2;
      tip.style.left = `${clamp((b.left - d.left) / k + (q - r * PER) / PER * barW, half, dv.offsetWidth - half)}px`;
      tip.style.top = `${(b.top - d.top) / k - 22}px`;
    }
    // ---- Drag -------------------------------------------------------------------------------------------
    // Pointer to a quarter boundary 0..N: the nearest bar by y, x as a fraction of its width.
    function boundary(x, y) {
      const rects = bars.map(b => b.getBoundingClientRect());
      let r = 0; rects.forEach((b, i) => { if (Math.abs(y - (b.top + b.height / 2)) < Math.abs(y - (rects[r].top + rects[r].height / 2))) r = i; });
      return r * PER + Math.round(clamp((x - rects[r].left) / rects[r].width, 0, 1) * PER);
    }
    dv.addEventListener('pointerdown', e => {
      const h = e.target.closest('.dv-hit');
      if (!h || !st || e.button || run) return;
      e.preventDefault();
      dv.setPointerCapture(e.pointerId);
      const mode = e.target.classList.contains('l') ? 'start' : e.target.classList.contains('r') ? 'end' : 'move';
      let lo = st.s, hi = st.e;  // the free run around the booking
      while (lo > 0 && !blocked(lo - 1)) lo--;
      while (hi < N && !blocked(hi)) hi++;
      const m = st.open && mode === 'end' ? 'move' : mode, edge = m === 'end' ? st.e : st.s;
      run = { id: e.pointerId, mode: m, off: boundary(e.clientX, e.clientY) - edge, from: st, lo, hi, s: st.s, e: st.e };
      for (const x of [...caps, ...hits]) x.classList.add('on');
      showTip();
    });
    dv.addEventListener('pointermove', e => {
      if (!run || e.pointerId !== run.id) return;
      const { mode, from, lo, hi } = run, len = from.e - from.s, want = boundary(e.clientX, e.clientY) - run.off;
      let s = from.s, to = from.e;
      if (mode === 'end') to = clamp(want, from.s + 1, hi);
      else {
        s = clamp(want, lo, mode === 'start' && !from.open ? from.e - 1 : hi - len);  // an open return keeps its 12 h, so its start grip moves the whole mark
        to = mode === 'start' && !from.open ? from.e : s + len;
      }
      if (s === run.s && to === run.e) return;
      run.s = s; run.e = to;
      pick.textContent = pageDate(new Date(toMs(s)));  // live feedback in 02's rows
      if (!from.open) ret.textContent = pageDate(new Date(toMs(to)));
      place(s, to);
      showTip();
    });
    const finish = (e, cancelled) => {
      if (!run || e.pointerId !== run.id) return;
      const { from, s, e: to } = run;
      run = null; tip.hidden = true;
      for (const x of [...caps, ...hits]) x.classList.remove('on');
      if (cancelled || (s === from.s && to === from.e)) {  // nothing to commit: the mock's own text goes back
        pick.textContent = pageDate(new Date(toMs(from.s)));
        if (!from.open) ret.textContent = pageDate(new Date(toMs(from.e)));
        place(from.s, from.e);
        return;
      }
      commit(from, s, to);
    };
    dv.addEventListener('pointerup', e => finish(e, false));
    dv.addEventListener('pointercancel', e => finish(e, true));

    // COMMIT (as 03): set one time through the mock's own sheet, in one synchronous task, so the sheet never paints. `old` is what the mock holds now; the wheels already show it.
    function setTime(which, old, d) {
      whens[which].click();
      const row = cols[0].querySelector('.pi').offsetHeight, wrap = (v, n) => ((v + n / 2) % n + n) % n - n / 2;
      const day = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(old).setHours(0, 0, 0, 0)) / 864e5);
      const rowsBy = [day, wrap((d.getHours() % 12 || 12) - (old.getHours() % 12 || 12), 12), wrap(d.getMinutes() / 15 - old.getMinutes() / 15, 4), (d.getHours() >= 12) - (old.getHours() >= 12)];
      cols.forEach((c, k) => { c.scrollTop += rowsBy[k] * row; });
      save.click();
    }
    function commit(from, s, e) {
      const a = new Date(toMs(s)), b = new Date(toMs(e)), a0 = new Date(toMs(from.s)), b0 = new Date(toMs(from.e));
      if (from.open) return setTime(0, a0, a);
      const todo = [];
      if (s !== from.s) todo.push([0, a0, a]);
      if (e !== from.e) todo.push([1, b0, b]);
      if (e > from.e) todo.reverse();  // a later end first, so the start never meets the old end
      todo.forEach(args => setTime(...args));
    }
    sync();
  }

  const mine = {
    async apply(ctx) {
      await ready;
      await base?.apply(ctx);
      dayView(ctx.root, ctx.data);
    },
  };
  globalThis.redlinePatch = mine;
})();
