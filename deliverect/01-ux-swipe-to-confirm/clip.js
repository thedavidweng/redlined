// Storyboard for 01-ux-swipe-to-confirm. `d` is the Director from _tools/play.js.
globalThis.redlineClip = {
  ready: () => document.querySelector('.manage-row') !== null,
  async before(d) {
    const b = await d.box(d.find('.manage-row', 'Rohan').querySelector('.action-button'));
    await d.glide(...d.center(b), 0.9);
    await d.wait(0.25);
    await d.tap();
    await d.wait(0.15);
    await d.wait(1.6);
  },
  async after(d) {
    const row = d.find('.manage-row', 'Rohan');
    const k = await d.box(row.querySelector('.p-swipe button'));
    await d.glide(...d.center(k), 1.0);
    await d.wait(0.25);
    await d.tap();
    await d.wait(1.3);
    const track = await d.box(row.querySelector('.p-swipe'));
    d.down();
    await d.wait(0.12);
    await d.glide(track.x + track.width - 18, d.y, 0.75);
    await d.wait(0.08);
    d.up();
    d.lift();
    await d.wait(1.5);
  },
};
