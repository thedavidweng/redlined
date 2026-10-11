// "Picked up" plays a completion effect before the row leaves. Three candidate styles, one per tap in turn:
// shine, ring, strike-through. The point is the decision (show completion), not one specific effect.
(() => {
  const { reduce, EASE, onPickedUp } = RedlineMotion;

  const VARIANTS = [shine, ring, strike];
  let taps = 0; // survives re-renders, so each completed order shows the next style

  function apply({ board }) {
    onPickedUp(board, (row, button) => {
      const play = VARIANTS[taps++ % VARIANTS.length];
      row.classList.add(`p-${play.name}`);
      play(row);
      if (!reduce) button.animate([{ transform: 'scale(.92)' }, { transform: 'scale(1.06)', offset: 0.45 }, { transform: 'none' }], { duration: 420, easing: EASE });
    }, reduce ? 900 : 1400);
  }

  // Row flashes green, a highlight sweeps across it.
  function shine(row) {
    if (reduce) return;
    const sweep = document.createElement('i');
    sweep.className = 'p-sweep';
    row.append(sweep);
    row.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.012)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 520, easing: EASE });
    row.animate([{ backgroundColor: '#c9f0dc', borderColor: '#7fd8aa' }, {}], { duration: 900, easing: 'ease-out' });
    sweep.animate([{ transform: 'translateX(-100%) skewX(-20deg)' }, { transform: 'translateX(1400%) skewX(-20deg)' }], { duration: 760, delay: 80, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'both' });
  }

  // A green ring traces the row's outline clockwise from the top-left, then pulses outward.
  function ring(row) {
    const { width, height } = row.getBoundingClientRect();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'p-ring');
    svg.setAttribute('width', width + 6);
    svg.setAttribute('height', height + 6);
    svg.innerHTML = `<rect x="1.5" y="1.5" width="${width + 3}" height="${height + 3}" rx="6" pathLength="1"/>`;
    row.append(svg);
    if (reduce) return;
    svg.querySelector('rect').animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 620, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'backwards' });
    row.animate([
      { boxShadow: '2px 2px 5px #03002b1a, 0 0 0 0 #00a86200' },
      { boxShadow: '2px 2px 5px #03002b1a, 0 0 0 0 #00a8624d', offset: 0.01 },
      { boxShadow: '2px 2px 5px #03002b1a, 0 0 0 14px #00a86200' },
    ], { duration: 700, delay: 560, easing: 'ease-out' });
  }

  // A line draws through the order's details (ID to customer) like a finished to-do.
  function strike(row) {
    const rowBox = row.getBoundingClientRect();
    const first = row.querySelector('.manage-id span').getBoundingClientRect();
    const last = row.querySelector('.manage-customer span').getBoundingClientRect();
    const line = document.createElement('i');
    line.className = 'p-strike';
    line.style.left = `${first.left - rowBox.left - 2}px`;
    line.style.width = `${last.right - first.left + 4}px`;
    row.append(line);
    if (reduce) return;
    line.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 420, delay: 60, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'backwards' });
  }

  globalThis.redlinePatch = { apply };
})();
