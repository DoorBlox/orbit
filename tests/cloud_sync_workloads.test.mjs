import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSyntheticWorkspace,measureSyncWorkloads} from '../scripts/measure-sync-workloads.mjs';

test('W1 BP-03: synthetic throughput fixture covers large workspaces without owner material',async()=>{
  const small=makeSyntheticWorkspace(30),large=makeSyntheticWorkspace(3000);
  assert.equal(small.tasks.length,30);assert.equal(large.tasks.length,3000);
  assert.equal(large.journalEntries.length,5);
  assert.equal(JSON.stringify(large).includes('PRIVATE OWNER'),false);
  assert.throws(()=>makeSyntheticWorkspace(6000),/Synthetic tasks/);
});

test('W1 BP-03: active, quiet, hidden and legacy reads have explicit byte evidence',async()=>{
  const result=await measureSyncWorkloads(30,{editCount:10});
  assert.equal(result.legacy.reads,240);
  assert.equal(result.active.reads,240);
  assert.equal(result.quiet.reads,123);
  assert.equal(result.hidden.reads,0);
  assert.equal(result.quiet.readBytes,123*result.payloadBytes);
  assert.equal(result.active.readBytes,240*result.payloadBytes);
  assert.equal(result.hidden.readBytes,0);
  assert.equal(result.legacy.writes,0);
});

test('W1 BP-09: many rapid edits coalesce to one CAS write but still need detached snapshot work',async()=>{
  const result=await measureSyncWorkloads(300,{editCount:30});
  assert.equal(result.editing.editCount,30);
  assert.equal(result.editing.savesBeforeFlush,0);
  assert.equal(result.editing.writes,1);
  assert.equal(result.editing.flushOk,true);
  assert.equal(result.editing.finalTitle,'Draft edit 29');
  assert.equal(result.editing.reads,0);
  assert.ok(result.editing.writeBytes>result.payloadBytes*0.95);
  assert.ok(Number.isFinite(result.editing.captureMs));
  assert.equal(result.clone.samples,7);
  assert.ok(Number.isFinite(result.clone.medianMs));
});

test('W1 BP-03: offline owner draft is retained, then exactly one write follows reconnection',async()=>{
  const result=await measureSyncWorkloads(30,{editCount:10});
  assert.equal(result.offline.offlineFlushOk,false);
  assert.equal(result.offline.pendingBefore,true);
  assert.equal(result.offline.savedAfterReconnect,true);
  assert.equal(result.offline.writes,1);
  assert.equal(result.offline.failedWrites,0);
  assert.equal(result.offline.finalTitle,'Recovered offline draft');
});

test('W1 BP-09: simultaneous devices preserve stale draft and reject stale CAS',async()=>{
  const result=await measureSyncWorkloads(30,{editCount:10});
  assert.equal(result.twoDevice.firstOk,true);
  assert.equal(result.twoDevice.secondOk,false);
  assert.equal(result.twoDevice.writes,2);
  assert.equal(result.twoDevice.conflicts,1);
  assert.equal(result.twoDevice.stateAfterConflict,'conflict');
  assert.equal(result.twoDevice.retainedTitle,'Device B offline-style draft');
  assert.equal(result.twoDevice.discardOk,true);
  assert.equal(result.twoDevice.acceptedTitle,'Device A');
  assert.equal(result.twoDevice.finalRemoteTitle,'Device A');
  assert.equal(result.twoDevice.reads,1);
});

test('W1 BP-03: bandwidth grows with workspace size, not polling frequency',async()=>{
  const [small,large]=await Promise.all([
    measureSyncWorkloads(30,{editCount:5}),
    measureSyncWorkloads(300,{editCount:5})
  ]);
  assert.ok(large.payloadBytes>small.payloadBytes*3);
  assert.equal(large.quiet.reads,small.quiet.reads);
  assert.ok(large.quiet.readBytes>small.quiet.readBytes*3);
});
