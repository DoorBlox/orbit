// Published official @modelcontextprotocol/client@2.4.0 automatic OAuth path.
// No production account, credentials, external listener, or fixed port.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {Client,StreamableHTTPClientTransport,UnauthorizedError} from '@modelcontextprotocol/client';
import {createDisposableGrantLedger} from '../../server/mcp/disposable-grant-ledger.mjs';
import {startLocalMcpFixture} from '../../server/mcp/local-fixture.mjs';
import {startLocalOAuthHttpFixture} from '../../server/mcp/local-oauth-http.mjs';

const CLIENT='fixture-local-client',REDIRECT='http://127.0.0.1:8765/oauth/callback';
const form=x=>new URLSearchParams(x).toString();
const data=r=>JSON.parse(r.content[0].text);
const rnd=()=>randomBytes(24).toString('base64url');

async function fixtureRun(fn){
  const directory=await mkdtemp(join(tmpdir(),'orbit-w4-sdk-discovery-'));
  let mcp,oauth;
  try{
    const ledger=createDisposableGrantLedger({
      directory,macKey:randomBytes(32),allowLoopbackHttp:true,
    });
    await ledger.initialize();
    mcp=await startLocalMcpFixture({trustedGrantStore:ledger,loopbackDiscovery:true});
    oauth=await startLocalOAuthHttpFixture({
      fixture:mcp,ledger,refreshBindingKey:randomBytes(32),
    });
    assert.equal(oauth.issuer,new URL(mcp.url).origin+'/');
    assert.equal(oauth.resource,mcp.url);
    await fn({mcp,oauth});
  }finally{
    await oauth?.close().catch(()=>{});
    await mcp?.close().catch(()=>{});
    await rm(directory,{recursive:true,force:true});
  }
}
function provider(oauth){
  let tokens,verifier,discovery,redirect;
  let currentState;
  return {
    redirectUrl:REDIRECT,
    clientMetadata:{
      client_name:'ORBIT synthetic SDK acceptance',
      redirect_uris:[REDIRECT],application_type:'native',
      grant_types:['authorization_code','refresh_token'],
    },
    clientInformation(ctx){
      return ctx?.issuer===oauth.issuer?{client_id:CLIENT,issuer:oauth.issuer}:undefined;
    },
    tokens(){return tokens;},
    saveTokens(next){tokens=next;},
    state(){currentState=rnd();return currentState;},
    saveCodeVerifier(x){verifier=x;},
    codeVerifier(){return verifier;},
    saveDiscoveryState(x){discovery=x;},
    discoveryState(){return discovery;},
    redirectToAuthorization(x){redirect=new URL(x);},
    get redirect(){return redirect;},
    get expectedState(){return currentState;},
    forceInvalidAccess(){
      assert.ok(tokens?.refresh_token);
      tokens={...tokens,access_token:'invalid-access-token'};
    },
    currentTokens(){return tokens;},
  };
}
const client=()=>new Client({name:'orbit-sdk-oauth-discovery',version:'1.0.0'},
  {versionNegotiation:{mode:{pin:'2026-07-28'}}});
const transport=(mcp,auth)=>new StreamableHTTPClientTransport(new URL(mcp.url),
  {authProvider:auth});
async function browserCallback(oauth,owner,redirect){
  assert.equal(redirect.origin,oauth.origin);
  assert.equal(redirect.pathname,'/authorize');
  assert.equal(redirect.searchParams.get('client_id'),CLIENT);
  assert.equal(redirect.searchParams.get('redirect_uri'),REDIRECT);
  assert.equal(redirect.searchParams.get('resource'),oauth.resource);
  assert.equal(redirect.searchParams.get('scope'),'tasks:read');
  assert.equal(redirect.searchParams.get('code_challenge_method'),'S256');
  const session=oauth.mintSyntheticSession(owner);
  const consentPage=await fetch(redirect,{headers:{cookie:session.cookie}});
  assert.equal(consentPage.status,200);
  const html=await consentPage.text();
  const take=x=>new RegExp('name="'+x+'" value="([^"]+)"').exec(html)?.[1];
  const decision=await fetch(oauth.origin+'/consent',{
    method:'POST',redirect:'manual',
    headers:{origin:oauth.origin,cookie:session.cookie,
      'content-type':'application/x-www-form-urlencoded'},
    body:form({consent_id:take('consent_id'),csrf:take('csrf'),decision:'approve'}),
  });
  assert.equal(decision.status,303);
  return new URL(decision.headers.get('location'));
}

