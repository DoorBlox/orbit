import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPortableArchive, inspectPortableArchive, rehydratePortableArchive
} from '../src/cloud/portable-backup.js';

const OWNER='11111111-1111-4111-8111-111111111111';
const TARGET='22222222-2222-4222-8222-222222222222';
const THIRD='33333333-3333-4333-8333-333333333333';
const fileA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const fileB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png';
const fileC='cccccccc-cccc-4ccc-8ccc-cccccccccccc.png';
const A=OWNER+'/'+fileA,B=OWNER+'/'+fileB,C=OWNER+'/'+fileC;
const PNG=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});
const sanitizeHtml=s=>s;
function snapshot(){
  return {format:'orbit-backup',version:6,
    branches:[{id:'inbox',parentId:'root',label:'Unsorted'}],
    tasks:[{id:'task_1',title:'Existing',projectId:'inbox'}],
    preferences:{colorMode:'deadline'},milestones:[],
    journalEntries:[{id:'page_1',date:'2026-11-12',title:'Private',html:'<p>Local</p>'}],
    extensions:{
      notes:[
        {id:'note_1',title:'Shared image',text:'A',x:0,y:0,width:300,height:240,
          color:'mint',imagePath:A,scene:{type:'excalidraw',version:2,
            appState:{viewBackgroundColor:'#f9edda'},
            elements:[{id:'image_1',type:'image',fileId:'file_1',x:15,y:20,width:90,height:80}],
            files:{file_1:{path:A,mimeType:'image/png'},file_unpainted:{path:B,mimeType:'image/png'}}}},
        {id:'note_2',title:'Other',text:'B',x:400,y:0,width:300,height:240,
          color:'peach',imagePath:B},
      ],
      journalImages:{page_1:A},
      journalScenes:{page_1:{type:'excalidraw',version:2,
        appState:{viewBackgroundColor:'#f9edda'},
        elements:[{id:'image_j',type:'image',fileId:'file_j',x:-120,y:210,width:300,height:120}],
        files:{file_j:{path:A,mimeType:'image/png'}}}},
      taskLinks:{}
    }
  };
}
const archive=()=>createPortableArchive(snapshot(),{
  ownerId:OWNER,download:async()=>PNG,libraryPaths:[C],sanitizeHtml
});
const inspect=async()=>inspectPortableArchive(await archive(),{sanitizeHtml});

test('BP-02: one checked asset preserves shared Sticky, Journal and canvas metadata plus selected detached media',async()=>{
  let downloadCalls=0;
  const exported=await createPortableArchive(snapshot(),{
    ownerId:OWNER,libraryPaths:[A,C,B,C],
    download:async()=>{downloadCalls++;return PNG;},sanitizeHtml
  });
  assert.equal(downloadCalls,3,'Each physically referenced or selected object is exported once');
  assert.deepEqual(exported.assets.map(a=>a.path),[A,B,C]);
  assert.deepEqual(exported.manifest.libraryOnlyPaths,[C]);
  const reviewed=await inspectPortableArchive(JSON.stringify(exported),{sanitizeHtml});
  let index=0;
  const restored=await rehydratePortableArchive(reviewed,{ownerId:TARGET,upload:async blob=>{
    assert.equal(blob.type,'image/png');
    index++;
    return TARGET+'/'+String(index).padStart(8,'0')+'-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
  }});
  assert.equal(index,3);
  const remappedA=TARGET+'/00000001-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
  const remappedB=TARGET+'/00000002-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
  assert.equal(restored.extensions.notes[0].imagePath,remappedA);
  assert.equal(restored.extensions.notes[0].scene.files.file_1.path,remappedA);
  assert.equal(restored.extensions.notes[0].scene.files.file_unpainted.path,remappedB);
  assert.equal(restored.extensions.notes[1].imagePath,remappedB);
  assert.equal(restored.extensions.journalImages.page_1,remappedA);
  assert.equal(restored.extensions.journalScenes.page_1.files.file_j.path,remappedA);
  assert.equal(restored.extensions.journalScenes.page_1.elements[0].x,-120);
  assert.equal(reviewed.snapshot.extensions.notes[0].imagePath,A,'reviewed source is unchanged');
});

