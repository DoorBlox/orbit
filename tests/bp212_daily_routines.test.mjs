import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanTask, normalizeTaskRoutines, setDailyRoutine, setDailyCompletion,
  getDailyOccurrence, routineDayKey } from '../src/model.js';
import { normalizeExtensions } from '../src/scene.js';
import { validateBackup } from '../src/backup.js';
import { createSyncController } from '../src/cloud/sync.js';

const task = (id='routine-1') => cleanTask({
  id,projectId:'inbox',title:'Daily exercise',status:'completed',
  createdAt:'2026-11-01T00:00:00.000Z',completedAt:'2026-11-01T00:00:00.000Z'
});
const backup = (extensions) => ({
  format:'orbit-backup',version:6,
  branches:[{id:'inbox',parentId:'root',label:'Inbox'}],
  tasks:[task()],preferences:{colorMode:'deadline'},
  milestones:[],journalEntries:[],
  ...(extensions===undefined?{}:{extensions})
});
const sanitizer = html => html;
const rules = () => setDailyRoutine({},'routine-1',{startDate:'2026-11-19',timeZone:'Asia/Jakarta'});

test('#212 legacy one-off tasks retain their schema, completed status and old backups',()=>{
  const oneOff=task();
  assert.equal(Object.hasOwn(oneOff,'recurrence'),false);
  assert.equal(oneOff.status,'completed');
  assert.equal(oneOff.completedAt,'2026-11-01T00:00:00.000Z');
  assert.equal(getDailyOccurrence(oneOff,{}, {now:new Date('2026-11-20T00:00:00Z')}),null);
  const restored=validateBackup(backup(),{sanitizeHtml:sanitizer});
  assert.equal(restored.tasks[0].status,'completed');
  assert.equal(restored.tasks[0].completedAt,oneOff.completedAt);
  assert.ok(!Object.hasOwn(restored.extensions??{},'taskRoutines'));
});

test('#212 daily routine preserves one task id while independent Jakarta dates reset completion',()=>{
  const original=task();
  const enabled=rules();
  assert.deepEqual(enabled['routine-1'],{
    frequency:'daily',startDate:'2026-11-19',timeZone:'Asia/Jakarta',completedDates:[]
  });
  assert.equal(routineDayKey(new Date('2026-11-19T16:59:59.999Z'),'Asia/Jakarta'),'2026-11-19');
  assert.equal(routineDayKey(new Date('2026-11-19T17:00:00.000Z'),'Asia/Jakarta'),'2026-11-20');
  const yesterday=setDailyCompletion(enabled,original.id,'2026-11-19',true);
  const previous=getDailyOccurrence(original,yesterday,{now:new Date('2026-11-19T16:59:59Z')});
  const current=getDailyOccurrence(original,yesterday,{now:new Date('2026-11-19T17:00:00Z')});
  assert.deepEqual([previous.dayKey,previous.completed,previous.active],['2026-11-19',true,true]);
  assert.deepEqual([current.dayKey,current.completed,current.active],['2026-11-20',false,true]);
  assert.equal(current.occurrenceKey,'routine-1@2026-11-20');
  assert.equal(original.status,'completed','Historic one-off status is never rewritten as a daily completion');
});

test('#212 repeated same-day completion is idempotent, unmarking touches only its date',()=>{
  const starting=rules();
  const once=setDailyCompletion(starting,'routine-1','2026-11-19',true);
  const twice=setDailyCompletion(once,'routine-1','2026-11-19',true);
  const tomorrow=setDailyCompletion(twice,'routine-1','2026-11-20',true);
  assert.deepEqual(twice,once);
  assert.deepEqual(tomorrow['routine-1'].completedDates,['2026-11-19','2026-11-20']);
  const undone=setDailyCompletion(tomorrow,'routine-1','2026-11-20',false);
  assert.deepEqual(undone['routine-1'].completedDates,['2026-11-19']);
  assert.deepEqual(starting['routine-1'].completedDates,[],'All operations preserve original snapshots');
  assert.deepEqual(tomorrow['routine-1'].completedDates,['2026-11-19','2026-11-20']);
});

