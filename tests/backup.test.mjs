import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBackup,persistBackup,recoverInterruptedRestore,RESTORE_RECOVERY_KEY} from '../src/backup.js';
import {STORAGE_KEYS} from '../src/storage.js';
const fixture=()=>({format:'orbit-backup',version:6,branches:[{id:'inbox',parentId:'root',label:'Inbox'},{id:'just-because',parentId:'root',label:'Just Because'}],tasks:[{id:'one',title:'Original',projectId:'inbox'}],preferences:{colorMode:'deadline'},milestones:[]});
function fake(seed={},fail=()=>false){let count=0;const bag=new Map(Object.entries(seed));return {bag,getItem:k=>bag.get(k)??null,setItem(k,v){if(fail(k,++count))throw Error('Synthetic quota failure');bag.set(k,String(v));},removeItem(k){if(fail(k,++count))throw Error('Synthetic quota failure');bag.delete(k);}};}
test('valid V5 and V6 snapshots preserve IDs and optional omissions',()=>{for(const version of [5,6]){const value=fixture();value.version=version;const result=validateBackup(value);assert.equal(result.tasks[0].id,'one');assert.equal(result.journalEntries,undefined);}});
test('rejects unsupported versions, malformed fields, duplicate IDs and missing inbox',()=>{for(const change of [v=>v.version=99,v=>v.tasks.push({...v.tasks[0]}),v=>v.branches.push({...v.branches[0]}),v=>v.branches.shift(),v=>v.tasks[0].title='',v=>v.tasks[0].projectId='absent']){const value=fixture();change(value);assert.throws(()=>validateBackup(value));}});
test('rejects branch cycles and orphan parents',()=>{for(const parentId of ['loop','absent']){const value=fixture();value.branches.push({id:'loop',parentId,label:'Loop'});assert.throws(()=>validateBackup(value),/hierarchy/i);}});
test('rejects impossible dates and malformed journal/layout before storage',()=>{for(const change of [v=>v.milestones=[{id:'m',date:'2026-02-31',title:'Bad'}],v=>v.journalEntries=[null],v=>v.spatialLayout={unknown:{x:0,y:0}},v=>v.spatialLayout={journal:{x:Infinity,y:0}}]){const value=fixture();change(value);assert.throws(()=>validateBackup(value,{sanitizeHtml:s=>s}));}});
test('journal validation invokes sanitizer and retains legacy timestamps',()=>{const value=fixture();value.journalEntries=[{id:'page',date:'2026-11-01T20:30:00.000Z',title:'Hello',html:'<p>Safe</p><script>bad</script>'}];assert.throws(()=>validateBackup(value),/sanitizer/i);const result=validateBackup(value,{sanitizeHtml:s=>s.replace(/<script>.*?<\/script>/g,'')});assert.equal(result.journalEntries[0].html,'<p>Safe</p>');assert.equal(result.journalEntries[0].date,'2026-11-02');});
test('successful restore preserves absent journal/layout keys and removes marker',()=>{const store=fake({[STORAGE_KEYS.journal]:'unchanged'});const result=persistBackup(validateBackup(fixture()),store);assert.equal(result.ok,true);assert.equal(JSON.parse(store.getItem(STORAGE_KEYS.tasks))[0].title,'Original');assert.equal(store.getItem(STORAGE_KEYS.journal),'unchanged');assert.equal(store.getItem(RESTORE_RECOVERY_KEY),null);});
test('failed staged restore rolls every changed key back',()=>{const seed={[STORAGE_KEYS.tasks]:'prior tasks',[STORAGE_KEYS.branches]:'prior branches'};const store=fake(seed,(key,count)=>key===STORAGE_KEYS.preferences&&count<8);const result=persistBackup(validateBackup(fixture()),store);assert.equal(result.ok,false);assert.equal(result.rollbackComplete,true);assert.equal(store.getItem(STORAGE_KEYS.tasks),'prior tasks');assert.equal(store.getItem(STORAGE_KEYS.branches),'prior branches');assert.equal(store.getItem(RESTORE_RECOVERY_KEY),null);});
test('failed rollback retains durable recovery marker and originals',()=>{const store=fake({[STORAGE_KEYS.tasks]:'prior'},(key,count)=>count>2);const result=persistBackup(validateBackup(fixture()),store);assert.equal(result.ok,false);assert.equal(result.rollbackComplete,false);assert.ok(store.getItem(RESTORE_RECOVERY_KEY));assert.equal(result.recoveryData[STORAGE_KEYS.tasks],'prior');});
test('interrupted restore recovers originals on startup',()=>{const originals={[STORAGE_KEYS.tasks]:'old',[STORAGE_KEYS.preferences]:null};const store=fake({[STORAGE_KEYS.tasks]:'partial',[STORAGE_KEYS.preferences]:'changed',[RESTORE_RECOVERY_KEY]:JSON.stringify({version:1,originals})});const result=recoverInterruptedRestore(store);assert.equal(result.ok,true);assert.equal(result.recovered,true);assert.equal(store.getItem(STORAGE_KEYS.tasks),'old');assert.equal(store.getItem(STORAGE_KEYS.preferences),null);assert.equal(store.getItem(RESTORE_RECOVERY_KEY),null);});
test('corrupt recovery marker is retained and prevents a new restore',()=>{const store=fake({[RESTORE_RECOVERY_KEY]:'{broken',[STORAGE_KEYS.tasks]:'prior'});const result=persistBackup(validateBackup(fixture()),store);assert.equal(result.ok,false);assert.equal(store.getItem(STORAGE_KEYS.tasks),'prior');assert.equal(store.getItem(RESTORE_RECOVERY_KEY),'{broken');});
test('marker cannot direct rollback outside allowlisted app keys',()=>{const store=fake({[RESTORE_RECOVERY_KEY]:JSON.stringify({version:1,originals:{foreign:'overwrite'}}),foreign:'retain'});assert.equal(recoverInterruptedRestore(store).ok,false);assert.equal(store.getItem('foreign'),'retain');});

test('a personalized Space name roundtrips through a full backup and local restore',()=>{
  const value=fixture();value.profile={displayName:'  My Starfield  '};
  const parsed=validateBackup(JSON.stringify(value));
  assert.deepEqual(parsed.profile,{displayName:'My Starfield'});
  const store=fake();
  const result=persistBackup(parsed,store);
  assert.equal(result.ok,true);
  assert.deepEqual(JSON.parse(store.getItem(STORAGE_KEYS.profile)),{displayName:'My Starfield'});
});
test('legacy backups without a profile retain an existing locally saved Space name',()=>{
  const value=fixture();const previous={displayName:'Existing title'};
  const store=fake({[STORAGE_KEYS.profile]:JSON.stringify(previous)});
  const parsed=validateBackup(value);
  assert.equal(parsed.profile,undefined);
  assert.equal(persistBackup(parsed,store).ok,true);
  assert.deepEqual(JSON.parse(store.getItem(STORAGE_KEYS.profile)),previous);
});
test('unsafe profile payloads cannot overwrite a valid backup or local storage',()=>{
  for(const profile of [{displayName:''},{displayName:'x'.repeat(101)},{displayName:11},[],null]){
    const value=fixture();value.profile=profile;
    assert.throws(()=>validateBackup(value),/workspace name/i);
  }
});
