import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPortableArchive, inspectPortableArchive, PORTABLE_MAX_TEXT_BYTES
} from '../src/cloud/portable-backup.js';

const OWNER='11111111-1111-4111-8111-111111111111';
const sanitizeHtml=value=>value;

function snapshot(html,count=1){
  return {format:'orbit-backup',version:6,
    branches:[{id:'inbox',parentId:'root',label:'Unsorted'}],
    tasks:[],preferences:{colorMode:'deadline'},milestones:[],
    journalEntries:Array.from({length:count},(_,i)=>({
      id:'page_'+i,date:'2026-11-12',title:'Synthetic multilingual journal',html
    }))};
}
const exportText=async(workspace)=>createPortableArchive(workspace,{
  ownerId:OWNER,sanitizeHtml,
  download:async()=>{throw Error('No private media is referenced');}
});

test('BP-02: valid CJK journals cannot produce a .orbit file exceeding the restore UI byte limit',
  {timeout:30000},async()=>{
    const html='<p>'+('漢'.repeat(57000))+'</p>';
    // 600 individually valid journal HTML fields fit the 96 MiB code-unit
    // quota but exceed it in real UTF-8 file bytes (as checked by the gallery).
    assert.ok(html.length<140000);
    assert.ok(html.length*600<PORTABLE_MAX_TEXT_BYTES);
    assert.ok(new Blob([html]).size*600>PORTABLE_MAX_TEXT_BYTES);
    await assert.rejects(exportText(snapshot(html,600)),/96|file|too large|exceed|limit/i,
      'Never present a completed export that the owner cannot select for restore');
});

test('BP-02: modest multilingual/emoji content still exports and imports unchanged',async()=>{
  const text='<p>'+('a'.repeat(32767))+'🖼️漢語'+' text</p>';
  const original=snapshot(text);
  const archive=await exportText(original);
  const serialized=JSON.stringify(archive);
  assert.ok(new Blob([serialized]).size<=PORTABLE_MAX_TEXT_BYTES);
  const inspected=await inspectPortableArchive(serialized,{sanitizeHtml});
  assert.equal(inspected.snapshot.journalEntries[0].html,text);
  assert.deepEqual(inspected.files,[]);
});
