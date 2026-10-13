// Storyboard for 01-ux-one-time-entry. `d` is the Director from _tools/play.js.
// Before: pick a car, open its page, no way to switch return type there; back, switch in the header, reopen the car.
// After: one tap on the header opens the sheet, OPEN shows the live count change, SAVE; then on the vehicle page the return type switches in place.
// Pins are map layers, so the tap point comes from the map: project() gives mock pixels.
(() => {
  const RETURN_TYPE = '.rows > div:first-child';

  // Tiles and markers first: an unloaded map would show blank squares behind the finger.
  const ready = () => typeof ModoMap !== 'undefined' && ModoMap.loaded() && !ModoMap.isMoving() && !!ModoMap.getLayer('pins');

  function car() {
    const [lng, lat] = ModoData.pins.features[ModoData.near].geometry.coordinates;
    const p = ModoMap.project([lng, lat]), r = ModoMap.getContainer().getBoundingClientRect();
    return [r.left + p.x, r.top + p.y - 22];
  }

  // Glide to an element of the mock, tap it, lift the finger so what it did stays visible.
  async function press(d, selector, wait = 0.7, dx = 0, text = null) {
    await d.glide(...d.center(await d.box(selector, text), dx), 0.5);
    await d.wait(0.1);
    await d.tap();
    d.lift();
    await d.wait(wait);
  }

  globalThis.redlineClip = {
    ready,
    async before(d) {
      // The car's page has a Return Type row, but it does nothing. Back out, switch in the header, reopen the car.
      await d.glide(...car(), 0.7);
      await d.tap();
      d.lift();
      await d.wait(0.5);
      await press(d, '.card', 0.5);
      await press(d, RETURN_TYPE, 0.3);
      d.ring(RETURN_TYPE, 'bad');
      await d.wait(0.8);
      d.ring(null);
      await press(d, '.back', 0.4);
      await press(d, '.seg > button:nth-child(2)', 0.4);
      await press(d, '.card', 1.0);
    },
    async after(d) {
      // One entry. The header row opens the sheet; OPEN changes the count at once; SAVE.
      await press(d, '.otr-trip', 0.5, -40);
      await press(d, '.otr-seg button[data-open="1"]', 1.0);
      await press(d, '.psave', 0.3);
      await d.glide(330, 380, 0.4, false);

      // The same switch on the vehicle page, where there was none; the line gives this car's verdict.
      await d.glide(...car(), 0.6);
      await d.tap();
      d.lift();
      await d.wait(0.4);
      await press(d, '.card', 0.4);
      await press(d, '.otr-type', 0.5);
      await press(d, '.otr-seg button[data-open="0"]', 0.9);
      await press(d, '.otr-seg button[data-open="1"]', 0.9);
    },
  };
})();
