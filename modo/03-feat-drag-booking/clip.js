// Storyboard for 03-feat-drag-booking. `d` is the Director from _tools/play.js.
// Both phones open on ?state=booked.
(() => {
  const wheel = (k, rows) => { const c = document.querySelectorAll('.pcol')[k]; c.scrollTo({ top: c.scrollTop + rows * 32, behavior: 'smooth' }); };
  // Centre of the nth quarter-hour dot of the vehicle page's strip, in the mock's own viewport.
  const dot = n => { const r = [...document.querySelectorAll('.page .dots svg')][n].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; };

  async function tapOn(d, selector, text) {
    const b = await d.box(selector, text);
    await d.glide(...d.center(b), 0.5);
    await d.wait(0.1);
    await d.tap();
    return b;
  }

  globalThis.redlineClip = {
    query: 'state=booked',
    ready: side => {
      const page = typeof ModoMap !== 'undefined' && ModoMap.loaded() && !ModoMap.isMoving() && document.querySelector('.page.in') !== null;
      const cap = document.querySelector('.drag-hit');  // the patch loads its base (02) first
      return page && (side === 'before' || (cap !== null && !cap.hidden));
    },
    async before(d) {
      // To change the booked time, scroll to Change Time and go through the sheet with its wheels.
      const rows = await d.box('.page .rows');
      await d.glide(rows.x + 180, rows.y + 150, 0.5);
      await d.scroll('.page .body', { top: 330 }, 600);
      await tapOn(d, '.page [data-change]');
      d.lift();
      await d.wait(0.6);
      wheel(1, 2);
      await d.wait(0.5);
      const b = await d.box('.psave');
      await d.glide(...d.center(b), 0.5);
      await d.tap();
      d.lift();
      await d.wait(0.5);
    },
    async after(d) {
      // Pull the right end out to two hours on, then slide the whole block later. The rows follow the finger; letting go commits.
      const right = await d.box('.drag-h.r');
      const gx = right.x + right.width * 0.2, gy = right.y + right.height / 2;  // the grip's pill
      const endNow = dot(2), endTo = dot(7);
      await d.glide(gx, gy, 0.6);
      await d.wait(0.1);
      await d.drag(gx, gy, gx + endTo[0] - endNow[0], gy, 1.0);
      await d.wait(0.3);
      const cap = await d.box('.drag-hit');
      const sNow = dot(1), sTo = dot(7);
      const mx = cap.x + cap.width / 2, my = cap.y + cap.height / 2;
      await d.drag(mx, my, mx + sTo[0] - sNow[0], my, 1.1);
      d.lift();
      await d.wait(0.4);
      d.ring('.page .trip', 'good');
      await d.wait(1.3);
      d.ring(null);
    },
  };
})();
