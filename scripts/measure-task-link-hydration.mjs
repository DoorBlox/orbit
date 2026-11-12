/**
 * BP-09 comparison of the former eager task-link hydration with the sparse
 * hydration path. Synthetic tasks only; local Node CPU, not billed transfer.
 */
import {performance} from 'node:perf_hooks';
import {hydrateTaskLinks} from '../src/cloud/repository.js';
import {makeSyntheticWorkspace} from './measure-sync-workloads.mjs';

const legacy=(tasks,overrides)=>tasks.map(task=>({...task,links:overrides[task.id]||task.links}));
const stat=samples=>{
  const s=[...samples].sort((a,b)=>a-b);
  return {medianMs:Number(s[Math.floor(s.length/2)].toFixed(4)),
    minMs:Number(s[0].toFixed(4)),maxMs:Number(s.at(-1).toFixed(4))};
};
function sample(fn,passes){
  const samples=[];let touched=0;
  for(let i=0;i<passes;i++){
    const start=performance.now(),result=fn();
    touched+=result.length;
    samples.push(performance.now()-start);
  }
  return {...stat(samples),passes,taskEntriesObserved:touched};
}
export function measureTaskLinkHydration(taskCount=300,{passes=100}={}){
  if(!Number.isSafeInteger(passes)||passes<1||passes>1000)throw Error('Invalid passes');
  const workspace=makeSyntheticWorkspace(taskCount);
  const tasks=workspace.tasks.map(task=>({...task,links:[]}));
  const sparse={'fixture-0':[{label:'Synthetic',url:'https://example.test/source'}]};
  // Warm both implementations; use no accuracy threshold on machine-specific time.
  for(let i=0;i<5;i++){legacy(tasks,{});hydrateTaskLinks(tasks,{});}
  const none={legacy:sample(()=>legacy(tasks,{}),passes),
    optimized:sample(()=>hydrateTaskLinks(tasks,{}),passes),
    legacyObjectCopies:taskCount*passes,optimizedObjectCopies:0};
  const one={legacy:sample(()=>legacy(tasks,sparse),passes),
    optimized:sample(()=>hydrateTaskLinks(tasks,sparse),passes),
    legacyObjectCopies:taskCount*passes,optimizedObjectCopies:passes};
  const oldProjected=JSON.stringify(legacy(tasks,sparse));
  const newProjected=JSON.stringify(hydrateTaskLinks(tasks,sparse));
  if(oldProjected!==newProjected)throw Error('Link hydration JSON changed');
  const cloneStart=performance.now();structuredClone(workspace);
  const cloneMs=Number((performance.now()-cloneStart).toFixed(4));
  const snapshotJsonBytes=Buffer.byteLength(JSON.stringify({revision:1,snapshot:workspace}),'utf8');
  return {taskCount,snapshotJsonBytes,cloneMs,none,one,
    note:'Generated data, Node CPU only; full RPC bytes and Auth request count unchanged'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  for(const taskCount of [30,300,3000]){
    console.log('W1 link hydration '+JSON.stringify(measureTaskLinkHydration(taskCount)));
  }
}
