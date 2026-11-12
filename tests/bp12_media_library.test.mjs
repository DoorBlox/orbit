import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrivateMedia } from '../src/cloud/media.js';
import { collectMediaReferenceUsage, collectReferencedPaths, detachMediaReference } from '../src/cloud/portable-backup.js';

const OWNER='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const FILE='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PATH=OWNER+'/'+FILE+'.png';
const SECOND=OWNER+'/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png';
const PNG=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});

function scene(){
  return {elements:[
    {id:'element_a',type:'image',fileId:'file_a'},
    {id:'element_b',type:'image',fileId:'file_a'},
  ],files:{file_a:{path:PATH,mimeType:'image/png'}}};
}
function snapshot(){
  return {format:'orbit-backup',version:6,extensions:{
    notes:[
      {id:'sticky_a',imagePath:PATH,scene:scene()},
      {id:'sticky_b',imagePath:PATH},
    ],
    journalImages:{journal_a:PATH},
    journalScenes:{journal_a:scene(),journal_b:{elements:[],files:{extra:{path:SECOND,mimeType:'image/png'}}}},
  }};
}
function storageClient(bucket,getUser=async()=>OWNER){
  return {auth:{getUser:async()=>({data:{user:{id:await getUser()}},error:null})},
    storage:{from:name=>{assert.equal(name,'orbit-private-media');return bucket;}}};
}

test('BP-12: listOwnMedia uses one authenticated owner folder and bounded storage pagination',async()=>{
  const calls=[];
  const listed=[
    {id:'object_1',name:FILE+'.png',metadata:{size:12},created_at:'2026-11-12T08:00:00Z'},
    {id:null,name:'nested-folder'},
    {id:'object_2',name:'../../another-account.png'},
    {id:'object_3',name:'irrelevant.svg'},
    {id:'object_4',name:FILE+'.png'},
  ];
  const media=createPrivateMedia(storageClient({
    list:async(prefix,opts)=>{calls.push([prefix,opts]);return {data:listed,error:null};},
  }),{ownerId:OWNER});
  const result=await media.listOwnMedia({offset:10,limit:5});
  assert.deepEqual(calls,[[OWNER,{limit:5,offset:10,sortBy:{column:'name',order:'asc'}}]]);
  assert.equal(result.items.length,1,'only valid, unique files returned; no folder or traversal rows');
  assert.deepEqual(result.items[0],{path:PATH,mime:'image/png',size:12,
    createdAt:'2026-11-12T08:00:00Z'});
  assert.equal(result.nextOffset,15,'pagination advances by server rows, not filtered rows');
  assert.equal(JSON.stringify(result).includes('signedUrl'),false);
  assert.equal(typeof media.remove,'undefined','listing must not introduce physical deletion');
  for(const options of [{limit:0},{limit:101},{offset:-1},{offset:1.5},{offset:1000001}]){
    await assert.rejects(media.listOwnMedia(options),/page|limit|offset/i);
  }
  media.dispose();
});

test('BP-12: owner switch during Storage listing fails closed instead of showing stale private rows',async()=>{
  let active=OWNER;
  const media=createPrivateMedia(storageClient({
    list:async()=>{active=OTHER;return {data:[{id:'x',name:FILE+'.png'}],error:null};},
  },async()=>active),{ownerId:OWNER});
  await assert.rejects(media.listOwnMedia(),/expired/i);
  await assert.rejects(media.listOwnMedia(),/expired/i);
  media.dispose();
});

test('BP-12: listing backend failures and malformed responses never masquerade as an empty gallery',async()=>{
  for(const result of [{data:null,error:null},{data:[],error:{message:'denied'}},null]){
    const media=createPrivateMedia(storageClient({list:async()=>result}),{ownerId:OWNER});
    await assert.rejects(media.listOwnMedia(),/list|unavailable/i);
    media.dispose();
  }
});

test('BP-12: upload and signed-link issuance cannot return success after account changes mid-flight',async()=>{
  let active=OWNER,uploaded=0;
  const uploader=createPrivateMedia(storageClient({
    upload:async()=>{uploaded++;active=OTHER;return {data:{path:PATH},error:null};},
  },async()=>active),{ownerId:OWNER});
  await assert.rejects(uploader.upload(PNG),/expired/i);
  assert.equal(uploaded,1,'orphaned upload is preserved for non-destructive recovery');
  uploader.dispose();

  active=OWNER;
  const signer=createPrivateMedia(storageClient({
    createSignedUrl:async()=>{active=OTHER;return {data:{signedUrl:'https://synthetic.example/secret'},error:null};},
  },async()=>active),{ownerId:OWNER});
  await assert.rejects(signer.signedUrl(PATH),/expired/i);
  signer.dispose();
});

