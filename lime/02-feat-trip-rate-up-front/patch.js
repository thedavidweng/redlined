// Proposed rate placement. CAD $0.15/min is the pre-ride demo fixture, not a verified active-trip tariff.
// Do not infer active-trip discounts from the pre-ride promotion or calculate a running cost.
(() => {
  function apply({ root }) {
    const metrics = root.querySelector('.trip-metrics');
    const rate = Object.assign(document.createElement('p'), { className: 'trip-rate' });
    rate.textContent = 'CAD $0.15/min';
    metrics.after(rate);
  }

  globalThis.redlinePatch = { apply };
})();
