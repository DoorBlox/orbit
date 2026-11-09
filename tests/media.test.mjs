import test from 'node:test';
import assert from 'node:assert/strict';
import {validMediaPath,validMediaOwner,validateImage,createPrivateMedia} from '../src/cloud/media.js';
const OWNER='11111111-1111-4111-8111-111111111111',OTHER='22222222-2222-4222-8222-222222222222';
const file='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('only correctly scoped, typed private media paths are accepted',()=>{
  assert.equal(validMediaPath(OWNER+'/'+file+'.png'),true);
  assert.equal(validMediaOwner(OWNER+'/'+file+'.webp',OWNER),true);
  for(const value of ['https://example.com/private.png','../private.png',OTHER+'/'+file+'.png',
    OWNER+'/../../secret.png'])assert.equal(validMediaOwner(value,OWNER),false);
});
test('image signature and size are checked independently of browser MIME claims',async()=>{
  const png=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});
  assert.equal(await validateImage(png),'png');
  const disguised=new Blob([Uint8Array.from([1,2,3,4,5,6,7,8,9,10,11,12])],{type:'image/png'});
  await assert.rejects(validateImage(disguised),/signature/);
  await assert.rejects(validateImage(new Blob(['hello'],{type:'text/plain'})),/PNG/);
});
test('upload and signed read paths verify the active Supabase account',async()=>{
  const seen=[],png=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});
  const client={
    auth:{getUser:async()=>({data:{user:{id:OWNER}},error:null})},
    storage:{from:name=>{assert.equal(name,'orbit-private-media');return {
      upload:async(path)=>{seen.push(path);return {error:null};},
      createSignedUrl:async(path)=>({data:{signedUrl:'https://synthetic.example/signed'},error:null}),
    };}}
  };
  const media=createPrivateMedia(client,{ownerId:OWNER});
  const path=await media.upload(png);
  assert.equal(validMediaOwner(path,OWNER),true);
  assert.equal(seen[0],path);
  assert.equal(await media.signedUrl(path),'https://synthetic.example/signed');
  await assert.rejects(media.signedUrl(OTHER+'/'+file+'.jpg'),/another space/);
  client.auth.getUser=async()=>({data:{user:{id:OTHER}},error:null});
  await assert.rejects(media.signedUrl(path),/expired/);
});

test('authenticated blob previews are cached per account and revoked on dispose',async()=>{
  const path=OWNER+'/'+file+'.png';let calls=0,created=0,revoked=0;
  const priorCreate=URL.createObjectURL,priorRevoke=URL.revokeObjectURL;
  URL.createObjectURL=()=>{created++;return 'blob:orbit-private-preview';};
  URL.revokeObjectURL=url=>{assert.equal(url,'blob:orbit-private-preview');revoked++;};
  const client={auth:{getUser:async()=>({data:{user:{id:OWNER}},error:null})},
    storage:{from:()=>({download:async()=>{calls++;return {data:new Blob(['private-bytes-for-image'],{type:'image/png'}),error:null};}})}};
  try{
    const media=createPrivateMedia(client,{ownerId:OWNER});
    assert.equal(await media.previewUrl(path),'blob:orbit-private-preview');
    assert.equal(await media.previewUrl(path),'blob:orbit-private-preview');
    assert.deepEqual([calls,created],[1,1]);
    await assert.rejects(media.previewUrl(OTHER+'/'+file+'.png'),/another space/);
    media.dispose();await Promise.resolve();
    assert.equal(revoked,1);
    await assert.rejects(media.previewUrl(path),/expired/);
  }finally{URL.createObjectURL=priorCreate;URL.revokeObjectURL=priorRevoke;}
});
test('failed private downloads never create a preview URL and can be retried',async()=>{
  const path=OWNER+'/'+file+'.jpg';let calls=0;
  const media=createPrivateMedia({auth:{getUser:async()=>({data:{user:{id:OWNER}}})},
    storage:{from:()=>({download:async()=>{calls++;return {error:{message:'denied'}};}})}},{ownerId:OWNER});
  await assert.rejects(media.previewUrl(path),/could not be downloaded/);
  await assert.rejects(media.previewUrl(path),/could not be downloaded/);
  assert.equal(calls,2);media.dispose();
});
test('cached preview never bypasses a changed authentication session',async()=>{
  const path=OWNER+'/'+file+'.png';let active=OWNER;
  const earlier=URL.createObjectURL;URL.createObjectURL=()=> 'blob:private';
  const media=createPrivateMedia({auth:{getUser:async()=>({data:{user:{id:active}}})},
    storage:{from:()=>({download:async()=>({data:new Blob(['private-content'],{type:'image/png'})})})}},{ownerId:OWNER});
  try{
    assert.equal(await media.previewUrl(path),'blob:private');
    active=OTHER;
    await assert.rejects(media.previewUrl(path),/expired/);
    media.dispose();
  }finally{URL.createObjectURL=earlier;}
});
