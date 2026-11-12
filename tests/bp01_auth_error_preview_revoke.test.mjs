import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateMedia} from '../src/cloud/media.js';

const OWNER='11111111-1111-4111-8111-111111111111';
const PATH=OWNER+'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const PNG=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});

async function withLeasedPreview(fn){
  const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;
  const revoked=[];let created=0,mode='valid',lists=0;
  URL.createObjectURL=()=>{created++;return 'blob:synthetic-private-'+created;};
  URL.revokeObjectURL=url=>{revoked.push(url);};
  let media;
  try{
    const client={auth:{getUser:async()=>{
      if(mode==='error')return {data:{user:null},error:Error('Synthetic auth denied internal details')};
      if(mode==='throw')throw Error('Synthetic auth transport internal details');
      return {data:{user:{id:OWNER}},error:null};
    }},storage:{from:bucket=>{
      assert.equal(bucket,'orbit-private-media');
      return {
        download:async()=>({data:PNG,error:null}),
        list:async()=>{lists++;return {data:[],error:null};},
      };
    }}};
    media=createPrivateMedia(client,{ownerId:OWNER});
    const lease=await media.acquirePreview(PATH);
    assert.equal(lease.url,'blob:synthetic-private-1');
    await fn({media,lease,revoked,created:()=>created,
      lists:()=>lists,setMode:value=>{mode=value;}});
  }finally{
    media?.dispose();
    URL.createObjectURL=originalCreate;
    URL.revokeObjectURL=originalRevoke;
  }
}

for(const mode of ['error','throw']){
  test('BP-01: auth '+mode+' revokes already visible private previews and invalidates the media session',async()=>{
    await withLeasedPreview(async({media,lease,revoked,lists,setMode})=>{
      setMode(mode);
      await assert.rejects(media.listOwnMedia(),error=>{
        assert.match(error.message,/media session expired/i);
        assert.doesNotMatch(error.message,/Synthetic auth/i,
          'Provider errors must not escape to callers');
        return true;
      });
      assert.deepEqual(revoked,[lease.url],
        'An auth failure must revoke existing active private Blob URLs immediately');
      assert.equal(lists(),0,'Auth failure must stop Storage operations');
      setMode('valid');
      await assert.rejects(media.acquirePreview(PATH),/media session expired/i,
        'A failed session must not revive cached private previews automatically');
      lease.release();
      assert.deepEqual(revoked,[lease.url],'Revocation must occur once');
    });
  });
}

test('BP-01: valid auth retains leased previews until explicit disposal',async()=>{
  await withLeasedPreview(async({media,lease,revoked,lists})=>{
    const page=await media.listOwnMedia();
    assert.deepEqual(page.items,[]);
    assert.equal(lists(),1);
    assert.equal(revoked.length,0,'Authorized operations cannot revoke a displayed image');
    lease.release();
    assert.equal(revoked.length,0,'An idle cached preview is preserved within budget');
    media.dispose();
    assert.deepEqual(revoked,[lease.url]);
  });
});
