import test from 'node:test';
import assert from 'node:assert/strict';
import {createSyncController} from '../src/cloud/sync.js';

const snapshot = title => ({tasks:[{id:'t',title,description:'x'.repeat(5000)}],
  branches:[{id:'inbox',parentId:'root',label:'Unsorted'}],journalEntries:[],milestones:[],
  spatialLayout:{},preferences:{colorMode:'deadline'}});
const make = repository => createSyncController({repository,initialRevision:0,
  debounceMs:100000,pollMs:0,eventTarget:null,visibilityTarget:null});
test('BP-09 owned snapshot bypasses redundant queue clone, keeps CAS save isolated',async()=>{
  const native=globalThis.structuredClone;
  let clones=0;
  globalThis.structuredClone = value => {clones++;return native(value);};
  let controller;
  try{
    const writes=[];
    const repository={async saveSnapshot(input,revision){
      writes.push({input,revision});input.tasks[0].title='repo changed its own copy';
      return {revision:revision+1};
    },async loadOwnerSnapshot(){return {revision:0,snapshot:snapshot('remote')};}};
    controller=make(repository);
    const live=snapshot('owned original');
    const detached=native(live); // mountOrbit getSnapshot contract returns its own detached model.
    assert.equal(controller.queueOwned(detached),true);
    assert.equal(clones,0,'owned queue must not clone a snapshot already detached by app');
    live.tasks[0].title='new live edit';
    const result=await controller.flush();
    assert.equal(result.ok,true);
    assert.equal(writes.length,1);
    assert.equal(writes[0].revision,0);
    assert.equal(clones,1,'repository boundary must still receive its own safe copy');
    assert.equal(detached.tasks[0].title,'owned original','repository mutation must not alter queued owner model');
    assert.equal(controller.getState().revision,1);
  }finally{controller?.dispose();globalThis.structuredClone=native;}
});
test('BP-09 ordinary queue remains defensive for mutable or unknown callers',async()=>{
  const writes=[];
  const controller=make({async saveSnapshot(input,revision){writes.push(input);return {revision:revision+1};},
    async loadOwnerSnapshot(){return {revision:0,snapshot:snapshot('remote')};}});
  try{
    const mutable=snapshot('draft');
    assert.equal(controller.queue(mutable),true);
    mutable.tasks[0].title='changed by caller';
    await controller.flush();
    assert.equal(writes[0].tasks[0].title,'draft');
  }finally{controller.dispose();}
});
test('BP-09 owned queue preserves pending latest-write and conflict retention',async()=>{
  const writes=[];
  let release;
  const first=new Promise(resolve=>{release=resolve;});
  const controller=make({async saveSnapshot(input,revision){
    writes.push({input,revision});
    if(writes.length===1)return first;
    throw Object.assign(Error('Conflict'),{code:'CONFLICT'});
  },async loadOwnerSnapshot(){return {revision:2,snapshot:snapshot('remote')};}});
  try{
    controller.queueOwned(snapshot('first'));
    const flushing=controller.flush();
    await new Promise(resolve=>setTimeout(resolve,0));
    controller.queueOwned(snapshot('second'));
    release({revision:1});
    await flushing;
    assert.equal(writes.length,2);
    assert.equal(writes[1].revision,1);
    assert.equal(writes[1].input.tasks[0].title,'second');
    assert.equal(controller.getState().state,'conflict');
    assert.equal(controller.getPendingSnapshot().tasks[0].title,'second');
  }finally{controller.dispose();}
});
