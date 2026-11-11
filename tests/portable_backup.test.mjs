import test from 'node:test';
import assert from 'node:assert/strict';
import { collectReferencedPaths, createPortableArchive, inspectPortableArchive,
  rehydratePortableArchive } from '../src/cloud/portable-backup.js';

const OWNER='11111111-1111-4111-8111-111111111111';
const TARGET='22222222-2222-4222-8222-222222222222';
const FILE='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PATH=OWNER+'/'+FILE+'.png';
const PNG=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});
const fixture=()=>({format:'orbit-backup',version:6,
  branches:[{id:'inbox',parentId:'root',label:'Unsorted'}],
  tasks:[{id:'task_1',title:'Private task',projectId:'inbox'}],
  preferences:{colorMode:'deadline'},milestones:[],
  journalEntries:[{id:'page_1',date:'2026-11-09',title:'Private journal',html:'<p>Safe</p>'}],
  extensions:{notes:[
    {id:'note_a',title:'Image',text:'A',x:0,y:0,width:300,height:240,color:'mint',imagePath:PATH},
    {id:'note_b',title:'Same image',text:'B',x:400,y:0,width:300,height:240,color:'peach',imagePath:PATH},
  ],journalImages:{page_1:PATH},journalScenes:{},taskLinks:{}}});
const sanitizeHtml=s=>s;
const make=async(snapshot=fixture(),download=async()=>PNG,ownerId=OWNER)=>createPortableArchive(snapshot,{ownerId,download,sanitizeHtml});

test('collect referenced private images from notes and journal without duplicates',()=>{
  assert.deepEqual(collectReferencedPaths(fixture()),[PATH]);
  const without=fixture();without.extensions.notes=[];without.extensions.journalImages={};
  assert.deepEqual(collectReferencedPaths(without),[]);
});

test('portable archive contains the full validated workspace and image bytes with SHA-256',async()=>{
  let calls=0;
  const archive=await make(fixture(),async path=>{assert.equal(path,PATH);calls++;return PNG;});
  assert.equal(archive.format,'orbit-portable-backup');
  assert.equal(archive.version,1);
  assert.equal(archive.snapshot.version,6);
  assert.equal(archive.snapshot.journalEntries[0].title,'Private journal');
  assert.equal(archive.assets.length,1);
  assert.equal(calls,1);
  assert.match(archive.assets[0].sha256,/^[a-f0-9]{64}$/);
  assert.equal(archive.assets[0].size,12);
  assert.equal(archive.assets[0].mime,'image/png');
  const inspected=await inspectPortableArchive(JSON.stringify(archive),{sanitizeHtml});
  assert.deepEqual(inspected.snapshot.extensions.journalImages,{page_1:PATH});
  assert.equal(inspected.files.length,1);
  assert.deepEqual(new Uint8Array(await inspected.files[0].blob.arrayBuffer()),new Uint8Array(await PNG.arrayBuffer()));
});

test('archive without images is still complete, without fetching Storage',async()=>{
  const snapshot=fixture();snapshot.extensions.notes=[];snapshot.extensions.journalImages={};
  const archive=await make(snapshot,async()=>{throw Error('Should never call download');});
  assert.deepEqual(archive.assets,[]);
  const inspected=await inspectPortableArchive(archive,{sanitizeHtml});
  assert.equal(inspected.files.length,0);
});

test('missing, failing, foreign-account and tampered media cannot produce a fake complete export',async()=>{
  await assert.rejects(make(fixture(),async()=>{throw Error('offline');}),/offline/);
  await assert.rejects(make(fixture(),async()=>null),/image|blob/i);
  await assert.rejects(make(fixture(),async()=>PNG,TARGET),/another|account|owner/i);
  await assert.rejects(make(fixture(),async()=>new Blob(['not really png data'],{type:'image/png'})),/signature/i);
});

test('import rejects modified bytes, missing, duplicated or extra image references',async()=>{
  const archive=await make();
  const variants=[
    obj=>{obj.assets[0].data='AA'+obj.assets[0].data.slice(2);},
    obj=>{obj.assets=[];},
    obj=>{obj.assets.push({...obj.assets[0]});},
    obj=>{obj.assets.push({...obj.assets[0],path:OWNER+'/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png'});},
    obj=>{obj.assets[0].mime='image/jpeg';},
    obj=>{obj.assets[0].sha256='0'.repeat(64);},
    obj=>{obj.assets[0].data='!not base64!';},
    obj=>{obj.snapshot.extensions.notes[0].imagePath='../../escaping.png';},
  ];
  for(const change of variants){
    const bad=structuredClone(archive);change(bad);
    await assert.rejects(inspectPortableArchive(bad,{sanitizeHtml}),undefined,JSON.stringify(change));
  }
});

