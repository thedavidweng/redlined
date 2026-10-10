// Slide-to-confirm replaces the one-tap action button. Same footprint as the original button.
(() => {
  const { reduce, EASE, confirmAndExit } = RedlineMotion;

  function apply({ board }) {
    for (const row of board.querySelectorAll('.manage-row')) swipe(row, row.querySelector('.action-button'));
  }

  // Green fill trails the knob; short of the end it springs back.
  function swipe(row, button) {
    const track = document.createElement('div');
    track.className = 'p-swipe';
    track.innerHTML = `<i class="p-swipe-fill"></i><span>${button.textContent}</span><button aria-label="Slide to confirm: ${button.getAttribute('aria-label')}"><b>›</b><b>✓</b></button>`;
    button.hidden = true;
    button.after(track);
    const knob = track.querySelector('button');
    let start = null, x = 0, done = false;
    const max = () => track.clientWidth - knob.offsetWidth - 4;
    const move = value => {
      x = value;
      track.style.setProperty('--x', `${x}px`);
      track.style.setProperty('--p', String(x / max()));
    };
    const finish = () => {
      track.classList.remove('dragging');
      if (x >= max() * 0.85) {
        done = true;
        move(max());
        track.classList.add('done');
        setTimeout(() => confirmAndExit(row, button), reduce ? 0 : 320);
      } else {
        if (x < 3 && !reduce) knob.animate([{ translate: '0' }, { translate: '10px' }, { translate: '0' }], { duration: 420, easing: EASE });
        move(0);
      }
    };
    knob.addEventListener('pointerdown', event => {
      if (done) return;
      start = event.clientX - x;
      knob.setPointerCapture(event.pointerId);
      track.classList.add('dragging');
    });
    knob.addEventListener('pointermove', event => { if (start !== null) move(Math.max(0, Math.min(max(), event.clientX - start))); });
    knob.addEventListener('pointerup', () => { if (start === null) return; start = null; finish(); });
    knob.addEventListener('pointercancel', () => { start = null; track.classList.remove('dragging'); move(0); });
    knob.addEventListener('keydown', event => {
      if (event.key !== 'ArrowRight' || done) return;
      event.preventDefault();
      move(Math.min(max(), x + max() / 3 + 1));
      if (x >= max()) finish();
    });
  }

  globalThis.redlinePatch = { apply };
})();
