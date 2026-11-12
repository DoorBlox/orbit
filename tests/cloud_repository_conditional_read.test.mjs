import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudRepository,CloudError} from '../src/cloud/repository.js';
import {makeSyntheticWorkspace} from '../scripts/measure-sync-workloads.mjs';

const snapshot=()=>({
  branches:[{id:'inbox',parentId:'root',label:'Unsorted'}],
  tasks:[{id:'one',projectId:'inbox',title:'Synthetic private task'}],
  journalEntries:[{id:'journal',date:'2026-11-12',title:'Synthetic journal',html:'<p>Safe note</p><script>unsafe()</script>'}],
  milestones:[],spatialLayout:{},preferences:{colorMode:'deadline'},
  extensions:{taskLinks:{},notes:[],journalScenes:{}}
});
const full=(revision=7,value=snapshot())=>({data:{revision,snapshot:value},error:null,status:200});
const unchanged=(revision=7)=>({data:{revision,unchanged:true},error:null,status:200});
const missing=()=>({data:null,error:{code:'PGRST202',message:'Synthetic missing RPC'},status:404});
function fixture({conditionalOwnerReads=false,users=['owner'],handler,ownerId='owner'}={}){
  const calls={auth:0,rpcs:[],sanitizer:0,abort:0};
  const client={
    auth:{async getUser(){
      const user=users[Math.min(calls.auth++,users.length-1)];
      return {data:{user:user?{id:user}:null},error:null};
    }},
    rpc(name,args){
      calls.rpcs.push({name,args});
      let value=Promise.resolve(handler?handler(name,args,calls):full());
      value.abortSignal=()=>{calls.abort++;return value;};
      return value;
    }
  };
  const repo=createCloudRepository(client,{
    conditionalOwnerReads,ownerId,
    sanitizeHtml:html=>{calls.sanitizer++;return html.replace(/<script>.*?<\/script>/g,'');}
  });
  return {repo,calls};
}
const codes=async(p,code)=>assert.rejects(p,error=>error instanceof CloudError&&error.code===code&&!error.message.includes('Synthetic'));

test('BP-03 gate: default-off and initial loads always use the existing full RPC',async()=>{
  const a=fixture({handler:()=>full()});
  assert.deepEqual(await a.repo.loadOwnerSnapshot({knownRevision:7}),{revision:7,unchanged:true});
  assert.deepEqual(a.calls.rpcs.map(x=>x.name),['load_owner_snapshot']);
  assert.equal(a.calls.auth,1,'Default behavior must not add Auth network calls');
  const b=fixture({conditionalOwnerReads:true});
  const result=await b.repo.loadOwnerSnapshot();
  assert.equal(result.revision,7);
  assert.equal(result.snapshot.journalEntries[0].html,'<p>Safe note</p>');
  assert.deepEqual(b.calls.rpcs.map(x=>x.name),['load_owner_snapshot']);
  assert.equal(b.calls.auth,1,'Initial full mount remains legacy-compatible');
  assert.throws(()=>fixture({conditionalOwnerReads:'true'}),/conditional/i);
});

test('BP-03 gated known equal revision accepts minimal envelope and retains local validated snapshot',async()=>{
  const f=fixture({conditionalOwnerReads:true,handler:name=>{
    assert.equal(name,'load_owner_snapshot_if_changed');
    return unchanged();
  }});
  assert.deepEqual(await f.repo.loadOwnerSnapshot({knownRevision:7}),{revision:7,unchanged:true});
  assert.deepEqual(f.calls.rpcs,[{name:'load_owner_snapshot_if_changed',args:{p_known_revision:7}}]);
  assert.equal(f.calls.sanitizer,0,'Fast path must not normalize nonexistent snapshot');
  assert.equal(f.calls.auth,2,'Experimental path re-verifies owner after RPC');
});

test('BP-03 changed revision preserves private extensions and sanitizes complete snapshot',async()=>{
  const changed=snapshot();
  changed.tasks[0].title='New synthetic remote task';
  changed.extensions.notes=[{id:'note-a',text:'synthetic'}];
  const f=fixture({conditionalOwnerReads:true,handler:()=>full(8,changed)});
  const response=await f.repo.loadOwnerSnapshot({knownRevision:7});
  assert.equal(response.revision,8);
  assert.equal(response.snapshot.tasks[0].title,'New synthetic remote task');
  assert.equal(response.snapshot.journalEntries[0].html,'<p>Safe note</p>');
  assert.deepEqual(response.snapshot.extensions.notes,[{id:'note-a',text:'synthetic'}]);
  assert.equal(f.calls.sanitizer,1);
});

test('BP-03 missing endpoint uses only canonical PGRST202/404 fallback and latches legacy mode',async()=>{
  let attempts=0;
  const f=fixture({conditionalOwnerReads:true,handler:name=>{
    if(name==='load_owner_snapshot_if_changed'){attempts++;return missing();}
    assert.equal(name,'load_owner_snapshot');
    return full();
  }});
  assert.deepEqual(await f.repo.loadOwnerSnapshot({knownRevision:7}),{revision:7,unchanged:true});
  assert.deepEqual(await f.repo.loadOwnerSnapshot({knownRevision:7}),{revision:7,unchanged:true});
  assert.equal(attempts,1,'Do not reissue a known-missing endpoint on every 15/30-second poll');
  assert.deepEqual(f.calls.rpcs.map(x=>x.name),[
    'load_owner_snapshot_if_changed','load_owner_snapshot','load_owner_snapshot'
  ]);
  assert.equal(f.calls.auth,4,'Fallback retains post-request account verification');
});

