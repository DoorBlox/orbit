import test from 'node:test';
import assert from 'node:assert/strict';
import {createSyncController} from '../src/cloud/sync.js';

test('BP-07 dirty canvas prevents remote snapshot from advancing CAS revision',async()=>{
  const seen=[];
  const repository={
    async loadOwnerSnapshot(){return {revision:4,snapshot:{id:'remote'}};},
    async saveSnapshot(snapshot,revision){seen.push({snapshot,revision});return {revision:revision+1};}
  };
  const sync=createSyncController({repository,initialRevision:2,eventTarget:null,
    debounceMs:10000,pollMs:0,
    onSnapshot:()=>{throw Error('Editing canvas in progress');}});
  const result=await sync.refresh();
  assert.equal(result.ok,false);
  assert.equal(sync.getState().revision,2);
  sync.queue({id:'local-drawing'});
  await sync.flush();
  assert.equal(seen[0].revision,2,'the writer must not silently accept a remote revision it never displayed');
  sync.dispose();
});
