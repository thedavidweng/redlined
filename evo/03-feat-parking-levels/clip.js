// Storyboard for 03-feat-parking-levels. `d` is the Director from _tools/play.js.
// Signs are map layers, not DOM nodes: project() gives mock pixels, and a stand-in with getBoundingClientRect() lets ring() follow a sign.
(() => {
  const SHEET = '.pane-parking';
  const UNDERGROUND = 5, OTHERS = [3, 7];  // spots in EvoData.parking: Level P2 underground (no car in front of it, unlike spot 0), then two parkades on the home camera

  // Tiles and markers first: an unloaded map would show blank squares behind the finger.
  const ready = () => typeof EvoMap !== 'undefined' && EvoMap.loaded() && !EvoMap.isMoving() && !!EvoMap.getLayer('evo-parking');

  function sign(n) {  // a sign hangs above its tip (26 x 40 pt): the stand-in is the sign plus a little air
    return {
      getBoundingClientRect() {
        const p = EvoMap.project(EvoData.parking.features[n].geometry.coordinates), r = EvoMap.getContainer().getBoundingClientRect();
        return { left: r.left + p.x - 17, top: r.top + p.y - 46, width: 34, height: 52 };
      },
    };
  }
  const head = n => { const r = sign(n).getBoundingClientRect(); return [r.left + r.width / 2, r.top + 26]; };

  globalThis.redlineClip = {
    ready,
    async before(d) {
      // The same P everywhere; only the title says what kind of lot it is.
      for (const n of [UNDERGROUND, ...OTHERS]) { d.ring(sign(n), 'bad'); await d.wait(0.5); }
      d.ring(null);
      await d.glide(...head(UNDERGROUND), 1.0);
      await d.wait(0.25);
      await d.tap();
      d.lift();
      await d.wait(1.6);  // the camera and the sheet settle
      d.ring(`${SHEET} .ptitle`, 'bad');
      await d.wait(2.4);
      d.ring(null);
    },
    async after(d) {
      // The signs tell their kind: down arrow and level below ground, up arrow above. Tap an underground one, the level is a line of its own.
      for (const n of [UNDERGROUND, ...OTHERS]) { d.ring(sign(n), 'good'); await d.wait(0.5); }
      d.ring(null);
      await d.glide(...head(UNDERGROUND), 1.0);
      await d.wait(0.25);
      await d.tap();
      d.lift();
      await d.wait(1.6);
      d.ring(`${SHEET} .ep-level`, 'good');
      await d.wait(2.4);
      d.ring(null);
    },
  };
})();
