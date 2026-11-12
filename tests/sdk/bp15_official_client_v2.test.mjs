// Independent official MCP v2 client conformance against loopback synthetic owners.
// CI installs @modelcontextprotocol/client@2.4.0 only for this test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {startLocalMcpFixture} from '../../server/mcp/local-fixture.mjs';

async function connected(fixture,token,mode={pin:'2026-07-28'}){
  const client=new Client({name:'orbit-official-sdk-test',version:'1.0.0'},
    {versionNegotiation:{mode}});
  try{
    await client.connect(new StreamableHTTPClientTransport(new URL(fixture.url),{
      authProvider:token?{token:async()=>token}:undefined,
    }));
    return client;
  }catch(err){await client.close().catch(()=>{});throw err;}
}
const unpack=result=>{
  assert.equal(result.isError,false);
  assert.equal(result.content[0].type,'text');
  return JSON.parse(result.content[0].text);
};
async function fixtureRun(fn){
  const fixture=await startLocalMcpFixture();
  try{await fn(fixture);}finally{await fixture.close();}
}
test('real official SDK pinned modern handshake, discovery, and 3 private tools',()=>fixtureRun(async f=>{
  const c=await connected(f,f.tokens.ownerA);
  try{
    assert.equal(c.getProtocolEra(),'modern');
    assert.deepEqual(c.getDiscoverResult().supportedVersions,['2026-07-28']);
    const tools=await c.listTools();
    assert.deepEqual(tools.tools.map(t=>t.name),['list_branches','search_tasks','get_task']);
    assert.ok(tools.tools.every(t=>t.annotations?.readOnlyHint===true));
    assert.doesNotMatch(JSON.stringify(tools),/journal|tasks:write|delete_task/i);
    assert.equal(unpack(await c.callTool({name:'list_branches',arguments:{}})).branches[0].label,'Owner A');
    assert.equal(unpack(await c.callTool({name:'search_tasks',arguments:{query:'alpha'}})).tasks[0].id,'alpha-task');
    assert.equal(unpack(await c.callTool({name:'get_task',arguments:{taskId:'alpha-task'}})).task.title,'Alpha secret plan');
  }finally{await c.close();}
}));
test('official SDK isolates A and B, checks revoked epochs and token revocation',()=>fixtureRun(async f=>{
  const a=await connected(f,f.tokens.ownerA);
  const b=await connected(f,f.tokens.ownerB);
  try{
    assert.equal(unpack(await b.callTool({name:'list_branches',arguments:{}})).branches[0].label,'Owner B');
    assert.equal(unpack(await b.callTool({name:'get_task',arguments:{taskId:'alpha-task'}})).task,null);
    assert.equal(unpack(await a.callTool({name:'get_task',arguments:{taskId:'beta-task'}})).task,null);
    f.revoke('ownerA');
    await assert.rejects(()=>a.callTool({name:'list_branches',arguments:{}}));
    assert.equal(unpack(await b.callTool({name:'list_branches',arguments:{}})).branches[0].label,'Owner B');
    f.regrant('ownerA');
    await assert.rejects(()=>a.callTool({name:'list_branches',arguments:{}}));
    const newClient=await connected(f,f.tokenFor('ownerA'));
    try{
      assert.equal(unpack(await newClient.callTool({name:'list_branches',arguments:{}})).branches[0].label,'Owner A');
      f.revokeToken('ownerA');
      await assert.rejects(()=>newClient.callTool({name:'list_branches',arguments:{}}));
    }finally{await newClient.close();}
  }finally{await Promise.all([a.close(),b.close()]);}
}));
test('official SDK auto negotiates modern, and missing or forged credentials deny connection',()=>fixtureRun(async f=>{
  await assert.rejects(()=>connected(f,null));
  await assert.rejects(()=>connected(f,'invalid.forged.token'));
  const c=await connected(f,f.tokens.ownerB,'auto');
  try{
    assert.equal(c.getProtocolEra(),'modern');
    assert.equal(unpack(await c.callTool({name:'list_branches',arguments:{}})).branches[0].label,'Owner B');
  }finally{await c.close();}
}));
