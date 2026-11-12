import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyPrivateGalleryItems,validateDetachedBackupSelection}
  from '../src/cloud/owner-tools.js';

const OWNER='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const attached=OWNER+'/33333333-3333-4333-8333-333333333333.png';
const detached=OWNER+'/44444444-4444-4444-8444-444444444444.webp';
const foreign=OTHER+'/55555555-5555-4555-8555-555555555555.png';

test('BP-12 gallery marks shared references without treating a detached file as deleted',()=>{
  const items=[
    {path:attached,mime:'image/png',size:200,createdAt:null},
    {path:detached,mime:'image/webp',size:123,createdAt:'2026-11-11T00:00:00Z'}
  ];
  const usage=new Map([[attached,[{kind:'note-attachment',id:'note1'},
    {kind:'journal-attachment',id:'page2'}]]]);
  const result=classifyPrivateGalleryItems(items,usage,OWNER);
  assert.deepEqual(result.map(x=>({path:x.path,referenceCount:x.referenceCount,detached:x.detached})),[
    {path:attached,referenceCount:2,detached:false},
    {path:detached,referenceCount:0,detached:true}
  ]);
  assert.deepEqual(items[0],{path:attached,mime:'image/png',size:200,createdAt:null});
  assert.deepEqual(usage.get(attached),[{kind:'note-attachment',id:'note1'},{kind:'journal-attachment',id:'page2'}]);
});

test('BP-12 gallery fails closed on malformed or foreign inventory metadata',()=>{
  const row={path:attached,mime:'image/png',size:123,createdAt:null};
  const usage=new Map();
  for(const values of [
    [{...row,path:foreign}], [{...row,path:'javascript:alert(1)'}],
    [row,row], [{...row,size:-1}], [{...row,mime:'text/html'}],
    [{...row,createdAt:{unsafe:true}}], [{...row,path:OWNER+'/../evil.png'}]
  ])assert.throws(()=>classifyPrivateGalleryItems(values,usage,OWNER));
  assert.throws(()=>classifyPrivateGalleryItems('wrong',usage,OWNER));
  assert.throws(()=>classifyPrivateGalleryItems([row],{},OWNER));
});

test('BP-12 only explicitly chosen, still-detached owner media enters optional backups',()=>{
  const usage=new Map([[attached,[{kind:'journal-attachment',id:'page'}]]]);
  assert.deepEqual(validateDetachedBackupSelection([],usage,OWNER),[]);
  assert.deepEqual(validateDetachedBackupSelection([detached],usage,OWNER),[detached]);
  for(const paths of [[attached],[foreign],[detached,detached],['unsafe'],null]){
    assert.throws(()=>validateDetachedBackupSelection(paths,usage,OWNER));
  }
  assert.throws(()=>validateDetachedBackupSelection(Array(97).fill(detached),usage,OWNER));
  assert.throws(()=>validateDetachedBackupSelection([detached],new Map([[detached,[]]]),OWNER),
    'even metadata-only image paths are considered referenced');
});
