// Storyboard for 05-feat-walk-and-directions. `d` is the Director from _tools/play.js.
// Pins are map layers, not DOM nodes: project() gives mock pixels.
(() => {
  const PIN = 2;  // north of the user's dot; selected, the strip above the sheet is too small for the whole route, so the walk line opens the route preview

  function pin() {  // pins hang above their tip: tap the head
    const p = ModoMap.project(ModoData.pins.features[PIN].geometry.coordinates), r = ModoMap.getContainer().getBoundingClientRect();
    return [r.left + p.x, r.top + p.y - 22];
  }

  globalThis.redlineClip = {
    ready: () => typeof ModoMap !== 'undefined' && ModoMap.loaded() && !ModoMap.isMoving() && !!ModoMap.getLayer('pins'),
    async before(d) {
      // The station and nothing else: no distance, no route, and the map strip is too small to show one anyway.
      await d.glide(...pin(), 0.8);
      await d.wait(0.15);
      await d.tap();
      d.lift();
      await d.wait(1.6);
    },
    async after(d) {
      // Select the car, tap the walk line, the sheet drops away and the whole route fits; Directions from the bar.
      await d.glide(...pin(), 0.8);
      await d.wait(0.15);
      await d.tap();
      d.lift();
      d.ring('.card [data-walk]', 'good');
      await d.wait(1.5);  // camera frames the route, walk line
      d.ring(null);
      await d.glide(...d.center(await d.box('.card button[data-walk]')), 0.7);
      await d.wait(0.15);
      await d.tap();
      d.lift();
      await d.wait(2.4);  // route preview: the whole route, nothing under the finger
      await d.glide(...d.center(await d.box('.rp-go')), 0.8);
      await d.wait(0.15);
      await d.tap();
      d.lift();
      await d.wait(1.8);  // action sheet
    },
  };
})();
