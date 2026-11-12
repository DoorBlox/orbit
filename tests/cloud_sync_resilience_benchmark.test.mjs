import test from 'node:test';
import assert from 'node:assert/strict';
import {createSyncController} from '../src/cloud/sync.js';
import {measureReconnectStorm,measureSlowAndStalledRpc,measureSyncResilience} from '../scripts/measure-sync-resilience.mjs';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
const draft=()=>({branches:[],tasks:[{id:'synthetic',title:'Keep synthetic draft'}],
  journalEntries:[],milestones:[],spatialLayout:{},preferences:{colorMode:'deadline'}});

test('BP-03: spaced duplicate online events allow one eager reconnect then obey bounded retry schedule',async()=>{
  const result=await measureReconnectStorm(30,{onlineEvents:30});
  assert.deepEqual(result.afterBurst,{writes:2,reads:0,pending:true,state:'offline'},
    'Duplicate online events cannot bypass exponential backoff');
  assert.deepEqual(result.attempts.map(x=>x.at),[0,0,30000,90000,210000]);
  assert.equal(result.requestCount,5);
  assert.equal(result.saved,true);
  assert.equal(result.pending,false);
  assert.equal(result.revision,1);
  assert.equal(result.finalTitle,'Synthetic retained reconnect draft');
  assert.ok(result.writeBytes>result.responseBytes*4);
});

test('BP-03: authorization failures are not retried on online event floods',async()=>{
  const events=new EventTarget();let calls=0,poll;
  const client=createSyncController({repository:{
    async saveSnapshot(){calls++;throw Object.assign(Error('PRIVATE PROVIDER TEXT'),{code:'AUTH_REQUIRED'});},
    async loadOwnerSnapshot(){return {revision:0,snapshot:draft()};}
  },eventTarget:events,visibilityTarget:null,debounceMs:600000,pollMs:15000,
    pollScheduler:{setInterval(fn){poll=fn;return 1;},clearInterval(){}},
    now:()=>0,isOnline:()=>true,isVisible:()=>true});
  try{
    client.queueOwned(draft());await client.flush();
    for(let i=0;i<30;i++){events.dispatchEvent(new Event('online'));await settle();}
    poll();await settle();
    assert.equal(calls,1);
    assert.equal(client.getState().errorCode,'AUTH_REQUIRED');
    assert.equal(client.getState().hasPending,true);
    assert.equal(client.getPendingSnapshot().tasks[0].title,'Keep synthetic draft');
  }finally{client.dispose();}
});

test('BP-09: stalled abort-ignoring reads cannot overwrite newer remote revisions; slow writes stay serialized',async()=>{
  const result=await measureSlowAndStalledRpc(300);
  assert.equal(result.reads,2);
  assert.equal(result.readAborted,true);
  assert.equal(result.staleIgnored,true);
  assert.equal(result.replaced,true);
  assert.equal(result.beforeResolve,1);
  assert.equal(result.peakWrites,1);
  assert.equal(result.writeCalls,1);
  assert.equal(result.saved,true);
  assert.equal(result.revision,3);
});

test('BP-03/BP-09: 30/300/3000 synthetic workspaces expose bytes/CPU and preserve offline/CAS guarantees',async()=>{
  let previousBytes=0;
  for(const count of [30,300,3000]){
    const result=await measureSyncResilience(count,{onlineEvents:20,edits:12});
    assert.ok(result.responseBytes>previousBytes);
    previousBytes=result.responseBytes;
    assert.ok(Number.isFinite(result.serializationMs)&&Number.isFinite(result.cloneMs));
    assert.equal(result.storm.afterBurst.writes,2);
    assert.equal(result.storm.saved,true);
    assert.equal(result.slow.staleIgnored,true);
    assert.equal(result.slow.peakWrites,1);
    assert.equal(result.polling.hiddenReads,0);
    assert.ok(result.polling.quietReads<result.polling.activeReads);
    assert.equal(result.offline.savedAfterReconnect,true);
    assert.equal(result.offline.writes,1);
    assert.equal(result.twoDevice.conflicts,1);
    assert.equal(result.twoDevice.retainedTitle,'Device B offline-style draft');
    assert.equal(result.twoDevice.stateAfterConflict,'conflict');
    console.log('W1 synthetic resilient sync:',JSON.stringify({
      count,responseBytes:result.responseBytes,serializationMs:result.serializationMs,
      cloneMs:result.cloneMs,onlineBurstWrites:result.storm.afterBurst.writes,
      totalStormWriteBytes:result.storm.writeBytes,retryAt:result.storm.attempts.map(x=>x.at),
      slowWritePeak:result.slow.peakWrites,staleReadRejected:result.slow.staleIgnored,
      pollingReads:{active:result.polling.activeReads,quiet:result.polling.quietReads,hidden:result.polling.hiddenReads},
      casConflicts:result.twoDevice.conflicts}));
  }
});
