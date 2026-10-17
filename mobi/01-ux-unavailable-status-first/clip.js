// Storyboard for 01-ux-unavailable-status-first. `d` is the Director from _tools/play.js.
// Station pins are map layers, not DOM nodes: project() gives mock pixels.
(() => {
  const STATUS = '.unavailable-status';

  // Tiles and markers first: an unloaded map would show blank squares behind the finger.
  const ready = () => typeof MobiMap !== 'undefined' && MobiMap.loaded() && !MobiMap.isMoving() && !!MobiMap.getLayer('stations');

  function origin() { const r = MobiMap.getContainer().getBoundingClientRect(); return [r.left, r.top]; }

  function station() {
    const p = MobiMap.project(MobiRoutes.stations[MobiData.unavailable].at), r = MobiMap.getContainer().getBoundingClientRect();
    return [r.left + p.x, r.top + p.y];
  }

  const run = ring => async d => {
    await d.wait(0.6);
    // Hamilton & Davie is just off the left edge of the home map: pull the map right until its pin is in reach.
    const [x, y] = origin();
    await d.drag(x + 110, y + 330, x + 290, y + 330, 0.9);
    d.lift();
    await d.wait(0.9);  // the map settles
    await d.glide(...station(), 0.9);
    await d.wait(0.25);
    await d.tap();
    d.lift();
    await d.wait(1.2);  // sheet and camera settle
    d.ring(STATUS, ring);
    await d.wait(2.6);
    d.ring(null);
  };

  globalThis.redlineClip = { ready, before: run('bad'), after: run('good') };
})();