test('BP-02: forged inspection objects cannot bypass archive review',async()=>{
  const checked=await inspect();
  const forged={snapshot:structuredClone(checked.snapshot),files:[...checked.files],manifest:{...checked.manifest}};
  let uploads=0;
  await assert.rejects(rehydratePortableArchive(forged,{ownerId:TARGET,
    upload:async()=>{uploads++;return TARGET+'/'+fileA;}}),/review|invalid|archive/i);
  assert.equal(uploads,0);
});

test('BP-02: changed reviewed image bytes fail preflight before any upload',async()=>{
  const checked=await inspect();
  const bytes=new Uint8Array(await checked.files[1].blob.arrayBuffer());
  bytes[bytes.length-1]^=1;
  checked.files[1].blob=new Blob([bytes],{type:'image/png'});
  let uploads=0;
  await assert.rejects(rehydratePortableArchive(checked,{ownerId:TARGET,
    upload:async()=>{uploads++;return TARGET+'/'+fileA;}}),/checksum|changed|image|invalid/i);
  assert.equal(uploads,0,'Even valid-signature, changed bytes must not reach private Storage');
});

test('BP-02: changed reviewed snapshot and reordered asset array fail before upload',async()=>{
  for(const mutate of [
    checked=>{checked.snapshot.journalEntries[0].title='Changed after review';},
    checked=>{checked.snapshot.extensions.notes[0].imagePath=THIRD+'/'+fileA;},
    checked=>{checked.files.reverse();},
    checked=>{checked.files.pop();},
    checked=>{checked.manifest.assetCount=999;},
  ]){
    const checked=await inspect();mutate(checked);
    let uploads=0;
    await assert.rejects(rehydratePortableArchive(checked,{ownerId:TARGET,
      upload:async()=>{uploads++;return TARGET+'/'+fileA;}}),/review|image|checksum|changed|invalid|archive/i);
    assert.equal(uploads,0,'Preflight cannot leave orphans for any invalid review state');
  }
});

test('BP-02: snapshot modification during asynchronous upload cannot alter restored content',async()=>{
  const checked=await inspect();let index=0;
  const restored=await rehydratePortableArchive(checked,{ownerId:TARGET,upload:async()=>{
    index++;
    if(index===1)checked.snapshot.journalEntries[0].title='Mutated during upload';
    return TARGET+'/'+String(index).padStart(8,'0')+'-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
  }});
  assert.equal(restored.journalEntries[0].title,'Private');
  assert.equal(checked.snapshot.journalEntries[0].title,'Mutated during upload');
});

test('BP-02: partial upload never stages a snapshot; reviewed backup supports safe retry',async()=>{
  const checked=await inspect(),saved=structuredClone(checked.snapshot);
  let calls=0;
  await assert.rejects(rehydratePortableArchive(checked,{ownerId:TARGET,upload:async()=>{
    if(++calls===2)throw Error('synthetic network disconnect');
    return TARGET+'/'+String(calls).padStart(8,'0')+'-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
  }}),/disconnect/);
  assert.deepEqual(checked.snapshot,saved,'network errors must preserve the inspected data');
  assert.equal(calls,2);
  let retried=0;
  const result=await rehydratePortableArchive(checked,{ownerId:TARGET,upload:async()=>{
    retried++;return TARGET+'/'+String(retried).padStart(8,'0')+'-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png';
  }});
  assert.equal(retried,3,'retry uploads complete new owner-private objects; no destructive cleanup');
  assert.equal(result.extensions.notes[0].imagePath,
    TARGET+'/00000001-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png');
});

test('BP-02: restore stops when upload changes owner even after a successful first object',async()=>{
  const checked=await inspect();let calls=0;
  await assert.rejects(rehydratePortableArchive(checked,{ownerId:TARGET,upload:async()=>{
    calls++;
    return calls===2?THIRD+'/'+fileA:TARGET+'/'+fileA;
  }}),/owner|account|uploaded/i);
  assert.equal(calls,2,'must stop before preparing/applying a cloud workspace');
});

test('BP-02: mixed source-account references are invalid even with matching image bytes and checksums',async()=>{
  const forged=await createPortableArchive(snapshot(),{
    ownerId:OWNER,download:async()=>PNG,sanitizeHtml
  });
  forged.snapshot.extensions.notes[1].imagePath=THIRD+'/'+fileB;
  forged.snapshot.extensions.notes[0].scene.files.file_unpainted.path=THIRD+'/'+fileB;
  forged.assets[1].path=THIRD+'/'+fileB;
  await assert.rejects(inspectPortableArchive(forged,{sanitizeHtml}),
    /owner|account|invalid|private|image/i);
});
