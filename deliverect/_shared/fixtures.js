// Scenario data shared by the "before" and "after" side of every Deliverect redline.
(() => {
  const { managedOrders } = DeliverectModel;

  // Same restaurant, near-identical names: the real mix-up. Present on both sides.
  const lookalikes = [
    { id: 'A83F2C61', courier: '-', brand: 'Mang Lau Shan', customer: 'Rohan', status: 'ready', channel: 'NextGen', type: 'Pickup', location: 'Mang Lau Shan',
      items: [['1×', 'Spicy Beef Noodle Soup', 'Extra spicy'], ['1×', 'Popcorn Chicken']] },
    { id: '5D07B9E4', courier: '-', brand: 'Mang Lau Shan', customer: 'Ronan', status: 'ready', channel: 'NextGen', type: 'Pickup', location: 'Mang Lau Shan',
      items: [['2×', 'Mango Sago', 'Less sugar'], ['1×', 'Scallion Pancake']] },
  ];
  const fallbackItems = [['1×', 'Hot Chocolate', 'Oat milk'], ['2×', 'Salted Caramel Brownie'], ['1×', 'Iced Latte']];

  // The managed orders with the lookalikes inserted after the first one, every order carrying items.
  const redlineOrders = [managedOrders[0], ...lookalikes, ...managedOrders.slice(1)]
    .map((order, index) => ({ ...order, items: order.items ?? fallbackItems.slice(0, 1 + (index % 3)) }));

  const itemsById = new Map(redlineOrders.map(order => [order.id, order.items]));

  globalThis.RedlineFixtures = { lookalikes, fallbackItems, redlineOrders, itemsById };
})();
