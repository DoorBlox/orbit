import test from 'node:test';
import assert from 'node:assert/strict';
import {startLocalMcpFixture} from '../server/mcp/local-fixture.mjs';

const VERSION='2026-07-28';
function envelope(method,params={},id='request-1'){
  return {jsonrpc:'2.0',id,method,params:{...params,
    _meta:{'io.modelcontextprotocol/protocolVersion':VERSION,
      'io.modelcontextprotocol/clientInfo':{name:'orbit-wire-test',version:'1.0.0'},
      'io.modelcontextprotocol/clientCapabilities':{}}}};
}
async function rpc(fixture,method,params={},token=fixture.tokens.ownerA,extra={}){
  const body=envelope(method,params,extra.id??'wire-1');
  const headers={
    'accept':'application/json, text/event-stream',
    'content-type':'application/json',
    'mcp-protocol-version':VERSION,'mcp-method':method,
    ...(method==='tools/call'?{'mcp-name':params.name}:{}),
    ...(token?{authorization:'Bearer '+token}:{}),
    ...(extra.headers||{}),
  };
  const response=await fetch(fixture.url,{
    method:extra.method||'POST',headers,
    ...(extra.method==='GET'?{}:{body:extra.body??JSON.stringify(body)}),
  });
  let json=null;
  try{json=await response.json();}catch{}
  return {status:response.status,json,headers:response.headers};
}
async function withFixture(fn,opts={}){
  const fixture=await startLocalMcpFixture(opts);
  try{return await fn(fixture);}
  finally{await fixture.close();}
}
test('real loopback HTTP client discovers the 2026-07-28 server and three read-only tools',()=>withFixture(async f=>{
  assert.match(f.url,/^http:\/\/127\.0\.0\.1:\d+\/mcp$/);
  const discover=await rpc(f,'server/discover');
  assert.equal(discover.status,200);
  assert.equal(discover.json.id,'wire-1');
  assert.equal(discover.json.result.resultType,'complete');
  assert.deepEqual(discover.json.result.supportedVersions,[VERSION]);
  assert.deepEqual(discover.json.result.capabilities,{tools:{}});
  const listed=await rpc(f,'tools/list');
  assert.equal(listed.status,200);
  const tools=listed.json.result.tools;
  assert.deepEqual(tools.map(t=>t.name),['list_branches','search_tasks','get_task']);
  for(const tool of tools){
    assert.equal(tool.annotations.readOnlyHint,true);
    assert.equal(tool.inputSchema.type,'object');
    assert.equal(tool.inputSchema.additionalProperties,false);
    assert.equal(typeof tool.description,'string');
  }
  assert.doesNotMatch(JSON.stringify(tools),/journal|delete_task|tasks:write/i);
}));

test('real loopback tool calls use the existing verified JWT, grant and owner-filtered data path',()=>withFixture(async f=>{
  const a=await rpc(f,'tools/call',{name:'list_branches',arguments:{}});
  assert.equal(a.status,200);
  assert.equal(a.json.result.resultType,'complete');
  const branches=JSON.parse(a.json.result.content[0].text).branches;
  assert.equal(branches[0].label,'Owner A');
  const b=await rpc(f,'tools/call',{name:'list_branches',arguments:{}},f.tokens.ownerB);
  assert.equal(JSON.parse(b.json.result.content[0].text).branches[0].label,'Owner B');
  const search=await rpc(f,'tools/call',{name:'search_tasks',arguments:{query:'alpha'}});
  assert.deepEqual(JSON.parse(search.json.result.content[0].text).tasks.map(t=>t.id),['alpha-task']);
  const ownTask=await rpc(f,'tools/call',{name:'get_task',arguments:{taskId:'alpha-task'}});
  assert.equal(JSON.parse(ownTask.json.result.content[0].text).task.title,'Alpha secret plan');
  const foreign=await rpc(f,'tools/call',{name:'get_task',arguments:{taskId:'alpha-task'}},f.tokens.ownerB);
  assert.equal(foreign.status,200);
  assert.equal(JSON.parse(foreign.json.result.content[0].text).task,null);
  assert.doesNotMatch(JSON.stringify(b.json),/Alpha secret plan|alpha-task/);
}));

test('invalid and missing bearer headers cannot discover private tools or invoke private reads',()=>withFixture(async f=>{
  for(const token of [null,'invalid-token','x.y.z']){
    for(const method of ['server/discover','tools/list','tools/call']){
      const response=await rpc(f,method,method==='tools/call'?{name:'list_branches',arguments:{}}:{},token);
      assert.ok([401,403].includes(response.status),method);
      assert.ok(response.json?.error);
      assert.doesNotMatch(JSON.stringify(response.json),/Alpha secret plan|Owner A|PRIVATE_ROW/);
    }
  }
}));

