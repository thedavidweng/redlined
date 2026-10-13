// Storyboard for 07-feat-filter-from-chips. `d` is the Director from _tools/play.js.
// Both sides: tap the RAV4's pin, then its "SUV" chip. Before: the chip is a label (the tap falls through to the card and opens the page), so the map is unchanged.
// After: the map keeps only SUVs, a toast says how many, and the sheet jumps to the nearest other one (the Ford Escape).
// Pins are map layers: project() gives mock pixels.
(() => {
  const PIN = 1;  // the RAV4 Hybrid, an SUV south-west of the user
  const CHIP = '.card .chips .chip', BACK = '.back';

  function pin() {  // pins hang above their tip: tap the head
    const p = ModoMap.project(ModoData.pins.features[PIN].geometry.coordinates), r = ModoMap.getContainer().getBoundingClientRect();
    return [r.left + p.x, r.top + p.y - 22];
  }

  async function tapBox(d, selector, dx = 0, glide = 0.9) {
    const [x, y] = d.center(await d.box(selector), dx);
    await d.glide(x, y, glide);
    await d.wait(0.2);
    await d.tap();
    d.lift();
  }

  async function select(d) {
    await d.glide(...pin(), 0.8);
    await d.wait(0.25);
    await d.tap();
    d.lift();
    await d.wait(1.0);  // camera and sheet settle
  }

  globalThis.redlineClip = {
    ready: () => typeof ModoMap !== 'undefined' && ModoMap.loaded() && !ModoMap.isMoving() && !!ModoMap.getLayer('pins'),
    async before(d) {
      // The SUV chip is not a button. The tap opens the vehicle page; back, and the map still shows every car.
      await select(d);
      await d.wait(0.3);
      await tapBox(d, CHIP, -6);
      await d.wait(0.9);
      await tapBox(d, BACK, 0, 0.6);
      await d.wait(1.0);
    },
    async after(d) {
      // The same tap filters to SUVs and selects the nearest other one.
      await select(d);
      await d.wait(0.3);
      await tapBox(d, CHIP, -6);
      await d.wait(2.6);  // toast "9 SUVs", camera and sheet on the Escape, other cars gone
    },
  };
})();
