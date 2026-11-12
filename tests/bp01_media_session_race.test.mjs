import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateMedia} from '../src/cloud/media.js';

const OWNER='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const PATH=OWNER+'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const PNG=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});

function createFixture(getOwner){
  let downloads=0;
  const media=createPrivateMedia({
    auth:{getUser:async()=>({data:{user:{id:getOwner()}},error:null})},
    storage:{from:bucket=>{
      assert.equal(bucket,'orbit-private-media');
      return {download:async()=>{
        downloads++;
        return {data:PNG,error:null};
      }};
    }},
  },{ownerId:OWNER});
  return {media,getDownloads:()=>downloads};
}

// Pause ONLY the downloaded Blob's asynchronous signature read, after the
// authenticated Storage download has completed and its first owner recheck
// has passed. Restore the native prototype before each test exits.
function pauseSignatureRead(){
  const originalSlice=Blob.prototype.slice;
  let signalStarted,unblock;
  const started=new Promise(resolve=>{signalStarted=resolve;});
  const gate=new Promise(resolve=>{unblock=resolve;});
  let paused=false;
  Blob.prototype.slice=function(start,end,...args){
    const part=originalSlice.call(this,start,end,...args);
    if(paused||start!==0||end!==12)return part;
    paused=true;
    return {arrayBuffer:async()=>{
      signalStarted();
      await gate;
      return part.arrayBuffer();
    }};
  };
  return {started,resume:()=>unblock(),restore:()=>{Blob.prototype.slice=originalSlice;}};
}

for(const transition of ['switch account','dispose media session']){
  test('BP-01: private download rejects '+transition+' during signature validation', {timeout:5000}, async()=>{
    let active=OWNER;
    const delayed=pauseSignatureRead();
    const {media,getDownloads}=createFixture(()=>active);
    try{
      const pending=media.download(PATH);
      await delayed.started;
      if(transition==='switch account')active=OTHER;
      else media.dispose();
      delayed.resume();
      await assert.rejects(pending,/expired|sign in again/i,
        'Validated image bytes must never leave an expired media session');
      assert.equal(getDownloads(),1,'The Storage request was already completed before the transition');
    }finally{
      delayed.resume();delayed.restore();media.dispose();
    }
  });
}

test('BP-01: owner switch during validation does not create even a transient private preview URL',{timeout:5000},async()=>{
  let active=OWNER,created=0,revoked=0;
  const delayed=pauseSignatureRead();
  const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;
  URL.createObjectURL=()=>{created++;return 'blob:synthetic-private-race';};
  URL.revokeObjectURL=()=>{revoked++;};
  const {media}=createFixture(()=>active);
  try{
    const pending=media.acquirePreview(PATH);
    await delayed.started;
    active=OTHER;
    delayed.resume();
    await assert.rejects(pending,/expired|sign in again/i);
    assert.equal(created,0,'No Blob URL may be created from bytes after the owner has changed');
    assert.equal(revoked,0,'No private Blob URL existed to revoke');
  }finally{
    delayed.resume();delayed.restore();
    media.dispose();URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;
  }
});
