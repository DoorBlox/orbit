import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrivateMedia } from '../src/cloud/media.js';
import {
  createPortableArchive, inspectPortableArchive, rehydratePortableArchive
} from '../src/cloud/portable-backup.js';

const SOURCE='11111111-1111-4111-8111-111111111111';
const TARGET='22222222-2222-4222-8222-222222222222';
const ATTACHED=SOURCE+'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const DETACHED=SOURCE+'/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png';
const png=last=>new Blob([Uint8Array.from([
  137,80,78,71,13,10,26,10,0,0,0,last
])],{type:'image/png'});
const sanitizeHtml=html=>html;

function snapshot(){
  const scene={type:'excalidraw',version:2,
    appState:{viewBackgroundColor:'#f9edda'},
    elements:[{id:'canvas_image',type:'image',fileId:'file_1',
      x:-180,y:260,width:200,height:140}],
    files:{file_1:{path:ATTACHED,mimeType:'image/png'}}};
  return {format:'orbit-backup',version:6,
    branches:[{id:'inbox',parentId:'root',label:'Unsorted'}],
    tasks:[{id:'task_1',title:'Synthetic workspace',projectId:'inbox'}],
    preferences:{colorMode:'deadline'},milestones:[],
    journalEntries:[{id:'page_1',title:'Rehearsal',date:'2026-11-12',html:'<p>Synthetic only</p>'}],
    extensions:{
      notes:[{id:'sticky_1',title:'Shared attachment',text:'Synthetic',x:0,y:0,
        width:300,height:240,color:'mint',imagePath:ATTACHED,scene}],
      journalImages:{page_1:ATTACHED},
      journalScenes:{page_1:structuredClone(scene)},taskLinks:{}
    }};
}

function fakePrivateStorage({failUploadAt=0,afterUpload}={}){
  const session={owner:SOURCE};
  const stored=new Map([[ATTACHED,png(1)],[DETACHED,png(2)]]);
  const downloads=[];
  let uploads=0;
  const bucket={
    async download(path){
      downloads.push(path);
      if(!path.startsWith(session.owner+'/')||!stored.has(path))
        return {data:null,error:Error('Storage RLS denied or image missing')};
      return {data:stored.get(path),error:null};
    },
    async upload(path,blob,options){
      uploads++;
      assert.equal(options?.upsert,false,'Retry cannot overwrite owner files');
      if(!path.startsWith(session.owner+'/'))
        return {data:null,error:Error('Storage owner mismatch')};
      if(uploads===failUploadAt)
        return {data:null,error:Error('Synthetic interrupted upload')};
      stored.set(path,new Blob([blob],{type:blob.type}));
      if(afterUpload)await afterUpload({uploads,path,session});
      return {data:{path},error:null};
    },
    async list(prefix,{limit,offset}){
      if(prefix!==session.owner)return {data:null,error:Error('Storage RLS denied')};
      const names=[...stored.keys()].filter(path=>path.startsWith(prefix+'/'))
        .sort().slice(offset,offset+limit).map(path=>({
          id:path,name:path.split('/')[1],
          metadata:{size:stored.get(path).size},
          created_at:'2026-11-12T00:00:00Z'
        }));
      return {data:names,error:null};
    }
  };
  const client={
    auth:{getUser:async()=>({data:{user:{id:session.owner}},error:null})},
    storage:{from:name=>{
      assert.equal(name,'orbit-private-media');return bucket;
    }}
  };
  return {session,stored,downloads,client,
    getUploads:()=>uploads,setFailUploadAt:n=>{failUploadAt=n;}};
}
function ownedKeys(storage,owner){
  return [...storage.stored.keys()].filter(path=>path.startsWith(owner+'/')).sort();
}
async function prepareSource(storage){
  const media=createPrivateMedia(storage.client,{ownerId:SOURCE});
  const original=snapshot();
  const archive=await createPortableArchive(original,{
    ownerId:SOURCE,libraryPaths:[DETACHED,DETACHED],
    download:path=>media.download(path),sanitizeHtml
  });
  media.dispose();
  const inspected=await inspectPortableArchive(JSON.stringify(archive),{sanitizeHtml});
  return {original,archive,inspected};
}
async function readBytes(blob){
  return [...new Uint8Array(await blob.arrayBuffer())];
}

