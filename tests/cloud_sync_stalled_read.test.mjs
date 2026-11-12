import test from 'node:test';
import assert from 'node:assert/strict';
import {createSyncController} from '../src/cloud/sync.js';

const snapshot=title=>({branches:[],tasks:[{id:'synthetic',title}],journalEntries:[],milestones:[],spatialLayout:{},preferences:{colorMode:'deadline'}});
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};

test('BP-09: age out an in-flight read whose transport ignores abort, but never trust its late response',async()=>{
  let time=0,reads=0;const original=deferred(),controllers=[],seen=[];
  const repository={
    loadOwnerSnapshot({signal}={}){reads++;controllers.push(signal);return reads===1
      ?original.promise:Promise.resolve({revision:2,snapshot:snapshot('newer remote')});},
    saveSnapshot(){throw Error('Read-only synthetic test');}
  };
  const client=createSyncController({repository,initialRevision:0,pollMs:0,debounceMs:600000,
    maxReadAgeMs:45000,now:()=>time,eventTarget:null,visibilityTarget:null,
    onSnapshot:value=>seen.push(value.tasks[0].title)});
  const old=client.refresh();
  try{
    time=30000;
    assert.strictEqual(client.refresh(),old,'A healthy or slow read must still coalesce before the age budget');
    assert.equal(reads,1);
    time=45000;
    const replacement=client.refresh();
    assert.notStrictEqual(replacement,old);
    assert.equal(reads,2,'Expired read must not block fresh revalidation');
    assert.equal(controllers[0].aborted,true,'Abort obsolete transport when replacing');
    assert.equal((await replacement).changed,true);
    assert.equal(client.getState().revision,2);
    original.resolve({revision:99,snapshot:snapshot('late stale data')});
    assert.equal((await old).changed,false);
    assert.deepEqual(seen,['newer remote']);
    assert.equal(client.getState().revision,2);
  }finally{
    original.resolve({revision:99,snapshot:snapshot('late stale data')});
    client.dispose();
  }
});

test('BP-03: idle poll ages out a hung read after bounded delay without requesting on every interval',async()=>{
  let time=0,callback,reads=0;const ignored=deferred(),signals=[];
  const repository={
    loadOwnerSnapshot({signal}={}){signals.push(signal);reads++;return reads===1
      ?ignored.promise:Promise.resolve({revision:0,snapshot:snapshot('same')});},
    saveSnapshot(){throw Error('No write expected');}
  };
  const client=createSyncController({repository,initialRevision:0,pollMs:15000,
    idleAfterMs:0,idlePollMs:30000,maxReadAgeMs:45000,
    now:()=>time,eventTarget:null,visibilityTarget:null,
    pollScheduler:{
      setInterval(fn,ms){assert.equal(ms,15000);callback=fn;return 1;},
      clearInterval(id){assert.equal(id,1);}
    }
  });
  try{
    const first=client.refresh();
    for(let count=1;count<=2;count++){time+=15000;callback();}
    assert.equal(reads,1,'Keep one request until its expiry and avoid a parallel polling storm');
    time=45000;callback();
    assert.equal(reads,2,'Recover at the first poll on/after the configured expiry');
    assert.equal(signals[0].aborted,true);
    ignored.resolve({revision:50,snapshot:snapshot('late')});
    assert.equal((await first).changed,false);
    assert.equal(client.getState().revision,0);
  }finally{ignored.resolve({revision:50,snapshot:snapshot('late')});client.dispose();}
});

test('BP-09: reject invalid read age configuration before listeners/timers are installed',()=>{
  const repository={loadOwnerSnapshot(){},saveSnapshot(){}};
  for(const option of [{maxReadAgeMs:NaN},{maxReadAgeMs:-1},{maxReadAgeMs:1000,pollMs:15000}]){
    assert.throws(()=>createSyncController({repository,eventTarget:null,visibilityTarget:null,...option}),/read|age|poll/i);
  }
});
