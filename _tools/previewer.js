// Product page: runs the redline storyboard live in _tools/stage.html (an iframe at 1920x1080, scaled to fit).
// Classic script so the page also works from file://. List: <product>/_shared/redlines.js (REDLINED). Deep link: #<folder>.
// Talks to the stage with postMessage only: { redlined: 'play', redline } and { redlined: 'stop' }.
(() => {
  const { product, label, redlines } = REDLINED;
  const $ = selector => document.querySelector(selector);
  const [name, ...rest] = label.split(' · ');
  $('#product').innerHTML = `<b>${name}</b>${rest.map(part => ` ${part}`).join('')}`;

  const seg = $('#seg'), screen = $('#screen'), stage = $('#stage'), empty = $('#empty');
  for (const { folder, n } of redlines) {
    const b = document.createElement('button');
    b.textContent = `${n}: ${folder}`;
    b.dataset.folder = folder;
    b.addEventListener('click', () => go(folder));
    seg.append(b);
  }

  // The stage is 1920x1080 and scaled down to the player box.
  const fit = () => { stage.style.transform = `scale(${screen.clientWidth / 1920})`; };
  new ResizeObserver(fit).observe(screen);
  fit();

  let current, loaded = false, visible = true;
  const send = msg => stage.contentWindow?.postMessage(msg, '*');
  // Plays when the page is on screen; stops (and replays from the start later) when it is not. Automatic calls skip a repeat of the same state; Replay forces.
  let sent = '';
  function play(force) {
    if (!current || !loaded) return;  // the load handler plays
    const on = visible && !document.hidden, key = on ? current : '';
    if (!force && key === sent) return;
    sent = key;
    send(on ? { redlined: 'play', redline: current } : { redlined: 'stop' });
  }
  stage.addEventListener('load', () => { loaded = true; play(); });
  stage.src = `../_tools/stage.html?product=${product}`;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; play(); }).observe(screen);
  document.addEventListener('visibilitychange', play);

  function go(folder) {
    const entry = redlines.find(r => r.folder === folder) ?? redlines[0];
    current = entry.folder;
    if (location.hash !== `#${entry.folder}`) history.replaceState(null, '', `#${entry.folder}`);
    document.title = `${entry.n}: ${entry.title} · Redlined · ${REDLINED.name}`;
    $('#n').textContent = `NO. ${String(entry.n).padStart(2, '0')}`;
    $('#title').textContent = entry.title;
    $('#caption').textContent = entry.caption;
    $('#live').href = `mock/index.html?redline=${entry.folder}`;
    $('#original').href = `mock/index.html?redline=${entry.folder}&side=before`;
    for (const b of seg.children) b.setAttribute('aria-pressed', String(b.dataset.folder === entry.folder));
    seg.querySelector('[aria-pressed="true"]').scrollIntoView({ block: 'nearest', inline: 'center' });
    play();
  }
  const step = n => redlines.length && go(redlines[(redlines.findIndex(r => r.folder === current) + n + redlines.length) % redlines.length].folder);
  $('#prev').addEventListener('click', () => step(-1));
  $('#next').addEventListener('click', () => step(1));
  $('#replay-btn').addEventListener('click', () => play(true));
  document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') step(-1);
    if (event.key === 'ArrowRight') step(1);
    if (event.key === 'r' && !event.metaKey && !event.ctrlKey) play(true);
  });
  addEventListener('hashchange', () => location.hash.slice(1) !== current && go(location.hash.slice(1)));

  // No redlines yet: the page still opens, and "Try it live" opens the plain mock.
  function showNone() {
    $('#title').textContent = 'No redlines yet';
    $('#caption').textContent = 'The mock is not calibrated against the real app yet. You can still try the map.';
    $('#live').href = 'mock/index.html';
    for (const id of ['#n', '#original', '#replay-btn', 'nav']) $(id).style.display = 'none';
    stage.remove();
    empty.textContent = 'No redlines yet.';
    empty.hidden = false;
  }
  if (redlines.length) go(location.hash.slice(1));
  else showNone();
})();
