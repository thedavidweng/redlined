// Range in kilometres. The mock stores range in miles and writes the number on every selection (data-range), the unit is fixed text beside it.
// The patch converts what the mock writes and swaps the unit; nothing else is touched.
(() => {
  const KM_PER_MILE = 1.609344;

  function apply({ root }) {
    const value = root.querySelector('[data-range]');
    const unit = value.nextSibling;  // the text node " mi range"
    unit.textContent = unit.textContent.replace(/\bmi\b/, 'km');
    const convert = () => {
      const miles = parseFloat(value.textContent);
      if (!Number.isFinite(miles)) return;
      value.textContent = Math.round(miles * KM_PER_MILE);
      observer.takeRecords();  // our own write is not a new selection
    };
    const observer = new MutationObserver(convert);
    observer.observe(value, { childList: true, characterData: true, subtree: true });
    convert();  // a state opened already selected was filled before the patch ran
  }

  globalThis.redlinePatch = { apply };
})();
