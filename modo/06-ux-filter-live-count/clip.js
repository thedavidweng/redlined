// Storyboard for 06-ux-filter-live-count. `d` is the Director from _tools/play.js.
// Both sides do the same thing: open Filters, pick SUV and all-wheel drive, apply. Before: no feedback until the sheet is closed, then it has to be reopened to change anything.
// After: the button counts as you go (9 -> 3 cars), and applying filters the map.
(() => {
  const SUV = ['.fchip', 'SUV'], AWD = ['.row', 'all-wheel drive'], APPLY = ['.apply', null], PILL = ['.filter', null];

  // The finger leaves the glass afterwards so the result stays visible.
  async function tap(d, [selector, text], dx = 0) {
    const [x, y] = d.center(await d.box(selector, text), dx);
    await d.glide(x, y, 0.5);
    await d.wait(0.1);
    await d.tap();
    d.lift();
  }

  // Ring the button so the eye goes to its label: the count (after) or the plain APPLY that says nothing (before).
  async function show(d, tone, hold) {
    d.ring('.apply', tone);
    await d.wait(hold);
    d.ring(null);
  }

  async function scroll(d, top) {
    document.querySelector('.fscroll').scrollTo({ top, behavior: 'smooth' });
    await d.wait(0.55);
  }

  globalThis.redlineClip = {
    ready: () => typeof ModoMap !== 'undefined' && ModoMap.loaded() && !ModoMap.isMoving() && !!ModoMap.getLayer('pins'),
    async before(d) {
      // Toggle, apply, look, reopen.
      await tap(d, PILL);
      await d.wait(0.5);
      await tap(d, SUV, -40);
      await scroll(d, 190);
      await tap(d, AWD, -60);
      await show(d, 'bad', 0.9);  // still just APPLY: no idea what it will leave
      await tap(d, APPLY);
      await d.wait(0.9);  // the map did not change: nothing to see
      await tap(d, PILL);
      await d.wait(0.6);
      d.lift();
    },
    async after(d) {
      // The count answers each tap.
      await tap(d, PILL);
      await d.wait(0.5);
      d.ring('.apply', 'good');  // watch the label: SHOW 20 CARS
      await d.wait(0.6);
      await tap(d, SUV, -40);
      await d.wait(1.3);  // SHOW 9 CARS
      await scroll(d, 190);
      await tap(d, AWD, -60);
      await d.wait(1.4);  // SHOW 3 CARS
      d.ring(null);
      await tap(d, APPLY);
      await d.wait(1.6);  // the map shows only the match
    },
  };
})();
