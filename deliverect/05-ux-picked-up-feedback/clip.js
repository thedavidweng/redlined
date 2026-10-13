// Storyboard for 05-ux-picked-up-feedback. `d` is the Director from _tools/play.js.
// After side: three orders, three candidate effects (shine, ring, strike-through), one per tap.
globalThis.redlineClip = {
  ready: () => document.querySelector('.manage-row') !== null,
  async before(d) {
    const b = await d.box(d.find('.manage-row', 'Ronan').querySelector('.action-button'));
    await d.glide(...d.center(b), 0.9);
    await d.wait(0.25);
    await d.tap();
    d.lift();
    await d.wait(1.8);
  },
  async after(d) {
    for (const name of ['Ronan', 'Carter', 'Kevin']) {  // shine, ring, strike-through
      const a = await d.box(d.find('.manage-row', name).querySelector('.action-button'));
      await d.glide(...d.center(a), 0.8);
      await d.wait(0.2);
      await d.tap();
      d.lift();
      await d.wait(2.0);
    }
    await d.wait(0.4);
  },
};
