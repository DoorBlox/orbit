import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrivateMcpReadBoundary, validateMcpAccessClaims, MCP_READ_TOOLS } from '../server/mcp/read-boundary.mjs';

const OWNER = '01234567-89ab-4cde-8fab-0123456789ab';
const OTHER = 'fedcba98-7654-4321-8765-fedcba987654';
const ISSUER = 'https://auth.example.invalid/';
const RESOURCE = 'https://mcp.example.invalid/mcp';
const now = 1794474000000;
const claims = {iss:ISSUER,sub:OWNER,aud:RESOURCE,exp:Math.floor(now/1000)+600,iat:Math.floor(now/1000)-60,scope:'tasks:read'};
const branch = {owner_id:OWNER,id:'inbox',parent_id:null,label:'Unsorted',secret:'never expose'};
const task = {owner_id:OWNER,id:'task-1',project_id:'inbox',title:'Private task',status:'open',description:'Do work',due_date:null,urgency:'medium',effort_minutes:30,criteria:'done',secret:'never expose'};
const source = {
  listBranches: async owner=>[{...branch}],
  searchTasks: async (owner,query,limit)=>[{...task}],
  getTask: async (owner,id)=>({...task}),
};
const create = (overrides={})=>createPrivateMcpReadBoundary({
  issuer:ISSUER,resource:RESOURCE,clock:()=>now,
  verifyAccessToken:async token=>token==='valid'?claims:null,
  dataSource:source,...overrides,
});
const invoke=(boundary,tool,args={})=>boundary.invoke({authorization:'Bearer valid',name:tool,arguments:args});

const badClaims=[
  {...claims,iss:'https://evil.invalid/'}, {...claims,aud:'https://other.invalid/mcp'},
  {...claims,aud:['https://other.invalid/mcp']}, {...claims,sub:OTHER,scope:''},
  {...claims,sub:'../../other'}, {...claims,exp:Math.floor(now/1000)-1},
  {...claims,iat:Math.floor(now/1000)+5000}, {...claims,scope:'tasks:write'},
  {...claims,scope:['tasks:read']}, {...claims,token_use:'service_role'},
  {...claims,role:'service_role'}, {...claims,role:'anon'},
  {...claims,token_use:'id'}, {...claims,sub:null},
];

test('verified token claims must bind issuer, resource audience, owner, expiry and scope',()=>{
  assert.equal(validateMcpAccessClaims(claims,{issuer:ISSUER,resource:RESOURCE,now}).sub,OWNER);
  for(const c of badClaims)assert.throws(()=>validateMcpAccessClaims(c,{issuer:ISSUER,resource:RESOURCE,now}),/MCP_DENIED/);
  assert.equal(validateMcpAccessClaims({...claims,aud:[RESOURCE,'https://other.invalid/mcp']},{issuer:ISSUER,resource:RESOURCE,now}).sub,OWNER);
});

test('read tool registry is constrained and write/journal capabilities are NOT exposed',()=>{
  assert.deepEqual(Object.keys(MCP_READ_TOOLS).sort(),['get_task','list_branches','search_tasks']);
  assert.ok(Object.isFrozen(MCP_READ_TOOLS));
});

test('read service requires bearer verifier; no token from URL/body and no owner override',async()=>{
  const api=create();
  assert.deepEqual((await invoke(api,'list_branches')).branches,[{id:'inbox',parentId:null,label:'Unsorted'}]);
  for(const authorization of [null,'', 'Bearer', 'Basic valid', 'Bearer valid other', 'Bearer service_role']){
    await assert.rejects(()=>api.invoke({authorization,name:'list_branches',arguments:{}}),/MCP_DENIED/);
  }
  await assert.rejects(()=>api.invoke({authorization:'Bearer valid',name:'list_branches',arguments:{ownerId:OTHER}}),/MCP_DENIED/);
  await assert.rejects(()=>api.invoke({authorization:'Bearer valid',name:'list_branches',arguments:{__proto__:null,owner_id:OTHER}}),/MCP_DENIED/);
  await assert.rejects(()=>api.invoke({authorization:'Bearer valid',name:'list_branches',arguments:[]}),/MCP_DENIED/);
  await assert.rejects(()=>api.invoke({authorization:'Bearer valid',name:'create_task',arguments:{}}),/MCP_DENIED/);
  await assert.rejects(()=>api.invoke({authorization:'Bearer valid',name:'list_journals',arguments:{}}),/MCP_DENIED/);
  await assert.rejects(()=>api.invoke({authorization:'Bearer valid',name:'delete_task',arguments:{}}),/MCP_DENIED/);
});

test('search bounds exact argument allowlist and row projection removes unapproved data',async()=>{
  const api=create();
  assert.deepEqual((await invoke(api,'search_tasks',{query:'private',limit:5})).tasks,[{
    id:'task-1',projectId:'inbox',title:'Private task',status:'open',dueDate:null,urgency:'medium',effortMinutes:30,
  }]);
  assert.deepEqual((await invoke(api,'get_task',{taskId:'task-1'})).task,{
    id:'task-1',projectId:'inbox',title:'Private task',status:'open',description:'Do work',criteria:'done',
    dueDate:null,urgency:'medium',effortMinutes:30,
  });
  for(const args of [{query:''},{query:'a'.repeat(101)},{query:'foo',limit:100},{query:'foo',limit:0},
    {query:'foo',limit:5,ownerId:OTHER},{query:'foo',limit:5,offset:0},null,[],{query:'foo',limit:'10'}]){
    await assert.rejects(()=>invoke(api,'search_tasks',args),/MCP_DENIED/);
  }
  await assert.rejects(()=>invoke(api,'get_task',{}),/MCP_DENIED/);
  await assert.rejects(()=>invoke(api,'get_task',{taskId:'../../../etc/passwd'}),/MCP_DENIED/);
  await assert.rejects(()=>invoke(api,'get_task',{taskId:'task-1',owner:OTHER}),/MCP_DENIED/);
});

test('tenant mismatch and malformed responses fail closed instead of leaking cross-account records',async()=>{
  const invalidSources = [
    ['list_branches',{}, {...source,listBranches:async()=>[{...branch,owner_id:OTHER}]}],
    ['search_tasks',{query:'task'}, {...source,searchTasks:async()=>[{...task,owner_id:OTHER}]}],
    ['get_task',{taskId:'task-1'}, {...source,getTask:async()=>({...task,owner_id:OTHER})}],
    ['get_task',{taskId:'task-1'}, {...source,getTask:async()=>({...task,title:{text:'poison'}})}],
    ['search_tasks',{query:'task'}, {...source,searchTasks:async()=>Array.from({length:21},()=>task)}],
    ['get_task',{taskId:'task-1'}, {...source,getTask:async()=>({...task,id:'task-2'})}],
  ];
  for(const [name,args,dataSource] of invalidSources){
    await assert.rejects(()=>invoke(create({dataSource}),name,args),/MCP_DENIED/);
  }
});

test('refuses ambiguous token verifier, unscoped data source and missing expected origin',()=>{
  for(const patch of [
    {verifyAccessToken:null}, {dataSource:null}, {resource:'http://mcp.example.invalid/mcp'},
    {resource:'https://mcp.example.invalid/mcp?secret=yes'}, {issuer:'http://auth.example.invalid/'},
  ])assert.throws(()=>create(patch),/MCP_DENIED/);
});
