// Storyboard for 03-feat-order-symbols. `d` is the Director from _tools/play.js.
(() => {
  const SHAPE = { square: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/>' };
  const RECEIPT_BEFORE = '<div class="cap">PICKUP · BAG LABEL</div><div class="big">RONAN</div><div>Mang Lau Shan</div><hr><div>#5D07B9E4</div><div>2× Mango Sago</div><div>1× Scallion Pancake</div>';
  const RECEIPT_AFTER = `<div class="cap">PICKUP · BAG LABEL</div><svg viewBox="0 0 24 24" fill="#111">${SHAPE.square}</svg><div class="big">RONAN</div><div>Mang Lau Shan</div><hr><div>#5D07B9E4</div><div>2× Mango Sago</div><div>1× Scallion Pancake</div>`;

  // Ring one order's row with the outline classes of _shared/frame.css (cap-hl, cap-bad, cap-good); name null clears them.
  function mark(name, cls) {
    for (const row of document.querySelectorAll('.manage-row')) {
      row.classList.remove('cap-hl', 'cap-bad', 'cap-good');
      if (name && row.textContent.includes(name)) row.classList.add(cls);
    }
  }

  globalThis.redlineClip = {
    ready: () => document.querySelector('.manage-row') !== null,
    async before(d) {
      d.receipt(RECEIPT_BEFORE);
      await d.wait(1.1);
      for (const name of ['Rohan', 'Ronan', 'Rohan']) {
        mark(name, 'cap-hl');
        await d.wait(0.55);
      }
      mark('Rohan', 'cap-bad');
      await d.wait(1.8);
    },
    async after(d) {
      // Replay the symbols settling in (the patch plays this once, at load; same keyframes as patch.js symbol()).
      document.querySelectorAll('.p-symbol').forEach((symbol, index) => symbol.animate(
        [{ opacity: 0, transform: 'scale(.6) rotate(-12deg)' }, { opacity: 1, transform: 'none' }],
        { duration: 520, delay: 120 + index * 45, easing: 'cubic-bezier(.34,1.4,.64,1)', fill: 'backwards' }));
      await d.wait(1.4);
      d.receipt(RECEIPT_AFTER);
      await d.wait(1.0);
      mark('Ronan', 'cap-good');
      await d.wait(2.2);
    },
  };
})();
