// Unavailable status first. The mock already shows the status row on unavailable stations (is-unavailable); the patch only moves it (patch.css).
// Nothing to change in the DOM.
(() => {
  globalThis.redlinePatch = { apply() {} };
})();
