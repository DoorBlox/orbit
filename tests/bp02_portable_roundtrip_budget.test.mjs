import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPortableArchive,inspectPortableArchive,PORTABLE_MAX_TEXT_BYTES
} from '../src/cloud/portable-backup.js';

const OWNER='11111111-1111-4111-8111-111111111111';
const sanitizeHtml=value=>value;

function validLargeWorkspace(){
  // Both counts and each field are individually valid. Their combined
  // serialized text is larger than the v1 importer's 96 MiB input limit.
  const html='<p>'+('x'.repeat(139993))+'</p>';
  const description='d'.repeat(3000);
  assert.equal(html.length,140000);
  assert.ok(600*html.length+6000*description.length>PORTABLE_MAX_TEXT_BYTES);
  return {format:'orbit-backup',version:6,
    branches:[{id:'inbox',parentId:'root',label:'Unsorted'}],
    tasks:Array.from({length:6000},(_,i)=>({
      id:'task_'+i,title:'Test task',projectId:'inbox',description
    })),
    preferences:{colorMode:'deadline'},milestones:[],
    journalEntries:Array.from({length:600},(_,i)=>({
      id:'journal_'+i,date:'2026-11-12',title:'Private journal',html
    }))};
}

test('BP-02: export refuses a valid workspace that cannot pass its own 96 MiB import text limit',
  {timeout:30000},async()=>{
    let downloads=0;
    await assert.rejects(createPortableArchive(validLargeWorkspace(),{
      ownerId:OWNER,sanitizeHtml,
      download:async()=>{downloads++;throw Error('No images are referenced');}
    }),/96|too large|exceed|limit/i);
    assert.equal(downloads,0,'failure must not trigger any private Storage downloads');
  }
);

test('BP-02: a small export remains readable by the unchanged v1 importer',async()=>{
  const snapshot={format:'orbit-backup',version:6,
    branches:[{id:'inbox',parentId:'root',label:'Unsorted'}],
    tasks:[{id:'task_1',title:'Saved',projectId:'inbox'}],
    preferences:{colorMode:'deadline'},milestones:[],journalEntries:[]};
  const archive=await createPortableArchive(snapshot,{
    ownerId:OWNER,sanitizeHtml,download:async()=>{throw Error('Unexpected download');}
  });
  const text=JSON.stringify(archive);
  assert.ok(text.length<PORTABLE_MAX_TEXT_BYTES);
  const review=await inspectPortableArchive(text,{sanitizeHtml});
  assert.equal(review.snapshot.tasks[0].title,'Saved');
  assert.equal(review.files.length,0);
});
