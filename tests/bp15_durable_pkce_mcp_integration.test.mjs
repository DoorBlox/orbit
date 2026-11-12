import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {startLocalMcpFixture} from '../server/mcp/local-fixture.mjs';
import {createDisposableGrantLedger} from '../server/mcp/disposable-grant-ledger.mjs';
import {createDurableLocalPkce} from '../server/mcp/durable-local-oauth-pkce.mjs';

const CLIENT='fixture-local-client';
const REDIRECT='http://127.0.0.1:8765/oauth/callback';
const VERIFIER='v'.repeat(64);
const challenge=v=>createHash('sha256').update(v).digest('base64url');
const request=(owner='ownerA',changes={})=>({
  owner,clientId:CLIENT,redirectUri:REDIRECT,scope:'tasks:read',
  codeChallenge:challenge(VERIFIER),state:randomBytes(24).toString('base64url'),
  consent:true,...changes,
});
async function sandbox(run){
  const directory=await mkdtemp(join(tmpdir(),'orbit-mcp-ledger-link-'));
  const macKey=randomBytes(32);
  let fixture;
  try{
    const reopen=async()=>{
      const store=createDisposableGrantLedger({directory,macKey});
      await store.initialize();
      return store;
    };
    const ledger=await reopen();
    fixture=await startLocalMcpFixture({trustedGrantStore:ledger});
    await run({directory,macKey,reopen,fixture,ledger});
  }finally{
    if(fixture)await fixture.close();
    await rm(directory,{recursive:true,force:true});
  }
}
async function rpc(fixture,token,name='list_branches',args={}){
  const body={jsonrpc:'2.0',id:'owner-verified',method:'tools/call',
    params:{name,arguments:args,_meta:{
      'io.modelcontextprotocol/protocolVersion':'2026-07-28',
    }}};
  const response=await fetch(fixture.url,{method:'POST',headers:{
    accept:'application/json, text/event-stream',
    'content-type':'application/json',
    'mcp-protocol-version':'2026-07-28',
    'mcp-method':'tools/call','mcp-name':name,
    authorization:'Bearer '+token,
  },body:JSON.stringify(body)});
  const json=await response.json();
  return {status:response.status,
    value:response.status===200?JSON.parse(json.result.content[0].text):null};
}
async function exchange(auth,owner='ownerA'){
  const authorization=await auth.authorize(request(owner));
  assert.equal(authorization.approved,true);
  return auth.exchange({grantType:'authorization_code',
    clientId:CLIENT,redirectUri:REDIRECT,
    code:authorization.code,codeVerifier:VERIFIER});
}

test('persisted grant signs real MCP bearer access; two owners remain isolated and old epochs cannot revive',()=>sandbox(async({fixture,ledger})=>{
  const flow=createDurableLocalPkce({fixture,ledger});
  const a=await exchange(flow);
  const b=await exchange(flow,'ownerB');
  assert.deepEqual((await rpc(fixture,a.access_token)).value.branches.map(x=>x.label),['Owner A']);
  assert.deepEqual((await rpc(fixture,b.access_token)).value.branches.map(x=>x.label),['Owner B']);
  assert.equal((await rpc(fixture,b.access_token,'get_task',{taskId:'alpha-task'})).value.task,null);
  assert.equal((await rpc(fixture,a.access_token,'get_task',{taskId:'beta-task'})).value.task,null);
  const revoked=await flow.disconnect('ownerA');
  assert.ok(revoked.grantEpoch>=2);
  assert.equal((await rpc(fixture,a.access_token)).status,403);
  assert.equal((await rpc(fixture,b.access_token)).status,200);
  const reauthorized=await exchange(flow);
  assert.equal((await rpc(fixture,reauthorized.access_token)).status,200);
  assert.equal((await rpc(fixture,a.access_token)).status,403,'stale signed epoch stays revoked');
}));

