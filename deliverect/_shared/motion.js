// Shared design behaviour for Deliverect redlines: one set of motion values so every clip feels the same.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.32,.72,0,1)'; // iOS-like sheet curve: fast out, long settle
  let arrivingId = null;
  let entered = false;

  // Call right after renderManageOrders. Fades the board in on first render, flashes the row that just arrived.
  function afterRender(board) {
    if (!entered && !reduce) board.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
    const row = [...board.querySelectorAll('.manage-row')].find(row => row.dataset.orderId === arrivingId);
    if (row && !reduce) row.animate([{ backgroundColor: '#e3f7ec', borderColor: '#b6e8cd' }, {}], { duration: 900, easing: 'ease-out' });
    arrivingId = null;
    const first = !entered;
    entered = true;
    return first; // true on the first render: patches use it for their entrance animation
  }

  // Confirmed rows slide a touch right while fading, then the gap closes — so the list never jumps.
  function exitRow(row, done) {
    if (reduce) return done();
    const { height } = row.getBoundingClientRect();
    const from = { height: `${height}px`, opacity: 1, transform: 'none', marginBottom: '16px', paddingTop: '16px', paddingBottom: '16px', borderTopWidth: '2px', borderBottomWidth: '2px' };
    row.style.overflow = 'hidden';
    row.animate([
      from,
      { ...from, opacity: 0, transform: 'translateX(24px)', offset: 0.4 },
      { height: '0px', opacity: 0, transform: 'translateX(24px)', marginBottom: '0px', paddingTop: '0px', paddingBottom: '0px', borderTopWidth: '0px', borderBottomWidth: '0px' },
    ], { duration: 460, easing: EASE, fill: 'forwards' }).finished.then(done);
  }

  function confirmAndExit(row, button) {
    arrivingId = button.closest('.section').querySelector('h2').textContent === 'Preparing' ? row.dataset.orderId : null;
    exitRow(row, () => button.click());
  }

  // Picked-up rows play `celebrate(row, button)`, stay on screen for `hold` ms in their done state, then exit as usual.
  function onPickedUp(board, celebrate, hold) {
    for (const row of board.querySelectorAll('.manage-row')) {
      const button = row.querySelector('.action-button');
      if (button.textContent !== 'Picked up') continue;
      let state = 'idle';
      button.addEventListener('click', event => {
        if (state === 'leaving') return; // our own replayed click → let the original handler run
        event.stopImmediatePropagation();
        if (state === 'held') return;
        state = 'held';
        button.style.minWidth = `${button.offsetWidth}px`;
        button.classList.add('p-picked');
        button.textContent = '✓ Picked up';
        row.classList.add('p-complete');
        celebrate(row, button);
        setTimeout(() => { state = 'leaving'; confirmAndExit(row, button); }, hold);
      }, { capture: true });
    }
  }

  globalThis.RedlineMotion = { reduce, EASE, afterRender, exitRow, confirmAndExit, onPickedUp };
})();