test('BP-01/02/12/EX-02: two-owner rehearsal preserves referenced and selected detached image bytes',async()=>{
  const storage=fakePrivateStorage();
  const {original,archive,inspected}=await prepareSource(storage);
  assert.deepEqual(archive.assets.map(asset=>asset.path),[ATTACHED,DETACHED]);
  assert.deepEqual(archive.manifest.libraryOnlyPaths,[DETACHED]);
  assert.equal(storage.downloads.length,2,'shared note/Journal/canvas bytes download once');
  storage.session.owner=TARGET;
  const target=createPrivateMedia(storage.client,{ownerId:TARGET});
  try{
    const restored=await rehydratePortableArchive(inspected,{
      ownerId:TARGET,upload:blob=>target.upload(blob)
    });
    const newPaths=ownedKeys(storage,TARGET);
    assert.equal(newPaths.length,2,'both private assets uploaded to fresh target paths');
    const attached=restored.extensions.notes[0].imagePath;
    assert.ok(attached.startsWith(TARGET+'/'));
    assert.equal(restored.extensions.journalImages.page_1,attached);
    assert.equal(restored.extensions.notes[0].scene.files.file_1.path,attached);
    assert.equal(restored.extensions.journalScenes.page_1.files.file_1.path,attached);
    assert.deepEqual(restored.extensions.journalScenes.page_1.elements[0],{
      id:'canvas_image',type:'image',fileId:'file_1',x:-180,y:260,width:200,height:140
    });
    const detached=newPaths.find(path=>path!==attached);
    assert.ok(detached,'detached opt-in bytes survive without inventing snapshot references');
    assert.equal(JSON.stringify(restored).includes(detached),false);
    assert.equal(JSON.stringify(restored).includes(SOURCE),false);
    assert.deepEqual(await readBytes(await target.download(attached)),await readBytes(png(1)));
    assert.deepEqual(await readBytes(await target.download(detached)),await readBytes(png(2)));
    const inventory=await target.listOwnMedia();
    assert.equal(inventory.items.length,2,'detached image is discoverable in private inventory');
    const prior=createPrivateMedia(storage.client,{ownerId:SOURCE});
    await assert.rejects(prior.download(ATTACHED),/expired/i);
    prior.dispose();
    await assert.rejects(target.download(ATTACHED),/another space|invalid/i);
    assert.equal(original.extensions.notes[0].imagePath,ATTACHED);
    assert.equal(inspected.snapshot.extensions.notes[0].imagePath,ATTACHED);
    assert.equal(ownedKeys(storage,SOURCE).length,2,'source owner's original files remain untouched');
  }finally{target.dispose();}
});

test('BP-02: interrupted target upload keeps sources and reviewed data for non-destructive retry',async()=>{
  const storage=fakePrivateStorage({failUploadAt:2});
  const {original,inspected}=await prepareSource(storage);
  storage.session.owner=TARGET;
  const target=createPrivateMedia(storage.client,{ownerId:TARGET});
  try{
    await assert.rejects(rehydratePortableArchive(inspected,{
      ownerId:TARGET,upload:blob=>target.upload(blob)
    }),/upload|failed|interrupted/i);
    assert.equal(ownedKeys(storage,TARGET).length,1,'first upload may remain orphaned');
    assert.equal(inspected.snapshot.extensions.notes[0].imagePath,ATTACHED);
    assert.deepEqual(original,snapshot());
    storage.setFailUploadAt(0);
    const repaired=await rehydratePortableArchive(inspected,{
      ownerId:TARGET,upload:blob=>target.upload(blob)
    });
    const newPaths=ownedKeys(storage,TARGET);
    assert.equal(newPaths.length,3,'retry creates two NEW objects, never overwrites orphan');
    assert.ok(newPaths.includes(repaired.extensions.notes[0].imagePath));
    assert.equal(repaired.extensions.journalImages.page_1,repaired.extensions.notes[0].imagePath);
    assert.equal(ownedKeys(storage,SOURCE).length,2,'original source bytes remain private');
  }finally{target.dispose();}
});

test('BP-01/02: account switch after target Storage write prevents presenting restored snapshot',async()=>{
  const storage=fakePrivateStorage({afterUpload:async({uploads,session})=>{
    if(uploads===1)session.owner=SOURCE;
  }});
  const {inspected}=await prepareSource(storage);
  storage.session.owner=TARGET;
  const target=createPrivateMedia(storage.client,{ownerId:TARGET});
  try{
    await assert.rejects(rehydratePortableArchive(inspected,{
      ownerId:TARGET,upload:blob=>target.upload(blob)
    }),/expired|sign in again/i);
    assert.equal(ownedKeys(storage,TARGET).length,1,
      'an orphan may exist, but no successful restored snapshot was returned');
    assert.equal(inspected.snapshot.extensions.notes[0].imagePath,ATTACHED);
    assert.equal(ownedKeys(storage,SOURCE).length,2);
  }finally{target.dispose();}
});
