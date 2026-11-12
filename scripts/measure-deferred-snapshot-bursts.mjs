/**
 * W1 BP-09 deterministic, synthetic 100-edit snapshot construction benchmark.
 * No Supabase network, owner data, credentials, billing or Production traffic.
 * CPU time includes the UI-shaped detached structuredClone only, not
 * rendering, JSON serialization, or the separately retained save-boundary clone.
 */
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {createSyncController} from '../src/cloud/sync.js';
import {makeSyntheticWorkspace} from './measure-sync-workloads.mjs';

const round=n=>Number(n.toFixed(3));
const bytes=v=>Buffer.byteLength(JSON.stringify(v),'utf8');

async function measureOne(taskCount,mode,editCount){
  const live=makeSyntheticWorkspace(taskCount);
  let captures=0,captureMs=0,writes=0,expectedRevision=null,saved=null;
  const repository={
    async saveSnapshot(snapshot,revision){
      writes++;expectedRevision=revision;
      saved=structuredClone(snapshot);
      return {revision:revision+1};
    },
    async loadOwnerSnapshot(){throw Error('Clean cloud read unexpected during synthetic edit burst');}
  };
  const sync=createSyncController({
    repository,initialRevision:0,pollMs:0,debounceMs:600000,
    eventTarget:null,visibilityTarget:null,isOnline:()=>true
  });
  const detached=()=>{
    const started=performance.now();
    const copy=structuredClone(live);
    captureMs+=performance.now()-started;
    captures++;
    return copy;
  };
  try{
    for(let index=0;index<editCount;index++){
      live.tasks[0].title='Synthetic edit '+index;
      if(mode==='eager')sync.queueOwned(detached());
      else sync.queueDeferredOwned(detached);
    }
    const before=sync.getState(),beforeWrites=writes;
    const result=await sync.flush();
    return {
      editCount,taskCount,captureCalls:captures,captureCpuMs:round(captureMs),
      networkWrites:writes,networkWritesBeforeFlush:beforeWrites,
      dirtyBeforeFlush:before.hasPending,flushOk:result.ok,
      revision:result.revision,expectedRevision,
      savedTitle:saved?.tasks[0].title,
      savedBytes:bytes(saved)
    };
  }finally{sync.dispose();}
}
export async function measureDeferredSnapshotBurst(taskCount=3000,editCount=100){
  if(!Number.isSafeInteger(editCount)||editCount<1||editCount>300)throw Error('Invalid synthetic edit count');
  const eager=await measureOne(taskCount,'eager',editCount);
  const deferred=await measureOne(taskCount,'deferred',editCount);
  return {taskCount,editCount,eager,deferred,
    capturesAvoided:eager.captureCalls-deferred.captureCalls,
    detachedCopyCpuMsAvoided:round(eager.captureCpuMs-deferred.captureCpuMs)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  for(const size of [30,300,3000]){
    console.log('ORBIT_DEFERRED_100_EDIT_BENCH '+JSON.stringify(await measureDeferredSnapshotBurst(size,100)));
  }
}
