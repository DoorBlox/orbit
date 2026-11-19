import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPortableArchive, inspectPortableArchive, rehydratePortableArchive,
  collectMediaReferenceUsage
} from '../src/cloud/portable-backup.js';

const SOURCE='11111111-1111-4111-8111-111111111111';
const TARGET='22222222-2222-4222-8222-222222222222';
const FOREIGN='33333333-3333-4333-8333-333333333333';
const A=SOURCE+'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const B=SOURCE+'/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg';
const C=SOURCE+'/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webp';
const D=SOURCE+'/dddddddd-dddd-4ddd-8ddd-dddddddddddd.png';
const sanitizeHtml=html=>html;
const fixtureBytes=new Map([
  [A,new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,1])],{type:'image/png'})],
  [B,new Blob([Uint8Array.from([255,216,255,224,0,16,74,70,73,70,0,2])],{type:'image/jpeg'})],
  [C,new Blob([Uint8Array.from([82,73,70,70,6,0,0,0,87,69,66,80,0,3])],{type:'image/webp'})],
  [D,new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,4])],{type:'image/png'})],
]);
const scene=(path,type,imageId)=>({
  type:'excalidraw',version:2,
  appState:{viewBackgroundColor:'#f9edda'},
  elements:[{id:imageId,type:'image',fileId:'file_shared',
    x:-220,y:180,width:360,height:240}],
  files:{file_shared:{path,mimeType:type}}
});
function snapshot(){
  return {
    format:'orbit-backup',version:6,
    branches:[{id:'inbox',parentId:'root',label:'Unsorted'}],
    tasks:[{id:'task_1',projectId:'inbox',title:'Synthetic media release test'}],
    preferences:{colorMode:'deadline'},milestones:[],
    spatialLayout:{journal:{x:930,y:1780,width:1650,height:1300}},
    journalEntries:[{id:'page_1',title:'Canvas page',date:'2026-11-19',
      html:'<p>Synthetic no-personal-data journal.</p>'}],
    extensions:{
      notes:[{id:'sticky_1',title:'Canvas sticky',text:'Synthetic only',
        x:20,y:40,width:900,height:640,color:'mint',mode:'canvas',
        imagePath:A,scene:scene(B,'image/jpeg','sticky_image')}],
      journalImages:{page_1:A},
      journalScenes:{page_1:scene(C,'image/webp','journal_image')},
      journalModes:{page_1:'canvas'},
      journalPaperStyles:{page_1:'grid'},
      taskLinks:{}
    }
  };
}
const bytes=async blob=>[...new Uint8Array(await blob.arrayBuffer())];