test('BP-12: media reference index counts shared notes, journal and canvas FILE references',()=>{
  const value=snapshot(),usage=collectMediaReferenceUsage(value,{ownerId:OWNER});
  assert.deepEqual(collectReferencedPaths(value),[PATH,SECOND].sort());
  assert.deepEqual(usage.get(PATH).map(ref=>ref.kind),[
    'note-attachment','note-canvas','note-attachment','journal-attachment','journal-canvas',
  ]);
  assert.equal(usage.get(SECOND).length,1,'orphaned canvas metadata remains a recoverable reference');
  assert.equal(usage.get(SECOND)[0].id,'journal_b');
  assert.throws(()=>collectMediaReferenceUsage(value,{ownerId:OTHER}),/owner|account|private|invalid/i);
  const bad=snapshot();bad.extensions.notes[0].scene.files.file_a.path='../../escape.png';
  assert.throws(()=>collectMediaReferenceUsage(bad),/invalid|private/i);
});

test('BP-12: detach removes exactly one snapshot reference, preserving every clone and Storage object',()=>{
  const before=snapshot();
  const note=detachMediaReference(before,{kind:'note-attachment',id:'sticky_a',ownerId:OWNER});
  assert.equal(note.detachedPath,PATH);
  assert.equal(note.remainingReferences,4);
  assert.equal(note.snapshot.extensions.notes[0].imagePath,undefined);
  assert.equal(note.snapshot.extensions.notes[1].imagePath,PATH,'duplicate sticky keeps the shared file');
  assert.equal(before.extensions.notes[0].imagePath,PATH,'original snapshot is immutable');

  const journal=detachMediaReference(note.snapshot,{kind:'journal-attachment',id:'journal_a',ownerId:OWNER});
  assert.equal(journal.remainingReferences,3);
  assert.equal(journal.snapshot.extensions.journalImages.journal_a,undefined);
  assert.equal(journal.snapshot.extensions.journalScenes.journal_a.files.file_a.path,PATH);
  assert.equal(before.extensions.journalImages.journal_a,PATH);
});

test('BP-12: detaching one of two canvas images keeps shared file metadata until last element',()=>{
  const before=snapshot();
  const first=detachMediaReference(before,{
    kind:'note-canvas-image',id:'sticky_a',elementId:'element_a',ownerId:OWNER,
  });
  assert.equal(first.remainingReferences,5);
  assert.equal(first.snapshot.extensions.notes[0].scene.elements.length,1);
  assert.equal(first.snapshot.extensions.notes[0].scene.files.file_a.path,PATH);
  const last=detachMediaReference(first.snapshot,{
    kind:'note-canvas-image',id:'sticky_a',elementId:'element_b',ownerId:OWNER,
  });
  assert.equal(last.remainingReferences,4);
  assert.deepEqual(last.snapshot.extensions.notes[0].scene.files,{});
  assert.equal(last.snapshot.extensions.notes[0].scene.elements.length,0);
  assert.equal(before.extensions.notes[0].scene.elements.length,2);
  assert.equal(last.snapshot.extensions.journalScenes.journal_a.files.file_a.path,PATH);
});

test('BP-12: no ambiguous, forged or unsupported detach may silently damage a workspace',()=>{
  const value=snapshot();
  for(const opts of [
    {kind:'note-attachment',id:'missing'},
    {kind:'journal-attachment',id:'missing'},
    {kind:'note-canvas-image',id:'sticky_a',elementId:'absent'},
    {kind:'journal-canvas-image',id:'journal_a',elementId:'absent'},
    {kind:'note-canvas-image',id:'sticky_a'},
    {kind:'delete-storage-object',id:'sticky_a'},
    {kind:'note-attachment',id:'sticky_a',ownerId:OTHER},
  ])assert.throws(()=>detachMediaReference(value,opts),undefined,JSON.stringify(opts));
  const duplicate=snapshot();duplicate.extensions.notes.push({...duplicate.extensions.notes[0]});
  assert.throws(()=>detachMediaReference(duplicate,{kind:'note-attachment',id:'sticky_a'}),/ambiguous|invalid|duplicate/i);
  assert.equal(value.extensions.notes[0].imagePath,PATH);
});
