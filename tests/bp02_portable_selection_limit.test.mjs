import test from 'node:test';
import assert from 'node:assert/strict';
import {createPortableArchive,inspectPortableArchive} from '../src/cloud/portable-backup.js';

const OWNER='11111111-1111-4111-8111-111111111111';
const FILE=OWNER+'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const PNG=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});
const sanitizeHtml=s=>s;
function snapshot(referenced=false){
  return {format:'orbit-backup',version:6,
    branches:[{id:'inbox',parentId:'root',label:'Unsorted'}],
    tasks:[],preferences:{colorMode:'deadline'},milestones:[],journalEntries:[],
    extensions:{notes:[],journalImages:referenced?{page_1:FILE}:{},journalScenes:{},taskLinks:{}}};
}
async function exportPaths(paths,referenced=false,onDownload=()=>{}){
  return createPortableArchive(snapshot(referenced),{ownerId:OWNER,libraryPaths:paths,
    sanitizeHtml,download:async path=>{onDownload(path);return PNG;}});
}

test('BP-02: 97 repeated explicit detached selections export one recoverable file',async()=>{
  let downloads=0;
  const archive=await exportPaths(Array(97).fill(FILE),false,()=>downloads++);
  assert.equal(downloads,1,'repeated selection cannot duplicate physical downloads');
  assert.equal(archive.manifest.assetCount,1);
  assert.deepEqual(archive.manifest.libraryOnlyPaths,[FILE]);
  const inspected=await inspectPortableArchive(JSON.stringify(archive),{sanitizeHtml});
  assert.equal(inspected.files.length,1);
  assert.deepEqual(inspected.manifest.libraryOnlyPaths,[FILE]);
});

test('BP-02: repeated selections already referenced in a Journal do not exceed file budget',async()=>{
  let downloads=0;
  const archive=await exportPaths(Array(97).fill(FILE),true,()=>downloads++);
  assert.equal(downloads,1);
  assert.equal(archive.manifest.assetCount,1);
  assert.equal(archive.manifest.libraryOnlyPaths,undefined,
    'an already referenced image must not be incorrectly marked detached');
});

test('BP-02: 97 distinct files are denied before any network fetch',async()=>{
  const unique=Array.from({length:97},(_,i)=>
    OWNER+'/'+String(i).padStart(8,'0')+'-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png');
  let downloads=0;
  await assert.rejects(exportPaths(unique,false,()=>downloads++),/64 MB|96-image|limit/i);
  assert.equal(downloads,0);
});

test('BP-02: an absurdly long selection list is rejected even if all paths duplicate',async()=>{
  let downloads=0;
  await assert.rejects(exportPaths(Array(3073).fill(FILE),false,()=>downloads++),/limit|64 MB|96-image/i);
  assert.equal(downloads,0,'malformed selection input must not start file downloads');
});
