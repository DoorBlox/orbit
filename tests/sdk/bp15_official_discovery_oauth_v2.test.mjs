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

async function fixtureRun(fn,{clock=Date.now}={}){
  const directory=await mkdtemp(join(tmpdir(),'orbit-w4-sdk-discovery-'));
  let mcp,oauth;
  try{
    const ledger=createDisposableGrantLedger({
      directory,macKey:randomBytes(32),allowLoopbackHttp:true,clock,
    });
    await ledger.initialize();
    mcp=await startLocalMcpFixture({trustedGrantStore:ledger,loopbackDiscovery:true,clock});
    oauth=await startLocalOAuthHttpFixture({
      fixture:mcp,ledger,refreshBindingKey:randomBytes(32),clock,
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
    redirectToAuthorization(x){
      const location=new URL(x);
      // The fixed-test owner browser may visit ONLY this local AS.
      if(location.origin!==oauth.origin||location.pathname!=='/authorize')
        throw Error('LOCAL_AUTHORIZATION_REDIRECT_DENIED');
      redirect=location;
    },
    validateResourceURL(serverUrl,resource){
      if(new URL(serverUrl).href!==oauth.resource||
        (resource!==undefined&&resource!==oauth.resource))
        throw Error('LOCAL_RESOURCE_METADATA_DENIED');
      return Promise.resolve(new URL(oauth.resource));
    },
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
const transport=(mcp,auth,fetchFn)=>new StreamableHTTPClientTransport(new URL(mcp.url),
  {authProvider:auth,...(fetchFn?{fetch:fetchFn}:{})});
/** Host enforces state before handing the callback query to the SDK.
 * The official SDK verifies issuer and authorization-code binding, NOT state.
 */
async function finishWithHostState(transport,auth,params){
  if(params.get('state')!==auth.expectedState)
    throw Error('LOCAL_OAUTH_STATE_MISMATCH');
  return transport.finishAuth(params);
}
async function authorizeSdkOwner(mcp,oauth,owner){
  const auth=provider(oauth),initial=client(),initialTransport=transport(mcp,auth);
  try{
    await assert.rejects(()=>initial.connect(initialTransport),UnauthorizedError);
    const callback=await browserCallback(oauth,owner,auth.redirect);
    assert.equal(callback.searchParams.get('iss'),oauth.issuer);
    await finishWithHostState(initialTransport,auth,callback.searchParams);
    return {auth,callback};
  }finally{await initial.close().catch(()=>{});}
}
function modifyingFetch(endpoint,mutator,expectedOrigin){
  return async(input,init)=>{
    const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
    if(url.origin!==expectedOrigin)throw Error('LOCAL_CROSS_ORIGIN_METADATA_REQUEST_DENIED');
    const response=await fetch(input,init);
    if(url.pathname!==endpoint)return response;
    assert.equal(response.status,200);
    const body=mutator(await response.json());
    return new Response(JSON.stringify(body),{status:200,
      headers:{'content-type':'application/json','cache-control':'no-store'}});
  };
}
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
      await finishWithHostState(initialTransport,auth,callback.searchParams);
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
    await assert.rejects(()=>finishWithHostState(t,auth,wrongState.searchParams),
      /LOCAL_OAUTH_STATE_MISMATCH/);
    assert.equal(auth.currentTokens(),undefined);
  }finally{await c.close().catch(()=>{});}
}));

test('SDK refuses poisoned AS issuer, resource indicator and cross-origin authorization redirect',()=>fixtureRun(async({mcp,oauth})=>{
  const asPath='/.well-known/oauth-authorization-server';
  const resourcePath='/.well-known/oauth-protected-resource/mcp';
  const cases=[
    {name:'issuer',path:asPath,change:x=>({...x,issuer:'http://127.0.0.1:9999/'})},
    {name:'resource',path:resourcePath,change:x=>({...x,resource:oauth.origin+'/other'})},
    {name:'authorize-origin',path:asPath,
      change:x=>({...x,authorization_endpoint:'https://attacker.invalid/authorize'})},
  ];
  for(const entry of cases){
    const auth=provider(oauth),c=client();
    try{
      const fetchFn=modifyingFetch(entry.path,entry.change,oauth.origin);
      await assert.rejects(()=>c.connect(transport(mcp,auth,fetchFn)),Error,entry.name);
      assert.equal(auth.currentTokens(),undefined,entry.name);
      assert.equal(auth.redirect,undefined,entry.name);
    }finally{await c.close().catch(()=>{});}
  }
}));

test('shared localhost metadata, registered client and redirect remain exact and non-leaking',()=>fixtureRun(async({mcp,oauth})=>{
  const auth=provider(oauth),c=client();
  try{
    await assert.rejects(()=>c.connect(transport(mcp,auth)),UnauthorizedError);
    const owner=oauth.mintSyntheticSession('ownerA');
    for(const [key,value] of [
      ['client_id','different-client'],['redirect_uri','https://attacker.invalid/cb'],
      ['redirect_uri',REDIRECT+'/extra'],['resource',oauth.origin+'/journals'],
      ['scope','journals:read'],['response_type','token'],
    ]){
      const tampered=new URL(auth.redirect);
      tampered.searchParams.set(key,value);
      const response=await fetch(tampered,{headers:{cookie:owner.cookie},redirect:'manual'});
      assert.equal(response.status,400,key);
      assert.equal(response.headers.get('location'),null,key);
    }
    const wrongOrigin=await fetch(auth.redirect,{headers:{
      cookie:owner.cookie,origin:'https://attacker.invalid',
    }});
    assert.equal(wrongOrigin.status,403);
    const badToken=await fetch(oauth.origin+'/token',{
      method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
      body:form({grant_type:'authorization_code',client_id:'different-client',
        resource:mcp.url,redirect_uri:REDIRECT,code:rnd(),code_verifier:'v'.repeat(64)}),
    });
    assert.equal(badToken.status,400);
    for(const path of ['/.well-known/oauth-protected-resource/mcp',
      '/.well-known/oauth-authorization-server']){
      const response=await fetch(oauth.origin+path);
      assert.equal(response.status,200,path);
      assert.equal(response.headers.get('cache-control'),'no-store');
      assert.equal(response.headers.get('access-control-allow-origin'),null);
    }
  }finally{await c.close().catch(()=>{});}
}));

