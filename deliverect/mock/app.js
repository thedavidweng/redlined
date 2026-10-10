// Classic scripts, not ES modules, so the mock also runs when opened straight from disk (file://).
(async () => {
  const { orders, managedOrders, locations, channels, filterOrders, searchOrders, setOrderStatus } = DeliverectModel;
  const { renderManageOrders } = DeliverectManage;

  // REDLINE SEAM (inert without ?redline=): ?redline=<folder>&side=before|after (default after) renders the Manage tab
  // with the shared scenario orders; side=after also applies <folder>/patch.js + patch.css. See README.md.
  const query = new URLSearchParams(location.search);
  const redline = /^[a-z0-9-]+$/.test(query.get('redline') ?? '') ? query.get('redline') : null;
  const after = redline && query.get('side') !== 'before';
  const loadScript = src => new Promise((resolve, reject) => document.head.append(Object.assign(document.createElement('script'), { src, onload: resolve, onerror: reject })));
  if (redline) for (const src of ['../_shared/fixtures.js', '../_shared/motion.js', ...(after ? [`../${redline}/patch.js`] : [])]) await loadScript(src);
  const [fixtures, motion, patch] = redline ? [RedlineFixtures, RedlineMotion, after ? redlinePatch : null] : [];
  if (patch) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `../${redline}/patch.css` }));

  let pickupItems = orders;
  let manageItems = redline ? fixtures.redlineOrders : managedOrders;
  let activeView = redline || query.get('view') === 'manage' ? 'manage' : 'pickup';
  const orderSearch = document.querySelector('#order-search');

  const filters = { channel: [], brand: [], type: [], location: [...locations] };
  const settings = { queue: false, preparing: true, timer: true, tracker: false };
  const board = document.querySelector('#board');
  const dialog = document.querySelector('#settings-dialog');
  const definitions = [
    { key: 'channel', placeholder: 'Filter on channels', options: Object.keys(channels) },
    { key: 'brand', placeholder: 'Filter on brands', options: [...new Set([...orders, ...managedOrders].map(order => order.brand))].sort() },
    { key: 'type', placeholder: 'Filter by types', options: ['Curbside pickup', 'Delivery', 'Eat-in', 'Pickup'] },
    { key: 'location', placeholder: 'Filter on locations', options: locations },
  ];

  function renderBoard() {
    board.replaceChildren();
    board.classList.toggle('manage-board', activeView === 'manage');
    if (activeView === 'manage') {
      document.querySelector('#tracker').hidden = true;
      const onStatusChange = (id, status) => {
        manageItems = setOrderStatus(manageItems, id, status);
        pickupItems = setOrderStatus(pickupItems, id, status);
        renderBoard();
      };
      const visibleManaged = searchOrders(filterOrders(manageItems, filters), orderSearch.value);
      renderManageOrders(board, visibleManaged, onStatusChange);
      if (redline) {
        const entering = motion.afterRender(board);
        patch?.apply({ board, orders: visibleManaged, onStatusChange, entering });
      }
      return;
    }
    const visible = filterOrders(pickupItems, filters);
    for (const [status, title] of [['ready', 'Ready for pickup'], ['preparing', 'Preparing'], ['queue', 'In the queue']]) {
      if (status === 'preparing' && !settings.preparing || status === 'queue' && !settings.queue) continue;
      const section = document.createElement('section');
      section.className = 'section';
      const heading = document.createElement('h2');
      heading.textContent = title;
      const cards = document.createElement('div');
      cards.className = 'cards';
      for (const order of visible.filter(order => order.status === status)) {
        const card = document.createElement('article');
        card.className = 'card';
        card.dataset.orderId = order.id;
        card.setAttribute('aria-label', `Order ${order.id}, ${order.brand}, ${title}`);
        for (const [asset, text, className] of [
          [channels[order.channel], `#${order.id}`, 'order-id'],
          ['store.svg', order.brand, 'detail'],
          ['courier.svg', order.courier, 'detail'],
          ['customer.svg', order.customer, 'detail'],
        ]) {
          const row = document.createElement('div');
          row.className = `card-row ${className === 'detail' ? 'detail' : ''}`;
          const icon = document.createElement('img');
          icon.src = `assets/${asset}`;
          icon.alt = className === 'order-id' ? `${order.channel} logo` : '';
          const label = document.createElement('span');
          label.className = className;
          label.textContent = text;
          row.append(icon, label);
          card.append(row);
        }
        if (order.status === 'ready') {
          const corner = document.createElement('div');
          corner.className = 'ribbon-corner';
          const ribbon = document.createElement('span');
          ribbon.className = 'ribbon-text';
          ribbon.textContent = 'Ready';
          card.append(corner, ribbon);
        } else if (settings.timer) {
          const timer = document.createElement('span');
          timer.className = 'timer';
          timer.textContent = `in ${order.time}`;
          card.append(timer);
        }
        cards.append(card);
      }
      if (!cards.children.length) {
        const empty = document.createElement('p');
        empty.className = 'empty';
        empty.textContent = 'No orders';
        cards.append(empty);
      }
      section.append(heading, cards);
      board.append(section);
    }
    document.querySelector('#tracker').hidden = !settings.tracker;
  }

  function closeDropdowns() {
    for (const dropdown of document.querySelectorAll('.dropdown')) dropdown.hidden = true;
    for (const trigger of document.querySelectorAll('.filter-trigger')) trigger.setAttribute('aria-expanded', 'false');
  }

  for (const { key, placeholder, options } of definitions) {
    const filter = document.createElement('div');
    filter.className = 'filter';
    filter.innerHTML = `<button class="filter-trigger" aria-label="${placeholder}" aria-expanded="false" aria-controls="filter-${key}"><span></span><i class="chevron" aria-hidden="true"></i></button><div class="dropdown" id="filter-${key}" hidden><input type="search" aria-label="Search ${key}" placeholder="Search…"><div class="options"></div></div>`;
    const trigger = filter.querySelector('.filter-trigger');
    const dropdown = filter.querySelector('.dropdown');
    const search = filter.querySelector('input');
    const optionsElement = filter.querySelector('.options');
    function updateLabel() {
      trigger.querySelector('span').textContent = filters[key].length ? `${filters[key].length} selected` : placeholder;
      trigger.classList.toggle('has-selection', filters[key].length > 0);
    }
    function renderOptions() {
      optionsElement.replaceChildren();
      for (const option of options.filter(option => option.toLowerCase().includes(search.value.toLowerCase()))) {
        const label = document.createElement('label');
        label.className = 'option';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = filters[key].includes(option);
        checkbox.addEventListener('change', () => {
          filters[key] = checkbox.checked ? [...filters[key], option] : filters[key].filter(value => value !== option);
          updateLabel();
          renderBoard();
        });
        label.append(checkbox, document.createTextNode(option));
        optionsElement.append(label);
      }
      if (!optionsElement.children.length) {
        const empty = document.createElement('div');
        empty.className = 'no-options';
        empty.textContent = 'No options';
        optionsElement.append(empty);
      }
    }
    trigger.addEventListener('click', () => {
      const wasOpen = !dropdown.hidden;
      closeDropdowns();
      dropdown.hidden = wasOpen;
      trigger.setAttribute('aria-expanded', String(!wasOpen));
      if (!wasOpen) search.focus();
    });
    // A separate button keeps keyboard access to clearing a selection.
    if (key === 'location') {
      const clear = document.createElement('button');
      clear.className = 'clear-location';
      clear.textContent = '×';
      clear.setAttribute('aria-label', 'Clear locations');
      clear.addEventListener('click', () => {
        filters.location = [];
        renderOptions();
        updateLabel();
        renderBoard();
      });
      filter.append(clear);
    }
    search.addEventListener('input', renderOptions);
    updateLabel();
    renderOptions();
    document.querySelector('#filters').append(filter);
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('.filter')) closeDropdowns();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDropdowns();
  });

  const settingDefinitions = [
    ['queue', "Show 'In the queue' section", 'When activated, third section will be shown and received/accepted orders will be under that section'],
    ['preparing', "Show 'Preparing' section", "When activated, 'Preparing' section will be shown in 'Pickup screen' tab"],
    ['checkin', 'Customer self check-in', 'When enabled, customers scanning the store QR code see only their own order after entering their order number on the branded check-in page'],
    ['timer', 'Show timer'],
    ['tracker', 'Show the order tracker link in the footer'],
  ];
  for (const [key, title, description] of settingDefinitions) {
    const group = document.createElement('div');
    group.className = 'setting-group';
    const row = document.createElement('div');
    row.className = 'setting-row';
    const label = document.createElement('span');
    label.textContent = title;
    const toggle = document.createElement('button');
    toggle.className = 'switch';
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-label', title);
    toggle.setAttribute('aria-checked', String(Boolean(settings[key])));
    if (key === 'checkin') {
      toggle.disabled = true;
      toggle.title = 'Customer check-in requires a backend and is outside this screen mock';
    } else {
      toggle.addEventListener('click', () => {
        settings[key] = !settings[key];
        toggle.setAttribute('aria-checked', String(settings[key]));
        renderBoard();
      });
    }
    row.append(label, toggle);
    group.append(row);
    if (description) {
      const text = document.createElement('p');
      text.className = 'setting-description';
      text.textContent = description;
      group.append(text);
    }
    document.querySelector('#settings-body').append(group);
  }
  document.querySelector('#settings').addEventListener('click', () => dialog.showModal());
  document.querySelector('#close-settings').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }
  });
  let fontSize = 16;
  document.querySelector('#zoom').addEventListener('click', () => {
    fontSize = fontSize === 24 ? 16 : fontSize + 4;
    document.documentElement.style.setProperty('--card-font', `${fontSize}px`);
  });
  document.querySelector('#fullscreen').addEventListener('click', async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.querySelector('#pickup-screen').requestFullscreen();
  });
  function selectView(view) {
    activeView = view;
    closeDropdowns();
    for (const tab of document.querySelectorAll('[data-view]')) {
      const selected = tab.dataset.view === view;
      tab.classList.toggle('selected', selected);
      if (selected) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    }
    document.querySelector('.tools').hidden = view === 'manage';
    document.querySelector('.manage-tools').hidden = view !== 'manage';
    const url = new URL(location.href);
    if (view === 'manage') url.searchParams.set('view', 'manage');
    else url.searchParams.delete('view');
    history.replaceState(null, '', url);
    renderBoard();
    board.scrollTop = 0;
  }
  for (const tab of document.querySelectorAll('[data-view]')) tab.addEventListener('click', () => selectView(tab.dataset.view));
  orderSearch.addEventListener('input', renderBoard);
  const qrDialog = document.querySelector('#qr-dialog');
  document.querySelector('#qr-scanning').addEventListener('click', () => qrDialog.showModal());
  document.querySelector('#close-qr').addEventListener('click', () => qrDialog.close());
  selectView(activeView);
})();
