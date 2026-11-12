import test from 'node:test';
import assert from 'node:assert/strict';
import { createFocusClock } from '../src/focus.js';

function harness(key='orbit.fo01.v1.owner-a',shared=null) {
  const records=shared||new Map();
  const operations={writes:0,removals:0};
  let mono=20000,wall=1_800_000_000_000;
  const storage={
    getItem:k=>records.has(k)?records.get(k):null,
    setItem(k,v){operations.writes++;records.set(k,String(v));},
    removeItem(k){operations.removals++;records.delete(k);},
  };
  return {
    records,operations,storage,key,
    advance(ms){mono+=ms;wall+=ms;},
    sleep(ms){wall+=ms;},
    clockBack(ms){wall-=ms;},
    now(){return {mono,wall};},
    create(){return createFocusClock({storage,storageKey:key,monoNow:()=>mono,wallNow:()=>wall});},
  };
}

test('FO-01 start, pause, resume, reset and manual phase transition are monotonic',()=>{
  const h=harness(),clock=h.create();
  assert.deepEqual([clock.getState().phase,clock.getState().status,clock.getState().remainingMs],
    ['work','idle',25*60_000]);
  clock.start();h.advance(30000);
  assert.equal(clock.getState().remainingMs,24*60_000+30_000);
  clock.pause();h.advance(40000);
  assert.equal(clock.getState().remainingMs,24*60_000+30_000,'Paused time cannot advance');
  clock.start();h.advance(20000);
  assert.equal(clock.getState().remainingMs,24*60_000+10_000);
  clock.reset();
  assert.deepEqual([clock.getState().phase,clock.getState().status,clock.getState().remainingMs],
    ['work','idle',25*60_000]);
  clock.nextPhase();
  assert.deepEqual([clock.getState().phase,clock.getState().status,clock.getState().remainingMs],
    ['break','idle',5*60_000]);
  clock.dispose();
});

test('FO-01 ten thousand UI ticks never write persistent/cloud state each second',()=>{
  const h=harness(),clock=h.create();
  clock.start();
  const writes=h.operations.writes;
  for(let i=0;i<10_000;i++)clock.tick();
  assert.equal(h.operations.writes,writes,'Time renders must be pure, no storage write');
  h.advance(25*60_000);
  clock.tick();
  assert.equal(clock.getState().status,'finished');
  assert.equal(clock.getState().remainingMs,0);
  assert.equal(h.operations.writes,writes+1,'Completion persists once');
  clock.tick();clock.tick();
  assert.equal(h.operations.writes,writes+1,'Finished ticks must not write again');
  clock.dispose();
});

test('FO-01 reload recovers running timer by wall anchor without cloud snapshots',()=>{
  const h=harness(),first=h.create();first.setDurations({workMinutes:3,breakMinutes:2});first.start();
  h.advance(42000);
  first.dispose();
  const restored=h.create();
  assert.equal(restored.getState().status,'running');
  assert.equal(restored.getState().remainingMs,138_000);
  h.sleep(160_000);restored.reconcile();
  assert.equal(restored.getState().status,'finished','Sleep resumes from wall time on visibility');
  assert.equal(restored.getState().remainingMs,0);
  restored.nextPhase();
  assert.equal(restored.getState().phase,'break');
  restored.start();
  h.advance(500);
  assert.equal(restored.getState().remainingMs,119_500);
  restored.dispose();
});

test('FO-01 a sleeping page reconciles wall time; timezone and backward wall jump do not erase monotonic progress',()=>{
  const h=harness(),clock=h.create();clock.setDurations({workMinutes:2,breakMinutes:1});clock.start();
  h.advance(4000);h.clockBack(120_000);
  clock.reconcile();
  assert.equal(clock.getState().remainingMs,116_000);
  h.advance(2000);assert.equal(clock.getState().remainingMs,114_000);
  h.sleep(120_000);clock.reconcile();
  assert.equal(clock.getState().status,'finished');
  clock.dispose();
});

test('FO-01 durations are bounded and running sessions cannot be unexpectedly reconfigured',()=>{
  const h=harness(),clock=h.create();
  assert.equal(clock.setDurations({workMinutes:30,breakMinutes:7}),true);
  assert.equal(clock.getState().durationMs,30*60_000);
  assert.equal(clock.setDurations({workMinutes:0,breakMinutes:7}),false);
  assert.equal(clock.setDurations({workMinutes:121,breakMinutes:7}),false);
  assert.equal(clock.setDurations({workMinutes:25,breakMinutes:61}),false);
  assert.equal(clock.setDurations({workMinutes:0.1,breakMinutes:5}),false);
  clock.start();
  assert.equal(clock.setDurations({workMinutes:45,breakMinutes:9}),false);
  assert.equal(clock.getState().workMinutes,30);
  clock.pause();
  assert.equal(clock.setDurations({workMinutes:40,breakMinutes:10}),true);
  clock.dispose();
});

test('FO-01 scoped session data cannot leak to a second signed-in account and can be cleared on logout',()=>{
  const records=new Map(),a=harness('orbit.fo01.v1.user-a',records),b=harness('orbit.fo01.v1.user-b',records);
  const first=a.create();first.start();a.advance(12000);
  const second=b.create();
  assert.equal(second.getState().status,'idle');
  assert.equal(second.getState().remainingMs,25*60_000);
  assert.equal(first.getState().status,'running');
  first.dispose({clearSession:true});
  assert.equal(records.has(a.key),false,'Signing out clears this account timer');
  assert.equal(second.getState().status,'idle');
  second.dispose();
});

test('FO-01 corrupt or unavailable session storage degrades safely without throwing',()=>{
  const h=harness();h.records.set(h.key,'{"status":"running","phase":"work","elapsedMs":-1}');
  const clock=h.create();
  assert.equal(clock.getState().status,'idle','Reject invalid saved state');
  clock.start();clock.dispose();
  const blocked=createFocusClock({
    storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}},
    storageKey:'orbit.fo01.v1.blocked',monoNow:()=>10,wallNow:()=>10,
  });
  assert.equal(blocked.getState().status,'idle');
  blocked.start();blocked.tick();
  assert.equal(blocked.getState().status,'running');
  assert.equal(blocked.getState().storageAvailable,false);
  blocked.dispose({clearSession:true});
});
