import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateMedia} from '../src/cloud/media.js';

const OWNER='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const PATHS=[1,2,3].map(n=>OWNER+'/'+String(n).padStart(8,'0')+'-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png');
const PNG=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});
function instrumentUrls(t){
  const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;
  let serial=0;const made=[],revoked=[];
  URL.createObjectURL=()=>{const url='blob:bp10-'+(++serial);made.push(url);return url;};
  URL.revokeObjectURL=url=>{revoked.push(url);};
  t.after(()=>{URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;});
  return {made,revoked};
}
function fakeClient({onDownload=async()=>({data:PNG,error:null}),onUser=async()=>OWNER}={}){
  let downloads=0;
  const client={
    auth:{getUser:async()=>({data:{user:{id:await onUser()}},error:null})},
    storage:{from:()=>({download:async path=>{downloads++;return onDownload(path);}})}
  };
  return {client,get downloads(){return downloads;}};
}
test('BP-10: LRU evicts idle previews but never revokes an active note',async t=>{
  const {revoked}=instrumentUrls(t),storage=fakeClient();
  const media=createPrivateMedia(storage.client,{ownerId:OWNER,maxIdlePreviews:1,maxIdleBytes:1024});
  const one=await media.acquirePreview(PATHS[0]);
  const two=await media.acquirePreview(PATHS[1]);
  two.release();
  assert.equal(revoked.length,0,'The active first image must stay valid');
  const three=await media.acquirePreview(PATHS[2]);
  three.release();
  assert.deepEqual(revoked,[two.url],'Only the older unused image is evicted');
  const oneAgain=await media.acquirePreview(PATHS[0]);
  assert.equal(oneAgain.url,one.url,'An active image keeps its original Object URL');
  assert.equal(storage.downloads,3,'An active cache hit must avoid downloading twice');
  one.release();oneAgain.release();
  // Releasing the last active consumer makes that image the newest idle entry.
  assert.ok(revoked.includes(three.url));
  assert.ok(!revoked.includes(one.url));
  media.dispose();
  assert.equal(new Set(revoked).size,revoked.length,'Each Blob URL must be revoked once');
});
test('BP-10: a strict idle byte budget evicts older entries independent of count',async t=>{
  const {revoked}=instrumentUrls(t),storage=fakeClient();
  const media=createPrivateMedia(storage.client,{ownerId:OWNER,maxIdlePreviews:8,maxIdleBytes:18});
  const first=await media.acquirePreview(PATHS[0]);
  first.release();
  const second=await media.acquirePreview(PATHS[1]);
  second.release();
  assert.deepEqual(revoked,[first.url],'Two 12-byte images exceed the 18-byte idle budget');
  const reused=await media.acquirePreview(PATHS[1]);
  assert.equal(reused.url,second.url);
  reused.release();media.dispose();
});
test('BP-10: concurrent callers share a single signed-in Storage download',async t=>{
  const {revoked}=instrumentUrls(t);
  let resolveTransfer;
  const pending=new Promise(resolve=>{resolveTransfer=resolve;});
  const storage=fakeClient({onDownload:()=>pending});
  const media=createPrivateMedia(storage.client,{ownerId:OWNER,maxIdlePreviews:0});
  const requests=[media.acquirePreview(PATHS[0]),media.acquirePreview(PATHS[0]),media.acquirePreview(PATHS[0])];
  for(let i=0;i<40&&storage.downloads!==1;i++)await Promise.resolve();
  assert.equal(storage.downloads,1);
  resolveTransfer({data:PNG,error:null});
  const leases=await Promise.all(requests);
  assert.equal(new Set(leases.map(x=>x.url)).size,1);
  leases[0].release();leases[0].release();
  leases[1].release();
  assert.equal(revoked.length,0,'One remaining consumer pins the Blob');
  leases[2].release();
  assert.deepEqual(revoked,[leases[2].url]);
  media.dispose();assert.equal(revoked.length,1);
});
test('BP-10: changed account immediately expires and revokes even pinned images',async t=>{
  const {revoked}=instrumentUrls(t);
  let active=OWNER;const storage=fakeClient({onUser:async()=>active});
  const media=createPrivateMedia(storage.client,{ownerId:OWNER});
  const lease=await media.acquirePreview(PATHS[0]);
  active=OTHER;
  await assert.rejects(media.acquirePreview(PATHS[0]),/expired/);
  assert.deepEqual(revoked,[lease.url],'Owner changes must invalidate every previous preview');
  lease.release();media.dispose();
  assert.equal(revoked.length,1);
});
test('BP-10: dispose while a download is pending never preserves a stale URL',async t=>{
  const {made,revoked}=instrumentUrls(t);
  let finish;
  const pending=new Promise(resolve=>{finish=resolve;});
  const storage=fakeClient({onDownload:()=>pending});
  const media=createPrivateMedia(storage.client,{ownerId:OWNER});
  const open=media.acquirePreview(PATHS[0]);
  for(let i=0;i<40&&storage.downloads!==1;i++)await Promise.resolve();
  assert.equal(storage.downloads,1);
  media.dispose();
  finish({data:PNG,error:null});
  await assert.rejects(open,/expired/);
  assert.deepEqual(made,revoked,'No Blob may survive an aborted session');
});
test('BP-10: a rejected Storage download does not poison future retries',async t=>{
  const {made}=instrumentUrls(t);
  let calls=0;
  const storage=fakeClient({onDownload:async()=>++calls===1?{error:'offline'}:{data:PNG,error:null}});
  const media=createPrivateMedia(storage.client,{ownerId:OWNER});
  await assert.rejects(media.acquirePreview(PATHS[0]),/could not be downloaded/);
  const lease=await media.acquirePreview(PATHS[0]);
  assert.equal(calls,2);
  assert.equal(made.length,1);
  lease.release();media.dispose();
});
