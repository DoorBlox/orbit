import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPortableArchive, PORTABLE_MAX_TEXT_BYTES} from '../src/cloud/portable-backup.js';

const sanitizeHtml=value=>value;
const baseSnapshot=()=>({
  format:'orbit-backup',version:6,
  branches:[{id:'inbox',parentId:'root',label:'Unsorted'}],
  tasks:[],preferences:{colorMode:'deadline'},milestones:[]
});

test('BP-02: direct object archive inspection enforces the same 96 MiB UTF-8 limit as JSON text',
  {timeout:40000},async()=>{
    const html='<p>'+('漢'.repeat(57000))+'</p>';
    const snapshot={...baseSnapshot(),journalEntries:Array.from({length:600},(_,i)=>({
      id:'page_'+i,date:'2026-11-12',title:'Synthetic Unicode journal',html
    }))};
    const archive={
      format:'orbit-portable-backup',version:1,exportedAt:'2026-11-12T00:00:00.000Z',
      manifest:{assetCount:0,totalBytes:0},snapshot,assets:[]
    };
    // All 600 pages obey the per-entry journal limit, but their encoded
    // archive exceeds 96 MiB even with no private media or Base64 payload.
    assert.ok(html.length<140000);
    assert.ok(html.length*600<PORTABLE_MAX_TEXT_BYTES);
    assert.ok(new Blob([html]).size*600>PORTABLE_MAX_TEXT_BYTES);
    await assert.rejects(
      inspectPortableArchive(archive,{sanitizeHtml}),
      /96|file is too large|exceeds|limit/i,
      'An object input must not bypass the same recovery archive size limit'
    );
});

test('BP-02: normal small object-form archive remains inspectable without any uploads',async()=>{
  const archive={
    format:'orbit-portable-backup',version:1,exportedAt:'2026-11-12T00:00:00.000Z',
    manifest:{assetCount:0,totalBytes:0},
    snapshot:{...baseSnapshot(),journalEntries:[{
      id:'page_1',date:'2026-11-12',title:'Small Unicode page',html:'<p>漢語🙂</p>'
    }]},
    assets:[]
  };
  const reviewed=await inspectPortableArchive(archive,{sanitizeHtml});
  assert.equal(reviewed.snapshot.journalEntries[0].html,'<p>漢語🙂</p>');
  assert.deepEqual(reviewed.files,[]);
});
