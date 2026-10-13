// Storyboard for 02-feat-find-parking. `d` is the Director from _tools/play.js.
// Both sides open on a trip (the stage passes `query`); `now` freezes the clock so which lots are open does not depend on the recording hour.
// Meters and lots are map layers, not DOM nodes: project() gives mock pixels.
(() => {
  const PILL = '.ef-find', WHY = '.ef-why', CLOSE = '.ef-x';

  // Tiles and layers first: an unloaded map would show blank squares behind the finger. The after side also needs the patch's layers.
  const ready = side => typeof EvoMap !== 'undefined' && EvoMap.loaded() && !EvoMap.isMoving() && !!EvoMap.getLayer('evo-cars') && (side === 'before' || !!EvoMap.getLayer('ef-meters'));

  const shift = () => { const r = EvoMap.getContainer().getBoundingClientRect(); return [r.left, r.top]; };
  const project = c => { const p = EvoMap.project(c), [x, y] = shift(); return [x + p.x, y + p.y]; };

  // The second-nearest meter by driving time that is clear of the chrome and far enough from the picked one to be a visibly different choice.
  function other() {
    const { meters } = EvoMeters, { meters: routes } = EvoParkingRoutes, [x0, y0] = shift();
    const list = meters.filter(m => routes[m[2]]).sort((a, b) => routes[a[2]].duration - routes[b[2]].duration);
    const [px, py] = project([list[0][0], list[0][1]]);
    for (const m of list.slice(1)) {
      const [x, y] = project([m[0], m[1]]);
      if (x > x0 + 24 && x < x0 + 366 && y > y0 + 140 && y < y0 + 540 && Math.hypot(x - px, y - py) > 50) return [x, y];
    }
    return project([list[1][0], list[1][1]]);
  }

  globalThis.redlineClip = {
    query: 'state=in-trip&now=2026-10-13T12:00',
    ready,
    async before(d) {
      // A trip, the map: Evo's own lots are the only places it shows. Pan around, nothing says where else the trip may end.
      const [x, y] = shift();
      await d.wait(0.6);
      await d.drag(x + 200, y + 230, x + 120, y + 400, 1.0);
      d.lift();
      await d.wait(0.8);
      await d.drag(x + 140, y + 420, x + 280, y + 260, 1.0);
      d.lift();
      await d.wait(0.8);
      d.ring('.tlabel.lock', 'bad');  // "Lock and end trip": but where?
      await d.wait(2.2);
      d.ring(null);
    },
    async after(d) {
      // Find parking: the places a trip may end appear, the nearest is picked and routed; why it is allowed; another dot; close.
      await d.wait(0.6);
      await d.glide(...d.center(await d.box(PILL)), 0.9);
      await d.wait(0.2);
      await d.tap();
      d.lift();
      await d.wait(2.4);  // dots, route, bar
      d.ring(WHY, 'good');
      await d.wait(1.8);
      d.ring(null);
      await d.glide(...other(), 0.9);
      await d.wait(0.2);
      await d.tap();
      d.lift();
      await d.wait(2.0);
      await d.glide(...d.center(await d.box(CLOSE)), 0.8);
      await d.wait(0.15);
      await d.tap();
      d.lift();
      await d.wait(1.4);
    },
  };
})();
