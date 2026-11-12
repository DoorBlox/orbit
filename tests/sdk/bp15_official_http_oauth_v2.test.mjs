// Official maintained MCP SDK 2.4.0 acceptance using credentials from
// ORBIT's disposable *real HTTP* PKCE/consent/token/refresh/revoke fixture.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {createDisposableGrantLedger} from '../../server/mcp/disposable-grant-ledger.mjs';
import {startLocalMcpFixture} from '../../server/mcp/local-fixture.mjs';
import {startLocalOAuthHttpFixture} from '../../server/mcp/local-oauth-http.mjs';

const CLIENT='fixture-local-client',REDIRECT='http://127.0.0.1:8765/oauth/callback';
const VERIFIER='v'.repeat(64);
const CHALLENGE=createHash('sha256').update(VERIFIER).digest('base64url');
const form=o=>new URLSearchParams(o).toString();
async function withFixture(fn){
  const directory=await mkdtemp(join(tmpdir(),'orbit-official-oauth-v2-'));
  let mcp,oauth;
  try{
    const ledger=createDisposableGrantLedger({directory,macKey:randomBytes(32)});
    await ledger.initialize();
    mcp=await startLocalMcpFixture({trustedGrantStore:ledger});
    oauth=await startLocalOAuthHttpFixture({
      fixture:mcp,ledger,refreshBindingKey:randomBytes(32),
    });
    await fn({mcp,oauth});
  }finally{
    await oauth?.close().catch(()=>{});
    await mcp?.close().catch(()=>{});
    await rm(directory,{recursive:true,force:true});
  }
}
async function signedIn(oauth,owner){
  const session=oauth.mintSyntheticSession(owner);
  const params={client_id:CLIENT,redirect_uri:REDIRECT,response_type:'code',
    scope:'tasks:read',resource:oauth.resource,code_challenge_method:'S256',
    code_challenge:CHALLENGE,state:randomBytes(24).toString('base64url')};
  const page=await fetch(oauth.origin+'/authorize?'+form(params),{
    headers:{cookie:session.cookie},
  });
  assert.equal(page.status,200);
  const html=await page.text();
  const take=x=>new RegExp('name="'+x+'" value="([^"]+)"').exec(html)?.[1];
  const consent=await fetch(oauth.origin+'/consent',{method:'POST',
    redirect:'manual',headers:{origin:oauth.origin,cookie:session.cookie,
      'content-type':'application/x-www-form-urlencoded'},
    body:form({consent_id:take('consent_id'),csrf:take('csrf'),decision:'approve'}),
  });
  assert.equal(consent.status,303);
  const cb=new URL(consent.headers.get('location'));
  assert.equal(cb.searchParams.get('state'),params.state);
  const tokenResponse=await fetch(oauth.origin+'/token',{method:'POST',
    headers:{origin:oauth.origin,'content-type':'application/x-www-form-urlencoded'},
    body:form({grant_type:'authorization_code',client_id:CLIENT,
      resource:oauth.resource,redirect_uri:REDIRECT,
      code:cb.searchParams.get('code'),code_verifier:VERIFIER}),
  });
  assert.equal(tokenResponse.status,200);
  return tokenResponse.json();
}
const unpack=r=>{
  assert.equal(r.isError,false);
  assert.equal(r.content[0].type,'text');
  return JSON.parse(r.content[0].text);
};
async function connected(mcp,getToken){
  const client=new Client({name:'orbit-real-http-oauth-sdk-v2',version:'1.0.0'},
    {versionNegotiation:{mode:{pin:'2026-07-28'}}});
  try{
    await client.connect(new StreamableHTTPClientTransport(new URL(mcp.url),{
      authProvider:{token:async()=>getToken()},
    }));
    return client;
  }catch(e){await client.close().catch(()=>{});throw e;}
}
test('official SDK v2 consumes real HTTP PKCE bearer and sees only own private tools',()=>withFixture(async({mcp,oauth})=>{
  const a=await signedIn(oauth,'ownerA');
  const b=await signedIn(oauth,'ownerB');
  let currentA=a.access_token;
  const ca=await connected(mcp,()=>currentA),cb=await connected(mcp,()=>b.access_token);
  try{
    assert.equal(ca.getProtocolEra(),'modern');
    assert.deepEqual((await ca.listTools()).tools.map(t=>t.name),[
      'list_branches','search_tasks','get_task']);
    assert.equal(unpack(await ca.callTool({name:'list_branches',arguments:{}})).branches[0].label,'Owner A');
    assert.equal(unpack(await cb.callTool({name:'list_branches',arguments:{}})).branches[0].label,'Owner B');
    assert.equal(unpack(await cb.callTool({name:'get_task',arguments:{taskId:'alpha-task'}})).task,null);
    const rotate=await fetch(oauth.origin+'/token',{method:'POST',
      headers:{'content-type':'application/x-www-form-urlencoded'},
      body:form({grant_type:'refresh_token',client_id:CLIENT,
        resource:oauth.resource,refresh_token:a.refresh_token}),
    });
    assert.equal(rotate.status,200);
    currentA=(await rotate.json()).access_token;
    assert.equal(unpack(await ca.callTool({name:'list_branches',arguments:{}})).branches[0].label,'Owner A');
    const revoke=await fetch(oauth.origin+'/revoke',{method:'POST',
      headers:{'content-type':'application/x-www-form-urlencoded'},
      body:form({client_id:CLIENT,token:a.refresh_token}),
    });
    assert.equal(revoke.status,200);
    // A rotated-away refresh token no longer revokes the current grant.
    assert.equal(unpack(await ca.callTool({name:'list_branches',arguments:{}})).branches[0].label,'Owner A');
    assert.equal(unpack(await cb.callTool({name:'list_branches',arguments:{}})).branches[0].label,'Owner B');
  }finally{await Promise.all([ca.close(),cb.close()]);}
}));
test('official SDK v2 rejects revoked HTTP access token while retaining other owner',()=>withFixture(async({mcp,oauth})=>{
  const a=await signedIn(oauth,'ownerA'),b=await signedIn(oauth,'ownerB');
  const ca=await connected(mcp,()=>a.access_token),cb=await connected(mcp,()=>b.access_token);
  try{
    const revoke=await fetch(oauth.origin+'/revoke',{method:'POST',
      headers:{'content-type':'application/x-www-form-urlencoded'},
      body:form({client_id:CLIENT,token:a.refresh_token}),
    });
    assert.equal(revoke.status,200);
    await assert.rejects(()=>ca.callTool({name:'list_branches',arguments:{}}));
    assert.equal(unpack(await cb.callTool({name:'list_branches',arguments:{}})).branches[0].label,'Owner B');
  }finally{await Promise.all([ca.close(),cb.close()]);}
}));
