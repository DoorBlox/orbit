import test from 'node:test';
import assert from 'node:assert/strict';
import {removeBranchPreservingContents} from '../src/data.js';
import {createLayout} from '../src/layout.js';
import {orderJournalEntries} from '../src/journal.js';

const tree=()=>[{id:'inbox',parentId:'root',label:'Unsorted'},{id:'just-because',parentId:'root',label:'Just Because'},
{id:'topic',parentId:'root',label:'Topic'},{id:'sub',parentId:'topic',label:'Sub'},{id:'deep',parentId:'sub',label:'Deep'}];

test('the constellation root reflects a profile, never hardcodes one user',()=>{
  assert.equal(createLayout([],[],'Alex').nodes[0].label,'Alex');
  assert.equal(createLayout(tree(),[],'Sam').nodes[0].label,'Sam');
  assert.equal(createLayout(tree(),[]).nodes[0].label,'My space');
});
test('branch deletion keeps direct tasks and all descendants',()=>{
  const branches=tree(),tasks=[{id:'a',projectId:'topic'},{id:'b',projectId:'sub'},{id:'c',projectId:'deep'}];
  const result=removeBranchPreservingContents('topic',branches,tasks);
  assert.ok(!result.branches.some(b=>b.id==='topic'));
  assert.equal(result.branches.find(b=>b.id==='sub').parentId,'root');
  assert.equal(result.branches.find(b=>b.id==='deep').parentId,'sub');
  assert.equal(result.tasks.find(t=>t.id==='a').projectId,'inbox');
  assert.equal(result.tasks.find(t=>t.id==='b').projectId,'sub');
  assert.equal(result.movedTasks,1);assert.equal(result.reparentedChildren,1);
  assert.equal(branches.find(b=>b.id==='sub').parentId,'topic');assert.equal(tasks[0].projectId,'topic');
});
test('nested branch deletion moves tasks to parent and keeps children',()=>{
  const r=removeBranchPreservingContents('sub',tree(),[{id:'a',projectId:'sub'}]);
  assert.equal(r.tasks[0].projectId,'topic');assert.equal(r.branches.find(b=>b.id==='deep').parentId,'topic');
});
test('core branches and nonexistent targets cannot be deleted',()=>{
  for(const id of ['inbox','just-because','missing'])assert.throws(()=>removeBranchPreservingContents(id,tree(),[]));
});
test('journal pages sort chronologically with stable order on equal dates',()=>{
  const before=[{id:'later',date:'2026-11-09',createdAt:'2026-11-09T00:00:00Z'},
    {id:'first',date:'2026-11-01',createdAt:'2026-11-01T00:00:00Z'},
    {id:'same',date:'2026-11-09',createdAt:'2026-11-08T00:00:00Z'}];
  assert.deepEqual(orderJournalEntries(before).map(x=>x.id),['first','same','later']);
  assert.equal(before[0].id,'later');
});

test('collapsing a branch hides descendants but keeps its own tasks and an expansion target',()=>{
  const branches=tree(),tasks=[{id:'direct',projectId:'topic'},{id:'nested',projectId:'sub'},{id:'deep-task',projectId:'deep'}];
  const expanded=createLayout(branches,tasks,'My space');
  assert.ok(expanded.nodes.some(n=>n.id==='sub'));
  assert.ok(expanded.nodes.some(n=>n.id==='deep'));
  const collapsed=createLayout(branches,tasks,'My space',['topic']);
  assert.ok(collapsed.nodes.some(n=>n.id==='topic'&&n.collapsed&&n.hasChildren));
  assert.ok(!collapsed.nodes.some(n=>n.id==='sub'||n.id==='deep'));
  assert.ok(collapsed.stacks.some(s=>s.branchId==='topic'));
  assert.ok(!collapsed.stacks.some(s=>s.branchId==='sub'||s.branchId==='deep'));
  assert.deepEqual(collapsed.children.get('topic'),['sub']);
});
test('nested collapse is independent and expanding a parent reveals still-collapsed children',()=>{
  const branches=tree(),tasks=[{id:'nested',projectId:'sub'},{id:'deep-task',projectId:'deep'}];
  const nested=createLayout(branches,tasks,'My space',['topic','sub']);
  assert.ok(!nested.nodes.some(n=>n.id==='sub'||n.id==='deep'));
  const parentExpanded=createLayout(branches,tasks,'My space',['sub']);
  assert.ok(parentExpanded.nodes.some(n=>n.id==='sub'&&n.collapsed));
  assert.ok(!parentExpanded.nodes.some(n=>n.id==='deep'));
  const allExpanded=createLayout(branches,tasks,'My space',[]);
  assert.ok(allExpanded.nodes.some(n=>n.id==='deep'));
});
test('unknown and leaf IDs are ignored as collapsed view state',()=>{
  const layout=createLayout(tree(),[],'My space',['missing','deep']);
  assert.deepEqual([...layout.collapsed],[]);
  assert.ok(layout.nodes.some(n=>n.id==='deep'));
});
