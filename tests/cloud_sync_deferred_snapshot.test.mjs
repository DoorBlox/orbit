import test from 'node:test';
import assert from 'node:assert/strict';
import {createSyncController} from '../src/cloud/sync.js';

const snap=title=>({
  branches:[],tasks:[{id:'t',title}],journalEntries:[],milestones:[],
  spatialLayout:{},preferences:{colorMode:'deadline'}
});
const deferred=()=>{let resolve;const promise=new Promise(yes=>{resolve=yes;});return {promise,resolve};};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const make=(repository,options={})=>createSyncController({
  repository,initialRevision:0,pollMs:0,debounceMs:600000,
  eventTarget:null,visibilityTarget:null,...options
});

test('BP-09: 100 rapid edits materialize exactly one detached snapshot at save boundary',async()=>{
  const writes=[],live=snap('edit 0');let captures=0;
  const repository={
    async saveSnapshot(value,expectedRevision){writes.push({value,expectedRevision});return {revision:expectedRevision+1};},
    async loadOwnerSnapshot(){throw Error('No full remote read expected');}
  };
  const c=make(repository);
  try{
    for(let index=0;index<100;index++){
      live.tasks[0].title='edit '+index;
      assert.equal(c.queueDeferredOwned(()=>{
        captures++;
        return structuredClone(live);
      }),true);
    }
    assert.equal(captures,0,'No per-character full snapshot is constructed');
    assert.equal(c.getState().hasPending,true,'Beforeunload warning can see pending lazy drafts');
    assert.equal((await c.flush()).ok,true);
    assert.equal(captures,1,'One capture for one acknowledged burst');
    assert.equal(writes.length,1,'One network CAS write');
    assert.equal(writes[0].value.tasks[0].title,'edit 99');
    assert.equal(writes[0].expectedRevision,0);
    assert.equal(c.getState().revision,1);
  }finally{c.dispose();}
});

test('BP-09: first failed save captures a stable draft once; online retry never re-reads mutable live view',async()=>{
  const live=snap('offline draft'),writes=[];let captures=0;
  const repository={
    async saveSnapshot(value,expectedRevision){
      writes.push({value,expectedRevision});
      if(writes.length===1)throw Object.assign(Error('Private data should not leak'),{code:'NETWORK'});
      return {revision:1};
    },
    async loadOwnerSnapshot(){throw Error('No read expected');}
  };
  const c=make(repository);
  try{
    c.queueDeferredOwned(()=>{captures++;return structuredClone(live);});
    assert.equal((await c.flush()).ok,false);
    assert.equal(c.getState().state,'offline');
    assert.equal(c.getPendingSnapshot().tasks[0].title,'offline draft');
    live.tasks[0].title='mutated live without a new queue';
    assert.equal((await c.retry()).ok,true);
    assert.equal(captures,1);
    assert.deepEqual(writes.map(w=>w.value.tasks[0].title),['offline draft','offline draft']);
    assert.deepEqual(writes.map(w=>w.expectedRevision),[0,0]);
    assert.equal(c.getState().hasPending,false);
  }finally{c.dispose();}
});

test('BP-09: deferred edits queued during a save serialize with the acknowledged revision',async()=>{
  const first=deferred(),writes=[];let firstCaptures=0,secondCaptures=0;
  const repository={
    async saveSnapshot(value,expectedRevision){
      writes.push({value,expectedRevision});
      return writes.length===1?first.promise:{revision:expectedRevision+1};
    },
    async loadOwnerSnapshot(){throw Error('No read expected');}
  };
  const c=make(repository);
  try{
    c.queueDeferredOwned(()=>{firstCaptures++;return snap('first');});
    const pending=c.flush();
    await settle();
    assert.equal(firstCaptures,1);
    c.queueDeferredOwned(()=>{secondCaptures++;return snap('second');});
    assert.equal(secondCaptures,0);
    first.resolve({revision:1});
    assert.equal((await pending).ok,true);
    assert.equal(secondCaptures,1);
    assert.deepEqual(writes.map(w=>[w.value.tasks[0].title,w.expectedRevision]),[['first',0],['second',1]]);
    assert.equal(c.getState().revision,2);
  }finally{first.resolve({revision:1});c.dispose();}
});

test('BP-09: explicit pending-draft export captures only once and remains mutation-isolated',async()=>{
  const repository={
    writes:[],async saveSnapshot(value,rev){this.writes.push(value);return {revision:rev+1};},
    async loadOwnerSnapshot(){throw Error('No read expected');}
  };
  let calls=0;const c=make(repository);
  try{
    c.queueDeferredOwned(()=>{calls++;return snap('protected');});
    const a=c.getPendingSnapshot();
    const b=c.getPendingSnapshot();
    assert.equal(calls,1);
    a.tasks[0].title='external mutated copy';
    b.tasks[0].title='another mutated export';
    assert.equal(c.getPendingSnapshot().tasks[0].title,'protected');
    assert.equal((await c.flush()).ok,true);
    assert.equal(calls,1);
    assert.equal(repository.writes[0].tasks[0].title,'protected');
  }finally{c.dispose();}
});

test('BP-09: failed deferred producer does not silently lose draft or publish data',async()=>{
  let writes=0;
  const repository={
    async saveSnapshot(){writes++;return {revision:1};},
    async loadOwnerSnapshot(){throw Error('No read expected');}
  };
  const states=[],c=make(repository,{onStatus:state=>states.push(state)});
  try{
    assert.throws(()=>c.queueDeferredOwned(null),/producer|function|snapshot/i);
    assert.equal(c.getState().hasPending,false);
    c.queueDeferredOwned(()=>{throw Error('PRIVATE SECRET SNAPSHOT');});
    assert.equal((await c.flush()).ok,false);
    assert.equal(writes,0);
    assert.equal(c.getState().hasPending,true);
    assert.equal(JSON.stringify(states).includes('SECRET'),false);
    c.queueDeferredOwned(()=>Promise.resolve(snap('bad async')));
    assert.equal((await c.flush()).ok,false,'Async factories are prohibited');
    assert.equal(writes,0);
    c.queueDeferredOwned(()=>snap('recover valid'));
    assert.equal((await c.flush()).ok,true);
    assert.equal(writes,1);
  }finally{c.dispose();}
});

test('BP-09: disposal and explicit CAS conflict never execute a newly stale producer',async()=>{
  let captures=0,writes=0;
  const repository={
    async saveSnapshot(){writes++;throw Object.assign(Error('private'),{code:'CONFLICT'});},
    async loadOwnerSnapshot(){return {revision:3,snapshot:snap('authoritative remote')};}
  };
  const c=make(repository);
  c.queueDeferredOwned(()=>{captures++;return snap('local conflicting');});
  assert.equal((await c.flush()).ok,false);
  assert.equal(c.getState().state,'conflict');
  c.queueDeferredOwned(()=>{captures++;return snap('latest conflicting');});
  assert.equal(captures,1,'Conflict waits for explicit resolution or export');
  assert.equal((await c.retry()).ok,false);
  assert.equal(writes,1);
  assert.equal(c.getPendingSnapshot().tasks[0].title,'latest conflicting');
  assert.equal(captures,2);
  c.dispose();
  assert.equal(c.queueDeferredOwned(()=>{captures++;return snap('after dispose');}),false);
  assert.equal(captures,2);
});
