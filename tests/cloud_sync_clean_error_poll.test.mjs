import test from 'node:test';
import assert from 'node:assert/strict';
import {createSyncController} from '../src/cloud/sync.js';

const snapshot=title=>({
  branches:[],tasks:[{id:'synthetic-task',title}],journalEntries:[],milestones:[],
  spatialLayout:{},preferences:{colorMode:'deadline'}
});
const settle=()=>new Promise(resolve=>setImmediate(resolve));

function fixture(failureCode){
  let time=0,poll=null,code=failureCode;
  const states=[],reads=[];
  const repository={
    async loadOwnerSnapshot(){
      reads.push(time);
      if(code)throw Object.assign(Error('PRIVATE REMOTE ERROR BODY'),{code});
      return {revision:0,snapshot:snapshot('dummy owner')};
    },
    async saveSnapshot(){throw Error('Clean polling must never write');}
  };
  const sync=createSyncController({
    repository,initialRevision:0,debounceMs:600000,pollMs:15000,
    idleAfterMs:120000,idlePollMs:30000,
    eventTarget:null,visibilityTarget:null,isVisible:()=>true,isOnline:()=>true,
    now:()=>time,onStatus:value=>states.push(value),
    pollScheduler:{
      setInterval(fn,ms){assert.equal(ms,15000);poll=fn;return 1;},
      clearInterval(id){assert.equal(id,1);poll=null;}
    }
  });
  return {
    sync,reads,states,setFailure:value=>{code=value;},
    async tick(count=1){for(let i=0;i<count;i++){time+=15000;poll();await settle();}}
  };
}

test('BP-03 clean AUTH_REQUIRED/FORBIDDEN/VALIDATION/INVALID_RESPONSE errors cannot cause automatic full-read storms',async()=>{
  for(const code of ['AUTH_REQUIRED','FORBIDDEN','VALIDATION','INVALID_RESPONSE']){
    const f=fixture(code);
    try{
      assert.equal((await f.sync.refresh()).ok,false);
      assert.equal(f.sync.getState().errorCode,code);
      assert.equal(f.sync.getState().hasPending,false);
      assert.equal(f.reads.length,1);
      await f.tick(12);
      assert.equal(f.reads.length,1,code+' should not be automatically retried by 15-second polling');
      assert.equal(JSON.stringify(f.states).includes('PRIVATE REMOTE ERROR BODY'),false,
        'Provider details must never appear in UI status');
      // Explicit owner/session recovery remains available after permissions change.
      f.setFailure(null);
      assert.equal((await f.sync.retry()).ok,true);
      assert.equal(f.reads.length,2);
      assert.equal(f.sync.getState().state,'saved');
      assert.equal(f.sync.getState().revision,0);
      await f.tick(2);
      assert.equal(f.reads.length,3,'Normal clean polling resumes after manual recovery');
    }finally{f.sync.dispose();}
  }
});

test('BP-03 clean transient NETWORK failures still retry by polling when connectivity recovers',async()=>{
  const f=fixture('NETWORK');
  try{
    assert.equal((await f.sync.refresh()).ok,false);
    assert.equal(f.sync.getState().errorCode,'NETWORK');
    f.setFailure(null);
    await f.tick();
    assert.equal(f.reads.length,2,'Transient network errors must recover unattended');
    assert.equal(f.sync.getState().state,'saved');
  }finally{f.sync.dispose();}
});
