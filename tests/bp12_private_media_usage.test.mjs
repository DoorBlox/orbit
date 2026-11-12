import test from 'node:test';
import assert from 'node:assert/strict';
import * as mediaModule from '../src/cloud/media.js';

const OWNER='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const FILE_A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const FILE_B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg';
const FILE_C='cccccccc-cccc-4ccc-8ccc-cccccccccccc.webp';
const item=(name,size,id='object-id')=>({id,name,
  ...(size===undefined?{}:{metadata:{size}})});

function fakeMedia(list,getUser=async()=>OWNER){
  const calls=[];
  const client={
    auth:{getUser:async()=>({data:{user:{id:await getUser()}},error:null})},
    storage:{from:name=>{
      assert.equal(name,'orbit-private-media');
      return {list:async(prefix,opts)=>{
        calls.push({prefix,opts});
        return list(prefix,opts);
      }};
    }}
  };
  return {service:mediaModule.createPrivateMedia(client,{ownerId:OWNER}),calls};
}

test('BP-12: read-only usage reports known bytes, unknown sizes and deduplicates owner files across pages',async()=>{
  const pages=new Map([
    [0,[item(FILE_A,100),item('../../foreign.png',500),item(FILE_B)]],
    [3,[item(FILE_A,99999),item(FILE_C,200)]]
  ]);
  const {service,calls}=fakeMedia(async(_,opts)=>({data:pages.get(opts.offset)??[],error:null}));
  try{
    const usage=await mediaModule.summarizePrivateMediaUsage(service,{pageSize:3,maxPages:3});
    assert.deepEqual(usage,{files:3,knownBytes:300,unknownSizeFiles:1,
      complete:true,totalBytes:null});
    assert.deepEqual(calls.map(x=>x.prefix),[OWNER,OWNER]);
    assert.deepEqual(calls.map(x=>x.opts.offset),[0,3],
      'Advance by all Storage rows, including rejected entries');
    assert.equal(calls[0].opts.sortBy.column,'name');
    assert.equal(typeof service.remove,'undefined','Never introduce destructive Storage actions');
  }finally{service.dispose();}
});

test('BP-12: complete inventory with all known sizes can report an exact private byte total',async()=>{
  const rows=[item(FILE_A,10),item(FILE_B,20),item(FILE_C,30)];
  const {service}=fakeMedia(async(_,opts)=>({data:rows.slice(opts.offset,opts.offset+opts.limit),error:null}));
  try{
    const usage=await mediaModule.summarizePrivateMediaUsage(service,{pageSize:2,maxPages:3});
    assert.deepEqual(usage,{files:3,knownBytes:60,unknownSizeFiles:0,
      complete:true,totalBytes:60});
  }finally{service.dispose();}
});

test('BP-12: bounded inventory never mislabels a truncated scan as the whole bucket',async()=>{
  let calls=0;
  const {service}=fakeMedia(async()=>{calls++;return {data:[item(FILE_A,12)],error:null};});
  try{
    const usage=await mediaModule.summarizePrivateMediaUsage(service,{pageSize:1,maxPages:1});
    assert.deepEqual(usage,{files:1,knownBytes:12,unknownSizeFiles:0,
      complete:false,totalBytes:null});
    assert.equal(calls,1,'Never scan beyond the configured page budget');
  }finally{service.dispose();}
});

test('BP-12: a private account switch during a later inventory page rejects the entire summary',async()=>{
  let active=OWNER,reads=0;
  const {service}=fakeMedia(async()=>{
    reads++;
    if(reads===2)active=OTHER;
    return {data:[item(FILE_A,12)],error:null};
  },async()=>active);
  try{
    await assert.rejects(mediaModule.summarizePrivateMediaUsage(service,{pageSize:1,maxPages:3}),
      /expired|sign in again/i);
    assert.equal(reads,2);
    await assert.rejects(service.listOwnMedia(),/expired|sign in again/i);
  }finally{service.dispose();}
});

test('BP-12: malformed later pages and unsafe byte arithmetic never produce false usage success',async()=>{
  const {service}=fakeMedia(async(_,opts)=>opts.offset===0
    ?{data:[item(FILE_A,12)],error:null}
    :{data:null,error:null});
  try{
    await assert.rejects(mediaModule.summarizePrivateMediaUsage(service,{pageSize:1,maxPages:3}),
      /unavailable|list/i);
  }finally{service.dispose();}
  const {service:overflow}=fakeMedia(async(_,opts)=>({data:opts.offset===0
    ?[item(FILE_A,Number.MAX_SAFE_INTEGER)]:[item(FILE_C,1)],error:null}));
  try{
    await assert.rejects(mediaModule.summarizePrivateMediaUsage(overflow,{pageSize:1,maxPages:2}),
      /size|usage|bytes|total/i);
  }finally{overflow.dispose();}
});

test('BP-12: invalid scan budgets and foreign-owner inventory rows are rejected',async()=>{
  const {service,calls}=fakeMedia(async()=>({data:[],error:null}));
  try{
    for(const options of [{pageSize:0},{pageSize:101},{maxPages:0},{maxPages:51},
      {pageSize:1.5},{maxPages:1.5}]){
      await assert.rejects(mediaModule.summarizePrivateMediaUsage(service,options),
        /page|limit|budget/i);
    }
    assert.equal(calls.length,0,'Invalid options must fail before private Storage reads');
  }finally{service.dispose();}
  const fake={ownerId:OWNER,listOwnMedia:async()=>({items:[{
    path:OTHER+'/'+FILE_A,size:1
  }],nextOffset:1,hasMore:false})};
  await assert.rejects(mediaModule.summarizePrivateMediaUsage(fake,{pageSize:1}),
    /owner|private|account|invalid/i);
});
