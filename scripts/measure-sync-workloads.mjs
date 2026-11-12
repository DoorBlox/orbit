/**
 * BP-03/BP-09 deterministic synthetic workload probe. NO owner snapshots,
 * hosted requests, telemetry, persistent state, or production measurements.
 *
 * Read/write byte totals approximate UTF-8 JSON payloads before HTTP headers,
 * compression, Auth RPC envelopes, CDN billing, or database storage overhead.
 */
import {performance} from 'node:perf_hooks';
import {createSyncController} from '../src/cloud/sync.js';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
const bytes=value=>Buffer.byteLength(JSON.stringify(value),'utf8');
const fail=code=>Object.assign(Error('Synthetic '+code),{code});

export function makeSyntheticWorkspace(taskCount=1000) {
  if(!Number.isSafeInteger(taskCount)||taskCount<1||taskCount>5000)throw Error('Synthetic tasks must be between 1 and 5000');
  return {
    branches:[{id:'inbox',parentId:'root',label:'Unsorted'}],
    tasks:Array.from({length:taskCount},(_,index)=>({
      id:'fixture-'+index,projectId:'inbox',title:'Synthetic task '+String(index).padStart(5,'0'),
      description:'Synthetic private-workspace-shaped content. '.repeat(8),
      status:index%8===0?'completed':'ready',dueDate:'2026-12-01',urgency:3,
      effortMinutes:45,createdAt:'2026-11-12T00:00:00.000Z'
    })),
    journalEntries:Array.from({length:5},(_,index)=>({
      id:'fixture-journal-'+index,date:'2026-11-'+String(index+1).padStart(2,'0'),
      title:'Synthetic diary '+index,html:'<p>'+'Generated, nonpersonal writing. '.repeat(60)+'</p>'
    })),
    milestones:[],spatialLayout:{timeline:{x:400,y:100},constellation:{x:400,y:700}},
    preferences:{colorMode:'deadline'},extensions:{taskLinks:{},notes:[],journalScenes:{}}
  };
}

function fakeClock(){
  let current=0;
  const callbacks=new Map();
  return {
    now:()=>current,
    scheduler:{
      setInterval(fn,ms){if(ms!==15000)throw Error('Unexpected poll interval');const id=callbacks.size+1;callbacks.set(id,fn);return id;},
      clearInterval:id=>callbacks.delete(id)
    },
    async tick(){current+=15000;for(const fn of [...callbacks.values()])fn();await settle();}
  };
}
function ledger(snapshot){
  let revision=0,value=structuredClone(snapshot),online=true;
  const stats={reads:0,readBytes:0,writes:0,writeBytes:0,conflicts:0,failedWrites:0};
  return {
    stats,
    setOnline:v=>{online=v;},
    getRevision:()=>revision,
    getValue:()=>structuredClone(value),
    repository:{
      async loadOwnerSnapshot(){
        stats.reads++;
        if(!online)throw fail('NETWORK');
        stats.readBytes+=bytes({revision,snapshot:value});
        return {revision,snapshot:structuredClone(value)};
      },
      async saveSnapshot(snapshot,expectedRevision){
        stats.writes++;
        stats.writeBytes+=bytes({p_snapshot:snapshot,p_expected_revision:expectedRevision});
        if(!online){stats.failedWrites++;throw fail('NETWORK');}
        if(expectedRevision!==revision){stats.conflicts++;throw fail('CONFLICT');}
        value=structuredClone(snapshot);
        return {revision:++revision};
      }
    }
  };
}
function controller(repository,{clock=fakeClock(),events=new EventTarget(),visible=()=>true,
  online=()=>true,onSnapshot=()=>{},idlePollMs=30000}={}) {
  return createSyncController({repository,initialRevision:0,debounceMs:600000,pollMs:15000,
    idleAfterMs:120000,idlePollMs,now:clock.now,pollScheduler:clock.scheduler,
    eventTarget:events,visibilityTarget:null,isVisible:visible,isOnline:online,onSnapshot});
}

async function pollHour(snapshot,mode){
  const store=ledger(snapshot),clock=fakeClock(),events=new EventTarget();
  let visible=mode!=='hidden';
  const client=controller(store.repository,{clock,events,visible:()=>visible,
    idlePollMs:mode==='legacy'?15000:30000});
  try {
    for(let index=0;index<240;index++){
      if(mode==='active')events.dispatchEvent(new Event('pointerdown'));
      await clock.tick();
    }
    return {...store.stats,revision:store.getRevision()};
  }finally{client.dispose();}
}

