// The ?state= seam: opens a mock straight into a named state, for calibration and recording. Classic script, works from file://.
//   const { name, state } = IosState.pick(STATES)
// STATES is the product's table, { name: whatever the product needs to open that state }; its first key is the default.
// Without ?state= the first state is used silently. An unknown name falls back to the first with a console warning.
// The product applies the state itself (camera, selection, sheet); this only parses and falls back.
globalThis.IosState = (() => {
  function pick(states, search = location.search) {
    const asked = new URLSearchParams(search).get('state');
    const names = Object.keys(states), name = Object.hasOwn(states, asked) ? asked : names[0];
    if (asked && name !== asked) console.warn(`Unknown state "${asked}"; showing ${name}. Known: ${names.join(', ')}`);
    return { name, state: states[name] };
  }
  return { pick };
})();
