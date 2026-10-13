// Storyboard for 02-ux-tap-twice-to-confirm. `d` is the Director from _tools/play.js.
globalThis.redlineClip = {
  ready: () => document.querySelector('.manage-row') !== null,
  async before(d) {
    const b = await d.box(d.find('.manage-row', 'Ronan').querySelector('.action-button'));
    await d.glide(...d.center(b), 0.9);
    await d.wait(0.25);
    await d.tap();
    await d.wait(0.15);
    await d.wait(1.6);
  },
  async after(d) {
    const a = await d.box(d.find('.manage-row', 'Ronan').querySelector('.action-button'));
    await d.glide(...d.center(a), 1.0);
    await d.wait(0.25);
    await d.tap(0.05);
    await d.wait(0.07);
    await d.tap(0.05);
    await d.wait(1.5);
    await d.tap();
    d.lift();
    await d.wait(1.6);
  },
};