test('Release #214/#216/#26/#29: multi-format canvases and enlarged Journal retain byte-identical owner-private assets after .orbit restore',async()=>{
  const original=snapshot(),pristine=structuredClone(original);
  const reads=[];
  const archive=await createPortableArchive(original,{
    ownerId:SOURCE,libraryPaths:[D,D],sanitizeHtml,
    download:async path=>{reads.push(path);return fixtureBytes.get(path);}
  });
  assert.deepEqual(reads,[A,B,C,D],'Every unique referenced and opted-in detached asset is read once');
  assert.equal(archive.manifest.assetCount,4);
  assert.equal(archive.manifest.totalBytes,[...fixtureBytes.values()].reduce((n,b)=>n+b.size,0));
  assert.deepEqual(archive.manifest.libraryOnlyPaths,[D]);
  assert.deepEqual(archive.assets.map(a=>a.mime),['image/png','image/jpeg','image/webp','image/png']);
  const inspected=await inspectPortableArchive(JSON.stringify(archive),{sanitizeHtml});
  const stored=new Map(),remap=new Map();
  let ordinal=0;
  const restored=await rehydratePortableArchive(inspected,{
    ownerId:TARGET,
    upload:async blob=>{
      const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[blob.type];
      const path=TARGET+'/'+String(++ordinal).padStart(8,'0')+'-aaaa-4aaa-8aaa-aaaaaaaaaaaa.'+ext;
      stored.set(path,new Blob([blob],{type:blob.type}));
      remap.set(reads[ordinal-1],path);
      return path;
    }
  });
  assert.equal(stored.size,4);
  for(const [oldPath,newPath] of remap){
    assert.equal(stored.get(newPath).type,fixtureBytes.get(oldPath).type);
    assert.deepEqual(await bytes(stored.get(newPath)),await bytes(fixtureBytes.get(oldPath)));
  }
  assert.equal(restored.extensions.notes[0].imagePath,remap.get(A));
  assert.equal(restored.extensions.journalImages.page_1,remap.get(A));
  assert.equal(restored.extensions.notes[0].scene.files.file_shared.path,remap.get(B));
  assert.equal(restored.extensions.journalScenes.page_1.files.file_shared.path,remap.get(C),
    'file IDs are scoped per scene, never confused between Sticky and Journal');
  assert.equal(restored.extensions.notes[0].scene.files.file_shared.mimeType,'image/jpeg');
  assert.equal(restored.extensions.journalScenes.page_1.files.file_shared.mimeType,'image/webp');
  assert.equal(restored.extensions.notes[0].mode,'canvas');
  assert.equal(restored.extensions.journalModes.page_1,'canvas');
  assert.equal(restored.spatialLayout.journal.width,1650);
  assert.equal(restored.spatialLayout.journal.height,1300);
  assert.deepEqual(restored.extensions.notes[0].scene.elements[0],
    pristine.extensions.notes[0].scene.elements[0]);
  assert.deepEqual(restored.extensions.journalScenes.page_1.elements[0],
    pristine.extensions.journalScenes.page_1.elements[0]);
  assert.equal(JSON.stringify(restored).includes(SOURCE),false,'No source account path survives restore');
  assert.equal(JSON.stringify(restored).includes(remap.get(D)),false,
    'Opted-in detached bytes are retained privately without inventing workspace references');
  assert.deepEqual(original,pristine,'Export and restore never mutate existing workspace data');
  assert.deepEqual(inspected.snapshot.extensions.notes[0].imagePath,A,
    'Reviewed source inspection remains unchanged');
  assert.deepEqual([...collectMediaReferenceUsage(restored,{ownerId:TARGET}).keys()].sort(),
    [remap.get(A),remap.get(B),remap.get(C)].sort());
});

test('Release cross-account preflight rejects ALL foreign scene references before reading even one private asset',async()=>{
  const mixed=snapshot();
  mixed.extensions.journalScenes.page_1.files.file_shared.path=
    FOREIGN+'/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webp';
  const original=structuredClone(mixed);
  let reads=0;
  await assert.rejects(createPortableArchive(mixed,{
    ownerId:SOURCE,sanitizeHtml,
    download:async path=>{reads++;return fixtureBytes.get(path);}
  }),/another account|owner|private|invalid/i);
  assert.equal(reads,0,
    'Do not partly read otherwise valid owner assets before detecting a foreign Excalidraw path');
  assert.deepEqual(mixed,original);
});

test('Release archive fails closed on missing WebP canvas bytes without a partial .orbit file',async()=>{
  const original=snapshot(),before=structuredClone(original),reads=[];
  await assert.rejects(createPortableArchive(original,{
    ownerId:SOURCE,sanitizeHtml,
    download:async path=>{
      reads.push(path);
      if(path===C)throw Error('Synthetic missing journal canvas object');
      return fixtureBytes.get(path);
    }
  }),/missing journal canvas object/);
  assert.deepEqual(reads,[A,B,C]);
  assert.deepEqual(original,before,'Export failure must not mutate the saved workspace');
});

test('Release import refuses corrupted JPEG/WebP assets before ANY target Storage uploads',async()=>{
  const archive=await createPortableArchive(snapshot(),{
    ownerId:SOURCE,sanitizeHtml,
    download:async path=>fixtureBytes.get(path)
  });
  for(const index of [1,2]){
    const corrupt=structuredClone(archive);
    const changed=Uint8Array.from(Buffer.from(corrupt.assets[index].data,'base64'));
    changed[changed.length-1]^=0x01;
    corrupt.assets[index].data=Buffer.from(changed).toString('base64');
    let uploads=0;
    await assert.rejects(async()=>{
      const inspected=await inspectPortableArchive(JSON.stringify(corrupt),{sanitizeHtml});
      await rehydratePortableArchive(inspected,{ownerId:TARGET,upload:async()=>{
        uploads++;return TARGET+'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
      }});
    },/checksum/i);
    assert.equal(uploads,0,'Never upload even one asset after failed checksum preflight');
  }
});