test('revoking a durable synthetic grant or token immediately denies subsequent MCP calls',()=>withFixture(async f=>{
  assert.equal((await rpc(f,'tools/list')).status,200);
  f.revoke('ownerA');
  for(const method of ['tools/list','tools/call'])
    assert.equal((await rpc(f,method,method==='tools/call'?{name:'list_branches',arguments:{}}:{})).status,403);
  assert.equal((await rpc(f,'tools/list',{},f.tokens.ownerB)).status,200);
  f.regrant('ownerA');
  assert.equal((await rpc(f,'tools/list')).status,403,'old grant_epoch must not revive');
  const fresh=f.tokenFor('ownerA');
  assert.equal((await rpc(f,'tools/list',{},fresh)).status,200);
  f.revokeToken('ownerA');
  assert.equal((await rpc(f,'tools/list',{},fresh)).status,403);
}));

test('Origin, method and mirrored-header inconsistencies fail closed over real HTTP',()=>withFixture(async f=>{
  const badOrigin=await rpc(f,'tools/list',{},f.tokens.ownerA,{headers:{origin:'https://attacker.example.test'}});
  assert.equal(badOrigin.status,403);
  assert.equal((await rpc(f,'tools/list',{},f.tokens.ownerA,
    {headers:{origin:'https://orbit.example.test'}})).status,200);
  const legacy=await rpc(f,'tools/list',{},f.tokens.ownerA,{method:'GET'});
  assert.equal(legacy.status,405);
  const wrong=await rpc(f,'tools/list',{},f.tokens.ownerA,{headers:{'mcp-method':'tools/call'}});
  assert.equal(wrong.status,400);
  assert.equal(wrong.json.error.code,-32020);
  const oldVersion=await rpc(f,'tools/list',{},f.tokens.ownerA,{headers:{'mcp-protocol-version':'2025-11-25'}});
  assert.equal(oldVersion.status,400);
  assert.equal(oldVersion.json.error.code,-32020);
}));

test('read-only RPC limits reject arbitrary tools, account overrides and forbidden methods',()=>withFixture(async f=>{
  const badTool=await rpc(f,'tools/call',{name:'delete_task',arguments:{}});
  assert.equal(badTool.status,404);
  assert.equal(badTool.json.error.code,-32601);
  const badArgs=await rpc(f,'tools/call',{name:'list_branches',arguments:{ownerId:f.ownerIds.ownerB}});
  assert.equal(badArgs.status,403);
  const forbidden=await rpc(f,'resources/read',{uri:'file:///private/journal'});
  assert.equal(forbidden.status,404);
  assert.equal(forbidden.json.error.code,-32601);
}));

test('malformed and oversized POSTs receive bounded errors with no reflected input',()=>withFixture(async f=>{
  const malformed=await rpc(f,'tools/call',{name:'list_branches',arguments:{}},f.tokens.ownerA,
    {body:'{"jsonrpc":"2.0","method":"tools/call","method":"delete_task"}'});
  assert.equal(malformed.status,400);
  assert.doesNotMatch(JSON.stringify(malformed.json),/delete_task|Alpha secret/);
  const oversize=await rpc(f,'tools/list',{},f.tokens.ownerA,{body:'x'.repeat(70000)});
  assert.equal(oversize.status,413);
  assert.ok(JSON.stringify(oversize.json).length<800);
}));

test('per-owner local rate limiter is independent and rejects burst after a fixed cap',()=>withFixture(async f=>{
  const ok1=await rpc(f,'tools/list');
  const ok2=await rpc(f,'tools/list');
  assert.equal(ok1.status,200);assert.equal(ok2.status,200);
  const blocked=await rpc(f,'tools/list');
  assert.equal(blocked.status,429);
  assert.equal((await rpc(f,'tools/list',{},f.tokens.ownerB)).status,200);
}, {maxRequestsPerMinute:2}));

test('spoofed Host is denied on loopback without exposing internal details',()=>withFixture(async f=>{
  const bad=await rpc(f,'tools/list',{},f.tokens.ownerA,{headers:{host:'evil.example.test'}});
  assert.equal(bad.status,403);
  assert.equal(bad.json.error.message,'Request denied');
}));

test('response metadata contains no access token, private grant row, or session cookies',()=>withFixture(async f=>{
  const res=await rpc(f,'tools/list');
  assert.equal(res.status,200);
  assert.equal(res.headers.get('cache-control'),'no-store');
  assert.equal(res.headers.get('set-cookie'),null);
  assert.doesNotMatch(JSON.stringify(res.json),/eyJhbGci|grant_epoch|private_note/);
}));
