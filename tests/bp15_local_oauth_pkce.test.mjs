import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {startLocalMcpFixture} from '../server/mcp/local-fixture.mjs';
import {createDisposableOAuthPkce} from '../server/mcp/local-oauth-pkce.mjs';

const CLIENT='fixture-local-client';
const REDIRECT='http://127.0.0.1:8765/oauth/callback';
const VERIFIER='v'.repeat(64);
const challenge=verifier=>createHash('sha256').update(verifier).digest('base64url');
const params=(owner='ownerA',other={})=>({
  owner,clientId:CLIENT,redirectUri:REDIRECT,scope:'tasks:read',
  state:randomBytes(24).toString('base64url'),
  codeChallenge:challenge(VERIFIER),consent:true,...other,
});
async function fixtureRun(fn){
  const fixture=await startLocalMcpFixture();
  try{await fn(fixture);}finally{await fixture.close();}
}
async function privateBranches(fixture,accessToken){
  const data={jsonrpc:'2.0',id:'oauth-1',method:'tools/call',params:{
    name:'list_branches',arguments:{},
    _meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'},
  }};
  const res=await fetch(fixture.url,{method:'POST',headers:{
    accept:'application/json, text/event-stream',
    'content-type':'application/json',
    'mcp-protocol-version':'2026-07-28',
    'mcp-method':'tools/call','mcp-name':'list_branches',
    authorization:'Bearer '+accessToken,
  },body:JSON.stringify(data)});
  const json=await res.json();
  return {status:res.status,branches:json.result?
    JSON.parse(json.result.content[0].text).branches:undefined};
}
test('S256 consent code and token exchange integrate with real private MCP A/B reads',()=>fixtureRun(async fixture=>{
  const oauth=createDisposableOAuthPkce({fixture});
  const ownerA=params('ownerA'),ownerB=params('ownerB');
  const aCode=oauth.authorize(ownerA),bCode=oauth.authorize(ownerB);
  assert.equal(aCode.state,ownerA.state);
  assert.ok(aCode.redirectUri.startsWith(REDIRECT+'?'));
  assert.notEqual(aCode.code,bCode.code);
  const a=oauth.exchange({grantType:'authorization_code',clientId:CLIENT,
    redirectUri:REDIRECT,code:aCode.code,codeVerifier:VERIFIER});
  const b=oauth.exchange({grantType:'authorization_code',clientId:CLIENT,
    redirectUri:REDIRECT,code:bCode.code,codeVerifier:VERIFIER});
  assert.equal(a.scope,'tasks:read');
  assert.equal(a.token_type,'Bearer');
  assert.ok(a.refresh_token&&!a.access_token.includes('\n'));
  assert.deepEqual((await privateBranches(fixture,a.access_token)).branches.map(x=>x.label),['Owner A']);
  assert.deepEqual((await privateBranches(fixture,b.access_token)).branches.map(x=>x.label),['Owner B']);
  assert.throws(()=>oauth.exchange({grantType:'authorization_code',clientId:CLIENT,
    redirectUri:REDIRECT,code:aCode.code,codeVerifier:VERIFIER}),/OAUTH_FIXTURE_DENIED/);
}));
test('invalid PKCE, client/redirect mismatch, missing consent and scope escalation fail closed',()=>fixtureRun(async fixture=>{
  const oauth=createDisposableOAuthPkce({fixture});
  assert.deepEqual(oauth.authorize(params('ownerA',{consent:false})),{approved:false});
  for(const bad of [{scope:'journals:read'},{redirectUri:'https://evil.example/'},
    {codeChallenge:'X'.repeat(42)},{clientId:'different-client'}]){
    assert.throws(()=>oauth.authorize(params('ownerA',bad)),/OAUTH_FIXTURE_DENIED/);
  }
  const good=oauth.authorize(params());
  assert.throws(()=>oauth.exchange({grantType:'authorization_code',
    clientId:CLIENT,redirectUri:REDIRECT,code:good.code,codeVerifier:'z'.repeat(64)}),
    /OAUTH_FIXTURE_DENIED/);
  assert.throws(()=>oauth.exchange({grantType:'authorization_code',
    clientId:CLIENT,redirectUri:REDIRECT,code:good.code,codeVerifier:VERIFIER}),
    /OAUTH_FIXTURE_DENIED/,'invalid verifier consumes authorization code');
}));
test('refresh rotation preserves valid owner scope and replay revokes the token family',()=>fixtureRun(async fixture=>{
  const oauth=createDisposableOAuthPkce({fixture});
  const code=oauth.authorize(params());
  const first=oauth.exchange({grantType:'authorization_code',clientId:CLIENT,
    redirectUri:REDIRECT,code:code.code,codeVerifier:VERIFIER});
  const refreshed=oauth.refresh({grantType:'refresh_token',clientId:CLIENT,
    refreshToken:first.refresh_token});
  assert.notEqual(refreshed.refresh_token,first.refresh_token);
  assert.equal((await privateBranches(fixture,refreshed.access_token)).status,200);
  assert.throws(()=>oauth.refresh({grantType:'refresh_token',clientId:CLIENT,
    refreshToken:first.refresh_token}),/OAUTH_FIXTURE_DENIED/);
  assert.equal((await privateBranches(fixture,refreshed.access_token)).status,403);
  assert.throws(()=>oauth.refresh({grantType:'refresh_token',clientId:CLIENT,
    refreshToken:refreshed.refresh_token}),/OAUTH_FIXTURE_DENIED/);
}));
test('explicit owner disconnect revokes access immediately and keeps other owner valid',()=>fixtureRun(async fixture=>{
  const oauth=createDisposableOAuthPkce({fixture});
  const mint=owner=>{
    const code=oauth.authorize(params(owner));
    return oauth.exchange({grantType:'authorization_code',clientId:CLIENT,
      redirectUri:REDIRECT,code:code.code,codeVerifier:VERIFIER});
  };
  const a=mint('ownerA'),b=mint('ownerB');
  assert.equal((await privateBranches(fixture,a.access_token)).status,200);
  oauth.disconnect('ownerA');
  assert.equal((await privateBranches(fixture,a.access_token)).status,403);
  assert.equal((await privateBranches(fixture,b.access_token)).status,200);
  assert.throws(()=>oauth.refresh({grantType:'refresh_token',clientId:CLIENT,
    refreshToken:a.refresh_token}),/OAUTH_FIXTURE_DENIED/);
  const fresh=mint('ownerA');
  assert.equal((await privateBranches(fixture,fresh.access_token)).status,200);
  assert.equal((await privateBranches(fixture,a.access_token)).status,403);
}));
test('expired code, malformed inputs, wrong client and refresh replay deny without token leaks',()=>fixtureRun(async fixture=>{
  let now=Date.now();
  const oauth=createDisposableOAuthPkce({fixture,clock:()=>now});
  const code=oauth.authorize(params());
  now+=61_000;
  assert.throws(()=>oauth.exchange({grantType:'authorization_code',clientId:CLIENT,
    redirectUri:REDIRECT,code:code.code,codeVerifier:VERIFIER}),/OAUTH_FIXTURE_DENIED/);
  const newer=oauth.authorize(params());
  assert.throws(()=>oauth.exchange({grantType:'authorization_code',clientId:'evil',
    redirectUri:REDIRECT,code:newer.code,codeVerifier:VERIFIER}),/OAUTH_FIXTURE_DENIED/);
  assert.throws(()=>oauth.exchange({grantType:'authorization_code',clientId:CLIENT,
    redirectUri:REDIRECT,code:newer.code,codeVerifier:VERIFIER}),/OAUTH_FIXTURE_DENIED/);
}));
