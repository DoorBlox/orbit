import test from 'node:test';
import assert from 'node:assert/strict';
import { createLayout } from '../src/layout.js';

// W6 #217 test-first contract. Deliberately RED until W3 implements collapse
// of terminal branches containing tasks and removes dangling empty connectors.
// All fixtures are synthetic; no real owner account, Auth or hosted storage.
const branches = [
  { id: 'parent', parentId: 'root', label: 'Synthetic parent', color: '#6597E6' },
  { id: 'leaf', parentId: 'parent', label: 'Synthetic leaf', color: '#6597E6' }
];
const tasks = [{ id: 'dummy-task', title: 'Synthetic task',
  projectId: 'leaf', status: 'ready', dueDate: '' }];
const layout = collapsed => createLayout(branches, tasks, 'W6 synthetic space', collapsed);

test('W6 #217 control: expanded terminal branch retains its task stack and connector', () => {
  const expanded = layout([]);
  assert.ok(expanded.nodes.some(node => node.id === 'leaf'));
  assert.equal(expanded.stacks.filter(s => s.branchId === 'leaf').length, 1);
  assert.ok(expanded.edges.some(([from, to]) => from === 'parent' && to === 'leaf'));
});

test('W6 #217 RED: terminal task-bearing branch can collapse without deleting its tasks', () => {
  const expanded = layout([]);
  const collapsed = layout(['leaf']);
  assert.equal(tasks.length, 1, 'Collapsing must not mutate or delete the task data');
  assert.equal(collapsed.nodes.find(n => n.id === 'leaf')?.collapsed, true,
    'Terminal branch must expose a real collapsed state even with zero child branches');
  assert.equal(collapsed.stacks.some(s => s.branchId === 'leaf'), false,
    'Collapsing a terminal leaf must hide its task stack');
  assert.equal(collapsed.edges.some(([from,to]) => from === 'parent' && to === 'leaf'), true,
    'Branch-parent relationship remains visible while task list is hidden');
  assert.equal(expanded.stacks.some(s => s.branchId === 'leaf'), true,
    'Expand must recover the original task-stack projection');
});

test('W6 #217 RED: collapsing a parent with no direct tasks leaves no empty terminal connector', () => {
  const result = layout(['parent']);
  assert.equal(result.nodes.some(n => n.id === 'leaf'), false,
    'Collapsing parent must hide its descendant nodes');
  assert.equal(result.stacks.some(s => s.branchId === 'parent'), false,
    'A parent without direct tasks must not create an empty task stack');
  assert.equal(result.edges.some(([from, to]) => from === 'parent' && to === 'leaf'), false);
});