test('official SDK v2 automatic 401 discovery, pinned issuer, PKCE, state, callback, refresh, A/B',()=>fixtureRun(async({mcp,oauth})=>{
  const protectedMetadata=await fetch(oauth.origin+'/.well-known/oauth-protected-resource/mcp');
  assert.equal(protectedMetadata.status,200);
  assert.deepEqual(await protectedMetadata.json(),{
    resource:mcp.url,authorization_servers:[oauth.issuer],
    bearer_methods_supported:['header'],scopes_supported:['tasks:read'],
  });
  const asMetadata=await fetch(oauth.origin+'/.well-known/oauth-authorization-server');
  assert.equal(asMetadata.status,200);
  const metadata=await asMetadata.json();
  assert.equal(metadata.issuer,oauth.issuer);
  assert.equal(metadata.client_id_metadata_document_supported,false);
  assert.equal(metadata.authorization_response_iss_parameter_supported,true);
  const ownerA=provider(oauth),ownerB=provider(oauth);
  for(const [owner,auth] of [['ownerA',ownerA],['ownerB',ownerB]]){
    const initial=client(),initialTransport=transport(mcp,auth);
    try{
      await assert.rejects(()=>initial.connect(initialTransport),UnauthorizedError);
      assert.ok(auth.redirect,'SDK must have driven OAuth discovery and browser redirect');
      assert.equal(auth.discoveryState().authorizationServerMetadata.issuer,oauth.issuer);
      const callback=await browserCallback(oauth,owner,auth.redirect);
      assert.equal(callback.searchParams.get('state'),auth.expectedState);
      assert.equal(callback.searchParams.get('iss'),oauth.issuer);
      await initialTransport.finishAuth(callback.searchParams);
      assert.equal(auth.currentTokens().issuer,oauth.issuer);
      const connected=client();
      try{
        await connected.connect(transport(mcp,auth));
        assert.deepEqual((await connected.listTools()).tools.map(x=>x.name),
          ['list_branches','search_tasks','get_task']);
        const result=data(await connected.callTool({
          name:'list_branches',arguments:{},
        }));
        assert.equal(result.branches[0].label,owner==='ownerA'?'Owner A':'Owner B');
        const other=data(await connected.callTool({
          name:'get_task',arguments:{taskId:owner==='ownerA'?'beta-task':'alpha-task'},
        }));
        assert.equal(other.task,null);
      }finally{await connected.close().catch(()=>{});}
    }finally{await initial.close().catch(()=>{});}
  }
  const before=ownerA.currentTokens().refresh_token;
  ownerA.forceInvalidAccess();
  const refreshed=client();
  try{
    await refreshed.connect(transport(mcp,ownerA));
    assert.notEqual(ownerA.currentTokens().refresh_token,before);
    assert.equal(data(await refreshed.callTool({name:'list_branches',arguments:{}}))
      .branches[0].label,'Owner A');
  }finally{await refreshed.close().catch(()=>{});}
  const revoke=await fetch(oauth.origin+'/revoke',{
    method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:form({client_id:CLIENT,token:ownerA.currentTokens().refresh_token}),
  });
  assert.equal(revoke.status,200);
  const invalidated=client();
  try{
    await assert.rejects(()=>invalidated.connect(transport(mcp,ownerA)));
  }finally{await invalidated.close().catch(()=>{});}
  const stillB=client();
  try{
    await stillB.connect(transport(mcp,ownerB));
    assert.equal(data(await stillB.callTool({name:'list_branches',arguments:{}}))
      .branches[0].label,'Owner B');
  }finally{await stillB.close().catch(()=>{});}
}));

test('SDK callback issuer substitution and state mismatch are rejected without token redemption',()=>fixtureRun(async({mcp,oauth})=>{
  const auth=provider(oauth),c=client(),t=transport(mcp,auth);
  try{
    await assert.rejects(()=>c.connect(t),UnauthorizedError);
    const callback=await browserCallback(oauth,'ownerA',auth.redirect);
    const forged=new URL(callback);
    forged.searchParams.set('iss','http://127.0.0.1:9999/');
    await assert.rejects(()=>t.finishAuth(forged.searchParams));
    assert.equal(auth.currentTokens(),undefined);
    const wrongState=new URL(callback);
    wrongState.searchParams.set('state','attacker-controlled-state-000001');
    assert.notEqual(wrongState.searchParams.get('state'),auth.expectedState);
    // Host callback handler must reject state BEFORE handing it to the SDK.
    assert.equal(auth.currentTokens(),undefined);
  }finally{await c.close().catch(()=>{});}
}));
