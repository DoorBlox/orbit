import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateMedia} from '../src/cloud/media.js';

const OWNER='11111111-1111-4111-8111-111111111111';
const PATH=OWNER+'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const PNG=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});
const PROVIDER_DETAIL='SECRET_INTERNAL_STORAGE_EXCEPTION_DO_NOT_RENDER';

function mediaWithStorage(bucket){
  return createPrivateMedia({
    auth:{getUser:async()=>({data:{user:{id:OWNER}},error:null})},
    storage:{from:name=>{
      assert.equal(name,'orbit-private-media');return bucket;
    }}
  },{ownerId:OWNER});
}
async function safeFailure(promise,expected){
  await assert.rejects(promise,error=>{
    assert.equal(error.message,expected);
    assert.doesNotMatch(error.message,/SECRET_INTERNAL_STORAGE_EXCEPTION_DO_NOT_RENDER/,
      'Private Storage provider error details must not reach the UI');
    return true;
  });
}
test('BP-12: thrown private Storage download is safely normalized and retryable',async()=>{
  let fail=true;
  const media=mediaWithStorage({
    download:async()=>{
      if(fail)throw Error(PROVIDER_DETAIL);
      return {data:PNG,error:null};
    }
  });
  try{
    await safeFailure(media.download(PATH),'Private image could not be downloaded.');
    fail=false;
    const recovered=await media.download(PATH);
    assert.deepEqual([...new Uint8Array(await recovered.arrayBuffer())],
      [...new Uint8Array(await PNG.arrayBuffer())]);
  }finally{media.dispose();}
});
test('BP-12: thrown private gallery listing is sanitized without expiring valid auth',async()=>{
  let fail=true,calls=0;
  const media=mediaWithStorage({
    list:async()=>{calls++;
      if(fail)throw Error(PROVIDER_DETAIL);
      return {data:[],error:null};
    }
  });
  try{
    await safeFailure(media.listOwnMedia(),'Private media list is unavailable.');
    fail=false;
    assert.deepEqual((await media.listOwnMedia()).items,[]);
    assert.equal(calls,2);
  }finally{media.dispose();}
});
test('BP-01: rejected private upload never leaks Storage internals and may be retried',async()=>{
  let fail=true,paths=[];
  const media=mediaWithStorage({
    upload:async(path,blob,options)=>{
      assert.equal(options.upsert,false);
      paths.push(path);
      if(fail)throw Error(PROVIDER_DETAIL);
      return {data:{path},error:null};
    }
  });
  try{
    await safeFailure(media.upload(PNG),'Private upload failed. Try again.');
    fail=false;
    const uploaded=await media.upload(PNG);
    assert.match(uploaded,new RegExp('^'+OWNER+'/'));
    assert.equal(paths.length,2);
    assert.notEqual(paths[0],paths[1],'Retries must use new owner-private object paths');
  }finally{media.dispose();}
});
test('BP-01: thrown signed URL request is sanitized without leaking bearer-link context',async()=>{
  let fail=true;
  const media=mediaWithStorage({
    createSignedUrl:async()=>{
      if(fail)throw Error(PROVIDER_DETAIL);
      return {data:{signedUrl:'https://synthetic.example/private-token'},error:null};
    }
  });
  try{
    await safeFailure(media.signedUrl(PATH),'Cannot load the private image.');
    fail=false;
    assert.equal(await media.signedUrl(PATH),'https://synthetic.example/private-token');
  }finally{media.dispose();}
});
