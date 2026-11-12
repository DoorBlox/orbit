import test from 'node:test';
import assert from 'node:assert/strict';
import {createPortableArchive,inspectPortableArchive,rehydratePortableArchive}
  from '../src/cloud/portable-backup.js';

const OWNER='11111111-1111-4111-8111-111111111111';
const TARGET='22222222-2222-4222-8222-222222222222';
const REF=OWNER+'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const DETACHED=OWNER+'/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png';
const SECOND=OWNER+'/cccccccc-cccc-4ccc-8ccc-cccccccccccc.png';
const FOREIGN=TARGET+'/dddddddd-dddd-4ddd-8ddd-dddddddddddd.png';
const PNG=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});
const sanitizeHtml=s=>s;
function fixture(){
  return {format:'orbit-backup',version:6,
    branches:[{id:'inbox',parentId:'root',label:'Unsorted'}],
    tasks:[{id:'task_1',title:'Safe',projectId:'inbox'}],
    preferences:{colorMode:'deadline'},milestones:[],journalEntries:[],
    extensions:{notes:[
      {id:'note_a',title:'Image',text:'A',x:0,y:0,width:300,height:240,color:'mint',imagePath:REF}
    ],journalImages:{},journalScenes:{},taskLinks:{}}};
}
const make=(snapshot=fixture(),libraryPaths=[])=>createPortableArchive(snapshot,{
  ownerId:OWNER,libraryPaths,download:async()=>PNG,sanitizeHtml
});

test('BP-02/12: old portable backup envelope stays compatible without a library manifest field',async()=>{
  const legacy=await make();
  assert.equal(Object.hasOwn(legacy.manifest,'libraryOnlyPaths'),false);
  const restored=await inspectPortableArchive(JSON.stringify(legacy),{sanitizeHtml});
  assert.equal(restored.files.length,1);
  assert.equal(restored.snapshot.extensions.notes[0].imagePath,REF);
});

test('BP-02/12: explicitly included detached library images are checksummed and deduplicated',async()=>{
  const archive=await make(fixture(),[SECOND,REF,DETACHED,SECOND]);
  assert.deepEqual(archive.manifest.libraryOnlyPaths,[DETACHED,SECOND]);
  assert.deepEqual(archive.assets.map(x=>x.path),[REF,DETACHED,SECOND]);
  assert.equal(archive.manifest.assetCount,3);
  assert.equal(archive.manifest.totalBytes,36);
  assert.equal(archive.snapshot.extensions.notes[0].imagePath,REF);
  assert.equal(JSON.stringify(archive).includes('signedUrl'),false);
  const inspection=await inspectPortableArchive(JSON.stringify(archive),{sanitizeHtml});
  assert.deepEqual(inspection.files.map(x=>x.path),[REF,DETACHED,SECOND]);
  assert.deepEqual(inspection.manifest.libraryOnlyPaths,[DETACHED,SECOND]);
});

test('BP-02/12: detached-only workspace is independently portable and restored as private Stored files',async()=>{
  const source=fixture();delete source.extensions.notes[0].imagePath;
  const archive=await make(source,[DETACHED]);
  assert.deepEqual(archive.manifest.libraryOnlyPaths,[DETACHED]);
  assert.deepEqual(archive.assets.map(x=>x.path),[DETACHED]);
  const inspection=await inspectPortableArchive(archive,{sanitizeHtml});
  const uploads=[];
  const restored=await rehydratePortableArchive(inspection,{ownerId:TARGET,upload:async blob=>{
    uploads.push(blob);
    return TARGET+'/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.png';
  }});
  assert.equal(uploads.length,1);
  assert.equal(uploads[0].type,'image/png');
  assert.equal(restored.extensions.notes[0].imagePath,undefined,
    'detached-only media must not become a fabricated note attachment');
  assert.equal(source.extensions.notes[0].imagePath,undefined);
});

test('BP-02/12: referenced assets and detached extras both upload under importing owner',async()=>{
  const inspection=await inspectPortableArchive(await make(fixture(),[DETACHED]),{sanitizeHtml});
  let index=0;
  const imported=await rehydratePortableArchive(inspection,{ownerId:TARGET,upload:async()=>{
    index++;
    return TARGET+'/'+String(index).padStart(8,'0')+'-eeee-4eee-8eee-eeeeeeeeeeee.png';
  }});
  assert.equal(index,2,'the detached asset is privately restored too');
  assert.equal(imported.extensions.notes[0].imagePath,
    TARGET+'/00000001-eeee-4eee-8eee-eeeeeeeeeeee.png');
  assert.equal(inspection.snapshot.extensions.notes[0].imagePath,REF);
});

test('BP-02/12: library-only import rejects appended, reordered, foreign and fabricated manifests before upload',async()=>{
  const valid=await make(fixture(),[DETACHED,SECOND]);
  const mutants=[
    value=>{value.manifest.libraryOnlyPaths=[SECOND,DETACHED];},
    value=>{value.manifest.libraryOnlyPaths=[DETACHED,DETACHED];},
    value=>{value.manifest.libraryOnlyPaths=[REF,DETACHED,SECOND];},
    value=>{value.manifest.libraryOnlyPaths=[DETACHED,FOREIGN];},
    value=>{value.manifest.libraryOnlyPaths=['../../escape.png'];},
    value=>{value.manifest.libraryOnlyPaths='not an array';},
    value=>{value.manifest.libraryOnlyPaths=[DETACHED];},
    value=>{delete value.manifest.libraryOnlyPaths;},
    value=>{value.assets[2].path=FOREIGN;},
    value=>{value.assets[1].data='not-base64';},
  ];
  for(const mutate of mutants){
    const tampered=structuredClone(valid);mutate(tampered);
    await assert.rejects(inspectPortableArchive(tampered,{sanitizeHtml}),undefined,
      'tampered extra manifest must be rejected before any private upload');
  }
});

test('BP-02/12: export rejects malformed, foreign and overlimit private library path inputs',async()=>{
  for(const input of [null,'not an array',[FOREIGN],['../../escape.png'],
    Array.from({length:97},(_,i)=>OWNER+'/'+i.toString(16).padStart(8,'0')+'-eeee-4eee-8eee-eeeeeeeeeeee.png')]){
    await assert.rejects(make(fixture(),input),/image|account|owner|limit|path|archive|library|private/i);
  }
});

test('BP-02/12: a failed detached image fetch aborts the complete backup without partial success',async()=>{
  let calls=0;
  await assert.rejects(createPortableArchive(fixture(),{
    ownerId:OWNER,libraryPaths:[DETACHED],
    download:async path=>{calls++;if(path===DETACHED)throw Error('Storage unavailable');return PNG;},
    sanitizeHtml
  }),/Storage unavailable/);
  assert.equal(calls,2);
});
