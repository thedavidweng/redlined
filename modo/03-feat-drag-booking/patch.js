// Drag the booking. 03 = 02 + drag: the trip block from 02-ux-trip-times-together, with the booked quarters on its strip turned into one draggable capsule.
//
// STACKING (04 does the same on top of this file): a redline that builds on another loads that redline's patch.js and patch.css and runs its apply first.
//   1. The seam reads globalThis.redlinePatch once, right after THIS script has run, so the last line of the file sets it (to our own { apply }).
//   2. The base is loaded with a classic script tag (path relative to the mock page, as the seam's own). It is async, so apply waits for it. The base script
//      overwrites globalThis.redlinePatch when it loads; the handler takes that as `base` and puts ours back (the seam already holds ours, so this is only tidiness).
//   3. Our apply = base.apply(ctx), then our own work on the DOM the base built. patch.css of the base is linked here, ours by the seam after it.
//
// DRAG. Structure inside the mock's strip (02 moved it into .trip-strip): .drag-cap (behind the dots, z-index -1) and .drag-hit (above them) with two .drag-h grips.
// Both live INSIDE the scrolling strip, so they scroll with the dots natively. The mock rewrites strip.innerHTML on every render, which removes them; a MutationObserver
// puts the same two nodes back and re-reads the range. Source of truth is never ours: the range is parsed from the mock's own Pick up / Return by rows
// ("Mon, 12 Oct 2026, 12:15 PM"; an open return is 12 h, as the mock marks it) and checked against the strip's dots (all must be "yours", i.e. free and inside the 24 h shown),
// otherwise there is no capsule. Busy quarters are read from the dots too (crossed grey = a circle with fill="none").
//
// COMMIT. The mock's times live in a closure. On release we drive its own controls, in one synchronous task: click the header's Start / End button (the mock opens the time sheet
// and sets the wheels to the current value), shift each wheel by the difference (rows of 32 px; hour and minute loop, so only the shortest way round), click SAVE. IosSheet's show() is
// animated, but hide() runs before its first frame and finds the sheet still at its hidden position, so it settles at once: the sheet never paints (checked by a rAF probe).
// Order avoids the mock's "end at or before start becomes start + 1 h" rule: when the end moves later it is saved first, otherwise the start is.
// The mock then renders (header, rows, BOOK, strip) from its own state, so everything agrees. While dragging only the rows' text and the dots' colours are ours, rewritten at each snap.
(() => {
  const BASE = '../02-ux-trip-times-together/';
  const head = document.head;
  head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}patch.css` }));
  let base = null;
  const ready = new Promise(resolve => {
    const tag = Object.assign(document.createElement('script'), { src: `${BASE}patch.js` });
    tag.onload = tag.onerror = () => { if (globalThis.redlinePatch !== mine) base = globalThis.redlinePatch; globalThis.redlinePatch = mine; resolve(); };
    head.append(tag);
  });

  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const Q = 9e5, N = 96, OPEN = 48, PAD = 3, DOT_R = 5;  // quarter in ms, quarters on the strip, the 12 h open return mark, capsule padding and dot radius in px
  const FREE = '#8fbdd7', MINE = '#476470';  // the mock's dot colours
  const clock = d => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
  const pageDate = d => `${DAY[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${clock(d)}`;  // the mock's page format
  function parse(text) {
    const m = /^\w{3}, (\d+) (\w{3}) (\d{4}), (\d+):(\d+) ([AP]M)$/.exec(text);
    return m && new Date(+m[3], MON.indexOf(m[2]), +m[1], +m[4] % 12 + (m[6] === 'PM' ? 12 : 0), +m[5]);
  }
  const rubber = o => 6 * Math.tanh(Math.abs(o) / 30) * Math.sign(o);  // the pull-back felt at a limit, px
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function drag(root) {
    const $ = q => root.querySelector(q);
    const strip = $('.trip-strip [data-strip]');
    const pick = $('[data-pickup]'), ret = $('[data-retby]'), rtype = $('[data-rtype]');
    const whens = root.querySelectorAll('.when'), cols = [...root.querySelectorAll('.pcol')], save = $('.psave');

    const cap = Object.assign(document.createElement('div'), { className: 'drag-cap' });
    const hit = Object.assign(document.createElement('div'), { className: 'drag-hit' });
    hit.innerHTML = '<i class="drag-h l"></i><i class="drag-h r"></i>';
    cap.setAttribute('aria-hidden', 'true'); hit.setAttribute('aria-hidden', 'true');
    const [hl, hr] = hit.children;

    let hour0 = 0, xs = [], yc = 0, busy = [], hours = [], dots = [];
    let st = null;  // the committed range { s, e, open } in quarters from the strip's first, or null (no time, or not one the strip can show)
    let run = null;  // the live drag

    function measure() {
      hours = [...strip.children].filter(el => el.classList?.contains('hour'));
      dots = hours.flatMap(h => [...h.querySelectorAll('.dots svg')]);
      if (dots.length !== N) return false;
      const label = hours[0].querySelector('time').textContent, h = +label.split(' ')[0] % 12 + (label.endsWith('PM') ? 12 : 0);
      const t = ModoData.now(); t.setHours(h, 0, 0, 0);
      if (t - ModoData.now() > 36e5) t.setDate(t.getDate() - 1);  // the label is the mock's load hour; across midnight that was yesterday's
      hour0 = +t;
      // SVG has no offsetLeft: each dot's centre is its hour's layout position plus its rect offset from the hour (rects are scaled by the phone, hence k).
      const k = scale(), at = (d, h) => { const a = d.getBoundingClientRect(), b = h.getBoundingClientRect(); return [h.offsetLeft + (a.left - b.left + a.width / 2) / k, h.offsetTop + (a.top - b.top + a.height / 2) / k]; };
      xs = dots.map((d, q) => at(d, hours[q >> 2])[0]);
      yc = at(dots[0], hours[0])[1];
      busy = dots.map(d => d.querySelector('circle').getAttribute('fill') === 'none');
      return true;
    }
    function read() {
      if (!measure() || !pick.textContent || pick.textContent === 'Please set a time') return null;
      const a = parse(pick.textContent), open = rtype.textContent === 'Open Return', b = open ? a && new Date(+a + OPEN * Q) : parse(ret.textContent);
      if (!a || !b || (a - hour0) % Q || (b - hour0) % Q) return null;
      const s = (a - hour0) / Q, e = (b - hour0) / Q;
      if (s < 0 || e > N || e <= s || busy.slice(s, e).some(Boolean)) return null;
      return { s, e, open };
    }

    // Place the capsule over quarters [s, e). bump (px) is the give felt at a limit: the whole capsule, the start edge or the end edge.
    function place(s, e, bump = 0, mode = 'move') {
      let l = xs[s] - DOT_R - PAD, r = xs[e - 1] + DOT_R + PAD;
      if (mode === 'move') { l += bump; r += bump; } else if (mode === 'start') l += bump; else r += bump;
      for (const el of [cap, hit]) Object.assign(el.style, { left: `${l}px`, width: `${r - l}px`, top: `${yc - 10}px` });
      hours.forEach((h, i) => h.classList.toggle('bridge', s <= 4 * i + 3 && 4 * i + 4 < e));  // the divider between two hours inside the capsule is hidden
      dots.forEach((d, q) => {
        if (busy[q]) return;
        const c = d.querySelectorAll('circle'), fill = q >= s && q < e ? MINE : FREE;
        if (c[0].getAttribute('fill') !== fill) { c[0].setAttribute('fill', fill); c[2].setAttribute('fill', fill); }
      });
    }

    function refresh() {
      if (!strip.contains(cap)) strip.append(cap, hit);  // innerHTML removed them
      mo.takeRecords();
      st = run ? st : read();
      cap.hidden = hit.hidden = !st;
      if (st) { hit.classList.toggle('open', st.open); place(st.s, st.e); }
    }
    const mo = new MutationObserver(refresh);
    mo.observe(strip, { childList: true });
    new ResizeObserver(() => { if (!run) refresh(); }).observe(strip);
    document.fonts?.ready.then(() => { if (!run) refresh(); });

    // Pointer to the strip's own coordinates (scroll content), whatever the scale of the phone on the stage.
    const scale = () => strip.getBoundingClientRect().width / strip.offsetWidth;
    const toContent = clientX => (clientX - strip.getBoundingClientRect().left) / scale() + strip.scrollLeft;
    const nearest = x => xs.reduce((best, v, q) => Math.abs(v - x) < Math.abs(xs[best] - x) ? q : best, 0);

    function begin(e, mode) {
      if (!st || e.button || run) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      let lo = st.s, hi = st.e;  // the free run around the booking: grows until a busy quarter, the strip's end or the current hour
      while (lo > 0 && !busy[lo - 1]) lo--;
      while (hi < N && !busy[hi]) hi++;
      run = { id: e.pointerId, mode: st.open && mode === 'end' ? 'move' : mode, x0: toContent(e.clientX), lastX: e.clientX, from: st, lo, hi, s: st.s, e: st.e, raf: 0 };
      cap.classList.add('on'); hit.classList.add('on');
      auto();
    }
    function move() {
      const { mode, from, lo, hi } = run, dx = toContent(run.lastX) - run.x0, len = from.e - from.s;
      let s = from.s, e = from.e, want, ref, p, bump = 0, limited = false;
      if (mode === 'end') {
        want = nearest(xs[from.e - 1] + dx) + 1; e = clamp(want, from.s + 1, hi); limited = e !== want;
        ref = xs[e - 1]; p = xs[from.e - 1] + dx;
      } else {
        want = nearest(xs[from.s] + dx);
        const top = mode === 'start' && !from.open ? from.e - 1 : hi - len;  // an open return keeps its 12 h, so its start handle moves the whole mark
        s = clamp(want, lo, top); limited = s !== want;
        e = mode === 'start' && !from.open ? from.e : s + len;
        ref = xs[s]; p = xs[from.s] + dx;
      }
      if (limited) bump = rubber(p - ref);
      if (s !== run.s || e !== run.e || bump !== run.bump) {
        if (s !== run.s || e !== run.e) rows(s, e, from.open);
        run.s = s; run.e = e; run.bump = bump;
        place(s, e, bump, mode);
      }
    }
    // Live feedback: the Pick up and Return by rows (02 watches them and re-derives what it shows).
    function rows(s, e, open) {
      pick.textContent = pageDate(new Date(hour0 + s * Q));
      if (!open) ret.textContent = pageDate(new Date(hour0 + e * Q));
    }
    // Near the strip's edge the strip scrolls under the finger, faster the closer to it.
    function auto() {
      const r = strip.getBoundingClientRect(), k = scale(), edge = 44 * k;
      const near = run.lastX < r.left + edge ? run.lastX - (r.left + edge) : run.lastX > r.right - edge ? run.lastX - (r.right - edge) : 0;
      if (near) { const before = strip.scrollLeft; strip.scrollLeft += clamp(near / edge, -1, 1) * 7; if (strip.scrollLeft !== before) move(); }
      run.raf = requestAnimationFrame(auto);
    }
    function end(e, cancelled) {
      if (!run || e.pointerId !== run.id) return;
      const { from, s, e: to, raf } = run;
      cancelAnimationFrame(raf); run = null;
      cap.classList.remove('on'); hit.classList.remove('on');
      if (cancelled || (s === from.s && to === from.e)) {  // nothing to commit: the mock's own text goes back
        pick.textContent = pageDate(new Date(hour0 + from.s * Q));
        if (!from.open) ret.textContent = pageDate(new Date(hour0 + from.e * Q));
        place(from.s, from.e);
        return;
      }
      commit(from, s, to);
    }

    // Set one time through the mock's own sheet (see COMMIT above). `old` is what the mock holds now; the wheels already show it.
    function setTime(which, old, d) {
      whens[which].click();
      const row = cols[0].querySelector('.pi').offsetHeight, wrap = (v, n) => ((v + n / 2) % n + n) % n - n / 2;
      const day = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(old).setHours(0, 0, 0, 0)) / 864e5);
      const rowsBy = [day, wrap((d.getHours() % 12 || 12) - (old.getHours() % 12 || 12), 12), wrap(d.getMinutes() / 15 - old.getMinutes() / 15, 4), (d.getHours() >= 12) - (old.getHours() >= 12)];
      cols.forEach((c, k) => { c.scrollTop += rowsBy[k] * row; });
      save.click();
    }
    function commit(from, s, e) {
      const a = new Date(hour0 + s * Q), b = new Date(hour0 + e * Q), a0 = new Date(hour0 + from.s * Q), b0 = new Date(hour0 + from.e * Q);
      if (from.open) return setTime(0, a0, a);
      const todo = [];
      if (s !== from.s) todo.push([0, a0, a]);
      if (e !== from.e) todo.push([1, b0, b]);
      if (e > from.e) todo.reverse();  // a later end first, so the start never meets the old end
      todo.forEach(args => setTime(...args));
    }

    for (const [el, mode] of [[hit, 'move'], [hl, 'start'], [hr, 'end']]) {
      el.addEventListener('pointerdown', e => { if (el === hit && e.target !== hit) return; begin(e, mode); });
      // A grip is inside the capsule: its pointer events bubble there, so they stop at the grip.
      const own = e => { if (el !== hit) e.stopPropagation(); };
      el.addEventListener('pointermove', e => { own(e); if (run && e.pointerId === run.id) { run.lastX = e.clientX; move(); } });
      el.addEventListener('pointerup', e => { own(e); end(e, false); });
      el.addEventListener('pointercancel', e => { own(e); end(e, true); });
    }
    refresh();
  }

  const mine = {
    async apply(ctx) {
      await ready;
      await base?.apply(ctx);
      drag(ctx.root);
    },
  };
  globalThis.redlinePatch = mine;
})();
