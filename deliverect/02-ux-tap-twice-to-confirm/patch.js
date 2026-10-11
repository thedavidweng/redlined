// The action button needs two deliberate taps. Same button, same place.
(() => {
  const { reduce, EASE, confirmAndExit } = RedlineMotion;

  function apply({ board }) {
    for (const row of board.querySelectorAll('.manage-row')) doubleTap(row, row.querySelector('.action-button'));
  }

  // First tap arms for 3 s (a hairline drains to show the window); the second tap must come ≥ 350 ms later,
  // so an accidental quick double-click does nothing.
  function doubleTap(row, button) {
    const label = button.textContent;
    button.classList.add('p-tap');
    button.innerHTML = `<span>${label}</span><i></i>`;
    const text = button.querySelector('span');
    let armedAt = 0, confirmed = false, timer;
    const swap = (next, className) => {
      button.classList.remove('p-armed', 'p-done');
      if (className) button.classList.add(className);
      if (reduce) return void (text.textContent = next);
      text.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 110, easing: 'ease-in' }).finished.then(() => {
        text.textContent = next;
        text.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: EASE });
      });
    };
    button.addEventListener('click', event => {
      if (confirmed) return; // our own replayed click → let the original handler run
      event.stopImmediatePropagation();
      const now = performance.now();
      if (!armedAt) {
        armedAt = now;
        button.style.minWidth = `${button.offsetWidth}px`;
        swap('Tap again', 'p-armed');
        timer = setTimeout(() => { armedAt = 0; swap(label); }, 3000);
      } else if (now - armedAt >= 350) {
        clearTimeout(timer);
        swap(`✓ ${label}`, 'p-done');
        setTimeout(() => { confirmed = true; confirmAndExit(row, button); }, reduce ? 0 : 360);
      }
    }, { capture: true });
  }

  globalThis.redlinePatch = { apply };
})();
