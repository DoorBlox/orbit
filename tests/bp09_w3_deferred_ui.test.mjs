import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchSnapshotChange} from '../src/app.js';
import {createSyncController} from '../src/cloud/sync.js';

const snapshot=title=>({
  branches:[{id:'inbox',parentId:'root',label:'Unsorted'}],
  tasks:[{id:'t',projectId:'inbox',title}],
  journalEntries:[],milestones:[],spatialLayout:{},
  preferences:{colorMode:'deadline'},profile:{displayName:'Synthetic'}
});

test('W3 BP-09 deferred callback does not construct owner snapshots during 100 rapid edits',()=>{
  let built=0,emitted=0,eager=0,producer=null;
  const live=snapshot('initial');
  for(let i=0;i<100;i++){
    live.tasks[0].title='edit '+i;
    dispatchSnapshotChange({
      getSnapshot:()=>{built++;return structuredClone(live);},
      onSnapshotDirty:fn=>{emitted++;producer=fn;},
      onSnapshotChange:()=>{eager++;},
    });
  }
  assert.equal(emitted,100,'Every edit still marks the workspace dirty');
  assert.equal(built,0,'No large owner snapshot should be eagerly cloned');
  assert.equal(eager,0,'Opt-in dirty callback must take precedence over the legacy eager callback');
  assert.equal(typeof producer,'function');
  const captured=producer();
  assert.equal(built,1);
  assert.equal(captured.tasks[0].title,'edit 99');
  live.tasks[0].title='later mutation';
  assert.equal(captured.tasks[0].title,'edit 99','Factory returns a detached snapshot');
});

test('W3 BP-09 legacy onSnapshotChange consumers still receive eager detached snapshots',()=>{
  let built=0;const seen=[],live=snapshot('a');
  dispatchSnapshotChange({
    getSnapshot:()=>{built++;return structuredClone(live);},
    onSnapshotChange:value=>seen.push(value),
  });
  live.tasks[0].title='b';
  dispatchSnapshotChange({
    getSnapshot:()=>{built++;return structuredClone(live);},
    onSnapshotChange:value=>seen.push(value),
  });
  assert.equal(built,2);
  assert.deepEqual(seen.map(s=>s.tasks[0].title),['a','b']);
  live.tasks[0].title='c';
  assert.equal(seen[1].tasks[0].title,'b');
});

test('W3 BP-09 UI dirty bridge uses W1 queueDeferredOwned and preserves CAS once per burst',async()=>{
  const writes=[];let built=0;const live=snapshot('initial');
  const repository={
    async saveSnapshot(value,expectedRevision){writes.push({value,expectedRevision});return {revision:expectedRevision+1};},
    async loadOwnerSnapshot(){throw Error('Unexpected owner read');},
  };
  const sync=createSyncController({
    repository,initialRevision:7,pollMs:0,debounceMs:600000,
    eventTarget:null,visibilityTarget:null,
  });
  try{
    for(let i=0;i<100;i++){
      live.tasks[0].title='typed '+i;
      dispatchSnapshotChange({
        getSnapshot:()=>{built++;return structuredClone(live);},
        onSnapshotDirty:producer=>sync.queueDeferredOwned(producer),
      });
    }
    assert.equal(built,0);
    assert.equal(sync.getState().hasPending,true,'Beforeunload sees deferred draft as pending');
    const result=await sync.flush();
    assert.equal(result.ok,true);
    assert.equal(built,1);
    assert.equal(writes.length,1);
    assert.equal(writes[0].value.tasks[0].title,'typed 99');
    assert.equal(writes[0].expectedRevision,7);
    assert.equal(sync.getState().revision,8);
    assert.equal(sync.getState().hasPending,false);
  }finally{sync.dispose();}
});
