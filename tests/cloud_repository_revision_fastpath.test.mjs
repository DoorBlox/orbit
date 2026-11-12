import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudRepository} from '../src/cloud/repository.js';
import {createSyncController} from '../src/cloud/sync.js';

const snapshot=()=>({
  branches:[{id:'inbox',parentId:'root',label:'Unsorted'}],
  tasks:[{id:'t',projectId:'inbox',title:'Synthetic task'}],
  journalEntries:[{id:'j',date:'2026-11-12',title:'Synthetic journal',html:'<p>Safe synthetic text</p>'}],
  milestones:[],spatialLayout:{},preferences:{colorMode:'deadline'}
});
function fixture(){
  let userId='owner', payload={revision:7,snapshot:snapshot()};
  const calls={auth:0,rpc:0,sanitizer:0};
  const client={
    auth:{async getUser(){calls.auth++;return {data:{user:{id:userId}},error:null};}},
    rpc(name){assert.equal(name,'load_owner_snapshot');calls.rpc++;return Promise.resolve({data:payload,error:null});}
  };
  const repository=createCloudRepository(client,{ownerId:'owner',sanitizeHtml:html=>{calls.sanitizer++;return html;}});
  return {repository,calls,setPayload:value=>{payload=value;},switchUser:id=>{userId=id;}};
}

test('BP-09: unchanged known revision avoids repeated full journal validation without omitting owner verification',async()=>{
  const f=fixture();
  const initial=await f.repository.loadOwnerSnapshot();
  assert.equal(initial.snapshot.journalEntries[0].title,'Synthetic journal');
  assert.equal(f.calls.sanitizer,1);
  const equal=await f.repository.loadOwnerSnapshot({knownRevision:7});
  assert.deepEqual(equal,{revision:7,unchanged:true});
  assert.equal(f.calls.sanitizer,1,'No expensive HTML sanitation for discarded equal-revision snapshot');
  assert.equal(f.calls.auth,2,'Every read still verifies the signed-in owner');
  assert.equal(f.calls.rpc,2,'Source optimization does not claim to remove full network RPC');
});

test('BP-09: a new remote revision still undergoes complete validation and is returned to caller',async()=>{
  const f=fixture();
  const changed=snapshot();changed.tasks[0].title='New remote revision';
  f.setPayload({revision:8,snapshot:changed});
  const loaded=await f.repository.loadOwnerSnapshot({knownRevision:7});
  assert.equal(loaded.revision,8);
  assert.equal(loaded.snapshot.tasks[0].title,'New remote revision');
  assert.equal(loaded.unchanged,undefined);
  assert.equal(f.calls.sanitizer,1);
});

test('BP-09: same-revision fast path refuses malformed RPC envelopes and changed identities',async()=>{
  const f=fixture();
  f.setPayload({revision:7,snapshot:null});
  await assert.rejects(f.repository.loadOwnerSnapshot({knownRevision:7}),e=>e.code==='INVALID_RESPONSE');
  const count=f.calls.rpc;
  f.setPayload({revision:7,snapshot:snapshot()});
  f.switchUser('other');
  await assert.rejects(f.repository.loadOwnerSnapshot({knownRevision:7}),e=>e.code==='FORBIDDEN');
  assert.equal(f.calls.rpc,count,'Cross-account request must fail before private RPC');
  await assert.rejects(f.repository.loadOwnerSnapshot({knownRevision:-1}),e=>e.code==='VALIDATION');
});

test('BP-09: sync refresh supplies its current CAS revision and does not require unchanged snapshot bytes in memory',async()=>{
  const known=[],seen=[];
  const repository={
    async loadOwnerSnapshot({knownRevision}) {
      known.push(knownRevision);
      if(knownRevision===0)return {revision:1,snapshot:snapshot()};
      return {revision:1,unchanged:true};
    },
    async saveSnapshot(){throw Error('No mutation expected');}
  };
  const sync=createSyncController({
    repository,initialRevision:0,pollMs:0,eventTarget:null,visibilityTarget:null,
    onSnapshot:value=>seen.push(value.tasks[0].title)
  });
  try{
    assert.equal((await sync.refresh()).changed,true);
    assert.equal((await sync.refresh()).changed,false);
    assert.deepEqual(known,[0,1]);
    assert.deepEqual(seen,['Synthetic task']);
    assert.equal(sync.getState().revision,1);
  }finally{sync.dispose();}
});
