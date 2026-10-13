// Storyboard for 04-feat-order-details. `d` is the Director from _tools/play.js.
globalThis.redlineClip = {
  ready: () => document.querySelector('.manage-row') !== null,
  async before(d) {
    const r = await d.box('.manage-row', 'Ronan');
    await d.glide(r.x + r.width * .45, r.y + r.height / 2, 0.9);
    await d.wait(0.25);
    await d.tap();
    await d.wait(0.5);
    await d.tap();
    await d.wait(1.6);
  },
  async after(d) {
    const r = await d.box('.manage-row', 'Ronan');
    await d.glide(r.x + r.width * .45, r.y + r.height / 2, 1.0);
    await d.wait(0.25);
    await d.tap();
    await d.wait(2.4);
  },
};
