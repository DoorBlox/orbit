/**
 * W6 #171: deliberately RED acceptance contract for unexpected owner tab loss.
 * This exercises the real sync controller with a synthetic in-memory owner
 * repository; it does NOT use hosted Auth/SQL/Storage or owner-private data.
 *
 * The voluntary beforeunload export warning is not crash recovery. Never
 * change the assertion to expect lost edits merely to make CI green.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyncController } from '../src/cloud/sync.js';

const clone=value=>structuredClone(value);
const original=()=>({
  format:'orbit-backup',version:6,
  branches:[
    {id:'inbox',parentId:'root',label:'Unsorted'},
    {id:'research',parentId:'root',label:'Research'}
  ],
  tasks:[{id:'task_1',projectId:'research',title:'W6 initial task'}],
  journalEntries:[{id:'page_1',title:'W6 initial journal',date:'2026-11-13',
    html:'<p>Initial dummy entry</p>',createdAt:'2026-11-13T00:00:00Z'}],
  milestones:[],preferences:{colorMode:'deadline'},
  extensions:{
    notes:[{id:'note_1',title:'W6 initial sticky',text:'Initial dummy note',
      x:0,y:0,width:300,height:250,color:'mint'}],
    projects:{research:{description:'W6 initial project',status:'active',links:[]}},
    journalImages:{},journalScenes:{},taskLinks:{}
  }
});
const applyDummyOfflineEdits=base=>{
  const snapshot=clone(base);
  snapshot.tasks[0].title='W6 UNSENT TASK';
  snapshot.journalEntries[0].html='<p>W6 UNSENT JOURNAL</p>';
  snapshot.extensions.notes[0].text='W6 UNSENT STICKY';
  snapshot.extensions.projects.research.description='W6 UNSENT PROJECT';
  return snapshot;
};
function privateRepository(){
  let revision=1,serverSnapshot=original(),saves=0;
  return {
    async loadOwnerSnapshot(){
      return {revision,snapshot:clone(serverSnapshot)};
    },
    async saveSnapshot(snapshot,expected){
      if(expected!==revision)
        throw Object.assign(Error('Synthetic CAS conflict'),{code:'CONFLICT'});
      serverSnapshot=clone(snapshot);saves++;
      return {revision:++revision};
    },
    inspect(){return {revision,saves,snapshot:clone(serverSnapshot)};}
  };
}
function ownerSync(repository,{online,onSnapshot=()=>{},initialRevision=1}={}){
  return createSyncController({
    repository,initialRevision,onSnapshot,debounceMs:60000,pollMs:0,
    isOnline:()=>online(),eventTarget:null,visibilityTarget:null
  });
}
function assertAllEdits(snapshot){
  assert.equal(snapshot.tasks[0].title,'W6 UNSENT TASK');
  assert.equal(snapshot.journalEntries[0].html,'<p>W6 UNSENT JOURNAL</p>');
  assert.equal(snapshot.extensions.notes[0].text,'W6 UNSENT STICKY');
  assert.equal(snapshot.extensions.projects.research.description,'W6 UNSENT PROJECT');
}

test('W6 #171 control: same live tab reconnects and CAS-persists all four offline edits',async()=>{
  const repository=privateRepository();
  let online=false,view;
  const owner=ownerSync(repository,{online:()=>online});
  try{
    const pending=applyDummyOfflineEdits(original());
    assert.equal(owner.queueOwned(pending),true);
    assert.equal((await owner.flush()).ok,false);
    assert.equal(repository.inspect().saves,0);
    assertAllEdits(owner.getPendingSnapshot());
    online=true;
    assert.equal((await owner.retry()).ok,true);
    assert.equal(repository.inspect().revision,2);
    assert.equal(repository.inspect().saves,1);
  }finally{owner.dispose();}
  const remounted=ownerSync(repository,{online:()=>true,initialRevision:0,
    onSnapshot:snapshot=>{view=snapshot;}});
  try{
    assert.equal((await remounted.refresh()).ok,true);
    assertAllEdits(view);
  }finally{remounted.dispose();}
});

test('W6 #171 RED acceptance: abrupt tab loss must recover unacknowledged private edits',async()=>{
  const repository=privateRepository();
  const owner=ownerSync(repository,{online:()=>false});
  const pending=applyDummyOfflineEdits(original());
  assert.equal(owner.queueOwned(pending),true);
  assert.equal((await owner.flush()).ok,false);
  assertAllEdits(owner.getPendingSnapshot());
  assert.equal(repository.inspect().saves,0,
    'The server must not pretend the offline draft received a cloud ACK');

  // Browser kill/renderer crash: beforeunload and manual Export are unavailable.
  // The current controller has no account-scoped durable draft storage; disposal
  // drops its only pending copy. This is intentionally a failing expectation
  // until W1/W3 agree and implement a safe crash-recovery contract.
  owner.dispose();
  let reloaded;
  const nextOwner=ownerSync(repository,{online:()=>true,initialRevision:0,
    onSnapshot:snapshot=>{reloaded=snapshot;}});
  try{
    assert.equal((await nextOwner.refresh()).ok,true);
    assert.ok(reloaded,'Signed-in remount should load a valid private snapshot');
    assertAllEdits(reloaded);
  }finally{nextOwner.dispose();}
});
