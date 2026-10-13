// Storyboard for 01-fix-range-in-km. `d` is the Director from _tools/play.js.
// Vehicle markers are map layers, not DOM nodes, so the tap point comes from the map: project() gives mock pixels.
(() => {
  const RANGE = '.range';  // the whole row: battery icon and text

  // Tiles and markers first: an unloaded map would show blank squares behind the finger.
  const ready = () => typeof LimeMap !== 'undefined' && LimeMap.loaded() && !LimeMap.isMoving() && !!LimeMap.getLayer('vehicles');

  function car() {
    const [lng, lat] = LimeData.vehicles.features[LimeData.nearest].geometry.coordinates;
    const p = LimeMap.project([lng, lat]), r = LimeMap.getContainer().getBoundingClientRect();
    return [r.left + p.x, r.top + p.y];
  }

  globalThis.redlineClip = {
    ready,
    async before(d) {
      await d.glide(...car(), 1.0);
      await d.wait(0.25);
      await d.tap();
      d.lift();
      await d.wait(1.0);  // sheet spring settles
      d.ring(RANGE, 'bad');
      await d.wait(2.4);
      d.ring(null);
    },
    async after(d) {
      await d.glide(...car(), 1.1);
      await d.wait(0.25);
      await d.tap();
      d.lift();
      await d.wait(1.0);
      d.ring(RANGE, 'good');
      await d.wait(2.4);
      d.ring(null);
    },
  };
})();
