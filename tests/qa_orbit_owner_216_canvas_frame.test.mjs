import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeExtensions } from '../src/scene.js';

// FB-216 only stores a page-specific display frame lock; scene bytes stay as-is.
test('Canvas frame lock is optional and keyed to each private journal page',()=>{
  const raw={journalCanvasLocks:{pageA:true},journalScenes:{
    pageA:{type:'excalidraw',version:2,source:'https://orbit.starscene.com/',
      elements:[],appState:{viewBackgroundColor:'#f9edda'},files:{}}}};
  const normalized=normalizeExtensions(raw);
  assert.deepEqual(normalized.journalCanvasLocks,{pageA:true});
  assert.deepEqual(normalized.journalScenes.pageA,raw.journalScenes.pageA);
  assert.equal(normalizeExtensions({}).journalCanvasLocks,undefined);
});
test('Canvas frame locks reject invalid private state and prototype IDs',()=>{
  assert.throws(()=>normalizeExtensions({journalCanvasLocks:{pageA:false}}),/Invalid journal Canvas frame lock/);
  assert.throws(()=>normalizeExtensions({journalCanvasLocks:{pageA:'yes'}}),/Invalid journal Canvas frame lock/);
  const injected=Object.create(null);injected['__proto__']=true;
  assert.throws(()=>normalizeExtensions({journalCanvasLocks:injected}),/Invalid journal Canvas frame lock/);
});