test('SDK authorization code is single-use; consent cannot switch trusted owner session',()=>fixtureRun(async({mcp,oauth})=>{
  const {auth,callback}=await authorizeSdkOwner(mcp,oauth,'ownerA');
  const replay=await fetch(oauth.origin+'/token',{
    method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:form({grant_type:'authorization_code',client_id:CLIENT,resource:mcp.url,
      redirect_uri:REDIRECT,code:callback.searchParams.get('code'),
      code_verifier:await auth.codeVerifier()}),
  });
  assert.equal(replay.status,400,'an exchanged authorization code is consumed');
  const nextProvider=provider(oauth),initial=client(),t=transport(mcp,nextProvider);
  try{
    await assert.rejects(()=>initial.connect(t),UnauthorizedError);
    const a=oauth.mintSyntheticSession('ownerA');
    const b=oauth.mintSyntheticSession('ownerB');
    const page=await fetch(nextProvider.redirect,{headers:{cookie:a.cookie}});
    assert.equal(page.status,200);
    const html=await page.text();
    const take=x=>new RegExp('name="'+x+'" value="([^"]+)"').exec(html)?.[1];
    const body=form({consent_id:take('consent_id'),csrf:take('csrf'),decision:'approve'});
    const swapped=await fetch(oauth.origin+'/consent',{
      method:'POST',redirect:'manual',headers:{
        cookie:b.cookie,origin:oauth.origin,
        'content-type':'application/x-www-form-urlencoded',
      },body,
    });
    assert.equal(swapped.status,403);
    const replayAsA=await fetch(oauth.origin+'/consent',{
      method:'POST',redirect:'manual',headers:{
        cookie:a.cookie,origin:oauth.origin,
        'content-type':'application/x-www-form-urlencoded',
      },body,
    });
    assert.equal(replayAsA.status,403,'a consumed pending consent cannot be reused');
  }finally{await initial.close().catch(()=>{});}
}));

test('synthetic expiring JWT fails access verification; SDK refreshes with rotated credentials',()=>{
  let current=Date.now();
  return fixtureRun(async({mcp,oauth})=>{
    const {auth}=await authorizeSdkOwner(mcp,oauth,'ownerA');
    const expiredAccess=auth.currentTokens().access_token;
    const originalRefresh=auth.currentTokens().refresh_token;
    current+=301000; // 300 s signed JWT lifetime, no real wait
    const request={jsonrpc:'2.0',id:'expiry-check',method:'tools/call',
      params:{name:'list_branches',arguments:{},
        _meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}};
    const response=await fetch(mcp.url,{method:'POST',
      headers:{'content-type':'application/json',
        accept:'application/json, text/event-stream',
        'mcp-protocol-version':'2026-07-28','mcp-method':'tools/call',
        'mcp-name':'list_branches',authorization:'Bearer '+expiredAccess},
      body:JSON.stringify(request),
    });
    assert.equal(response.status,401,'an expired signed access token never reads tasks');
    const renewed=client();
    try{
      await renewed.connect(transport(mcp,auth));
      assert.notEqual(auth.currentTokens().refresh_token,originalRefresh,
        'SDK refreshed and persisted new credentials');
      assert.equal(data(await renewed.callTool({
        name:'list_branches',arguments:{},
      })).branches[0].label,'Owner A');
    }finally{await renewed.close().catch(()=>{});}
  },{clock:()=>current});
});

test('replayed rotated refresh revokes only its own owner grant epoch',()=>fixtureRun(async({mcp,oauth})=>{
  const a=await authorizeSdkOwner(mcp,oauth,'ownerA');
  const b=await authorizeSdkOwner(mcp,oauth,'ownerB');
  const oldRefresh=a.auth.currentTokens().refresh_token;
  a.auth.forceInvalidAccess();
  const fresh=client();
  try{
    await fresh.connect(transport(mcp,a.auth));
    assert.notEqual(a.auth.currentTokens().refresh_token,oldRefresh);
    const replay=await fetch(oauth.origin+'/token',{method:'POST',
      headers:{'content-type':'application/x-www-form-urlencoded'},
      body:form({grant_type:'refresh_token',client_id:CLIENT,resource:mcp.url,
        refresh_token:oldRefresh}),
    });
    assert.equal(replay.status,400);
    await assert.rejects(()=>fresh.callTool({name:'list_branches',arguments:{}}));
    const ownerB=client();
    try{
      await ownerB.connect(transport(mcp,b.auth));
      assert.equal(data(await ownerB.callTool({
        name:'list_branches',arguments:{},
      })).branches[0].label,'Owner B');
    }finally{await ownerB.close().catch(()=>{});}
  }finally{await fresh.close().catch(()=>{});}
}));
