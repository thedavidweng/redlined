// Plays a redline's storyboard (<redline>/clip.js) inside the mock, for _tools/stage.html. Included by every mock
// page after the app script: <script src="../../_tools/play.js"></script>. Inert unless the mock URL has ?play=still|live
// (the stage adds it, together with ?redline=<folder>&side=before|after). Classic script, works from file://.
//
// Why inside the mock: from file:// every file is its own origin, so the stage cannot reach into an iframe. Everything
// crosses the frame boundary as postMessage({ redlined: <type>, ... }, '*'):
//   mock -> stage   ready          loaded and settled (play=live)
//                   frozen         frozen and ready to be shown as a still (play=still, or after 'freeze')
//                   done           the storyboard for this side has finished
//                   finger {x,y,on}, press {down}, ring {rect,tone}, receipt {html}, credit {html}   what the stage draws
//   stage -> mock   run {from:[x,y], exit:[x,y]|null}    play clip[side](d); from = the finger, in this mock's viewport px
//                   freeze                              swap the maps for pictures, stop animations
// play=still freezes as soon as it is ready; play=live waits for 'run'. Only one mock is live at a time.
//
// clip.js sets globalThis.redlineClip = { query?, ready?(side), before(d), after(d) }; see _tools/README.md.
// `d` is the Director below. All coordinates are CSS px in the mock's own viewport. Input is synthetic: pointer and
// mouse events at the finger, with .rl-active / .rl-hover twins of :active / :hover (rules read from document.styleSheets;
// Chrome refuses cssRules of linked files under file://, so there the press and hover looks are not shown).
(() => {
  const params = new URLSearchParams(location.search);
  const mode = params.get('play'), redline = params.get('redline');
  if ((mode !== 'still' && mode !== 'live') || window.parent === window) return;
  const side = params.get('side') === 'before' ? 'before' : 'after';
  const post = (type, data) => parent.postMessage({ redlined: type, ...data }, '*');
  const sleep = s => new Promise(resolve => setTimeout(resolve, s * 1000));

  // ---- input -------------------------------------------------------------------------------------------------
  let capture = null;  // element that called setPointerCapture on our pointer (id 1): it keeps receiving events until the release
  const { setPointerCapture, releasePointerCapture } = Element.prototype;
  Element.prototype.setPointerCapture = function (id) { try { setPointerCapture.call(this, id); } catch {} if (id === 1) capture = this; };  // synthetic ids are no active pointers: the real call throws
  Element.prototype.releasePointerCapture = function (id) { try { releasePointerCapture.call(this, id); } catch {} if (capture === this) capture = null; };

  const chain = el => { const out = []; for (; el; el = el.parentElement) out.push(el); return out; };
  const toggle = (cls, from, to) => {
    for (const el of from) if (!to.includes(el)) el.classList.remove(cls);
    for (const el of to) el.classList.add(cls);
    return to;
  };

  // :active and :hover cannot be set by script. Give every such rule a twin on .rl-active / .rl-hover.
  function addTwins(rules, owner) {
    for (let i = rules.length - 1; i >= 0; i--) {
      const rule = rules[i];
      if (rule.selectorText) {
        if (!/:(active|hover)\b/.test(rule.selectorText)) continue;
        const selector = rule.selectorText.replace(/:active\b/g, '.rl-active').replace(/:hover\b/g, '.rl-hover');
        try { owner.insertRule(`${selector} { ${rule.style.cssText} }`, i + 1); } catch {}
      } else if (rule.cssRules) addTwins(rule.cssRules, rule);  // @media, @supports, @layer
    }
  }
  function twinStyles() {
    for (const sheet of document.styleSheets) { try { addTwins(sheet.cssRules, sheet); } catch {} }
  }

  function director(from, exit) {
    let x = from[0], y = from[1], on = false, down = null, active = [], hover = [], ringFrame = 0;
    const inside = (px, py) => px >= 0 && py >= 0 && px < innerWidth && py < innerHeight;
    const hit = () => capture?.isConnected ? capture : document.elementFromPoint(x, y);
    const fire = (target, type, button, buttons) => {
      if (!target) return true;  // nothing under the finger (page tearing down)
      const init = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, screenX: x, screenY: y, view: window, button, buttons };
      return target.dispatchEvent(type.startsWith('pointer')
        ? new PointerEvent(type, { ...init, pointerId: 1, pointerType: 'mouse', isPrimary: true, width: 1, height: 1, pressure: buttons ? .5 : 0 })
        : new MouseEvent(type, { ...init, detail: type === 'click' ? 1 : 0 }));
    };
    const find = (selector, text) => {
      const norm = s => s.replace(/\s+/g, ' ').toLowerCase();  // like Playwright's has-text: case-insensitive, whitespace-normalised
      return [...document.querySelectorAll(selector)].find(el => !text || norm(el.textContent).includes(norm(text))) ?? null;
    };
    const until = async (fn, limit = 10) => {
      for (let t = 0; t < limit * 20; t++) { const value = fn(); if (value) return value; await sleep(.05); }
      throw new Error(`d.until: timed out: ${fn}`);
    };
    const moved = (cx, cy, show) => {
      x = cx; y = cy; on = show;
      post('finger', { x, y, on });
      if (!inside(x, y)) { hover = toggle('rl-hover', hover, []); return; }
      const target = hit();
      hover = toggle('rl-hover', hover, chain(target));
      fire(target, 'pointermove', -1, down ? 1 : 0);
      fire(target, 'mousemove', 0, down ? 1 : 0);
    };

    const d = {
      get x() { return x; },
      get y() { return y; },
      wait: sleep,
      until,
      find,
      async box(target, text) {  // waits for the element to exist, like Playwright did
        return (typeof target === 'string' ? await until(() => find(target, text)) : target).getBoundingClientRect();
      },
      center(target, dx = 0) {
        const r = target instanceof Element ? target.getBoundingClientRect() : target;
        return [r.left + r.width / 2 + dx, r.top + r.height / 2];
      },
      glide(tx, ty, dur = .7, show = true) {  // time-based, so a slow frame can't stretch the motion
        const x0 = x, y0 = y, t0 = performance.now();
        return new Promise(resolve => {
          const step = () => {
            const t = Math.min(1, Math.max(0, (performance.now() - t0) / (dur * 1000)));
            const e = t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;  // ease-in-out cubic
            moved(x0 + (tx - x0) * e, y0 + (ty - y0) * e, show);
            if (t < 1) requestAnimationFrame(step);
            else resolve();
          };
          requestAnimationFrame(step);
        });
      },
      down() {
        post('press', { down: true });
        if (!inside(x, y)) { down = { target: null }; return; }
        const target = hit();
        down = { target };
        active = toggle('rl-active', active, chain(target));
        if (fire(target, 'pointerdown', 0, 1)) fire(target, 'mousedown', 0, 1);
      },
      up() {
        const start = down?.target;
        down = null;
        post('press', { down: false });
        active = toggle('rl-active', active, []);
        if (!start || !inside(x, y)) { capture = null; return; }
        const target = hit();
        capture = null;
        fire(target, 'pointerup', 0, 0);
        fire(target, 'mouseup', 0, 0);
        const common = chain(start).find(el => el.contains(target));
        if (common) fire(common, 'click', 0, 0);
      },
      async tap(hold = .09) { d.down(); await sleep(hold); d.up(); },
      async drag(x0, y0, x1, y1, dur = .6) {  // press at (x0, y0), pull to (x1, y1), release
        await d.glide(x0, y0, .5);
        d.down();
        await d.glide(x1, y1, dur);
        d.up();
      },
      lift() { on = false; post('finger', { x, y, on }); },  // the finger leaves the glass so what it did stays visible
      ring(selector, tone) {  // outline drawn by the stage around an element, following it each frame; tone 'hl' | 'bad' | 'good'; null removes
        cancelAnimationFrame(ringFrame);
        if (!selector || !tone) { post('ring', { rect: null }); return; }
        const place = () => {
          const el = typeof selector === 'string' ? find(selector) : selector;
          if (el) { const { left, top, width, height } = el.getBoundingClientRect(); post('ring', { rect: { left, top, width, height }, tone }); }
          ringFrame = requestAnimationFrame(place);
        };
        place();
      },
      receipt(html) { post('receipt', { html: html || null }); },  // paper slip over the corner of the window; null hides it
      scroll(target, { top, left }, ms) {  // eased, like a finger flick (a mouse drag does not scroll a div)
        const el = typeof target === 'string' ? find(target) : target, t0 = performance.now(), from = [el.scrollTop, el.scrollLeft];
        return new Promise(resolve => {
          const step = () => {
            const t = Math.min(1, (performance.now() - t0) / ms), e = 1 - (1 - t) ** 3;
            if (top !== undefined) el.scrollTop = from[0] + (top - from[0]) * e;
            if (left !== undefined) el.scrollLeft = from[1] + (left - from[1]) * e;
            if (t < 1) requestAnimationFrame(step);
            else resolve();
          };
          requestAnimationFrame(step);
        });
      },
      exit: () => d.glide(x, exit[1], .6, false),  // After only: the finger leaves towards the bottom of the stage
      end() { cancelAnimationFrame(ringFrame); post('ring', { rect: null }); },
    };
    return d;
  }

  // ---- readiness ---------------------------------------------------------------------------------------------
  let clip = null;
  const clipLoaded = new Promise(resolve => {
    if (!/^[a-z0-9-]+$/.test(redline ?? '')) return resolve();
    document.head.append(Object.assign(document.createElement('script'), {
      src: `../${redline}/clip.js`, onload: () => resolve((clip = globalThis.redlineClip ?? null)), onerror: () => resolve() }));  // no clip.js: nothing to animate
  });
  const retried = new WeakSet();
  function settled() {
    if (![...document.querySelectorAll('link[rel=stylesheet]')].every(link => link.sheet)) return false;
    let images = true;
    for (const img of document.images) {  // retry once an image that failed under the burst of parallel requests
      if (!img.complete) images = false;
      else if (!img.naturalWidth && img.src && !retried.has(img)) { retried.add(img); img.src = `${img.src.split('?')[0]}?r=${Date.now()}`; images = false; }
    }
    const idle = document.getAnimations().every(a => a.effect?.getComputedTiming().iterations === Infinity || a.playState !== 'running');
    const maps = (globalThis.IosMapPerf?.maps ?? []).every(map => map.loaded() && !map.isMoving());
    let own = true;
    try { own = clip?.ready?.(side) ?? true; } catch { own = false; }
    return images && idle && maps && Boolean(own);
  }
  async function whenReady() {
    await clipLoaded;
    if (document.readyState !== 'complete') await new Promise(resolve => addEventListener('load', resolve, { once: true }));
    await document.fonts.ready;
    const t0 = performance.now();
    while (!settled() && performance.now() - t0 < 20000) await sleep(.2);
    if (performance.now() - t0 >= 20000) console.warn('play.js: gave up waiting for the mock to settle');
    await sleep(.5);
  }

  // ---- freeze ------------------------------------------------------------------------------------------------
  // Each map is replaced by a picture of its last frame and its WebGL context released, so a frozen mock costs nothing.
  async function freeze() {
    await Promise.all((globalThis.IosMapPerf?.maps ?? []).map(async map => {
      const canvas = map.getCanvas();
      const url = await new Promise(resolve => {  // the drawing buffer is only readable inside the frame that drew it
        const timer = setTimeout(() => resolve(null), 2000);
        map.once('render', () => { clearTimeout(timer); resolve(canvas.toDataURL()); });
        map.triggerRepaint();
      });
      if (!url) return;
      const img = Object.assign(new Image(), { src: url });
      img.style.cssText = `position:absolute;left:0;top:0;width:${canvas.style.width};height:${canvas.style.height};pointer-events:none`;
      await img.decode();
      canvas.after(img);  // inside the canvas container, below the DOM markers
      (canvas.getContext('webgl2') ?? canvas.getContext('webgl'))?.getExtension('WEBGL_lose_context')?.loseContext();
    }));
    document.getAnimations().forEach(a => a.pause());
  }

  // ---- run ---------------------------------------------------------------------------------------------------
  addEventListener('message', async ({ source, data }) => {
    if (source !== parent || !data?.redlined) return;
    if (data.redlined === 'freeze') { await freeze(); post('frozen'); }
    if (data.redlined !== 'run') return;
    twinStyles();
    const d = director(data.from ?? [innerWidth / 2, innerHeight + 100], data.exit);
    try {
      if (clip?.[side]) await clip[side](d); else await sleep(1.5);  // no storyboard: hold the frame
      d.end();
      if (data.exit) await d.exit();
    } catch (error) {
      console.error(error);
    }
    post('done');
  });

  whenReady().then(async () => {
    if (mode === 'live') return post('ready');
    await freeze();
    post('frozen');
  });
})();
