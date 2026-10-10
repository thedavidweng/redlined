(() => {
  const { channels } = DeliverectModel;

  function renderManageOrders(board, orders, onStatusChange) {
    for (const [status, title] of [['ready', 'Ready for pickup'], ['preparing', 'Preparing']]) {
      const section = document.createElement('section');
      section.className = 'section';
      const heading = document.createElement('h2');
      heading.textContent = title;
      section.append(heading);
      const items = orders.filter(order => order.status === status);
      for (const order of items) {
        const row = document.createElement('article');
        row.className = 'manage-row';
        row.dataset.orderId = order.id;
        row.setAttribute('aria-label', `Order ${order.id}, ${order.brand}, ${title}`);
        for (const [asset, value, className] of [
          [channels[order.channel], `#${order.id}`, 'manage-id'],
          ['courier.svg', order.courier, 'manage-courier'],
          ['store.svg', order.brand, 'manage-brand'],
          ['customer.svg', order.customer, 'manage-customer'],
        ]) {
          const cell = document.createElement('div');
          cell.className = `manage-cell ${className}`;
          const icon = document.createElement('img');
          icon.src = `assets/${asset}`;
          icon.alt = className === 'manage-id' ? `${order.channel} logo` : '';
          const label = document.createElement('span');
          label.textContent = value;
          cell.append(icon, label);
          row.append(cell);
        }
        const timer = document.createElement('div');
        timer.className = 'manage-timer';
        if (order.time) timer.textContent = `in ${order.time}`;
        const action = document.createElement('div');
        action.className = 'manage-action';
        const button = document.createElement('button');
        button.className = 'action-button';
        button.textContent = status === 'ready' ? 'Picked up' : 'Ready for pickup';
        button.setAttribute('aria-label', `${button.textContent}, order ${order.id}`);
        button.addEventListener('click', () => onStatusChange(order.id, status === 'ready' ? 'pickedup' : 'ready'));
        action.append(button);
        row.append(timer, action);
        section.append(row);
      }
      if (!items.length) {
        const empty = document.createElement('p');
        empty.className = 'empty';
        empty.textContent = 'No orders';
        section.append(empty);
      }
      board.append(section);
    }
  }

  globalThis.DeliverectManage = { renderManageOrders };
})();
