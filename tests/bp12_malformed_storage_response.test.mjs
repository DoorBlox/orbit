import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateMedia} from '../src/cloud/media.js';

const OWNER='11111111-1111-4111-8111-111111111111';
const PATH=OWNER+'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const PNG=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});

function fixture(bucket){
  return createPrivateMedia({
    auth:{getUser:async()=>({data:{user:{id:OWNER}},error:null})},
    storage:{from:name=>{assert.equal(name,'orbit-private-media');return bucket;}}
  },{ownerId:OWNER});
}

for(const malformed of [null,undefined]){
  test('BP-12: resolved '+String(malformed)+' download response is a safe private image failure',async()=>{
    let response=malformed,reads=0;
    const media=fixture({download:async()=>{reads++;return response;}});
    try{
      await assert.rejects(media.download(PATH),{message:'Private image could not be downloaded.'});
      response={data:PNG,error:null};
      const recovered=await media.download(PATH);
      assert.deepEqual([...new Uint8Array(await recovered.arrayBuffer())],
        [...new Uint8Array(await PNG.arrayBuffer())]);
      assert.equal(reads,2,'a Storage response fault must be independently retryable');
    }finally{media.dispose();}
  });

  test('BP-12: resolved '+String(malformed)+' signed-link response is sanitized and retryable',async()=>{
    let response=malformed,calls=0;
    const media=fixture({createSignedUrl:async()=>{calls++;return response;}});
    try{
      await assert.rejects(media.signedUrl(PATH),{message:'Cannot load the private image.'});
      response={data:{signedUrl:'https://synthetic.example/signed'},error:null};
      assert.equal(await media.signedUrl(PATH),'https://synthetic.example/signed');
      assert.equal(calls,2);
    }finally{media.dispose();}
  });
}
