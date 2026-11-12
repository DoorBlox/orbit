/**
 * W1 BP-09 local CPU probe of the *real* CloudRepository normalizer.
 * Fake authenticated RPC returns generated data; no network or owner content.
 * Wall-clock samples are machine-specific and are NOT browser/billing claims.
 */
import {performance} from 'node:perf_hooks';
import {createCloudRepository} from '../src/cloud/repository.js';
import {makeSyntheticWorkspace} from './measure-sync-workloads.mjs';

function summarize(samples){
  const values=[...samples].sort((a,b)=>a-b);
  return {
    minMs:Number(values[0].toFixed(3)),
    medianMs:Number(values[Math.floor(values.length/2)].toFixed(3)),
    maxMs:Number(values.at(-1).toFixed(3))
  };
}

export async function measureRepositoryNormalization(taskCount=300,{passes=9}={}){
  if(!Number.isSafeInteger(passes)||passes<1||passes>100)throw Error('Invalid normalization passes');
  const payload={revision:7,snapshot:makeSyntheticWorkspace(taskCount)};
  let authCalls=0,rpcCalls=0,sanitizerCalls=0;
  const client={
    auth:{async getUser(){authCalls++;return {data:{user:{id:'synthetic-owner'}},error:null};}},
    rpc(name){
      if(name!=='load_owner_snapshot')throw Error('Unexpected synthetic RPC');
      rpcCalls++;
      return Promise.resolve({data:payload,error:null});
    }
  };
  const repository=createCloudRepository(client,{ownerId:'synthetic-owner',sanitizeHtml:html=>{
    sanitizerCalls++;return html;
  }});
  // Initial authenticated mount must always normalize before any fast-path reads.
  const initial=await repository.loadOwnerSnapshot();
  if(initial.snapshot.tasks.length!==taskCount)throw Error('Bad initial normalization');
  async function run(knownRevision){
    authCalls=0;rpcCalls=0;sanitizerCalls=0;
    const durations=[];
    for(let index=0;index<passes;index++){
      const start=performance.now();
      const value=await repository.loadOwnerSnapshot(knownRevision===undefined?{}:{knownRevision});
      durations.push(performance.now()-start);
      if(knownRevision===undefined&&value.snapshot.tasks.length!==taskCount)throw Error('Full read omitted payload');
      if(knownRevision!==undefined&&(value.unchanged!==true||value.snapshot!==undefined))throw Error('Fast read retained payload');
    }
    return {passes,authCalls,rpcCalls,sanitizerCalls,...summarize(durations)};
  }
  // Alternate order across callers when comparing hardware; this is not an
  // externally calibrated benchmark or a stable product latency guarantee.
  const full=await run(undefined),equalRevision=await run(7);
  return {taskCount,responseBytes:Buffer.byteLength(JSON.stringify(payload),'utf8'),
    full,equalRevision,notes:'local synthetic CPU only; hosted RPC bytes/calls unchanged'};
}

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  for(const count of [30,300,3000]){
    console.log(JSON.stringify(await measureRepositoryNormalization(count)));
  }
}