test('BP-03 no fallback on 401, 403, network, malformed/missing reply or noncanonical 404',async()=>{
  for(const reply of [
    {data:null,error:{code:'PGRST301',message:'Synthetic private 401'},status:401},
    {data:null,error:{code:'42501',message:'Synthetic denied'},status:403},
    {data:null,error:{code:'NETWORK',message:'Synthetic transport'},status:0},
    {data:null,error:{code:'PGRST202',message:'Synthetic unusual 403'},status:403},
    {data:null,error:{code:'PGRST201',message:'Synthetic other 404'},status:404}
  ]){
    const f=fixture({conditionalOwnerReads:true,handler:()=>reply});
    await assert.rejects(f.repo.loadOwnerSnapshot({knownRevision:7}),e=>{
      assert.ok(e instanceof CloudError);
      assert.notEqual(e.code,'ABORTED');
      assert.equal(e.message.includes('Synthetic'),false);
      return true;
    });
    assert.equal(f.calls.rpcs.length,1,'No second RPC may hide permission or transport failures');
  }
  const f=fixture({conditionalOwnerReads:true,handler:()=>({data:null,error:null,status:200})});
  await codes(f.repo.loadOwnerSnapshot({knownRevision:7}),'INVALID_RESPONSE');
  assert.equal(f.calls.rpcs.length,1);
});

test('BP-03 conditional replies fail closed for stale, invalid, extra-data unchanged and equal full snapshot',async()=>{
  const invalid=[
    {revision:7,unchanged:true,snapshot:snapshot()},
    {revision:8,unchanged:true},
    {revision:7,unchanged:true,secret:'MUST NOT RETURN'},
    {revision:7,unchanged:'true'},
    {revision:7,unchanged:false},
    {revision:7,snapshot:snapshot()},
    {revision:6,snapshot:snapshot()},
    {revision:8,snapshot:null},
    {revision:-1,snapshot:snapshot()},
    {revision:'8',snapshot:snapshot()}
  ];
  for(const data of invalid){
    const f=fixture({conditionalOwnerReads:true,handler:()=>({data,error:null,status:200})});
    await codes(f.repo.loadOwnerSnapshot({knownRevision:7}),'INVALID_RESPONSE');
  }
});

test('BP-03 abort during conditional RPC and account switch after response cannot expose owner data',async()=>{
  const switched=fixture({conditionalOwnerReads:true,users:['owner','other'],handler:()=>full(8)});
  await codes(switched.repo.loadOwnerSnapshot({knownRevision:7}),'FORBIDDEN');
  assert.equal(switched.calls.rpcs.length,1);
  const unbound=fixture({conditionalOwnerReads:true,ownerId:undefined,users:['owner','other'],handler:()=>full(8)});
  await codes(unbound.repo.loadOwnerSnapshot({knownRevision:7}),'FORBIDDEN');
  const abort=new AbortController();
  const cancelled=fixture({conditionalOwnerReads:true,handler:()=>{
    abort.abort();
    return unchanged(7);
  }});
  await codes(cancelled.repo.loadOwnerSnapshot({knownRevision:7,signal:abort.signal}),'ABORTED');
});

test('BP-03 invalid known revisions never reach Auth or RPC and full reload bypasses the probe',async()=>{
  const f=fixture({conditionalOwnerReads:true});
  for(const rev of [-1,NaN,Infinity,'7',null])await codes(f.repo.loadOwnerSnapshot({knownRevision:rev}),'VALIDATION');
  assert.equal(f.calls.auth,0);
  assert.equal(f.calls.rpcs.length,0);
  await f.repo.loadOwnerSnapshot();
  assert.deepEqual(f.calls.rpcs.map(x=>x.name),['load_owner_snapshot']);
});

test('BP-03 30/300/3000 synthetic traffic models report >95% lower unchanged JSON bytes',()=>{
  let previousBytes=0;
  const short=Buffer.byteLength(JSON.stringify({revision:7,unchanged:true}),'utf8');
  for(const count of [30,300,3000]){
    const rich=makeSyntheticWorkspace(count);
    const fullSize=Buffer.byteLength(JSON.stringify({revision:7,snapshot:rich}),'utf8');
    const avoided=fullSize-short;
    assert.ok(fullSize>previousBytes);
    previousBytes=fullSize;
    assert.ok(avoided/fullSize>.95);
    console.log('W1 BP-03 gated conditional transport:',JSON.stringify({
      count,fullSnapshotBytes:fullSize,unchangedEnvelopeBytes:short,
      avoidedBytesPerUnchangedPoll:avoided,avoidedPercent:Number((100*avoided/fullSize).toFixed(3)),
      activePollsPerHour:240,quietPollsPerHour:123,
      quietBaselineUncompressedBytes:fullSize*123,quietUnchangedEstimateBytes:short*123
    }));
  }
});
