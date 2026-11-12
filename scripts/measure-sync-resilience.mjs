/**
 * W1 BP-03/BP-09 disposable sync-resilience harness.
 * No live network, user identity, credential or private workspace data.
 * JSON bytes are pre-compression envelopes, not billed network traffic.
 */
import {performance} from 'node:perf_hooks';
import {createSyncController} from '../src/cloud/sync.js';
import {makeSyntheticWorkspace,measureSyncWorkloads} from './measure-sync-workloads.mjs';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
const bytes=value=>Buffer.byteLength(JSON.stringify(value),'utf8');
const failure=code=>Object.assign(Error('Synthetic '+code),{code});
function clock(){
  let time=0,poll;
  return {
    now:()=>time,
    scheduler:{setInterval(fn){poll=fn;return 1;},clearInterval(){poll=null;}},
    async tick(){time+=15000;poll?.();await settle();},
    advance:ms=>{time+=ms;}
  };
}
function sync(repository,c,events,options={}){
  return createSyncController({repository,initialRevision:0,debounceMs:600000,pollMs:15000,
    idleAfterMs:120000,idlePollMs:30000,maxReadAgeMs:45000,
    now:c.now,pollScheduler:c.scheduler,eventTarget:events,
    visibilityTarget:null,isVisible:()=>true,isOnline:()=>true,...options});
}

export async function measureReconnectStorm(taskCount=30,{onlineEvents=30}={}){
  if(!Number.isSafeInteger(onlineEvents)||onlineEvents<1||onlineEvents>100)throw Error('Invalid online event count');
  const snapshot=makeSyntheticWorkspace(taskCount),c=clock(),events=new EventTarget();
  const attempts=[];let revision=0,stored=structuredClone(snapshot),readCalls=0,writeBytes=0;
  const repository={
    async saveSnapshot(value,expected){
      writeBytes+=bytes({p_snapshot:value,p_expected_revision:expected});
      attempts.push({at:c.now(),expected});
      if(attempts.length<=4)throw failure('NETWORK');
      if(expected!==revision)throw failure('CONFLICT');
      stored=structuredClone(value);return {revision:++revision};
    },
    async loadOwnerSnapshot(){
      readCalls++;
      return {revision,snapshot:structuredClone(stored)};
    }
  };
  const controller=sync(repository,c,events);
  try{
    const draft=structuredClone(snapshot);draft.tasks[0].title='Synthetic retained reconnect draft';
    controller.queueOwned(draft);
    await controller.flush(); // First failed real-request-shaped write
    for(let n=0;n<onlineEvents;n++){
      events.dispatchEvent(new Event('online'));
      await settle(); // Distinct browser event tasks, not one microtask batch
    }
    const afterBurst={writes:attempts.length,reads:readCalls,
      pending:controller.getState().hasPending,state:controller.getState().state};
    let polls=0;
    while(controller.getState().hasPending&&polls<20){await c.tick();polls++;}
    return {taskCount,onlineEvents,afterBurst,polls,attempts,
      requestCount:attempts.length+readCalls,writeBytes,readCalls,
      saved:controller.getState().state==='saved',revision:controller.getState().revision,
      finalTitle:stored.tasks[0].title,pending:controller.getState().hasPending,
      responseBytes:bytes({revision,snapshot})};
  }finally{controller.dispose();}
}

export async function measureSlowAndStalledRpc(taskCount=30){
  const snapshot=makeSyntheticWorkspace(taskCount),c=clock(),events=new EventTarget();
  let firstResolve,writeResolve,readCalls=0,writeCalls=0,peakWrites=0,inFlight=0;
  let lateSignal,seen=[];
  const firstRead=new Promise(resolve=>{firstResolve=resolve;});
  const slowWrite=new Promise(resolve=>{writeResolve=resolve;});
  const repository={
    loadOwnerSnapshot({signal}={}){
      readCalls++;
      if(readCalls===1){lateSignal=signal;return firstRead;} // intentionally ignores abort
      return Promise.resolve({revision:2,snapshot});
    },
    async saveSnapshot(value,expected){
      writeCalls++;inFlight++;peakWrites=Math.max(peakWrites,inFlight);
      try{return await slowWrite;}finally{inFlight--;}
    }
  };
  const controller=sync(repository,c,events,{onSnapshot:value=>seen.push(value.tasks.length)});
  try{
    const first=controller.refresh();await settle();
    c.advance(45000);
    const current=await controller.refresh();
    firstResolve({revision:1,snapshot:{...snapshot,tasks:[]}});
    await first;await settle();
    const staleIgnored=seen.length===1&&seen[0]===taskCount&&controller.getState().revision===2;
    controller.queueOwned(snapshot);
    const write=controller.flush();await settle();
    for(let i=0;i<30;i++){events.dispatchEvent(new Event('online'));await settle();}
    const beforeResolve=writeCalls;
    writeResolve({revision:3});await write;await settle();
    return {taskCount,reads:readCalls,readAborted:lateSignal.aborted,
      staleIgnored,replaced:current.changed,writeCalls,peakWrites,beforeResolve,
      saved:controller.getState().state==='saved',revision:controller.getState().revision};
  }finally{controller.dispose();}
}

export async function measureSyncResilience(taskCount=30,{onlineEvents=30,edits=12}={}){
  const workspace=makeSyntheticWorkspace(taskCount);
  const start=performance.now();const raw=JSON.stringify({revision:0,snapshot:workspace});
  const serializationMs=Number((performance.now()-start).toFixed(4));
  const begin=performance.now();structuredClone(workspace);
  const cloneMs=Number((performance.now()-begin).toFixed(4));
  const storm=await measureReconnectStorm(taskCount,{onlineEvents});
  const slow=await measureSlowAndStalledRpc(taskCount);
  const baseline=await measureSyncWorkloads(taskCount,{editCount:edits});
  return {taskCount,responseBytes:bytes({revision:0,snapshot:workspace}),serializationMs,
    cloneMs,storm,slow,
    polling:{activeReads:baseline.active.reads,quietReads:baseline.quiet.reads,hiddenReads:baseline.hidden.reads,
      activeReadBytes:baseline.active.readBytes,quietReadBytes:baseline.quiet.readBytes},
    editing:baseline.editing,offline:baseline.offline,twoDevice:baseline.twoDevice,
    note:'Synthetic Node timing / precompressed JSON only; hosted RPC and Production untouched'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  for(const taskCount of [30,300,3000]){
    console.log('W1 sync resilience '+JSON.stringify(await measureSyncResilience(taskCount)));
  }
}
