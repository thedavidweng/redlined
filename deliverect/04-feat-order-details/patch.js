// Click a row to expand its items inline, directly under that row.
(() => {
  function apply({ board, orders }) {
    const byId = new Map(orders.map(order => [order.id, order]));
    for (const row of board.querySelectorAll('.manage-row')) detail(row, byId.get(row.dataset.orderId));
  }

  // Height animates via grid rows, items cascade in.
  function detail(row, order) {
    row.classList.add('p-clickable');
    const panel = document.createElement('div');
    panel.className = 'p-detail';
    panel.innerHTML = `<div><div class="p-detail-box">${order.items.map(([qty, name, note], i) => `<div style="--i:${i}"><strong>${qty}</strong> ${name}${note ? ` <em>${note}</em>` : ''}</div>`).join('')}</div></div>`;
    row.after(panel);
    row.addEventListener('click', event => {
      if (event.target.closest('.manage-action')) return;
      const open = !panel.classList.contains('open');
      panel.classList.toggle('open', open);
      row.classList.toggle('p-open', open);
    });
  }

  globalThis.redlinePatch = { apply };
})();
