// Bike-type tabs with counts. The mock writes the station name on every selection (data-title); the patch reads the counts for that station
// from the data and relabels the tabs. Nothing else is touched.
(() => {
  function apply({ root, data }) {
    const title = root.querySelector('[data-title]');
    const tabs = { electric: root.querySelector('[data-kind="electric"]'), mechanical: root.querySelector('[data-kind="mechanical"]') };
    const label = () => {
      const s = data.stations.find(x => x.name === title.textContent);
      if (!s) return;
      tabs.electric.textContent = `Electric · ${s.electric}`;
      tabs.mechanical.textContent = `Classic · ${s.bikes - s.electric}`;
      observer.takeRecords();  // our own writes are not a new selection
    };
    const observer = new MutationObserver(label);
    observer.observe(title, { childList: true, characterData: true, subtree: true });
    label();  // a state opened already selected was filled before the patch ran
  }

  globalThis.redlinePatch = { apply };
})();
