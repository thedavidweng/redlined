// Each order gets a symbol that replaces the generic customer icon.
(() => {
  const { reduce } = RedlineMotion;
  const { redlineOrders } = RedlineFixtures;

  // Shapes stay distinguishable on a monochrome receipt; colour is a screen-only second cue.
  const SHAPES = [
    '<circle cx="12" cy="12" r="9"/>',
    '<path d="M12 3 22 20H2z"/>',
    '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/>',
    '<path d="m12 2 2.9 6.5 7.1.7-5.3 4.8 1.5 7L12 17.4 5.8 21l1.5-7L2 9.2l7.1-.7z"/>',
    '<path d="M12 2 22 12 12 22 2 12z"/>',
    '<path d="M12 21s-9-5.6-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.4-9 12-9 12z"/>',
    '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
    '<path d="M15 3a9 9 0 1 0 6 15A8 8 0 0 1 15 3z"/>',
  ];
  const COLORS = ['#2563eb', '#dc2626', '#059669', '#ea580c', '#7c3aed', '#0891b2'];

  // Real version: assign at order acceptance, persist, print on the receipt. Unique shape per restaurant, unique shape+colour overall.
  const used = new Set();
  const brandShapes = new Map();
  const slots = SHAPES.length * COLORS.length;
  const symbolById = new Map(redlineOrders.map((order, index) => {
    const shapes = brandShapes.get(order.brand) ?? new Set();
    let k = (index * 13) % slots;
    while (used.has(k) || shapes.has(k % SHAPES.length)) k = (k + 1) % slots;
    used.add(k);
    shapes.add(k % SHAPES.length);
    brandShapes.set(order.brand, shapes);
    return [order.id, { shape: SHAPES[k % SHAPES.length], color: COLORS[Math.floor(k / SHAPES.length)] }];
  }));

  function apply({ board, entering }) {
    let index = 0;
    for (const row of board.querySelectorAll('.manage-row')) symbol(row, symbolById.get(row.dataset.orderId), entering ? index : -1), index++;
  }

  // On first view the symbols settle in, row by row.
  function symbol(row, order, index) {
    const icon = row.querySelector('.manage-customer img');
    icon.outerHTML = `<svg class="p-symbol" viewBox="0 0 24 24" fill="${order.color}" aria-hidden="true">${order.shape}</svg>`;
    if (index >= 0 && !reduce) {
      row.querySelector('.p-symbol').animate(
        [{ opacity: 0, transform: 'scale(.6) rotate(-12deg)' }, { opacity: 1, transform: 'none' }],
        { duration: 520, delay: 120 + index * 45, easing: 'cubic-bezier(.34,1.4,.64,1)', fill: 'backwards' },
      );
    }
  }

  globalThis.redlinePatch = { apply };
})();
