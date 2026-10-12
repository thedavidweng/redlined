// Shared iPhone frame. The page hands over its app root; the frame draws the status bar, the cutout (notch or
// Dynamic Island) and Home indicator, and gives the app the safe areas as CSS variables (--safe-top, --safe-bottom, --safe-left, --safe-right).
// The app must not draw its own. Classic script, no module, so it works from file://.
//   IosDevice.mount(appElement, { width: 390, height: 844, radius: 47.33, cutout: 'notch', safe: { top: 47, bottom: 34 } })  →  { mode, device }
//   cutout: 'notch' (iPhone X to 16e) or 'island' (default). safe defaults to the cutout's usual insets (47 / 59 top, 34 bottom).
//   ?cutout=none in the page URL hides the cutout (the status bar stays): calibration only, because iOS screenshots never show the notch.
//   IosDevice.scale()  →  how much desktop mode shrinks the phone (1 elsewhere), so a map can render at the size it is shown
//   IosDevice.credit(html)  →  data credits (map tiles) shown outside the app, never inside it: the page corner on
//   desktop, the stage corner in the stage (and so in the clip), a brief fade-out on a phone where there is no outside.
// Modes: 'stage' (inside an iframe, as in _tools/stage.html: exact device size, no shell), 'fullscreen' (narrow
// viewport such as a phone browser: fills the screen, real status bar and env(safe-area-inset-*)), 'desktop' (phone
// window centred in the page, scaled down to fit).
globalThis.IosDevice = (() => {
  const svg = (w, h, body) => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${body}</svg>`;
  const ICONS = [
    svg(18, 12, '<rect x="0" y="7.5" width="3" height="4.5" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/>'),
    svg(17, 12, '<path d="M8.5 2.3c2.3 0 4.4.9 6 2.4l1-1.1A10.4 10.4 0 0 0 8.5.8C5.7.8 3.2 1.9 1.3 3.6l1 1.1a8.9 8.9 0 0 1 6.2-2.4zm0 3.7c1.3 0 2.5.5 3.4 1.3l1-1.1a7.2 7.2 0 0 0-8.8 0l1 1.1c.9-.8 2.1-1.3 3.4-1.3zm0 3.6c-.6 0-1.2.2-1.6.6L8.5 12l1.6-1.8c-.4-.4-1-.6-1.6-.6z"/>'),
    svg(27, 13, '<rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.5"/><path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2z" opacity=".5"/>'),
  ];

  function el(tag, className, html) {
    const node = document.createElement(tag);
    node.className = className;
    if (html) node.innerHTML = html;
    return node;
  }

  function mount(app, { width = 393, height = 852, radius = 55, cutout = 'island', safe = {} } = {}) {
    const mode = window.top !== window ? 'stage' : matchMedia('(max-width: 500px)').matches ? 'fullscreen' : 'desktop';
    document.documentElement.classList.add('ios');
    document.body.classList.add(`ios-${mode}`);
    const device = el('div', 'ios-device');
    const top = safe.top ?? (cutout === 'notch' ? 47 : 59), bottom = safe.bottom ?? 34;
    device.classList.add(`cutout-${cutout}`);
    if (new URLSearchParams(location.search).get('cutout') === 'none') device.classList.add('no-cutout');
    device.style.cssText = `--ios-w:${width}px;--ios-h:${height}px;--ios-radius:${radius}px;--ios-safe-top:${top}px;--ios-safe-bottom:${bottom}px`;
    const screen = el('div', 'ios-screen');
    app.classList.add('ios-app');
    app.replaceWith(device);
    screen.append(app,
      el('div', 'ios-status', `<span class="time">9:41</span><span class="cutout"></span><span class="icons">${ICONS.join('')}</span>`),
      el('div', 'ios-home'));
    device.append(screen);
    if (mode === 'desktop') {
      const fit = () => device.style.setProperty('--ios-scale', scale = Math.min(1, (innerHeight - 56) / height, (innerWidth - 56) / width));
      addEventListener('resize', fit);
      fit();
    }
    current = mode;
    return { mode, device };
  }

  let current = null, scale = 1;
  function credit(html) {
    if (current === 'stage') { try { parent.stage?.credit?.(html); } catch {} return; }  // cross-origin parent: nothing to do
    const note = el('div', 'ios-credit', html);
    document.body.append(note);
    if (current === 'fullscreen') setTimeout(() => note.classList.add('gone'), 5000);
  }

  return { mount, credit, scale: () => scale };
})();
