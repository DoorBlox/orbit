import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateMedia,validMediaOwner} from '../src/cloud/media.js';

const OWNER='11111111-1111-4111-8111-111111111111';
const FILE=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});
const BAD_PATH=OWNER+'/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png';

function setup(upload){
  const media=createPrivateMedia({
    auth:{getUser:async()=>({data:{user:{id:OWNER}},error:null})},
    storage:{from:name=>{
      assert.equal(name,'orbit-private-media');
      return {upload};
    }}
  },{ownerId:OWNER});
  return media;
}
const expectedError='Private upload failed. Try again.';

test('BP-01: missing Storage upload acknowledgment never becomes a persisted private image path',async()=>{
  const paths=[];
  const media=setup(async(path,blob,{upsert})=>{
    paths.push(path);
    assert.equal(upsert,false);
    assert.equal(blob,FILE);
    return {data:null,error:null};
  });
  try{
    await assert.rejects(media.upload(FILE),{message:expectedError});
    assert.equal(paths.length,1,'Storage call was made but no object was acknowledged');
  }finally{media.dispose();}
});

test('BP-01: mismatched Storage returned path is not published as the new image reference',async()=>{
  const media=setup(async(path)=>({
    data:{path:BAD_PATH===path?OWNER+'/cccccccc-cccc-4ccc-8ccc-cccccccccccc.png':BAD_PATH},
    error:null
  }));
  try{
    await assert.rejects(media.upload(FILE),{message:expectedError});
  }finally{media.dispose();}
});

test('BP-01: invalid Storage acknowledgment may be safely retried using a distinct object path',async()=>{
  const paths=[];
  let rejectFirst=true;
  const media=setup(async(path,blob,{upsert})=>{
    assert.equal(blob,FILE);
    assert.equal(upsert,false,'never overwrite an ambiguous attempted upload');
    paths.push(path);
    if(rejectFirst){rejectFirst=false;return {data:{},error:null};}
    return {data:{path},error:null};
  });
  try{
    await assert.rejects(media.upload(FILE),{message:expectedError});
    const newPath=await media.upload(FILE);
    assert.equal(paths.length,2);
    assert.notEqual(paths[0],paths[1],'retry cannot overwrite a possibly uploaded private image');
    assert.equal(newPath,paths[1]);
    assert.equal(validMediaOwner(newPath,OWNER),true);
  }finally{media.dispose();}
});

test('BP-01: well-formed acknowledged Storage upload still returns its verified owner path',async()=>{
  let called=0;
  const media=setup(async(path)=>{
    called++;
    return {data:{path,id:'synthetic-upload-id',fullPath:'orbit-private-media/'+path},error:null};
  });
  try{
    const path=await media.upload(FILE);
    assert.equal(called,1);
    assert.equal(validMediaOwner(path,OWNER),true);
  }finally{media.dispose();}
});
