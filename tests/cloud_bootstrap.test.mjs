import test from 'node:test';
import assert from 'node:assert/strict';
import { publicSnapshot } from '../src/bootstrap.js';

const stamp='2026-11-01T12:00:00Z';
const publication=(kind,overrides={})=>({id:`fixture-${kind}`,kind,title:`Published ${kind}`,excerpt:'Explicitly approved text',published_date:'2026-11-01',updated_at:stamp,...overrides});

test('visitor model contains only explicit publication fields, never private record extras',()=>{
  const row=publication('task',{owner_id:'private-owner',body_html:'Private unpublished diary',resource_url:'https://private.example.invalid',criteria:'Private criteria',status:'completed'});
  const snapshot=publicSnapshot([row]);
  assert.equal(snapshot.tasks.length,1);
  assert.equal(snapshot.tasks[0].title,'Published task');
  assert.equal(snapshot.tasks[0].description,'Explicitly approved text');
  assert.equal(snapshot.tasks[0].status,'ready');
  assert.equal(snapshot.tasks[0].criteria,'');
  assert.equal(snapshot.tasks[0].resourceUrl,'');
  assert.ok(!JSON.stringify(snapshot).includes('Private unpublished diary'));
  assert.ok(!JSON.stringify(snapshot).includes('private-owner'));
});

test('empty publication is an empty visitor space, never sample tasks or private records',()=>{
  const result=publicSnapshot([]);
  assert.deepEqual(result.tasks,[]);
  assert.deepEqual(result.journalEntries,[]);
  assert.deepEqual(result.milestones,[]);
  assert.ok(result.branches.some(branch=>branch.id==='inbox'));
  assert.ok(result.branches.some(branch=>branch.id==='just-because'));
});

test('published milestone requires explicit publication date and branch is standalone',()=>{
  const result=publicSnapshot([publication('milestone'),publication('milestone',{id:'undated',published_date:null}),publication('branch',{parent_id:'private-parent'})]);
  assert.deepEqual(result.milestones,[{id:'public-fixture-milestone',title:'Published milestone',date:'2026-11-01'}]);
  const branch=result.branches.find(branch=>branch.id==='public-fixture-branch');
  assert.equal(branch.parentId,'root');
  assert.ok(!JSON.stringify(result).includes('private-parent'));
});

test('publication projection does not mutate provider rows or share model arrays',()=>{
  const row=Object.freeze(publication('task'));
  const first=publicSnapshot(Object.freeze([row]));
  first.tasks[0].title='Changed locally';first.branches.push({id:'local-only'});
  const second=publicSnapshot([row]);
  assert.equal(row.title,'Published task');
  assert.equal(second.tasks[0].title,'Published task');
  assert.equal(second.branches.some(branch=>branch.id==='local-only'),false);
});
