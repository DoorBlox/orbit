import test from 'node:test';
import assert from 'node:assert/strict';
import {createSyncController} from '../src/cloud/sync.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const snap=title=>({format:'orbit-backup',version:6,branches:[],tasks:[{id:'synthetic',title}],
  journalEntries:[],milestones:[],spatialLayout:{},preferences:{colorMode:'deadline'}});
const repository=()=>({writes:[],async saveSnapshot(snapshot,base){
  this.writes.push({snapshot,base});return {revision:base+1};
},async loadOwnerSnapshot(){return {revision:4,snapshot:snap('cloud')}}});
const vault=()=>({stored:null,writes:[],clears:0,
  async save(snapshot,revision){this.stored={snapshot:structuredClone(snapshot),revision};this.writes.push(revision);},
  async clear(){this.stored=null;this.clears++;}
});
const make=(repo,v,opts={})=>createSyncController({repository:repo,initialRevision:0,
  debounceMs:10000,pollMs:0,eventTarget:null,visibilityTarget:null,draftVault:v,...opts});
test('offline deferred owner edit gets a durable owner snapshot and never needs plaintext localStorage',async()=>{
  const v=vault(),repo=repository(),ctrl=make(repo,v,{isOnline:()=>false});
  ctrl.queueDeferredOwned(()=>snap('unsaved owner'));
  await tick();
  assert.equal(v.stored.snapshot.tasks[0].title,'unsaved owner');
  assert.equal(v.stored.revision,0);
  assert.equal((await ctrl.flush()).ok,false);
  ctrl.dispose();
  // Dispose must not erase the crash-recovery record. Explicit sign-out owns that.
  assert.equal(v.stored.snapshot.tasks[0].title,'unsaved owner');
});
test('successful cloud CAS save removes only an acknowledged encrypted local recovery',async()=>{
  const v=vault(),repo=repository(),ctrl=make(repo,v);
  ctrl.queueDeferredOwned(()=>snap('saved'));
  await tick();assert.equal(v.stored.snapshot.tasks[0].title,'saved');
  assert.equal((await ctrl.flush()).ok,true);
  await tick();
  assert.equal(v.stored,null);
  assert.equal(v.clears,1);
  assert.equal(repo.writes[0].snapshot.tasks[0].title,'saved');
  ctrl.dispose();
});
test('cloud conflict retains durable draft until an explicit discard',async()=>{
  const v=vault(),repo=repository();
  repo.saveSnapshot=async()=>{throw Object.assign(Error(),{code:'CONFLICT'});};
  const ctrl=make(repo,v);
  ctrl.queueDeferredOwned(()=>snap('owner conflicted'));
  await tick();await ctrl.flush();
  assert.equal(ctrl.getState().state,'conflict');
  assert.equal(v.stored.snapshot.tasks[0].title,'owner conflicted');
  assert.equal((await ctrl.discardPendingAndReload()).ok,true);
  await tick();assert.equal(v.stored,null);
  ctrl.dispose();
});
test('new edits supersede earlier delayed deferred captures before persistence',async()=>{
  const v=vault(),repo=repository(),ctrl=make(repo,v,{isOnline:()=>false});
  ctrl.queueDeferredOwned(()=>snap('old'));
  ctrl.queueDeferredOwned(()=>snap('current'));
  await tick();
  assert.equal(v.writes.length,1);
  assert.equal(v.stored.snapshot.tasks[0].title,'current');
  ctrl.dispose();
});
test('encrypted-vault failures warn while preserving in-memory pending work',async()=>{
  const failing={async save(){throw Error('private secret should not be logged');},async clear(){}};
  let warnings=0;
  const ctrl=make(repository(),failing,{isOnline:()=>false,
    onDraftVaultError:()=>{warnings++;}});
  ctrl.queueDeferredOwned(()=>snap('private'));
  await tick();
  assert.equal(warnings,1);
  assert.equal(ctrl.getPendingSnapshot().tasks[0].title,'private');
  assert.equal(ctrl.getState().state,'offline');
  ctrl.dispose();
});
