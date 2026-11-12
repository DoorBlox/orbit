import test from 'node:test';
import assert from 'node:assert/strict';
import {measureDeferredSnapshotBurst} from '../scripts/measure-deferred-snapshot-bursts.mjs';

test('BP-09 100-edit bursts create one deferred owner snapshot, not 100, at all synthetic workspace sizes',async()=>{
  const reports=[];
  for(const count of [30,300,3000]){
    const result=await measureDeferredSnapshotBurst(count,100);
    const {eager,deferred}=result;
    assert.equal(eager.captureCalls,100);
    assert.equal(deferred.captureCalls,1);
    assert.equal(result.capturesAvoided,99);
    assert.equal(eager.networkWrites,1);
    assert.equal(deferred.networkWrites,1);
    assert.equal(eager.networkWritesBeforeFlush,0);
    assert.equal(deferred.networkWritesBeforeFlush,0);
    assert.equal(eager.dirtyBeforeFlush,true);
    assert.equal(deferred.dirtyBeforeFlush,true);
    assert.equal(eager.flushOk,true);
    assert.equal(deferred.flushOk,true);
    assert.equal(eager.expectedRevision,0);
    assert.equal(deferred.expectedRevision,0);
    assert.equal(eager.revision,1);
    assert.equal(deferred.revision,1);
    assert.equal(eager.savedTitle,'Synthetic edit 99');
    assert.equal(deferred.savedTitle,'Synthetic edit 99');
    assert.equal(eager.savedBytes,deferred.savedBytes,'Transport write bytes must be unchanged');
    reports.push(result);
  }
  for(const report of reports){
    console.log('ORBIT_DEFERRED_100_EDIT_BENCH '+JSON.stringify(report));
  }
});

test('BP-09 deferred burst benchmark rejects invalid fixture cardinalities',async()=>{
  await assert.rejects(()=>measureDeferredSnapshotBurst(0,100),/Synthetic tasks/);
  await assert.rejects(()=>measureDeferredSnapshotBurst(30,0),/edit count/);
  await assert.rejects(()=>measureDeferredSnapshotBurst(30,301),/edit count/);
});
