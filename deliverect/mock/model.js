// Fictional names and randomized IDs based on the first layout observation; times intentionally stay still for UI comparisons.
(() => {
  const orders = [
    { id: '695B3414', brand: 'Thai Away Moon', courier: '-', customer: 'Emma R.', channel: 'Uber Eats', type: 'Delivery', status: 'ready' },
    { id: '992A9B81', brand: 'Thai Away Moon', courier: 'RAMI', customer: 'Sofia L.', channel: 'Uber Eats', type: 'Delivery', status: 'ready' },
    { id: '3974B95F', brand: 'Mang Lau Shan', courier: 'Juno', customer: 'Clayton B.', channel: 'Uber Eats', type: 'Delivery', status: 'ready' },
    { id: '2C1E16B4', brand: 'Hello Maki', courier: '-', customer: 'PAT J.', channel: 'Uber Eats', type: 'Delivery', status: 'ready' },
    { id: '9EF895ED', brand: "Mindy's", courier: 'FARIS', customer: 'Malik D.', channel: 'Uber Eats', type: 'Delivery', status: 'ready' },
    { id: '6594AC42', brand: "Mindy's", courier: 'RAMI', customer: 'Carter F.', channel: 'Uber Eats', type: 'Delivery', status: 'preparing', time: '03:47' },
    { id: '301BA5BE', brand: 'Mang Lau Shan', courier: '-', customer: 'Zhao M.', channel: 'Fantuan', type: 'Delivery', status: 'preparing', time: '05:04' },
    { id: '14C2200F', brand: 'Leaves Organic Coffee', courier: '-', customer: 'Parker', channel: 'NextGen', type: 'Pickup', status: 'preparing', time: '07:16' },
    { id: 'E75F0F17', brand: 'Thai Away Moon', courier: '-', customer: 'Luka', channel: 'NextGen', type: 'Pickup', status: 'preparing', time: '08:53' },
    { id: '423372B6', brand: "Mindy's", courier: '-', customer: 'Dominic R.', channel: 'Uber Eats', type: 'Delivery', status: 'preparing', time: '10:41' },
    { id: '26506B7C', brand: 'Jade Castle', courier: '-', customer: 'Kevin B', channel: 'DoorDash', type: 'Delivery', status: 'preparing', time: '13:26' },
    { id: '2945210B', brand: 'El Compa', courier: '-', customer: 'Lia', channel: 'NextGen', type: 'Pickup', status: 'preparing', time: '14:37' },
  ].map(order => ({ ...order, location: order.brand }));

  const locations = ["Barbarello Pizza", 'Chirpy Nest', 'MK Drinks', 'Guild Kitchen - Pilot', 'Drake Bowl', 'El Compa', 'Hello Maki', 'Mang Lau Shan', "Mindy's", 'Jade Castle', 'Thai Away Moon', 'Leaves Organic Coffee'];
  const channels = { 'Uber Eats': 'uber-eats.png', Fantuan: 'fantuan.png', NextGen: 'nextgen.png', DoorDash: 'doordash.png' };

  // Channel and type assignments are demo fixtures inferred from visible logos, not backend data.
  function filterOrders(items, filters) {
    return items.filter(order => ['channel', 'brand', 'type'].every(key => filters[key].length === 0 || filters[key].includes(order[key])) && filters.location.includes(order.location));
  }

  // Fictionalized management-tab observation; no production actions were performed.
  const managedOrders = [
    {
      "id": "9EF895ED",
      "courier": "FARIS",
      "brand": "Mindy's",
      "customer": "Malik D.",
      "status": "ready",
      "channel": "Uber Eats",
      "type": "Delivery",
      "location": "Mindy's"
    },
    {
      "id": "6594AC42",
      "courier": "RAMI",
      "brand": "Mindy's",
      "customer": "Carter F.",
      "status": "ready",
      "channel": "Uber Eats",
      "type": "Delivery",
      "location": "Mindy's"
    },
    {
      "id": "423372B6",
      "courier": "ADIL",
      "brand": "Mindy's",
      "customer": "Dominic R.",
      "status": "ready",
      "channel": "Uber Eats",
      "type": "Delivery",
      "location": "Mindy's"
    },
    {
      "id": "26506B7C",
      "courier": "Minho",
      "brand": "Jade Castle",
      "customer": "Kevin B",
      "time": "00:31",
      "status": "ready",
      "channel": "DoorDash",
      "type": "Delivery",
      "location": "Jade Castle"
    },
    {
      "id": "5A121C36",
      "courier": "-",
      "brand": "Saucy Staples",
      "customer": "Kelvin A.",
      "time": "10:12",
      "status": "ready",
      "channel": "Uber Eats",
      "type": "Delivery",
      "location": "Guild Kitchen - Pilot"
    },
    {
      "id": "4716856A",
      "courier": "-",
      "brand": "Indie Co",
      "customer": "Waleed",
      "time": "11:12",
      "status": "ready",
      "channel": "NextGen",
      "type": "Pickup",
      "location": "Guild Kitchen - Pilot"
    },
    {
      "id": "F7F39CCB",
      "courier": "-",
      "brand": "Mang Lau Shan",
      "customer": "Jean-Felix D",
      "time": "05:15",
      "status": "preparing",
      "channel": "DoorDash",
      "type": "Delivery",
      "location": "Mang Lau Shan"
    },
    {
      "id": "991D0363",
      "courier": "JASVEER",
      "brand": "Top Chop Dim Sum Express",
      "customer": "Flora S.",
      "time": "07:40",
      "status": "preparing",
      "channel": "Uber Eats",
      "type": "Delivery",
      "location": "Guild Kitchen - Pilot"
    },
    {
      "id": "FB1EBA83",
      "courier": "-",
      "brand": "Mang Lau Shan",
      "customer": "Alicia",
      "time": "07:25",
      "status": "preparing",
      "channel": "NextGen",
      "type": "Pickup",
      "location": "Mang Lau Shan"
    },
    {
      "id": "22B8EA99",
      "courier": "-",
      "brand": "Mindy's",
      "customer": "Adrian K.",
      "time": "11:14",
      "status": "preparing",
      "channel": "Uber Eats",
      "type": "Delivery",
      "location": "Mindy's"
    },
    {
      "id": "774339F5",
      "courier": "-",
      "brand": "Mindy's",
      "customer": "Tristan G.",
      "time": "12:12",
      "status": "preparing",
      "channel": "Uber Eats",
      "type": "Delivery",
      "location": "Mindy's"
    },
    {
      "id": "6329E6CF",
      "courier": "-",
      "brand": "Hello Maki",
      "customer": "Elias Y",
      "time": "19:06",
      "status": "preparing",
      "channel": "DoorDash",
      "type": "Delivery",
      "location": "Hello Maki"
    }
  ];

  function searchOrders(items, query) {
    const term = query.trim().toLowerCase();
    return items.filter(order => [`#${order.id}`, order.courier, order.channel, order.customer].some(value => value.toLowerCase().includes(term)));
  }

  function setOrderStatus(items, id, status) {
    return items.map(order => order.id === id ? { ...order, status } : order);
  }

  globalThis.DeliverectModel = { orders, locations, channels, filterOrders, managedOrders, searchOrders, setOrderStatus };
})();
