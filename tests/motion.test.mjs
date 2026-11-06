import test from 'node:test';
import assert from 'node:assert/strict';
import { SpatialBoard } from '../src/board.js';
import { Constellation } from '../src/constellation.js';

// Drive real animation methods with deterministic display timestamps. No sleeps.
function clock(t) {
  let now = 0, id = 0, reduced = false;
  const frames = new Map();
  for (const [target, key, value] of [
    [globalThis, 'requestAnimationFrame', fn => { frames.set(++id, fn); return id; }],
    [globalThis, 'cancelAnimationFrame', handle => frames.delete(handle)],
    [globalThis, 'matchMedia', () => ({ matches: reduced })],
    [performance, 'now', () => now],
  ]) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    Object.defineProperty(target, key, { configurable: true, value });
    t.after(() => descriptor ? Object.defineProperty(target, key, descriptor) : delete target[key]);
  }
  return {
    step(ms) { now += ms; const batch = [...frames.values()]; frames.clear(); for (const fn of batch) fn(now); },
    reduce() { reduced = true; }, pending: () => frames.size,
  };
}
function board() {
  return Object.assign(Object.create(SpatialBoard.prototype), {
    pan: { x: 0, y: 0 }, scale: 1, raf: 0,
    render() {}, viewportSize: () => ({ w: 800, h: 600 }),
    viewport: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
  });
}
function scene() {
  return Object.assign(Object.create(Constellation.prototype), {
    camera: { x: 0, y: 0, scale: 1 }, cameraAnimation: 0,
    width: 800, height: 600, hostScale: () => 1, applyCamera() {},
    viewport: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) },
  });
}
function wheel(excluded = false) {
  return { target: { closest: () => excluded }, deltaX: 17, deltaY: 120,
    preventDefault() {}, ctrlKey: false, metaKey: false };
}

test('background wheel pan owns the board after interrupting navigation', t => {
  const raf = clock(t), b = board();
  b.animate({ x: 500, y: 300, scale: 1.2 }, 520);
  raf.step(100);
  b.onWheel(wheel());
  const manual = { ...b.pan }, scale = b.scale;
  raf.step(1000);
  assert.deepEqual(b.pan, manual);
  assert.equal(b.scale, scale);
  assert.equal(raf.pending(), 0);
});

test('native inner scrolling does not steal an outer navigation flight', t => {
  const raf = clock(t), b = board();
  b.animate({ x: 500, y: 300, scale: 1.2 }, 520);
  raf.step(100); b.onWheel(wheel(true)); raf.step(600);
  assert.deepEqual(b.pan, { x: 500, y: 300 });
});

test('graph toolbar/keyboard zoom cancels focus flight and preserves its anchor', t => {
  const raf = clock(t), s = scene();
  s.animateCamera({ x: 500, y: 300, scale: 1.2 }, 500); raf.step(100);
  const anchor = s.screenToWorld(200, 150);
  s.zoomBy(1.35, 200, 150);
  const manual = s.getCamera();
  assert.deepEqual(s.screenToWorld(200, 150), anchor);
  raf.step(1000);
  assert.deepEqual(s.getCamera(), manual);
  assert.equal(raf.pending(), 0);
});

test('even a clamped graph zoom command cancels the obsolete flight', t => {
  const raf = clock(t), s = scene();
  s.camera.scale = 2.65;
  s.animateCamera({ x: 300, y: 200, scale: 2.65 }, 500);
  s.zoomBy(2);
  raf.step(1000);
  assert.deepEqual(s.getCamera(), { x: 0, y: 0, scale: 2.65 });
  assert.equal(raf.pending(), 0);
});

test('enabling reduced motion resolves an active board flight to its target', t => {
  const raf = clock(t), b = board();
  b.animate({ x: 500, y: 300, scale: 1.2 }, 520); raf.step(100);
  raf.reduce(); raf.step(1);
  assert.deepEqual(b.pan, { x: 500, y: 300 });
  assert.equal(b.scale, 1.2);
  assert.equal(b.raf, 0);
  assert.equal(raf.pending(), 0);
});

test('reduced motion resolves only the newest graph target', t => {
  const raf = clock(t), s = scene();
  s.animateCamera({ x: 500, y: 300, scale: 1.2 }, 500); raf.step(100);
  s.animateCamera({ x: 100, y: 50, scale: .8 }, 500);
  raf.reduce(); raf.step(1);
  assert.deepEqual(s.getCamera(), { x: 100, y: 50, scale: .8 });
  assert.equal(s.cameraAnimation, 0);
  assert.equal(raf.pending(), 0);
});

test('enabling reduced motion clears settling offsets without another spring frame', t => {
  const raf = clock(t), s = scene();
  Object.assign(s, { offsets: new Map([['node', { x: 100, y: 0, vx: 0, vy: 0 }]]), applyOffsets() {} });
  s.startSpring(); raf.step(16);
  raf.reduce(); raf.step(16);
  assert.equal(s.offsets.size, 0);
  assert.equal(s.springAnimation, 0);
  assert.equal(raf.pending(), 0);
});

test('already reduced motion schedules no navigation frames', t => {
  const raf = clock(t), b = board(), s = scene(); raf.reduce();
  b.animate({ x: 50, y: 30, scale: .5 }, 500);
  s.animateCamera({ x: 50, y: 30, scale: .5 }, 500);
  assert.deepEqual(b.pan, { x: 50, y: 30 });
  assert.deepEqual(s.getCamera(), { x: 50, y: 30, scale: .5 });
  assert.equal(raf.pending(), 0);
});

test('board teardown clears its animation handle and cancels pending rendering', t => {
  const raf = clock(t), b = board();
  let renders = 0;
  Object.assign(b, { render() { renders++; }, events: { abort() {} }, pointers: new Map(), widgets: new Map() });
  b.animate({ x: 50, y: 30, scale: .5 }, 500);
  b.dispose(); raf.step(1000);
  assert.equal(renders, 0);
  assert.equal(b.raf, 0);
  assert.equal(raf.pending(), 0);
});
