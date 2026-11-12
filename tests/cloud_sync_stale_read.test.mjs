import test from 'node:test';
import assert from 'node:assert/strict';
import {createSyncController} from '../src/cloud/sync.js';

const snapshot = title => ({
  branches: [], tasks: [{id:'synthetic',title}], milestones:[],journalEntries:[],
  spatialLayout:{},preferences:{colorMode:'deadline'},
});
const deferred = () => {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return {promise,resolve};
};
const settle = () => new Promise(resolve => setImmediate(resolve));
const make = repository => createSyncController({
  repository,initialRevision:0,debounceMs:600000,pollMs:0,eventTarget:null,visibilityTarget:null,
});

test('W1 BP-09: a local edit aborts a stale full read and a later refresh does not join a stuck request',async()=>{
  const slow=deferred(), signals=[],displayed=[];
  let reads=0;
  const repository={
    loadOwnerSnapshot({signal}={}) {
      signals.push(signal);
      reads++;
      return reads===1 ? slow.promise : Promise.resolve({revision:2,snapshot:snapshot('remote-current')});
    },
    async saveSnapshot(value,expectedRevision) {
      assert.equal(value.tasks[0].title,'local-draft');
      assert.equal(expectedRevision,0);
      return {revision:1};
    },
  };
  const controller=make(repository);
  const old=controller.refresh();
  try {
    assert.equal(reads,1);
    controller.queueOwned(snapshot('local-draft'));
    assert.equal(signals[0].aborted,true,'Detached draft must invalidate its earlier remote response at the transport boundary');
    assert.equal((await controller.flush()).ok,true);
    const current=controller.refresh();
    await settle();
    assert.equal(reads,2,'Never join an aborted request whose transport could remain stuck');
    assert.equal((await current).changed,true);
    assert.equal(controller.getState().revision,2);
    slow.resolve({revision:99,snapshot:snapshot('stale-private')});
    await old;
    assert.equal(controller.getState().revision,2);
  } finally {
    slow.resolve({revision:99,snapshot:snapshot('stale-private')});
    controller.dispose();
  }
});

test('W1 BP-09: late completion of invalidated read cannot clear the newer active read promise',async()=>{
  const stale=deferred(),fresh=deferred();
  let reads=0;
  const repository={
    loadOwnerSnapshot() { reads++; return reads===1?stale.promise:fresh.promise; },
    async saveSnapshot(_,expectedRevision) { return {revision:expectedRevision+1}; },
  };
  const controller=make(repository);
  const old=controller.refresh();
  try {
    controller.queueOwned(snapshot('local'));
    await controller.flush();
    const newest=controller.refresh();
    assert.equal(reads,2);
    stale.resolve({revision:100,snapshot:snapshot('ignored')});
    await old;
    const simultaneous=controller.refresh();
    assert.strictEqual(simultaneous,newest,'Stale finally must not release a different active read');
    assert.equal(reads,2,'Do not duplicate a pending replacement read');
    fresh.resolve({revision:2,snapshot:snapshot('accepted')});
    assert.equal((await newest).changed,true);
    assert.equal(controller.getState().revision,2);
  } finally {
    stale.resolve({revision:100,snapshot:snapshot('ignored')});
    fresh.resolve({revision:2,snapshot:snapshot('accepted')});
    controller.dispose();
  }
});

test('W1 BP-09: explicit reload cancels a superseded read even if transport ignores AbortSignal',async()=>{
  const stale=deferred(), signals=[],shown=[];
  let reads=0;
  const repository={
    loadOwnerSnapshot({signal}={}) {
      signals.push(signal); reads++;
      return reads===1?stale.promise:Promise.resolve({revision:3,snapshot:snapshot('user-chosen-remote')});
    },
    async saveSnapshot() { throw Error('Explicit clean reload must not save'); },
  };
  const controller=createSyncController({
    repository,initialRevision:0,debounceMs:600000,pollMs:0,
    eventTarget:null,visibilityTarget:null,onSnapshot:value=>shown.push(value.tasks[0].title),
  });
  const old=controller.refresh();
  try {
    assert.equal((await controller.discardPendingAndReload()).ok,true);
    assert.equal(signals[0].aborted,true,'A deliberate reload takes ownership of the read boundary');
    assert.equal(controller.getState().revision,3);
    stale.resolve({revision:200,snapshot:snapshot('late-stale')});
    await old;
    assert.deepEqual(shown,['user-chosen-remote']);
    assert.equal(controller.getState().revision,3);
  } finally {
    stale.resolve({revision:200,snapshot:snapshot('late-stale')});
    controller.dispose();
  }
});
