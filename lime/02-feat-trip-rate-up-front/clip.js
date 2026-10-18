// Storyboard for 02-fix-trip-rate-up-front. `d` is the Director from _tools/play.js.
// Before: the captured summary has no rate. After: a sample rate sits under the timer.
(() => {
  const RATE = '.trip-rate';
  const TIMER = '.trip-time';

  // Tiles first: an unloaded map would show blank squares behind the sheet.
  const ready = () => typeof LimeMap !== 'undefined' && LimeMap.loaded() && !LimeMap.isMoving();

  globalThis.redlineClip = {
    query: 'state=in-trip-expanded',
    ready,
    async before(d) {
      await d.wait(0.8);
      d.ring(TIMER, 'hl');  // where the rider looks
      await d.wait(1.0);
      d.ring(null);
      await d.wait(2.0);
      d.ring(null);
    },
    async after(d) {
      await d.wait(0.8);
      d.ring(TIMER, 'hl');
      await d.wait(1.0);
      d.ring(RATE, 'good');  // already in view, under the timer
      await d.wait(2.6);
      d.ring(null);
    },
  };
})();
