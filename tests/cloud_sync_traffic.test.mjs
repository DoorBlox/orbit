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

test('BP-03 clean idle foreground backoff halves nominal full-snapshot requests without hiding real freshness limits',async()=>{
  const data=await measureSyncTraffic(100);
  assert.equal(data.fullForegroundReads,240,'Legacy always-foreground baseline stays measurable');
  assert.equal(data.adaptiveForegroundReads,123,'Two minutes active 15s, then max 30s while unchanged');
  assert.equal(data.adaptiveForegroundBytes,123*data.responseBytes);
  assert.ok(data.adaptiveForegroundBytes<data.fullForegroundBytes*0.55);
  assert.equal(data.adaptiveHiddenReads,0,'Hidden tabs stay completely quiet');
  assert.equal(data.mixedReads,61);
  assert.equal(data.adaptiveMixedReads,34,'Return from hidden revalidates once, then adapts after two minutes');
  assert.equal(data.adaptiveMixedBytes,34*data.responseBytes);
});

test('BP-03 adaptive byte savings scale with only synthetic task fixtures',async()=>{
  const [small,large]=await Promise.all([measureSyncTraffic(30),measureSyncTraffic(300)]);
  assert.equal(small.adaptiveForegroundReads,large.adaptiveForegroundReads);
  assert.ok(large.adaptiveForegroundBytes>small.adaptiveForegroundBytes*2);
  assert.equal(small.adaptiveMixedReads,large.adaptiveMixedReads);
});
