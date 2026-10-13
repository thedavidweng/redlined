// Storyboard for 01-feat-walk-route. `d` is the Director from _tools/play.js.
// Cars are map layers, not DOM nodes: project() gives mock pixels.
(() => {
  const WALK = '.pane-car .walk';  // the walk row on the compact sheet

  // Tiles and markers first: an unloaded map would show blank squares behind the finger.
  const ready = () => typeof EvoMap !== 'undefined' && EvoMap.loaded() && !EvoMap.isMoving() && !!EvoMap.getLayer('evo-cars');

  function car() {  // cars hang above their tip: tap the head
    const p = EvoMap.project(EvoData.vehicles.features[EvoData.nearest].geometry.coordinates), r = EvoMap.getContainer().getBoundingClientRect();
    return [r.left + p.x, r.top + p.y - 22];
  }

  globalThis.redlineClip = {
    ready,
    async before(d) {
      // The estimate and no route: nothing says where the car is or how that figure came about.
      await d.glide(...car(), 1.0);
      await d.wait(0.25);
      await d.tap();
      d.lift();
      await d.wait(1.6);  // the camera and the sheet settle
      d.ring(WALK, 'bad');
      await d.wait(2.4);
      d.ring(null);
    },
    async after(d) {
      // Select the car, the route is drawn, tap the walk row: the sheet drops away and the whole route fits; close.
      await d.glide(...car(), 1.1);
      await d.wait(0.25);
      await d.tap();
      d.lift();
      await d.wait(1.6);
      d.ring(WALK, 'good');
      await d.wait(1.6);  // the route, the figure
      d.ring(null);
      await d.glide(...d.center(await d.box(WALK)), 0.7);
      await d.wait(0.15);
      await d.tap();
      d.lift();
      await d.wait(2.6);  // route preview: the whole route, nothing under the finger
      await d.glide(...d.center(await d.box('.ew-x')), 0.8);
      await d.wait(0.15);
      await d.tap();
      d.lift();
      await d.wait(1.4);
    },
  };
})();
