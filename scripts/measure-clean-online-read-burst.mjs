/**
 * W1 BP-03 synthetic foreground/reconnect read burst measurement.
 * No hosted RPC, owner records, credentials, telemetry or private fixtures.
 * Read bytes are uncompressed JSON estimates, excluding transport overhead.
 */
import {performance} from 'node:perf_hooks';
import {createSyncController} from '../src/cloud/sync.js';
import {makeSyntheticWorkspace} from './measure-sync-workloads.mjs';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
const size=value=>Buffer.byteLength(JSON.stringify(value),'utf8');

export async function measureCleanOnlineReadBurst(taskCount=30,{onlineEvents=30,minGapMs=2000}={}){
  if(!Number.isSafeInteger(onlineEvents)||onlineEvents<2||onlineEvents>100)throw Error('Invalid synthetic online event count');
  if(!Number.isFinite(minGapMs)||minGapMs<0)throw Error('Invalid synthetic wake gap');
  const snapshot=makeSyntheticWorkspace(taskCount);
  const payloadBytes=size({revision:0,snapshot});
  let clock=0,online=true,visible=true,reads=0,writes=0,readBytes=0,latestRevision=0;
  const events=new EventTarget(),visibility=new EventTarget();
  const requestedAt=[];
  const repository={
    async saveSnapshot(){writes++;throw Error('Unexpected synthetic write on clean workspace');},
    async loadOwnerSnapshot(){
      reads++;requestedAt.push(clock);
      readBytes+=size({revision:latestRevision,snapshot});
      return {revision:latestRevision,snapshot:structuredClone(snapshot)};
    }
  };
  const sync=createSyncController({repository,initialRevision:0,pollMs:15000,
    idleAfterMs:120000,idlePollMs:30000,debounceMs:600000,
    foregroundMinGapMs:minGapMs,now:()=>clock,eventTarget:events,visibilityTarget:visibility,
    isOnline:()=>online,isVisible:()=>visible,
    pollScheduler:{setInterval:()=>1,clearInterval:()=>{}}
  });
  const send=async type=>{events.dispatchEvent(new Event(type));await settle();};
  const visibilityEvent=async()=>{visibility.dispatchEvent(new Event('visibilitychange'));await settle();};
  try{
    const begun=performance.now();
    for(let i=0;i<onlineEvents;i++)await send('online');
    const afterBurst={reads,bytes:readBytes};
    await send('focus');const afterFocus=reads;
    await send('online');const afterFocusAndOnline=reads;
    // A real observed offline edge bypasses any short duplicate-event gap.
    online=false;await send('offline');
    online=true;await send('online');
    const afterRealReconnect=reads;
    clock+=minGapMs+1;await send('online');
    const afterQuietWindow=reads;
    visible=false;await visibilityEvent();await send('online');
    const afterHidden=reads;
    visible=true;await visibilityEvent();
    const afterVisible=reads;
    await send('online');
    const afterVisibleAndOnline=reads;
    const durationMs=Number((performance.now()-begun).toFixed(4));
    return {taskCount,onlineEvents,minGapMs,payloadBytes,
      afterBurst,afterFocus,afterFocusAndOnline,afterRealReconnect,afterQuietWindow,
      afterHidden,afterVisible,afterVisibleAndOnline,reads,readBytes,writes,
      durationMs,requestedAt,pending:sync.getState().hasPending,
      revision:sync.getState().revision,
      note:'Synthetic uncompressed JSON and local Node timing; not hosted transport traffic'};
  }finally{sync.dispose();}
}

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  for(const count of [30,300,3000]){
    console.log('W1 clean reconnect read burst '+JSON.stringify(await measureCleanOnlineReadBurst(count)));
  }
}
