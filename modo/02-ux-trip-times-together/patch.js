// Trip times together. The mock scatters the trip's times over the Vehicle Information page: strip, "View Full Availability", BOOK, three rows, Change Time, the Earliest/Latest box.
// The patch builds one block under the car identity and MOVES the mock's own nodes into it, so the mock keeps writing to them (render() sets the rows' text, the box's text and hidden).
// It only reads those writes (MutationObserver) and rewrites the derived line; it never duplicates the mock's logic. Editing re-uses the mock's own time sheet by clicking its header buttons.
//
// Structure (later redlines hook in here: 03 drags on .trip-strip, 04 adds a day view beside it):
//   section.trip[.empty]            .empty = no time set
//     div.trip-strip               the mock's [data-strip], unchanged
//     div.trip-rows                .trip-row[data-edit=start|end] x (Pick up at, Return by, Return); Return replaces Return by in an open return
//     p.trip-free                  "Free today 12:00 PM – Thu 8:30 AM", from the mock's .avail (hidden when the car is not free)
//     div.trip-more                the mock's View Full Availability button, last row
// BOOK VEHICLE, its note and Membership follow the block. The Change Time row and the grey box stay in the DOM but are hidden (patch.css).
(() => {
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const CHEVRON = '<svg class="trip-go" width="10" height="16" viewBox="0 0 10 16" aria-hidden="true"><path d="m2 2 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

  // "12 Oct 2026 at 12:00 PM→" (the mock's box text) to { date, time }.
  function parse(text) {
    const m = /^(\d+) (\w{3}) (\d{4}) at (\d+:\d+ [AP]M)/.exec(text);
    return m && { date: new Date(+m[3], MON.indexOf(m[2]), +m[1]), time: m[4] };
  }
  function day(d) {
    const days = Math.round((d - new Date().setHours(0, 0, 0, 0)) / 864e5);
    return days === 0 ? 'today' : days === 1 ? 'tomorrow' : days > 0 && days < 7 ? DAY[d.getDay()] : `${d.getDate()} ${MON[d.getMonth()]}`;
  }

  function apply({ root }) {
    const $ = q => root.querySelector(q);
    const strip = $('.page [data-strip]'), full = $('.page .full'), avail = $('.page .avail');
    const pickup = $('[data-pickup]').parentElement, retby = $('[data-retby]').parentElement, rtype = $('[data-rtype]').parentElement;
    const whens = root.querySelectorAll('.when');  // the header's Start/End buttons open the time sheet

    const trip = Object.assign(document.createElement('section'), { className: 'trip' });
    trip.setAttribute('aria-label', 'Trip times');
    trip.innerHTML = '<div class="trip-strip"></div><div class="trip-rows"></div><p class="trip-free" hidden></p><div class="trip-more"></div>';
    const [stripBox, rows, free, more] = trip.children;
    strip.replaceWith(trip);
    stripBox.append(strip);
    more.append(full);

    // Return Type folds into the rows: shown as "Return / Open Return" only for an open return (then there is no Return by row).
    rtype.querySelector('dt').textContent = 'Return';
    [[pickup, 'start'], [retby, 'end'], [rtype, 'start']].forEach(([row, which]) => {
      row.classList.add('trip-row');
      row.setAttribute('role', 'button'); row.tabIndex = 0;
      row.insertAdjacentHTML('beforeend', `<em>Set time</em>${CHEVRON}`);
      const edit = () => whens[which === 'end' ? 1 : 0].click();
      row.addEventListener('click', edit);
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); edit(); } });
      rows.append(row);
    });

    function sync() {
      trip.classList.toggle('empty', $('[data-pickup]').textContent === 'Please set a time');
      rtype.hidden = $('[data-rtype]').textContent !== 'Open Return';
      retby.classList.toggle('empty', $('[data-retby]').textContent === 'Please set a time');
      pickup.classList.toggle('empty', $('[data-pickup]').textContent === 'Please set a time');
      const a = !avail.hidden && parse($('[data-earliest]').textContent), b = parse($('[data-latest]').textContent);
      let text = '';
      if (a) {
        const from = `${day(a.date)} ${a.time}`;
        text = !b ? `Free from ${from}` : day(b.date) === day(a.date) ? `Free ${from} – ${b.time}` : `Free ${from} – ${day(b.date)} ${b.time}`;
      }
      free.textContent = text; free.hidden = !text;
      mo.takeRecords();  // our own writes are not the mock's
    }
    const mo = new MutationObserver(sync);
    for (const el of [rows, avail]) mo.observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    sync();  // a state opened with times (booked) was rendered before the patch ran
  }

  globalThis.redlinePatch = { apply };
})();