test('#212 local IANA day boundaries survive DST skips and repeated wall-clock hours',()=>{
  const ny=setDailyRoutine({},'routine-1',{startDate:'2026-01-01',timeZone:'America/New_York'});
  const get=instant=>getDailyOccurrence(task(),ny,{now:new Date(instant)}).dayKey;
  assert.equal(get('2026-03-08T04:59:59Z'),'2026-03-07');
  assert.equal(get('2026-03-08T05:00:00Z'),'2026-03-08');
  assert.equal(get('2026-11-01T03:59:59Z'),'2026-10-31');
  assert.equal(get('2026-11-01T04:00:00Z'),'2026-11-01');
  assert.equal(get('2026-11-01T05:30:00Z'),'2026-11-01');
  assert.equal(get('2026-11-01T06:30:00Z'),'2026-11-01');
  assert.equal(routineDayKey(new Date('2026-11-01T06:30:00Z'),'Asia/Jakarta'),'2026-11-01');
});

test('#212 a future start has no occurrence yet and early completions are rejected',()=>{
  const future=setDailyRoutine({},'routine-1',{startDate:'2026-12-01'});
  const view=getDailyOccurrence(task(),future,{now:new Date('2026-11-19T20:00:00Z')});
  assert.equal(view.active,false);
  assert.equal(view.completed,false);
  assert.throws(()=>setDailyCompletion(future,'routine-1','2026-11-30',true),/start|before/i);
});

test('#212 strict input validation rejects poisoned ids, bad zones and malformed dates',()=>{
  for (const id of ['__proto__','constructor','bad/id','']){
    assert.throws(()=>setDailyRoutine({},id,{startDate:'2026-11-19'}));
  }
  for (const rule of [
    {frequency:'weekly',startDate:'2026-11-19',timeZone:'Asia/Jakarta',completedDates:[]},
    {frequency:'daily',startDate:'2026-02-29',timeZone:'Asia/Jakarta',completedDates:[]},
    {frequency:'daily',startDate:'2026-11-19',timeZone:'Bad/Zone',completedDates:[]},
    {frequency:'daily',startDate:'2026-11-19',timeZone:'Asia/Jakarta',completedDates:['2026-11-31']},
    {frequency:'daily',startDate:'2026-11-19',timeZone:'Asia/Jakarta',completedDates:['2026-11-18']},
    {frequency:'daily',startDate:'2026-11-19',timeZone:'Asia/Jakarta',completedDates:[],secret:'unexpected'},
  ])assert.throws(()=>normalizeTaskRoutines({'routine-1':rule}));
  assert.throws(()=>setDailyCompletion(rules(),'routine-1','2026-11-20','true'));
  assert.throws(()=>routineDayKey(new Date('invalid'),'Asia/Jakarta'));
  assert.throws(()=>setDailyCompletion({},'routine-1','2026-11-20',true));
  assert.throws(()=>normalizeTaskRoutines({['routine-1']:{...rules()['routine-1'],completedDates:Array.from({length:2001},(_,i)=>'2026-11-19')}}));
});

test('#212 enabling the same daily rule preserves history, changing its timezone fails closed',()=>{
  const withHistory=setDailyCompletion(rules(),'routine-1','2026-11-19',true);
  const repeated=setDailyRoutine(withHistory,'routine-1',{startDate:'2026-11-19',timeZone:'Asia/Jakarta'});
  assert.deepEqual(repeated,withHistory);
  assert.throws(()=>setDailyRoutine(withHistory,'routine-1',{startDate:'2026-11-19',timeZone:'UTC'}),/timezone|history|existing/i);
  assert.throws(()=>setDailyRoutine(withHistory,'routine-1',{startDate:'2026-11-20',timeZone:'Asia/Jakarta'}),/start|history|existing/i);
});

test('#212 extension validation and old V6 backup re-import preserve private recurrence dates',()=>{
  const input=rules();
  const recorded=setDailyCompletion(input,'routine-1','2026-11-19',true);
  const extras=normalizeExtensions({taskRoutines:recorded});
  assert.deepEqual(extras.taskRoutines,recorded);
  assert.equal(Object.hasOwn(normalizeExtensions({}),'taskRoutines'),false);
  assert.deepEqual(validateBackup(backup(extras),{sanitizeHtml:sanitizer}).extensions.taskRoutines,recorded);
  assert.deepEqual(normalizeExtensions(JSON.parse(JSON.stringify(extras))).taskRoutines,recorded);
  assert.equal(normalizeExtensions({taskRoutines:recorded}).taskRoutines['routine-1'].completedDates.length,1);
});

