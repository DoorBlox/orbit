import test from 'node:test';
import assert from 'node:assert/strict';
import { SpatialBoard } from '../src/board.js';

test('focusing a tall journal starts below fixed chrome without changing stored positions', () => {
  const positions = { journal: { x: 930, y: 1780 } };
  const board = {
    widgets: new Map([['journal', { offsetWidth: 800, offsetHeight: 1100 }]]),
    positions, viewportSize: () => ({ w: 844, h: 390 }),
    animate(target) { this.target = target; },
  };
  SpatialBoard.prototype.focus.call(board, 'journal', { initial: true });
  assert.ok(board.target.y + positions.journal.y * board.target.scale >= 80);
  assert.deepEqual(positions, { journal: { x: 930, y: 1780 } });
});

test('keyboard focus pans an offscreen control into the usable viewport', () => {
  globalThis.cancelAnimationFrame = () => {};
  const positions = { journal: { x: 930, y: 1780 } };
  const board = {
    pan: { x: 0, y: 0 }, positions, raf: 0,
    viewport: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
    viewportSize: () => ({ w: 844, h: 390 }), render() {},
  };
  const control = { getBoundingClientRect: () => ({ left: 10, top: 700, right: 110, bottom: 730 }) };
  SpatialBoard.prototype.ensureVisible.call(board, control);
  assert.ok(board.pan.y + 730 <= 366);
  assert.ok(board.pan.x + 10 >= 24);
  assert.deepEqual(positions, { journal: { x: 930, y: 1780 } });
});

test('keyboard focus inside the usable viewport does not move the camera', () => {
  const board = {
    pan: { x: 13, y: 31 },
    viewport: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
    viewportSize: () => ({ w: 844, h: 390 }), render() {},
  };
  const control = { getBoundingClientRect: () => ({ left: 100, top: 110, right: 250, bottom: 150 }) };
  SpatialBoard.prototype.ensureVisible.call(board, control);
  assert.deepEqual(board.pan, { x: 13, y: 31 });
});
