import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
function clock(extra = {}) {
  let now = 0, id = 0;
  const pending = new Map();
  const context = vm.createContext({
    ...extra, performance: { now: () => now },
    requestAnimationFrame: fn => { pending.set(++id, fn); return id; },
    cancelAnimationFrame: id => pending.delete(id), setTimeout: () => 0, clearTimeout() {},
  });
  return { context, step(ms) { now += ms; const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(fn => fn(now)); }, pending };
}

export function sheetRun(source, intervals) {
  const events = {}, positions = [], commits = [];
  let writes = 0;
  const el = { style: { set transform(value) { positions.push(Number(value.match(/, ([^p]+)px/)[1])); writes++; } },
    classList: { add() {}, remove() {} }, addEventListener: (name, fn) => events[name] = fn, setPointerCapture() {} };
  const c = clock({ matchMedia: () => ({ matches: false }), ResizeObserver: class { observe() {} } });
  vm.runInContext(source, c.context);
  const sheet = c.context.IosSheet.create(el, { detents: { expanded: () => 0, collapsed: () => 400, hidden: () => 800 }, snaps: ['expanded', 'collapsed'] });
  sheet.snap('collapsed', false);
  events.pointerdown({ button: 0, pointerId: 1, clientX: 0, clientY: 400 });
  c.step(20);
  events.pointermove({ pointerId: 1, clientX: 0, clientY: 310 });
  c.step(20);
  events.pointermove({ pointerId: 1, clientX: 0, clientY: 250 });
  events.pointerup({ pointerId: 1 });
  const trajectory = [];
  for (let i = 0; c.pending.size && i < 1000; i++) {
    writes = 0; c.step(intervals[i % intervals.length]);
    commits.push(writes); trajectory.push(positions.at(-1));
  }
  assert.equal(c.pending.size, 0, 'spring must settle');
  assert.equal(sheet.state, 'expanded');
  assert.equal(positions.at(-1), 0);
  // A new snap cancels the old motion and must keep its exact endpoint.
  sheet.show('collapsed'); c.step(100); sheet.snap('expanded', false); c.step(100);
  assert.equal(c.pending.size, 0); assert.equal(positions.at(-1), 0);
  return { trajectory, commits };
}
for (const intervals of [[8.33], [16.67], [33.33], [64], [100], [8, 16, 33, 120]]) {
  const result = sheetRun(read('../_ios/sheet.js'), intervals);
  assert.ok(result.commits.every(n => n === 1), 'one spring DOM commit per animation frame');
}

// Scale changes must preserve camera motion and never use Map.resize(), which interrupts a drag.
const listeners = {}, mapEvents = {}, parent = { postMessage() {} }, window = {};
const c = clock({ devicePixelRatio: 3, IosDevice: { scale: () => 1 }, parent, window,
  addEventListener: (name, fn) => listeners[name] = fn });
vm.runInContext(read('../_ios/map-perf.js'), c.context);
let ratio = 3;
const map = { on: (name, fn) => (mapEvents[name] ??= []).push(fn), getPixelRatio: () => ratio,
  _resizeInternal: () => ratio = map._overridePixelRatio, triggerRepaint() {} };
c.context.IosMapPerf.attach(map);
const scale = (value, source = parent) => listeners.message({ source, data: { redlined: 'scale', scale: value } });
scale(.65); assert.ok(Math.abs(ratio - 1.95) < 1e-12);
const scaled = ratio;
for (const value of [0, -1, NaN, Infinity, '2']) { scale(value); assert.equal(ratio, scaled); }
scale(1, {}); assert.equal(ratio, scaled);
mapEvents.movestart.forEach(fn => fn({ originalEvent: {} }));
scale(.3); assert.ok(Math.abs(ratio - .9) < 1e-12);
scale(1); assert.equal(ratio, 2);
mapEvents.moveend.forEach(fn => fn()); scale(1); assert.equal(ratio, 3);
scale(.3); mapEvents.movestart.forEach(fn => fn({})); scale(1);
assert.equal(ratio, 2, 'enlarging a moving low-density map keeps the motion cap');
scale(.3); scale(1); c.step(16);
assert.equal(c.pending.size, 1, 'rapid resizes keep a single sampling loop');
scale(.3); c.step(16); assert.equal(c.pending.size, 0);
scale(1); assert.equal(ratio, 2);
assert.equal(c.pending.size, 1, 'enlarging restarts sampling after a low-density frame');

// The ring still follows changing geometry; only identical messages disappear.
const play = read('play.js'), messages = [];
let rect = { left: 10, top: 20, width: 100, height: 40 };
const target = { getBoundingClientRect: () => rect };
const r = clock({ sleep() {}, post: (type, data) => messages.push({ type, ...data }),
  document: { querySelectorAll: () => [target] }, innerWidth: 390, innerHeight: 844 });
vm.runInContext(`${play.slice(play.indexOf('  function director('), play.indexOf('  // ---- readiness'))}\nglobalThis.director = director;`, r.context);
const director = r.context.director([0, 0], [0, 844]);
director.ring(target, 'hl'); for (let i = 0; i < 60; i++) r.step(16.67);
assert.equal(messages.length, 1);
rect = { ...rect, top: 25 }; r.step(16.67); assert.equal(messages.length, 2);
director.ring(target, 'good'); assert.equal(messages.at(-1).tone, 'good');
director.ring(null, null); const count = messages.length; r.step(16.67);
assert.equal(messages.length, count); assert.equal(messages.at(-1).rect, null);
console.log('Performance regression checks passed: spring, map scale, ring tracking.');