test('#212 unsorted or duplicated date-key history is canonical and bounded without silently clearing data',()=>{
  const normalized=normalizeTaskRoutines({'routine-1':{
    frequency:'daily',startDate:'2026-11-01',timeZone:'Asia/Jakarta',
    completedDates:['2026-11-20','2026-11-19','2026-11-20']
  }});
  assert.deepEqual(normalized['routine-1'].completedDates,['2026-11-19','2026-11-20']);
  const large={'routine-1':{...normalized['routine-1'],completedDates:Array.from({length:2000},(_,i)=>{
    const date=new Date(Date.UTC(2020,0,1+i));return date.toISOString().slice(0,10);
  })}};
  large['routine-1'].startDate='2020-01-01';
  assert.equal(normalizeTaskRoutines(large)['routine-1'].completedDates.length,2000);
  assert.throws(()=>normalizeExtensions({taskRoutines:{...large,['r2']:{...large['routine-1'],completedDates:large['routine-1'].completedDates}} ,
    notes:Array.from({length:80},(_,i)=>({id:'n'+i,title:'',text:'x'.repeat(6000),x:0,y:0,width:250,height:200,color:'sand'}))
  }),/oversized|extensions/i);
});

test('#212 daily completion round-trips through the existing serialized CAS sync path without cloning task rows',async()=>{
  let persisted=backup({taskRoutines:rules()}),revision=0,writes=0;
  const repository={
    async loadOwnerSnapshot(){return {revision,snapshot:structuredClone(persisted)};},
    async saveSnapshot(snapshot,expectedRevision){
      if(expectedRevision!==revision)throw Object.assign(Error('stale CAS'),{code:'CONFLICT'});
      writes++;persisted=structuredClone(snapshot);return {revision:++revision};
    }
  };
  const controller=createSyncController({repository,initialRevision:0,debounceMs:600000,pollMs:0,
    eventTarget:null,visibilityTarget:null});
  try {
    const before=structuredClone(persisted);
    const daily=setDailyCompletion(before.extensions.taskRoutines,'routine-1','2026-11-19',true);
    before.extensions.taskRoutines=daily;
    controller.queueOwned(before);
    assert.equal((await controller.flush()).ok,true);
    const reloaded=validateBackup({...persisted,format:'orbit-backup',version:6},{sanitizeHtml:sanitizer});
    assert.equal(writes,1);
    assert.equal(revision,1);
    assert.equal(reloaded.tasks.length,1,'No duplicate task rows are generated each day');
    assert.deepEqual(reloaded.extensions.taskRoutines['routine-1'].completedDates,['2026-11-19']);
    const later=structuredClone(persisted);
    later.extensions.taskRoutines=setDailyCompletion(later.extensions.taskRoutines,'routine-1','2026-11-20',true);
    controller.queueOwned(later);
    assert.equal((await controller.flush()).ok,true);
    assert.equal(revision,2);
    assert.deepEqual(persisted.extensions.taskRoutines['routine-1'].completedDates,['2026-11-19','2026-11-20']);
  } finally {controller.dispose();}
});

test('#212 concurrent stale device CAS failure keeps its private draft and does not overwrite the winner',async()=>{
  let persisted=backup({taskRoutines:rules()}),revision=0,writeCount=0;
  const repository={
    async loadOwnerSnapshot(){return {revision,snapshot:structuredClone(persisted)};},
    async saveSnapshot(snapshot,expectedRevision){
      if(expectedRevision!==revision)throw Object.assign(Error('revision mismatch'),{code:'CONFLICT'});
      persisted=structuredClone(snapshot);writeCount++;return {revision:++revision};
    }
  };
  const make=()=>createSyncController({repository,initialRevision:0,debounceMs:600000,pollMs:0,
    eventTarget:null,visibilityTarget:null});
  const first=make(),second=make();
  try {
    const day1=structuredClone(persisted);const day2=structuredClone(persisted);
    day1.extensions.taskRoutines=setDailyCompletion(day1.extensions.taskRoutines,'routine-1','2026-11-19',true);
    day2.extensions.taskRoutines=setDailyCompletion(day2.extensions.taskRoutines,'routine-1','2026-11-20',true);
    first.queueOwned(day1);second.queueOwned(day2);
    assert.equal((await first.flush()).ok,true);
    assert.equal((await second.flush()).ok,false);
    assert.equal(second.getState().errorCode,'CONFLICT');
    assert.equal(second.getState().hasPending,true);
    assert.equal(second.getPendingSnapshot().extensions.taskRoutines['routine-1'].completedDates[0],'2026-11-20');
    assert.deepEqual(persisted.extensions.taskRoutines['routine-1'].completedDates,['2026-11-19']);
    assert.equal(writeCount,1,'Stale write must never silently overwrite winner');
  } finally {first.dispose();second.dispose();}
});