async function burstOfEdits(snapshot,editCount){
  const store=ledger(snapshot),clock=fakeClock(),events=new EventTarget();
  const client=controller(store.repository,{clock,events});
  let captureMs=0;
  try {
    for(let index=0;index<editCount;index++){
      const start=performance.now();
      const detached=structuredClone(snapshot); // Proxy for UI snapshot construction, NOT the actual UI implementation.
      detached.tasks[0].title='Draft edit '+index;
      captureMs+=performance.now()-start;
      client.queueOwned(detached);
    }
    const savesBeforeFlush=store.stats.writes;
    const result=await client.flush();
    return {...store.stats,editCount,captureMs:Number(captureMs.toFixed(3)),
      savesBeforeFlush,flushOk:result.ok,finalTitle:store.getValue().tasks[0].title};
  }finally{client.dispose();}
}

async function offlineAndReconnect(snapshot){
  const store=ledger(snapshot),events=new EventTarget();
  let online=false;store.setOnline(false);
  const client=controller(store.repository,{events,online:()=>online});
  try {
    const draft=structuredClone(snapshot);draft.tasks[0].title='Recovered offline draft';
    client.queueOwned(draft);
    const failed=await client.flush();
    const pendingBefore=client.getState().hasPending;
    online=true;store.setOnline(true);events.dispatchEvent(new Event('online'));
    await settle();await settle();await settle();
    return {...store.stats,offlineFlushOk:failed.ok,pendingBefore,
      savedAfterReconnect:client.getState().state==='saved',
      finalTitle:store.getValue().tasks[0].title};
  }finally{client.dispose();}
}

async function competingDevices(snapshot){
  const store=ledger(snapshot),displayed=[];
  const first=controller(store.repository);
  const second=controller(store.repository,{onSnapshot:value=>displayed.push(value.tasks[0].title)});
  try {
    const a=structuredClone(snapshot);a.tasks[0].title='Device A';
    const b=structuredClone(snapshot);b.tasks[0].title='Device B offline-style draft';
    first.queueOwned(a);second.queueOwned(b);
    const firstResult=await first.flush();
    const secondResult=await second.flush();
    const stateAfterConflict=second.getState();
    const retainedTitle=second.getPendingSnapshot()?.tasks[0]?.title;
    // Explicit user-choice recovery; never auto-discard a competing draft.
    const discardResult=await second.discardPendingAndReload();
    return {...store.stats,firstOk:firstResult.ok,secondOk:secondResult.ok,
      stateAfterConflict:stateAfterConflict.state,retainedTitle,
      discardOk:discardResult.ok,acceptedTitle:displayed.at(-1),
      finalRemoteTitle:store.getValue().tasks[0].title};
  }finally{first.dispose();second.dispose();}
}

function cloneSamples(snapshot,repetitions=7){
  const samples=[];
  for(let index=0;index<repetitions;index++){
    const start=performance.now();
    const clone=structuredClone(snapshot);
    samples.push(performance.now()-start);
    if(clone.tasks.length!==snapshot.tasks.length)throw Error('Bad clone sample');
  }
  samples.sort((a,b)=>a-b);
  return {samples:repetitions,medianMs:Number(samples[Math.floor(samples.length/2)].toFixed(3)),
    minMs:Number(samples[0].toFixed(3)),maxMs:Number(samples.at(-1).toFixed(3))};
}

export async function measureSyncWorkloads(taskCount=1000,{editCount=100}={}){
  if(!Number.isSafeInteger(editCount)||editCount<1||editCount>500)throw Error('Invalid synthetic edit count');
  const snapshot=makeSyntheticWorkspace(taskCount);
  const payloadBytes=bytes({revision:0,snapshot});
  const [legacy,quiet,active,hidden,editing,offline,twoDevice]=await Promise.all([
    pollHour(snapshot,'legacy'),pollHour(snapshot,'quiet'),pollHour(snapshot,'active'),
    pollHour(snapshot,'hidden'),burstOfEdits(snapshot,editCount),
    offlineAndReconnect(snapshot),competingDevices(snapshot)
  ]);
  return {taskCount,editCount,payloadBytes,
    legacy,quiet,active,hidden,editing,offline,twoDevice,clone:cloneSamples(snapshot),
    note:'Synthetic, pre-compression JSON and local Node CPU only; no real owner data, hosted RPC latency, mobile timing, or billed transfer'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  for(const taskCount of [30,300,3000])console.log(JSON.stringify(await measureSyncWorkloads(taskCount)));
}
