import test from 'node:test';
import assert from 'node:assert/strict';
import {createSyncController} from '../src/cloud/sync.js';

const snapshot=title=>({
  branches:[],tasks:[{id:'synthetic-task',title}],journalEntries:[],milestones:[],
  spatialLayout:{},preferences:{colorMode:'deadline'}
});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const fault=code=>Object.assign(Error('Synthetic retry failure'),{code});

function rig({failCodes=['NETWORK','NETWORK','NETWORK'],visible=true}={}){
  let clock=0,callback=null,online=true,revision=0;
  const attempts=[],accepted=[],events=new EventTarget(),visibility=new EventTarget();
  const repository={
    async saveSnapshot(value,expectedRevision){
      attempts.push({at:clock,title:value.tasks[0].title,expectedRevision});
      const code=failCodes[attempts.length-1];
      if(code)throw fault(code);
      if(expectedRevision!==revision)throw fault('CONFLICT');
      accepted.push(structuredClone(value));
      return {revision:++revision};
    },
    async loadOwnerSnapshot(){return {revision,snapshot:snapshot('remote')};},
  };
  const sync=createSyncController({
    repository,initialRevision:0,pollMs:15000,idleAfterMs:120000,idlePollMs:30000,
    debounceMs:600000,now:()=>clock,eventTarget:events,visibilityTarget:visibility,
    isOnline:()=>online,isVisible:()=>visible,
    pollScheduler:{
      setInterval(fn,ms){assert.equal(ms,15000);callback=fn;return 1;},
      clearInterval(id){assert.equal(id,1);}
    }
  });
  return {
    sync,attempts,accepted,events,visibility,
    setOnline:v=>{online=v;},
    async tick(times=1){
      for(let index=0;index<times;index++){clock+=15000;callback();await settle();}
    },
    get clock(){return clock;}
  };
}

test('BP-03: pending draft retries transient NETWORK failures on polling with capped exponential cadence',async()=>{
  const f=rig();
  try{
    f.sync.queueOwned(snapshot('Retain this draft'));
    assert.equal((await f.sync.flush()).ok,false);
    assert.equal(f.sync.getState().state,'offline');
    assert.equal(f.sync.getState().hasPending,true);
    assert.deepEqual(f.attempts.map(x=>x.at),[0]);

    await f.tick(); // 15 seconds: first retry, still network failure
    assert.deepEqual(f.attempts.map(x=>x.at),[0,15000]);
    await f.tick(); // 30 seconds: backoff, should NOT retry
    assert.equal(f.attempts.length,2);
    await f.tick(); // 45 seconds: second retry fails
    assert.deepEqual(f.attempts.map(x=>x.at),[0,15000,45000]);
    await f.tick(3); // 60, 75, 90 seconds: exponential backoff
    assert.equal(f.attempts.length,3);
    await f.tick(); // 105 seconds: third retry succeeds
    assert.deepEqual(f.attempts.map(x=>x.at),[0,15000,45000,105000]);
    assert.equal(f.sync.getState().state,'saved');
    assert.equal(f.sync.getState().hasPending,false);
    assert.equal(f.sync.getState().revision,1);
    assert.equal(f.accepted[0].tasks[0].title,'Retain this draft');
    assert.equal(f.attempts.every(x=>x.expectedRevision===0),true);
    await f.tick(8);
    assert.equal(f.attempts.length,4,'No extra retry when draft is acknowledged');
  }finally{f.sync.dispose();}
});

test('BP-03: a stale CAS conflict after network recovery permanently blocks unattended retry',async()=>{
  const f=rig({failCodes:['NETWORK','CONFLICT']});
  try{
    f.sync.queueOwned(snapshot('Keep conflicting local draft'));
    await f.sync.flush();
    await f.tick();
    assert.equal(f.sync.getState().state,'conflict');
    assert.equal(f.sync.getPendingSnapshot().tasks[0].title,'Keep conflicting local draft');
    assert.equal(f.attempts.length,2);
    await f.tick(20);
    assert.equal(f.attempts.length,2,'Conflict cannot be retried or discarded automatically');
    assert.equal((await f.sync.retry()).ok,false,'User retry alone must not overwrite conflict');
  }finally{f.sync.dispose();}
});

test('BP-03: authorization or invalid data failures never enter automatic network retry loop',async()=>{
  for(const code of ['AUTH_REQUIRED','FORBIDDEN','VALIDATION','UNKNOWN']){
    const f=rig({failCodes:[code]});
    try{
      f.sync.queueOwned(snapshot('owner private'));
      await f.sync.flush();
      assert.equal(f.sync.getState().errorCode,code);
      await f.tick(12);
      assert.equal(f.attempts.length,1,code+' must need explicit user action');
      assert.equal(f.sync.getState().hasPending,true);
    }finally{f.sync.dispose();}
  }
});

test('BP-03: a real online signal may retry immediately, without waiting for backoff',async()=>{
  const f=rig({failCodes:['NETWORK']});
  try{
    f.sync.queueOwned(snapshot('Reconnect draft'));
    await f.sync.flush();
    f.events.dispatchEvent(new Event('online'));
    await settle();
    assert.deepEqual(f.attempts.map(x=>x.at),[0,0]);
    assert.equal(f.sync.getState().state,'saved');
    await f.tick(10);
    assert.equal(f.attempts.length,2);
  }finally{f.sync.dispose();}
});

test('BP-03: hidden tabs do not generate periodic retries and dispose detaches the retry clock',async()=>{
  const f=rig({failCodes:['NETWORK'],visible:false});
  try{
    f.sync.queueOwned(snapshot('Offline hidden'));
    await f.sync.flush();
    await f.tick(15);
    assert.equal(f.attempts.length,1);
    assert.equal(f.sync.getPendingSnapshot().tasks[0].title,'Offline hidden');
    f.sync.dispose();
    assert.equal(f.sync.getState().state,'disposed');
  }finally{f.sync.dispose();}
});
