import test from 'node:test';
import assert from 'node:assert/strict';
import {createSyncController} from '../src/cloud/sync.js';
import {makeSyntheticWorkspace} from '../scripts/measure-sync-workloads.mjs';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
function harness(){
  let now=0,visible=true,reads=0,revision=0;
  const events=new EventTarget(),visibility=new EventTarget();
  const snapshot=makeSyntheticWorkspace(100);
  const repo={
    async loadOwnerSnapshot(){
      reads++;
      return {revision,snapshot};
    },
    async saveSnapshot(){throw Error('No write expected');}
  };
  const sync=createSyncController({repository:repo,initialRevision:0,pollMs:0,
    eventTarget:events,visibilityTarget:visibility,now:()=>now,
    isVisible:()=>visible,foregroundMinGapMs:2000});
  return {
    events,visibility,sync,snapshot,
    advance:ms=>{now+=ms;},
    setVisible:v=>{visible=v;},
    get reads(){return reads;},
    setRevision:v=>{revision=v;}
  };
}

test('BP-03: burst of focus and visible events transfers only one full snapshot when nothing changed',async()=>{
  const f=harness();
  try{
    for(let index=0;index<10;index++){
      f.events.dispatchEvent(new Event('focus'));
      f.visibility.dispatchEvent(new Event('visibilitychange'));
      await settle();
      f.advance(100);
    }
    assert.equal(f.reads,1,'Fast resolved RPC must not trigger a new request on every wake event');
    const responseBytes=Buffer.byteLength(JSON.stringify({revision:0,snapshot:f.snapshot}),'utf8');
    assert.ok(responseBytes>1000);
    assert.equal((10-f.reads)*responseBytes,9*responseBytes,'Nine modeled full JSON replies avoided in the wake burst');
    f.advance(1100);
    f.events.dispatchEvent(new Event('focus'));
    await settle();
    assert.equal(f.reads,2,'Return to normal revalidation after a bounded 2-second gap');
  }finally{f.sync.dispose();}
});

test('BP-03: a genuine hidden to visible transition bypasses wake dedupe, and hidden focus remains quiet',async()=>{
  const f=harness();
  try{
    f.events.dispatchEvent(new Event('focus'));
    await settle();assert.equal(f.reads,1);
    f.setVisible(false);
    f.visibility.dispatchEvent(new Event('visibilitychange'));
    f.events.dispatchEvent(new Event('focus'));
    await settle();assert.equal(f.reads,1);
    f.advance(200);
    f.setVisible(true);
    f.setRevision(2);
    f.visibility.dispatchEvent(new Event('visibilitychange'));
    await settle();
    assert.equal(f.reads,2,'Real visibility return must check immediately even inside the gap');
    assert.equal(f.sync.getState().revision,2,'No missed cross-device revision on visibility return');
    f.events.dispatchEvent(new Event('focus'));
    await settle();
    assert.equal(f.reads,2,'Second wake event coalesces with completed visibility refresh');
  }finally{f.sync.dispose();}
});

test('BP-03: invalid foreground gap is rejected, and disposal detaches wake handlers',async()=>{
  const repo={loadOwnerSnapshot:async()=>({revision:0,snapshot:makeSyntheticWorkspace(1)}),
    saveSnapshot:async()=>({revision:1})};
  for(const gap of [-1,Infinity,NaN]){
    assert.throws(()=>createSyncController({repository:repo,pollMs:0,foregroundMinGapMs:gap,
      eventTarget:null,visibilityTarget:null}),/idle|foreground|gap|clock/i);
  }
  const f=harness();f.events.dispatchEvent(new Event('focus'));await settle();
  f.sync.dispose();const before=f.reads;
  f.advance(3000);f.events.dispatchEvent(new Event('focus'));f.visibility.dispatchEvent(new Event('visibilitychange'));
  await settle();assert.equal(f.reads,before);
});
