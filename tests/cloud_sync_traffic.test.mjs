import test from 'node:test';
import assert from 'node:assert/strict';
import {measureSyncTraffic,TICKS_PER_MINUTE} from '../scripts/measure-sync-traffic.mjs';

test('BP-03 15-second foreground snapshot polling has predictable synthetic request volume',async()=>{
  const data=await measureSyncTraffic(100);
  assert.equal(TICKS_PER_MINUTE,4);
  assert.equal(data.fullForegroundReads,240);
  assert.equal(data.fullForegroundBytes,240*data.responseBytes);
  assert.ok(data.responseBytes>1000,'Generated fixture should represent meaningful JSON traffic');
});

test('BP-03 hidden tab has zero periodic reads, returns with one revalidation',async()=>{
  const data=await measureSyncTraffic(30);
  assert.equal(data.fullHiddenReads,0);
  assert.equal(data.fullHiddenBytes,0);
  assert.equal(data.mixedReads,61);
  assert.equal(data.mixedBytes,61*data.responseBytes);
});

test('BP-03 payload estimates scale with generated tasks, not private data',async()=>{
  const [small,large]=await Promise.all([measureSyncTraffic(30),measureSyncTraffic(300)]);
  assert.ok(large.responseBytes>small.responseBytes*2);
  assert.equal(large.fullForegroundReads,small.fullForegroundReads);
  assert.equal(large.fullHiddenReads,small.fullHiddenReads);
});