test('refresh credentials outlive adapter reopening; rotation and replay revoke only original owner',()=>sandbox(async({fixture,ledger,reopen})=>{
  const initial=createDurableLocalPkce({fixture,ledger});
  const a=await exchange(initial);
  const b=await exchange(initial,'ownerB');
  const durable=await reopen();
  const resumed=createDurableLocalPkce({fixture,ledger:durable});
  const refreshed=await resumed.refresh({grantType:'refresh_token',
    clientId:CLIENT,refreshToken:a.refresh_token,owner:'ownerA'});
  assert.notEqual(refreshed.refresh_token,a.refresh_token);
  assert.equal((await rpc(fixture,refreshed.access_token)).status,200);
  await assert.rejects(()=>initial.refresh({grantType:'refresh_token',
    clientId:CLIENT,refreshToken:a.refresh_token,owner:'ownerA'}),/OAUTH_FIXTURE_DENIED/);
  assert.equal((await rpc(fixture,refreshed.access_token)).status,403);
  assert.equal((await rpc(fixture,b.access_token)).status,200);
  await assert.rejects(()=>resumed.refresh({grantType:'refresh_token',
    clientId:CLIENT,refreshToken:refreshed.refresh_token,owner:'ownerA'}),/OAUTH_FIXTURE_DENIED/);
  const replacement=await exchange(resumed);
  assert.equal((await rpc(fixture,replacement.access_token)).status,200);
  assert.equal((await rpc(fixture,a.access_token)).status,403);
}));

test('wrong proof/client/redirect and denial never mint durable grants',()=>sandbox(async({fixture,ledger})=>{
  const flow=createDurableLocalPkce({fixture,ledger});
  assert.deepEqual(await flow.authorize(request('ownerA',{consent:false})),{approved:false});
  for(const change of [
    {clientId:'outside-client'}, {scope:'journals:read'},
    {redirectUri:'https://attacker.example/callback'},
    {codeChallenge:'x'.repeat(42)},
  ])await assert.rejects(()=>flow.authorize(request('ownerA',change)),/OAUTH_FIXTURE_DENIED/);
  const id={...fixture.grantIdentity,ownerId:fixture.ownerIds.ownerA,tokenId:'fixture-check-0001'};
  assert.equal(await ledger.readAuthorizationSnapshot(id),null);
  const approved=await flow.authorize(request());
  await assert.rejects(()=>flow.exchange({grantType:'authorization_code',clientId:CLIENT,
    redirectUri:REDIRECT,code:approved.code,codeVerifier:'w'.repeat(64)}),/OAUTH_FIXTURE_DENIED/);
  await assert.rejects(()=>flow.exchange({grantType:'authorization_code',clientId:CLIENT,
    redirectUri:REDIRECT,code:approved.code,codeVerifier:VERIFIER}),/OAUTH_FIXTURE_DENIED/);
}));

test('persisted refresh replay is serialized across independently opened adapters, not double issued',()=>sandbox(async({fixture,ledger,reopen})=>{
  const flow=createDurableLocalPkce({fixture,ledger});
  const original=await exchange(flow);
  const reopened=await reopen();
  const second=createDurableLocalPkce({fixture,ledger:reopened});
  const attempts=await Promise.allSettled([
    flow.refresh({grantType:'refresh_token',clientId:CLIENT,refreshToken:original.refresh_token,owner:'ownerA'}),
    second.refresh({grantType:'refresh_token',clientId:CLIENT,refreshToken:original.refresh_token,owner:'ownerA'}),
  ]);
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(attempts.filter(x=>x.status==='rejected').length,1);
  assert.equal((await rpc(fixture,original.access_token)).status,403);
}));

test('ledger outage fails closed in real MCP tool calls and prevents token exchanges',()=>sandbox(async({directory,fixture,ledger})=>{
  const flow=createDurableLocalPkce({fixture,ledger});
  const t=await exchange(flow);
  assert.equal((await rpc(fixture,t.access_token)).status,200);
  const lock=join(directory,'.orbit-grants.lock');
  await mkdir(lock,{mode:0o700});
  try{
    assert.equal((await rpc(fixture,t.access_token)).status,403);
    await assert.rejects(()=>flow.refresh({grantType:'refresh_token',
      clientId:CLIENT,refreshToken:t.refresh_token,owner:'ownerA'}),/OAUTH_FIXTURE_DENIED/);
  }finally{await rm(lock,{recursive:true,force:true});}
  assert.equal((await rpc(fixture,t.access_token)).status,200,
    'lock outage must not secretly revoke otherwise valid grant');
}));
