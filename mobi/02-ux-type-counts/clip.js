// Storyboard for 02-ux-type-counts. `d` is the Director from _tools/play.js.
// Station pins are map layers, not DOM nodes: project() gives mock pixels.
(() => {
  const SEGMENT = '.segment', CLASSIC = '[data-kind="mechanical"]';

  // Tiles and markers first: an unloaded map would show blank squares behind the finger.
  const ready = () => typeof MobiMap !== 'undefined' && MobiMap.loaded() && !MobiMap.isMoving() && !!MobiMap.getLayer('stations');

  function station() {
    const p = MobiMap.project(MobiRoutes.stations[MobiData.nearest].at), r = MobiMap.getContainer().getBoundingClientRect();
    return [r.left + p.x, r.top + p.y];
  }

  const run = ring => async d => {
    await d.wait(0.6);
    await d.glide(...station(), 1.1);
    await d.wait(0.25);
    await d.tap();
    d.lift();
    await d.wait(1.2);  // sheet and camera settle
    d.ring(SEGMENT, ring);
    await d.wait(1.8);
    d.ring(null);
    await d.glide(...d.center(await d.box(CLASSIC)), 0.8);
    await d.wait(0.2);
    await d.tap();
    d.lift();
    await d.wait(2.0);
  };

  globalThis.redlineClip = { ready, before: run('bad'), after: run('good') };
})();
