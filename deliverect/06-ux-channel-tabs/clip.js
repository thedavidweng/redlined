// Storyboard for 06-ux-channel-tabs. `d` is the Director from _tools/play.js.
globalThis.redlineClip = {
  ready: () => document.querySelector('.manage-row') !== null,
  async before(d) {
    for (const name of ['Malik', 'Ronan', 'Carter', 'Kevin']) {
      const r = await d.box('.manage-row', name);
      await d.glide(r.x + r.width * .1, r.y + r.height / 2, 0.45);
      await d.wait(0.2);
    }
    await d.wait(1.0);
  },
  async after(d) {
    const t = await d.box('.p-channel', 'DoorDash');
    await d.glide(...d.center(t), 1.0);
    await d.wait(0.25);
    await d.tap();
    d.lift();
    await d.wait(2.4);
  },
};
