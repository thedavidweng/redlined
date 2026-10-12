// Keeps a MapLibre map smooth on weak GPUs. At rest the map renders at the screen's full pixel ratio; while the camera
// moves it steps down (3 -> 2 -> 1.5 -> 1) only if frames run slow, and sharpens again once it settles. Capable
// devices never step down, and a 1x screen (the recording stage) is left alone. Classic script, works from file://.
//   IosMapPerf.attach(map)
// Pixel ratio follows the phone's real size on screen: desktop mode scales the phone down (IosDevice.scale()).
globalThis.IosMapPerf = (() => {
  const SLOW = 18, BUDGET = 14, WINDOW = 5, SETTLE = 160;  // ms: mean frame time that steps down, frame time aimed for, frames averaged, rest before sharpening

  function attach(map) {
    // rest: full ratio. Moving: from at most 2, down the ladder as far as the device needs.
    const ratios = () => {
      const rest = devicePixelRatio * (globalThis.IosDevice?.scale() ?? 1);
      return { rest, motion: [Math.min(rest, 2), ...[1.5, 1].filter(r => r < rest && r < 2)] };
    };
    let { rest, motion: steps } = ratios(), level = 0, moving = false, settle, last, frames = [], skip = 0;

    function apply(ratio) {
      if (ratio === map.getPixelRatio()) return;
      // map.setPixelRatio() calls resize(), which stops a drag in progress. These two internals (MapLibre 5.24.0, pinned) do the same without that.
      if (map._resizeInternal) { map._overridePixelRatio = ratio; map._resizeInternal(false); map.triggerRepaint(); }
      else if (!moving) map.setPixelRatio(ratio);
      frames = []; skip = 3;  // the first frames after a canvas resize are not representative
    }
    function sample(now) {
      if (!moving) return;
      requestAnimationFrame(sample);
      const dt = now - last; last = now;
      if (skip) { skip--; return; }
      if (dt > 250) return;  // tab was hidden
      frames.push(dt);
      if (frames.length < WINDOW) return;
      const mean = frames.reduce((a, b) => a + b) / frames.length;
      frames = [];
      if (mean <= SLOW || level === steps.length - 1) return;
      // Frame time grows with the pixel count, so jump straight to the ratio that should fit the budget.
      const want = steps[level] * Math.sqrt(BUDGET / mean);
      const fit = steps.findIndex(r => r <= want);
      apply(steps[level = Math.max(level + 1, fit < 0 ? steps.length - 1 : fit)]);
    }

    map.on('movestart', () => {
      if (steps.length === 1 && steps[0] === rest) return;  // 1x screen: nothing to give up
      clearTimeout(settle);
      if (moving) return;
      moving = true; frames = []; skip = 3; last = performance.now();
      apply(steps[level]);
      requestAnimationFrame(sample);
    });
    map.on('moveend', () => {
      moving = false;
      clearTimeout(settle);
      settle = setTimeout(() => apply(rest), SETTLE);
    });
    addEventListener('resize', () => {
      ({ rest, motion: steps } = ratios()); level = Math.min(level, steps.length - 1);
      if (!moving) apply(rest);
    });
    apply(rest);
  }

  return { attach };
})();
