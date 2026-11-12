import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudRepository, hydrateTaskLinks} from '../src/cloud/repository.js';
import {makeSyntheticWorkspace} from '../scripts/measure-sync-workloads.mjs';

const link={label:'Synthetic source',url:'https://example.test/source'};
function tasks(n){return makeSyntheticWorkspace(n).tasks.map(task=>({...task,links:[]}));}

test('BP-09: large link-free normalized workspaces reuse validated task objects instead of cloning every task',()=>{
  const list=tasks(3000);
  const result=hydrateTaskLinks(list,{});
  assert.strictEqual(result,list,'No extension links should not allocate 3000 extra task objects');
  assert.deepEqual(result,list);
});

test('BP-09: a sparse extension overrides only its matching task without cloning unrelated entries',()=>{
  const list=tasks(3000),overrides={'fixture-128':[link]};
  const result=hydrateTaskLinks(list,overrides);
  assert.notStrictEqual(result,list);
  assert.deepEqual(result[128].links,[link]);
  assert.notStrictEqual(result[128],list[128]);
  assert.strictEqual(result[0],list[0]);
  assert.strictEqual(result[2999],list[2999]);
  assert.deepEqual(list[128].links,[],'Input cannot be mutated');
  assert.deepEqual(hydrateTaskLinks(list,{'missing-task':[link]})[0],list[0]);
});

test('BP-09: real authenticated repository maintains extensions, validation and unchanged-revision fast path',async()=>{
  const snapshot=makeSyntheticWorkspace(30);
  snapshot.extensions.taskLinks={'fixture-3':[link]};
  let authCalls=0,rpcCalls=0;
  const client={auth:{getUser:async()=>{authCalls++;return {data:{user:{id:'synthetic-owner'}},error:null};}},
    rpc:()=>{rpcCalls++;return Promise.resolve({data:{revision:7,snapshot},error:null});}};
  const repo=createCloudRepository(client,{ownerId:'synthetic-owner',sanitizeHtml:html=>html});
  const first=await repo.loadOwnerSnapshot();
  assert.deepEqual(first.snapshot.tasks[3].links,[link]);
  assert.deepEqual(first.snapshot.tasks[4].links,[]);
  assert.deepEqual(first.snapshot.extensions.taskLinks['fixture-3'],[link]);
  const equal=await repo.loadOwnerSnapshot({knownRevision:7});
  assert.deepEqual(equal,{revision:7,unchanged:true});
  assert.equal(authCalls,2);
  assert.equal(rpcCalls,2,'Full hosted RPC is still required until conditional endpoint is approved');
});

test('BP-09: sparse hydration rejects no validated link data silently and matches previous JSON projection',()=>{
  const list=tasks(300);
  for(const overrides of [{},{'fixture-1':[link]},{'missing':[link]}]){
    const legacy=list.map(task=>({...task,links:overrides[task.id]||task.links}));
    assert.equal(JSON.stringify(hydrateTaskLinks(list,overrides)),JSON.stringify(legacy));
  }
});
