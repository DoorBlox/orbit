import test from 'node:test';
import assert from 'node:assert/strict';
import {measureCleanOnlineReadBurst} from '../scripts/measure-clean-online-read-burst.mjs';
import {measureReconnectStorm} from '../scripts/measure-sync-resilience.mjs';

test('BP-03: repeated clean online events and focus share one bounded full-snapshot read',async()=>{
  const r=await measureCleanOnlineReadBurst(30,{onlineEvents:30});
  assert.deepEqual(r.afterBurst,{reads:1,bytes:r.payloadBytes},
    'Thirty spaced online event tasks must not generate thirty authenticated full-snapshot reads');
  assert.equal(r.afterFocus,1,'Focus immediately after online should coalesce into the same revalidation');
  assert.equal(r.afterFocusAndOnline,1,'Focus plus online should not duplicate a fast completed read');
  assert.equal(r.writes,0);
  assert.equal(r.pending,false);
});

test('BP-03: actual offline-to-online and real visibility transitions still revalidate immediately',async()=>{
  const r=await measureCleanOnlineReadBurst(30,{onlineEvents:30});
  assert.equal(r.afterRealReconnect,2,
    'A genuine offline signal must allow a new read inside the coalescing gap');
  assert.equal(r.afterQuietWindow,3,
    'A fresh online signal beyond the bounded coalescing gap must revalidate');
  assert.equal(r.afterHidden,3,'Hidden reconnect events must not fetch private snapshots');
  assert.equal(r.afterVisible,4,'A real hidden-to-visible transition must fetch even inside the gap');
  assert.equal(r.afterVisibleAndOnline,4,'Follow-up online noise after visibility should not re-fetch');
  assert.deepEqual(r.requestedAt,[0,0,2001,2001]);
  assert.equal(r.readBytes,4*r.payloadBytes);
});

test('BP-03: 30/300/3000 synthetic workspaces show request and precompressed-byte reductions',async()=>{
  let prevSize=0;
  for(const count of [30,300,3000]){
    const r=await measureCleanOnlineReadBurst(count,{onlineEvents:30});
    assert.ok(r.payloadBytes>prevSize);
    prevSize=r.payloadBytes;
    assert.equal(r.afterBurst.reads,1);
    assert.equal(r.reads,4);
    assert.equal(r.writes,0);
    assert.equal(r.readBytes,r.payloadBytes*4);
    assert.ok(Number.isFinite(r.durationMs));
    console.log('W1 synthetic clean online burst:',JSON.stringify({
      taskCount:count,oneResponseBytes:r.payloadBytes,
      previousBurstRequests:30,optimizedBurstRequests:r.afterBurst.reads,
      avoidedRequests:30-r.afterBurst.reads,
      previousBurstBytes:30*r.payloadBytes,optimizedBurstBytes:r.afterBurst.bytes,
      avoidedBurstBytes:29*r.payloadBytes,
      burstAndTransitionRequests:r.reads,
      burstAndTransitionBytes:r.readBytes,localWallClockMs:r.durationMs
    }));
  }
});

test('BP-03: clean read coalescing preserves dirty NETWORK retry and CAS behavior',async()=>{
  const storm=await measureReconnectStorm(30,{onlineEvents:30});
  assert.equal(storm.afterBurst.writes,2,'Dirty reconnect retains exactly one eager retry');
  assert.deepEqual(storm.attempts.map(x=>x.at),[0,0,30000,90000,210000]);
  assert.equal(storm.readCalls,0,'No clean snapshot reload may overwrite a pending offline draft');
  assert.equal(storm.saved,true);
  assert.equal(storm.pending,false);
});
