import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateMedia} from '../src/cloud/media.js';

const OWNER='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const PATH=OWNER+'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const PNG=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});
const PRIVATE_ERROR='SECRET_PRIVATE_STORAGE_PROVIDER_DETAIL';

async function exerciseOwnerSwitchDuringFailedStorage(operation,mode){
  const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;
  const revoked=[];let active=OWNER,stage='prime',calls=0;
  URL.createObjectURL=()=> 'blob:synthetic-old-account-private-image';
  URL.revokeObjectURL=url=>revoked.push(url);
  const failed=()=>{
    calls++;
    active=OTHER;
    if(mode==='reject')throw Error(PRIVATE_ERROR);
    return {data:null,error:{message:PRIVATE_ERROR}};
  };
  const client={
    auth:{getUser:async()=>({data:{user:{id:active}},error:null})},
    storage:{from:name=>{
      assert.equal(name,'orbit-private-media');
      return {
        download:async()=>stage==='fail'&&operation==='download'?failed():{data:PNG,error:null},
        list:async()=>stage==='fail'&&operation==='list'?failed():{data:[],error:null},
        upload:async(path)=>stage==='fail'&&operation==='upload'?failed():{data:{path},error:null},
        createSignedUrl:async()=>stage==='fail'&&operation==='signedUrl'
          ?failed():{data:{signedUrl:'https://synthetic.example/signed'},error:null},
      };
    }}
  };
  let media;
  try{
    media=createPrivateMedia(client,{ownerId:OWNER});
    const lease=await media.acquirePreview(PATH);
    assert.equal(lease.url,'blob:synthetic-old-account-private-image');
    stage='fail';
    const request={
      download:()=>media.download(PATH),
      list:()=>media.listOwnMedia(),
      upload:()=>media.upload(PNG),
      signedUrl:()=>media.signedUrl(PATH),
    }[operation];
    await assert.rejects(request(),error=>{
      assert.match(error.message,/media session expired/i,
        'A Storage failure must not hide an account switch');
      assert.doesNotMatch(error.message,/SECRET_PRIVATE_STORAGE_PROVIDER_DETAIL/,
        'Never expose internal Storage provider messages');
      return true;
    });
    assert.equal(calls,1,'The failing Storage request was actually attempted');
    assert.deepEqual(revoked,[lease.url],
      'Previously visible private Blob URL must be revoked on failed account switch');
    active=OWNER;
    await assert.rejects(media.acquirePreview(PATH),/media session expired/i,
      'A replaced account cannot revive old cached previews');
    lease.release();
    assert.deepEqual(revoked,[lease.url],'Lease disposal must not double-revoke URLs');
  }finally{
    media?.dispose();
    URL.createObjectURL=originalCreate;
    URL.revokeObjectURL=originalRevoke;
  }
}

for(const operation of ['download','list','upload','signedUrl']){
  for(const mode of ['reject','error']){
    test('BP-01/12: '+operation+' '+mode+' during owner switch revokes existing Blob URLs',async()=>{
      await exerciseOwnerSwitchDuringFailedStorage(operation,mode);
    });
  }
}
