import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyncController } from '../src/cloud/sync.js';

const snapshot = title => ({ branches:[], tasks:[{id:'t',title}], journalEntries:[],
  milestones:[], spatialLayout:{}, preferences:{colorMode:'deadline'} });
const settle = () => new Promise(resolve => setImmediate(resolve));

function fixture({ initialRevision = 0, initialRemoteRevision = 0, initialRemoteTitle = 'remote' } = {}) {
  let time = 0, poll = null, stopped = false, remoteRevision = initialRemoteRevision;
  let remoteTitle = initialRemoteTitle, readFailure = false;
  let online = true, visible = true;
  const events = new EventTarget(), visibility = new EventTarget();
  const reads = [], writes = [], displayed = [];
  const repository = {
    async loadOwnerSnapshot() {
      reads.push(time);
      if (readFailure) throw Object.assign(Error('redacted failure'), {code:'NETWORK'});
      return {revision:remoteRevision,snapshot:snapshot(remoteTitle)};
    },
    async saveSnapshot(value,expectedRevision) {
      writes.push({value,expectedRevision});
      if (expectedRevision !== remoteRevision) throw Object.assign(Error('stale'),{code:'CONFLICT'});
      remoteTitle=value.tasks[0].title;
      return {revision:++remoteRevision};
    },
  };
  const controller = createSyncController({
    repository,initialRevision,debounceMs:600000,pollMs:15000,
    idleAfterMs:120000,idlePollMs:30000,now:()=>time,
    eventTarget:events,visibilityTarget:visibility,
    isOnline:()=>online,isVisible:()=>visible,
    onSnapshot:value=>displayed.push(value),
    pollScheduler:{
      setInterval(fn,ms){assert.equal(ms,15000);assert.equal(poll,null);poll=fn;return 1;},
      clearInterval(id){assert.equal(id,1);stopped=true;},
    },
  });
  async function tick(count=1) {
    for(let i=0;i<count;i++){time+=15000;poll();await settle();}
  }
  return {
    controller,events,visibility,reads,writes,displayed,tick,
    setRemote(revision,title){remoteRevision=revision;remoteTitle=title;},
    setFailure(value){readFailure=value;},
    setOnline(value){online=value;},
    setVisible(value){visible=value;},
    get stopped(){return stopped;},
  };
}

test('BP-03 unchanged clean foreground backs off from 15 to 30 seconds after two quiet minutes',async()=>{
  const f=fixture();
  await f.tick(16); // Four synthetic minutes with no local input or remote change
  assert.equal(f.reads.length,11,'Seven active 15-second reads then four quiet 30-second reads');
  f.events.dispatchEvent(new Event('pointerdown'));
  await f.tick(2);
  assert.equal(f.reads.length,13,'Pointer interaction immediately restores 15-second cadence');
  f.events.dispatchEvent(new Event('keydown'));
  await f.tick();
  assert.equal(f.reads.length,14,'Keyboard activity also restores active cadence');
  f.controller.dispose();
  assert.equal(f.stopped,true);
});

test('BP-03 idle remote updates surface within one 30-second interval and restore active polling',async()=>{
  const f=fixture();
  await f.tick(8); // The two-minute boundary; no idle read at exactly 120 seconds
  assert.equal(f.reads.length,7);
  f.setRemote(1,'updated on another device');
  await f.tick();
  assert.equal(f.reads.length,8);
  assert.equal(f.displayed[0].tasks[0].title,'updated on another device');
  assert.equal(f.controller.getState().revision,1);
  await f.tick();
  assert.equal(f.reads.length,9,'New remote content returns the workspace to active 15-second reads');
  f.controller.dispose();
});

test('BP-03 idle optimization never overwrites a local draft or weakens revision CAS',async()=>{
  const f=fixture();
  await f.tick(16);
  f.setRemote(2,'another device saved');
  f.controller.queue(snapshot('protected draft'));
  const saved=await f.controller.flush();
  assert.equal(saved.ok,false);
  assert.equal(f.controller.getState().state,'conflict');
  assert.equal(f.controller.getPendingSnapshot().tasks[0].title,'protected draft');
  assert.equal(f.writes[0].expectedRevision,0);
  const count=f.reads.length;
  await f.tick(4);
  assert.equal(f.reads.length,count,'Conflict must never auto-download over a private draft');
  f.controller.dispose();
});

test('BP-03 an idle network error retries at the original 15-second cadence, not the slow one',async()=>{
  const f=fixture();
  await f.tick(8);
  f.setFailure(true);
  await f.tick(); // 135 seconds: allowed quiet read fails
  assert.equal(f.controller.getState().errorCode,'NETWORK');
  const count=f.reads.length;
  f.setFailure(false);
  await f.tick(); // 150 seconds: must retry even though idle
  assert.equal(f.reads.length,count+1);
  assert.equal(f.controller.getState().state,'saved');
  f.controller.dispose();
});

test('BP-03 hidden and offline tabs stay quiet and visible return revalidates immediately',async()=>{
  const f=fixture();
  f.setVisible(false);f.setOnline(false);
  await f.tick(20);
  assert.equal(f.reads.length,0);
  f.setOnline(true);f.setVisible(true);
  f.visibility.dispatchEvent(new Event('visibilitychange'));
  await settle();
  assert.equal(f.reads.length,1,'Foreground return must immediately refresh after being hidden');
  await f.tick();
  assert.equal(f.reads.length,2,'Foreground return resets active cadence');
  f.controller.dispose();const count=f.reads.length;
  f.events.dispatchEvent(new Event('pointerdown'));
  f.visibility.dispatchEvent(new Event('visibilitychange'));
  await settle();assert.equal(f.reads.length,count);
});

test('BP-03 invalid idle timing and clock inputs are rejected instead of silently degrading',()=>{
  const repository={saveSnapshot(){},loadOwnerSnapshot(){}};
  for(const options of [{idleAfterMs:-1},{idlePollMs:-1},{idlePollMs:1000,pollMs:15000},{now:null}]) {
    assert.throws(()=>createSyncController({repository,pollMs:15000,eventTarget:null,
      visibilityTarget:null,...options}),/idle|clock|poll/i);
  }
});
