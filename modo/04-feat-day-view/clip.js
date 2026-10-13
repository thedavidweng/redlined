// Storyboard for 04-feat-day-view. `d` is the Director from _tools/play.js.
// Both phones open on ?state=booked.
// The vehicle page covers the header, so each side goes back, taps OPEN RETURN (12 h) and opens the car again.
(() => {
  async function tapOn(d, selector, text) {
    const b = await d.box(selector, text);
    await d.glide(...d.center(b), 0.5);
    await d.wait(0.1);
    await d.tap();
    return b;
  }

  async function openReturn(d) {
    await tapOn(d, '.back');
    await d.wait(0.5);
    await tapOn(d, '.seg > button', 'OPEN RETURN');
    await d.wait(0.2);
    await tapOn(d, '.card');
    d.lift();
    await d.wait(0.6);
  }

  globalThis.redlineClip = {
    query: 'state=booked',
    ready: side => {
      const page = typeof ModoMap !== 'undefined' && ModoMap.loaded() && !ModoMap.isMoving() && document.querySelector('.page.in') !== null;
      const cap = document.querySelector('.dv-cap');  // the patch loads its bases (03, then 02) first
      return page && (side === 'before' || (cap !== null && !cap.hidden));
    },
    async before(d) {
      // A 12 h open return runs off the strip; scroll sideways to find where it ends.
      await openReturn(d);
      const strip = await d.box('.page [data-strip]');
      const sx = strip.x + strip.width * 0.8, sy = strip.y + 40;
      await Promise.all([d.drag(sx, sy, strip.x + strip.width * 0.15, sy, 1.2), d.scroll('.page [data-strip]', { left: 700 }, 1200)]);  // the finger drags in parallel; a mouse drag does not scroll a div
      d.lift();
      await d.wait(0.6);
    },
    async after(d) {
      // The same booking and the whole free window in four rows. Then drag the booking later, across midnight.
      await openReturn(d);
      await d.wait(0.8);
      const bar = document.querySelectorAll('.dv-bar')[0].getBoundingClientRect();
      // grab the capsule's part in today's row at 3/4 of the bar, pull it 5.75 h on (12:15 PM to 6:00 PM) so it ends at 6 AM
      const hit = [...document.querySelectorAll('.dv-hit')].find(h => !h.hidden).getBoundingClientRect();
      const x0 = hit.x + hit.width / 2, y0 = hit.y + hit.height / 2;
      await d.drag(x0, y0, x0 + bar.width * 5.75 / 24, y0, 1.2);
      d.lift();
      await d.wait(0.4);
      d.ring('.page .trip', 'good');
      await d.wait(1.6);
      d.ring(null);
    },
  };
})();
