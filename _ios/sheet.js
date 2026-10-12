// Draggable bottom sheet with detents, a spring release and a rubber band. Classic script, works from file://.
//   const sheet = IosSheet.create(el, { detents, snaps, shown, onMove(y, at) })
//   sheet.show(to?) / sheet.hide(done?) / sheet.snap(name, animate = true) / sheet.state
// detents: { name: () => px }, measured on every resize. A detent is the sheet's translateY in px: 0 is fully open and larger
//   is lower. One detent must be named 'hidden' (the sheet's own height, so it is off screen); it is not draggable to.
// snaps: the detent names a release can settle on, top to bottom (the rest are reached by show/hide/snap only).
// shown: where show() goes by default (default: the last snap).
// onMove(y, at): on every position change; at is the measured detent table, e.g. at.collapsed.
// spring: { stiffness: 300, damping: 22 } by default (damping below critical: a small bounce on release).
// Only the sheet's transform changes while it moves, so nothing reflows and the map never repaints.
// While a finger drags, el gets the class 'dragging' (use it to switch off CSS transitions).
globalThis.IosSheet = (() => {
  const TAP = 6;

  // CSS cubic-bezier(.32, .72, 0, 1) as a function of time, to match the chrome's transitions.
  const ease = t => {
    const [x1, y1, x2, y2] = [.32, .72, 0, 1], bez = (a, b, s) => 3 * a * s * (1 - s) ** 2 + 3 * b * (1 - s) * s * s + s ** 3;
    let s = t;
    for (let i = 0; i < 8; i++) { const dx = bez(x1, x2, s) - t, d = (bez(x1, x2, s + 1e-4) - bez(x1, x2, s - 1e-4)) / 2e-4; if (!d) break; s -= dx / d; }
    return bez(y1, y2, Math.min(1, Math.max(0, s)));
  };

  function create(el, { detents, snaps, shown, spring: tune, onMove = () => {} }) {
    const SPRING = { stiffness: 300, damping: 22, ...tune };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    snaps ??= Object.keys(detents).filter(name => name !== 'hidden');
    shown ??= snaps.at(-1);
    let at = {}, y = 0, state = 'hidden', frame = 0, drag = null, blockClick = false;

    const measure = () => { for (const name in detents) at[name] = detents[name](); };
    const place = v => { y = v; el.style.transform = `translate3d(0, ${v}px, 0)`; onMove(v, at); };
    const target = name => at[name];
    const stop = () => { cancelAnimationFrame(frame); frame = 0; };

    // Move to a detent: a spring when handed a finger velocity (release), the chrome's ease otherwise.
    function go(next, { velocity, done } = {}) {
      stop();
      state = next;
      if (next !== 'hidden') el.style.visibility = 'visible';
      const to = target(next), from = y;
      const finish = () => { place(to); frame = 0; if (next === 'hidden') el.style.visibility = ''; done?.(); };
      if (reduced.matches || from === to && !velocity) return finish();
      let last = performance.now(), v = velocity ?? 0, t0 = last;
      const tick = now => {
        if (velocity === undefined) {
          const t = Math.min(1, (now - t0) / 500);
          place(from + (to - from) * ease(t));
          return t < 1 ? (frame = requestAnimationFrame(tick)) : finish();
        }
        // Semi-implicit Euler in 1/120 s steps so a slow frame can't blow the spring up.
        let dt = Math.min(64, now - last) / 1000; last = now;
        while (dt > 0) {
          const h = Math.min(dt, 1 / 120);
          v += (-SPRING.stiffness * (y - to) - SPRING.damping * v) * h; place(y + v * h); dt -= h;
        }
        if (Math.abs(y - to) < .3 && Math.abs(v) < 8) finish(); else frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }

    // Beyond the outermost snaps the sheet resists, like a rubber band.
    const band = raw => {
      const lo = Math.min(...snaps.map(target)), hi = Math.max(...snaps.map(target));
      return raw < lo ? lo + (raw - lo) * .25 : raw > hi ? hi + (raw - hi) * .25 : raw;
    };

    el.addEventListener('pointerdown', e => {
      if (state === 'hidden' || e.button) return;
      stop();
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, from: y, moved: false, samples: [[performance.now(), e.clientY]] };
    });
    el.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = (e.clientY - drag.y0) / (globalThis.IosDevice?.scale() ?? 1);  // screen px -> the phone's pt
      if (!drag.moved) {
        if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < TAP) return;
        drag.moved = true; el.setPointerCapture(e.pointerId); el.classList.add('dragging');
      }
      place(band(drag.from + dy));
      drag.samples.push([performance.now(), e.clientY]);
      if (drag.samples.length > 8) drag.samples.shift();
    });
    const release = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const { moved, samples } = drag; drag = null;
      el.classList.remove('dragging');
      if (!moved) return;
      blockClick = true; setTimeout(() => blockClick = false);
      // Velocity over the last 100 ms, in pt/s; the snap nearest to where the sheet would coast to wins.
      const now = performance.now(), recent = samples.filter(s => now - s[0] < 100), a = recent[0] ?? samples.at(-1), b = samples.at(-1);
      const k = globalThis.IosDevice?.scale() ?? 1, v = b[0] > a[0] ? (b[1] - a[1]) / k / (b[0] - a[0]) * 1000 : 0;
      const coast = y + v * .2;
      const next = snaps.reduce((best, name) => Math.abs(target(name) - coast) <= Math.abs(target(best) - coast) ? name : best);
      go(next, { velocity: v });
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('click', e => { if (blockClick) { e.stopPropagation(); e.preventDefault(); } }, true);

    new ResizeObserver(() => { measure(); if (!frame && !drag) place(target(state)); }).observe(el);
    measure(); place(at.hidden);

    return {
      get state() { return state; },
      show: (to = shown) => { measure(); if (state === 'hidden') place(at.hidden); go(to); },
      hide: done => go('hidden', { done }),
      snap: (to, animate = true) => animate ? go(to) : (stop(), measure(), state = to, el.style.visibility = 'visible', place(target(to))),
    };
  }

  return { create };
})();