test('inspected archive remaps duplicated image references into the importing owner namespace',async()=>{
  const original=await make();
  const inspected=await inspectPortableArchive(original,{sanitizeHtml});
  let uploads=0;const imported=await rehydratePortableArchive(inspected,{ownerId:TARGET,upload:async blob=>{
    uploads++;assert.equal(blob.type,'image/png');return TARGET+'/'+FILE+'.png';}});
  assert.equal(uploads,1);
  assert.equal(imported.extensions.notes[0].imagePath,TARGET+'/'+FILE+'.png');
  assert.equal(imported.extensions.notes[1].imagePath,TARGET+'/'+FILE+'.png');
  assert.equal(imported.extensions.journalImages.page_1,TARGET+'/'+FILE+'.png');
  assert.equal(inspected.snapshot.extensions.notes[0].imagePath,PATH);
  assert.equal(original.snapshot.extensions.notes[0].imagePath,PATH);
});

test('no existing workspace snapshot is returned if any upload fails or changes owner',async()=>{
  const inspected=await inspectPortableArchive(await make(),{sanitizeHtml});
  await assert.rejects(rehydratePortableArchive(inspected,{ownerId:TARGET,upload:async()=>{throw Error('Network');}}),/Network/);
  await assert.rejects(rehydratePortableArchive(inspected,{ownerId:TARGET,upload:async()=>PATH}),/another|account|owner/i);
});

test('nonportable objects, invalid version, oversized payload and suspicious binary are refused',async()=>{
  await assert.rejects(inspectPortableArchive(fixture(),{sanitizeHtml}),/portable/i);
  const archive=await make();
  for(const modify of [x=>{x.version=0;},x=>{x.assets[0].size=99;},
    x=>{x.assets[0].data='A'.repeat(8*1024*1024);}]){
    const bad=structuredClone(archive);modify(bad);
    await assert.rejects(inspectPortableArchive(bad,{sanitizeHtml}));
  }
});

test('EX-02 .orbit backup exports image bytes from canvas-only scenes and restores positions across owners',async()=>{
  const snapshot=fixture();
  snapshot.extensions.notes.forEach(note=>{delete note.imagePath;});
  snapshot.extensions.journalImages={};
  const scene={type:'excalidraw',version:2,source:'https://orbit.starscene.com/',
    appState:{viewBackgroundColor:'#f9edda'},
    elements:[{id:'free_image',type:'image',fileId:'file_1',x:-850,y:1490,width:440,height:360}],
    files:{file_1:{path:PATH,mimeType:'image/png'}}};
  snapshot.extensions.notes[0].scene=structuredClone(scene);
  snapshot.extensions.journalScenes.page_1=structuredClone(scene);
  assert.deepEqual(collectReferencedPaths(snapshot),[PATH]);
  let downloads=0;
  const exported=await make(snapshot,async path=>{downloads++;assert.equal(path,PATH);return PNG;});
  assert.equal(downloads,1,'identical private image in two scenes fetched once');
  assert.equal(exported.assets.length,1);
  assert.equal(JSON.stringify(exported.snapshot).includes('data:image/'),false);
  const inspected=await inspectPortableArchive(exported,{sanitizeHtml});
  let uploads=0;
  const restored=await rehydratePortableArchive(inspected,{ownerId:TARGET,upload:async blob=>{
    uploads++;assert.equal(blob.type,'image/png');return TARGET+'/'+FILE+'.png';
  }});
  assert.equal(uploads,1);
  assert.equal(restored.extensions.notes[0].scene.files.file_1.path,TARGET+'/'+FILE+'.png');
  assert.equal(restored.extensions.journalScenes.page_1.files.file_1.path,TARGET+'/'+FILE+'.png');
  assert.equal(restored.extensions.journalScenes.page_1.elements[0].x,-850);
  assert.equal(restored.extensions.journalScenes.page_1.elements[0].y,1490);
  assert.equal(inspected.snapshot.extensions.notes[0].scene.files.file_1.path,PATH,
    'import must not mutate validated backup or source owner');
  const corrupted=structuredClone(exported);
  corrupted.snapshot.extensions.journalScenes.page_1.files.file_1.path=
    '22222222-2222-4222-8222-222222222222/cccccccc-cccc-4ccc-8ccc-cccccccccccc.png';
  await assert.rejects(inspectPortableArchive(corrupted,{sanitizeHtml}),
    /incomplete|invalid|image/i,'no missing or foreign file reference may enter workspace');
});

test('EX-02 backup refuses missing privately referenced canvas images before returning an archive',async()=>{
  const snapshot=fixture();
  snapshot.extensions.notes.forEach(note=>{delete note.imagePath;});
  snapshot.extensions.journalImages={};
  snapshot.extensions.notes[0].scene={type:'excalidraw',version:2,
    appState:{viewBackgroundColor:'#f9edda'},
    elements:[{id:'image_1',type:'image',fileId:'file_1',x:10,y:10,width:50,height:50}],
    files:{file_1:{path:PATH,mimeType:'image/png'}}};
  await assert.rejects(make(snapshot,async()=>{throw Error('Storage offline');}),/offline/);
  await assert.rejects(make(snapshot,async()=>null),/image|blob/i);
  await assert.rejects(make(snapshot,async()=>PNG,TARGET),/owner|account/i);
});
