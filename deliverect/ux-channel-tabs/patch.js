// One-tap channel tabs above the list. Couriers name their platform first, so staff filter by it.
(() => {
  const { reduce, EASE } = RedlineMotion;
  const { channels } = DeliverectModel;

  let selected = null; // null = all channels; survives re-renders

  function apply({ board, orders }) {
    const channelById = new Map(orders.map(order => [order.id, order.channel]));
    const present = Object.keys(channels).filter(channel => orders.some(order => order.channel === channel));
    if (!present.includes(selected)) selected = null;

    const bar = document.createElement('div');
    bar.className = 'p-channels';
    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', 'Channels');
    bar.innerHTML = '<i class="p-indicator"></i>' + [null, ...present].map(channel => {
      const count = channel ? orders.filter(order => order.channel === channel).length : orders.length;
      const logo = channel ? `<img src="assets/${channels[channel]}" alt="">` : '';
      return `<button class="p-channel" role="tab" data-channel="${channel ?? ''}">${logo}<span>${channel ?? 'All channels'}</span><small>${count}</small></button>`;
    }).join('');
    board.prepend(bar);

    for (const section of board.querySelectorAll('.section')) {
      if (section.querySelector('.manage-row') && !section.querySelector('.empty')) {
        const empty = Object.assign(document.createElement('p'), { className: 'empty', textContent: 'No orders' });
        section.append(empty);
      }
    }

    const indicator = bar.querySelector('.p-indicator');
    // The pill follows the selected tab. Re-place it whenever layout settles (fonts, frame size), never trust one measurement.
    const place = animate => {
      const tab = bar.querySelector('[aria-selected=true]');
      if (!tab) return;
      indicator.style.transition = animate && !reduce ? '' : 'none';
      indicator.style.width = `${tab.offsetWidth}px`;
      indicator.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`;
    };
    new ResizeObserver(() => place(false)).observe(bar);
    for (const tab of bar.querySelectorAll('.p-channel')) new ResizeObserver(() => place(false)).observe(tab);
    document.fonts.ready.then(() => place(false));
    const show = (channel, animate) => {
      selected = channel;
      const tab = bar.querySelector(`[data-channel="${channel ?? ''}"]`);
      for (const button of bar.querySelectorAll('.p-channel')) button.setAttribute('aria-selected', String(button === tab));
      place(animate);

      // FLIP: remember where things were, filter, then glide them from there.
      const moving = [...board.querySelectorAll('.section > *')].filter(el => !el.hidden);
      const before = new Map(moving.map(el => [el, el.getBoundingClientRect().top]));
      for (const row of board.querySelectorAll('.manage-row')) row.hidden = channel !== null && channelById.get(row.dataset.orderId) !== channel;
      for (const section of board.querySelectorAll('.section')) {
        const empty = section.querySelector('.empty');
        if (empty && section.querySelector('.manage-row')) empty.hidden = !!section.querySelector('.manage-row:not([hidden])');
      }
      if (!animate || reduce) return;
      for (const el of board.querySelectorAll('.section > *:not([hidden])')) {
        const top = before.get(el);
        if (top === undefined) el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE });
        else if (top !== el.getBoundingClientRect().top) el.animate([{ transform: `translateY(${top - el.getBoundingClientRect().top}px)` }, { transform: 'none' }], { duration: 420, easing: EASE });
      }
    };
    bar.addEventListener('click', event => {
      const tab = event.target.closest('.p-channel');
      if (tab) show(tab.dataset.channel || null, true);
    });
    show(selected, false);
  }

  globalThis.redlinePatch = { apply };
})();
