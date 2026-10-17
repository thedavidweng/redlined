// Trip rate up front. The mock's only known rate is CAD $0.15/min (the same figure the pre-ride sheet and the Pricing details use).
// The patch writes it under the timer as fixed text. It is not a running cost: no timer x rate. The Pricing card below stays as is.
(() => {
  function apply({ root }) {
    const metrics = root.querySelector('.trip-metrics');
    const rate = Object.assign(document.createElement('p'), { className: 'trip-rate' });
    // Same promo handling as the mock: no promo by default, ?promo=25off adds it.
    rate.textContent = root.classList.contains('no-promo') ? 'CAD $0.15/min' : '25% off, up to $5, then CAD $0.15/min';
    metrics.after(rate);
  }

  globalThis.redlinePatch = { apply };
})();
