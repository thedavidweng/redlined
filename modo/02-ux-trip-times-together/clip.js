// Storyboard for 02-ux-trip-times-together. `d` is the Director from _tools/play.js.
// Both phones open on ?state=booked.
(() => {
  // The wheels of the time sheet: one row (32 px) on, smoothly.
  const wheel = (k, rows) => { const c = document.querySelectorAll('.pcol')[k]; c.scrollTo({ top: c.scrollTop + rows * 32, behavior: 'smooth' }); };

  async function tapOn(d, selector, text) {
    const b = await d.box(selector, text);
    await d.glide(...d.center(b), 0.8);
    await d.wait(0.2);
    await d.tap();
    return b;
  }

  globalThis.redlineClip = {
    query: 'state=booked',
    ready: () => typeof ModoMap !== 'undefined' && ModoMap.loaded() && !ModoMap.isMoving() && document.querySelector('.page.in') !== null,
    async before(d) {
      // The times are scattered; scan the strip, scroll down to Change Time and edit there.
      const strip = await d.box('.page [data-strip]');
      await d.glide(strip.x + 150, strip.y + 30, 0.7);
      d.ring('.page [data-strip]', 'bad');
      await d.wait(0.5);
      d.ring(null);
      const rows = await d.box('.page .rows');
      await d.glide(rows.x + 180, rows.y + 150, 0.5);
      await d.scroll('.page .body', { top: 330 }, 800);
      await d.wait(0.2);
      await tapOn(d, '.page [data-change]');
      d.lift();
      await d.wait(0.9);
      wheel(1, 1);
      await d.wait(0.8);
      const b = await d.box('.psave');
      await d.glide(...d.center(b), 0.5);
      await d.tap();
      d.lift();
      await d.wait(0.9);
    },
    async after(d) {
      // The same times in one block, edited right from it.
      await tapOn(d, '.trip-row:nth-child(1)');
      d.lift();
      await d.wait(0.9);
      wheel(1, 1);
      await d.wait(0.8);
      const b = await d.box('.psave');
      await d.glide(...d.center(b), 0.5);
      await d.tap();
      d.lift();
      await d.wait(0.5);
      d.ring('.page .trip', 'good');
      await d.wait(2.0);
      d.ring(null);
    },
  };
})();
