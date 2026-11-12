import test from 'node:test';
import assert from 'node:assert/strict';
import {measureRepositoryNormalization} from '../scripts/measure-cloud-normalization.mjs';

test('W1 BP-09: unchanged validated revisions avoid full sanitation without skipping Auth or RPC',async()=>{
  const data=await measureRepositoryNormalization(30,{passes:4});
  assert.equal(data.full.passes,4);
  assert.equal(data.full.rpcCalls,4);
  assert.equal(data.full.authCalls,4);
  assert.equal(data.full.sanitizerCalls,20,'Five generated pages sanitized on each full read');
  assert.equal(data.equalRevision.rpcCalls,4,'No unsupported network byte reduction claim');
  assert.equal(data.equalRevision.authCalls,4,'Identity still verified');
  assert.equal(data.equalRevision.sanitizerCalls,0,'No repeated unused HTML sanitation');
  assert.ok(data.responseBytes>1000);
  assert.ok(Number.isFinite(data.full.medianMs));
  assert.ok(Number.isFinite(data.equalRevision.medianMs));
});

test('W1 BP-09: large synthetic workspace benchmark reports CPU costs without hardcoding hardware speed',async()=>{
  const data=await measureRepositoryNormalization(3000,{passes:5});
  assert.equal(data.taskCount,3000);
  assert.ok(data.responseBytes>1000000);
  assert.equal(data.full.sanitizerCalls,25);
  assert.equal(data.equalRevision.sanitizerCalls,0);
  assert.equal(data.full.rpcCalls,data.equalRevision.rpcCalls);
  assert.equal(data.full.authCalls,data.equalRevision.authCalls);
  for(const mode of [data.full,data.equalRevision]){
    assert.ok(mode.minMs>=0);
    assert.ok(mode.medianMs>=mode.minMs);
    assert.ok(mode.maxMs>=mode.medianMs);
  }
  console.log('W1 synthetic normalization results (Node runner, not browser/hosted):',
    JSON.stringify({taskCount:data.taskCount,responseBytes:data.responseBytes,
      fullMedianMs:data.full.medianMs,equalRevisionMedianMs:data.equalRevision.medianMs,
      sanitizerCallsFull:data.full.sanitizerCalls,sanitizerCallsEqual:data.equalRevision.sanitizerCalls}));
});

test('W1 BP-09: synthetic CPU benchmark rejects unbounded task and repetition inputs',async()=>{
  await assert.rejects(measureRepositoryNormalization(5001),/Synthetic tasks/);
  await assert.rejects(measureRepositoryNormalization(30,{passes:-1}),/passes/);
});
