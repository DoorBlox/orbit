// Published @modelcontextprotocol/client@2.4.0 genuine CIMD auth path.
// HTTPS client identity is a pinned in-memory document, NOT a live network fetch.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {Client,StreamableHTTPClientTransport,UnauthorizedError} from '@modelcontextprotocol/client';
import {createDisposableGrantLedger} from '../../server/mcp/disposable-grant-ledger.mjs';
import {createPinnedCimdRegistry} from '../../server/mcp/cimd-client-metadata.mjs';
import {startLocalMcpFixture} from '../../server/mcp/local-fixture.mjs';
import {startLocalOAuthHttpFixture} from '../../server/mcp/local-oauth-http.mjs';

const CLIENT_ID='https://cimd.example.test/oauth/client.json';
const REDIRECT='http://127.0.0.1:8765/oauth/callback';
const NAME='ORBIT synthetic unregistered CIMD client';
const form=x=>new URLSearchParams(x).toString();
const doc=()=>({
  client_id:CLIENT_ID,client_name:NAME,redirect_uris:[REDIRECT],
  grant_types:['authorization_code','refresh_token'],
  response_types:['code'],token_endpoint_auth_method:'none',application_type:'native',
});
function provider(oauth){
  let tokens,verifier,discovery,redirect,clientInfo;
  let state;
  return {
    clientMetadataUrl:CLIENT_ID,redirectUrl:REDIRECT,
    clientMetadata:{client_name:NAME,redirect_uris:[REDIRECT],
      application_type:'native',grant_types:['authorization_code','refresh_token']},
    clientInformation(){return clientInfo;},
    saveClientInformation(info){clientInfo=info;},
    get savedClientInfo(){return clientInfo;},
    tokens(){return tokens;},
    saveTokens(next){tokens=next;},
    currentTokens(){return tokens;},
    state(){state=randomBytes(24).toString('base64url');return state;},
    get expectedState(){return state;},
    saveCodeVerifier(value){verifier=value;},
    codeVerifier(){return verifier;},
    saveDiscoveryState(value){discovery=value;},
    discoveryState(){return discovery;},
    redirectToAuthorization(url){
      const u=new URL(url);
      if(u.origin!==oauth.origin||u.pathname!=='/authorize')
        throw Error('CIMD_HOST_REDIRECT_DENIED');
      redirect=u;
    },
    get redirect(){return redirect;},
    validateResourceURL(url,fromMetadata){
      if(new URL(url).href!==oauth.resource||
        (fromMetadata!==undefined&&fromMetadata!==oauth.resource))
        throw Error('CIMD_RESOURCE_MISMATCH');
      return Promise.resolve(new URL(oauth.resource));
    },
    invalidateAccess(){tokens={...tokens,access_token:'invalid-access-token'};},
  };
}
const client=()=>new Client({name:'orbit-cimd',version:'1.0.0'},
  {versionNegotiation:{mode:{pin:'2026-07-28'}}});
const transport=(mcp,p)=>new StreamableHTTPClientTransport(new URL(mcp.url),{authProvider:p});
const branches=async c=>JSON.parse((await c.callTool({
  name:'list_branches',arguments:{},
})).content[0].text).branches.map(x=>x.label);

async function withCimdFixture(fn){
  const directory=await mkdtemp(join(tmpdir(),'orbit-cimd-sdk-'));
  let mcp,oauth;
  try{
    const documents=new Map([[CLIENT_ID,doc()]]);
    const registry=createPinnedCimdRegistry({
      documents,trustedOrigins:['https://cimd.example.test'],
      allowedRedirectUris:[REDIRECT],
    });
    const ledger=createDisposableGrantLedger({
      directory,macKey:randomBytes(32),allowLoopbackHttp:true,
      allowCimdClientIds:true,
    });
    await ledger.initialize();
    mcp=await startLocalMcpFixture({
      trustedGrantStore:ledger,loopbackDiscovery:true,cimdClientId:CLIENT_ID,
    });
    oauth=await startLocalOAuthHttpFixture({
      fixture:mcp,ledger,cimdRegistry:registry,refreshBindingKey:randomBytes(32),
    });
    await fn({mcp,oauth,documents,registry,ledger});
  }finally{
    await oauth?.close().catch(()=>{});
    await mcp?.close().catch(()=>{});
    await rm(directory,{recursive:true,force:true});
  }
}
async function authorize(mcp,oauth,owner){
  const p=provider(oauth),c=client(),t=transport(mcp,p);
  try{
    await assert.rejects(()=>c.connect(t),UnauthorizedError);
    assert.equal(p.savedClientInfo.client_id,CLIENT_ID,
      'Official SDK selected URL CIMD without DCR or pre-registration');
    assert.equal(p.savedClientInfo.issuer,oauth.issuer);
    assert.equal(p.redirect.searchParams.get('client_id'),CLIENT_ID);
    assert.equal(p.redirect.searchParams.get('resource'),mcp.url);
    assert.equal(p.redirect.searchParams.get('code_challenge_method'),'S256');
    const session=oauth.mintSyntheticSession(owner);
    const consent=await fetch(p.redirect,{headers:{cookie:session.cookie}});
    assert.equal(consent.status,200);
    const html=await consent.text();
    assert.match(html,/ORBIT synthetic unregistered CIMD client/);
    assert.match(html,/Registered callback host: 127\.0\.0\.1/);
    const field=x=>new RegExp('name="'+x+'" value="([^"]+)"').exec(html)?.[1];
    const decision=await fetch(oauth.origin+'/consent',{method:'POST',redirect:'manual',
      headers:{origin:oauth.origin,cookie:session.cookie,
        'content-type':'application/x-www-form-urlencoded'},
      body:form({consent_id:field('consent_id'),csrf:field('csrf'),decision:'approve'}),
    });
    assert.equal(decision.status,303);
    const callback=new URL(decision.headers.get('location'));
    assert.equal(callback.searchParams.get('iss'),oauth.issuer);
    assert.equal(callback.searchParams.get('state'),p.expectedState,
      'Browser host compared the callback state before SDK finishAuth');
    await t.finishAuth(callback.searchParams);
    assert.equal(p.currentTokens().issuer,oauth.issuer);
    const claims=JSON.parse(Buffer.from(p.currentTokens().access_token.split('.')[1],
      'base64url').toString('utf8'));
    assert.equal(claims.client_id,CLIENT_ID,
      'The signed JWT carries the original URL client_id, not an opaque alias');
    assert.equal(claims.aud,mcp.url);
    return {p,callback};
  }finally{await c.close().catch(()=>{});}
}

test('official SDK v2.4 CIMD URL client ID: real automatic 401, discovery, PKCE, A/B, refresh, revoke',()=>withCimdFixture(async({mcp,oauth})=>{
  const discovery=await fetch(oauth.origin+'/.well-known/oauth-authorization-server');
  assert.equal(discovery.status,200);
  const metadata=await discovery.json();
  assert.equal(metadata.client_id_metadata_document_supported,true);
  assert.equal(metadata.issuer,oauth.issuer);
  const ownerA=await authorize(mcp,oauth,'ownerA');
  const ownerB=await authorize(mcp,oauth,'ownerB');
  for(const [label,auth] of [['Owner A',ownerA.p],['Owner B',ownerB.p]]){
    const c=client();
    try{
      await c.connect(transport(mcp,auth));
      assert.deepEqual(await branches(c),[label]);
      assert.deepEqual((await c.listTools()).tools.map(x=>x.name),
        ['list_branches','search_tasks','get_task']);
    }finally{await c.close().catch(()=>{});}
  }
  const spentRefresh=ownerA.p.currentTokens().refresh_token;
  ownerA.p.invalidateAccess();
  const refreshed=client();
  try{
    await refreshed.connect(transport(mcp,ownerA.p));
    assert.notEqual(ownerA.p.currentTokens().refresh_token,spentRefresh);
    assert.deepEqual(await branches(refreshed),['Owner A']);
  }finally{await refreshed.close().catch(()=>{});}
  const revoked=await fetch(oauth.origin+'/revoke',{
    method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:form({client_id:CLIENT_ID,token:ownerA.p.currentTokens().refresh_token}),
  });
  assert.equal(revoked.status,200);
  const old=client();
  try{await assert.rejects(()=>old.connect(transport(mcp,ownerA.p)));}
  finally{await old.close().catch(()=>{});}
  const stillB=client();
  try{
    await stillB.connect(transport(mcp,ownerB.p));
    assert.deepEqual(await branches(stillB),['Owner B']);
  }finally{await stillB.close().catch(()=>{});}
}));

test('CIMD disallows SSRF URL, foreign redirect, changed client document and secret escalation',()=>withCimdFixture(async({mcp,oauth,documents,ledger})=>{
  const p=provider(oauth),c=client(),t=transport(mcp,p);
  try{
    await assert.rejects(()=>c.connect(t),UnauthorizedError);
    assert.equal(p.redirect.searchParams.get('client_id'),CLIENT_ID);
    const session=oauth.mintSyntheticSession('ownerA');
    for(const [key,value] of [
      ['client_id','https://169.254.169.254/latest/meta-data.json'],
      ['client_id','https://evil.example.test/oauth/client.json'],
      ['client_id','http://127.0.0.1:7777/client.json'],
      ['redirect_uri','https://attacker.invalid/callback'],
      ['redirect_uri',REDIRECT+'/suffix'],
      ['scope','journals:read'],
    ]){
      const invalid=new URL(p.redirect);
      invalid.searchParams.set(key,value);
      const res=await fetch(invalid,{headers:{cookie:session.cookie},redirect:'manual'});
      assert.equal(res.status,400,key+':'+value);
      assert.equal(res.headers.get('location'),null);
    }
    documents.set(CLIENT_ID,{...doc(),client_id:'https://evil.example.test/oauth/client.json'});
    const changed=await fetch(p.redirect,{headers:{cookie:session.cookie}});
    assert.equal(changed.status,400,'document identity does not match URL');
    documents.set(CLIENT_ID,doc());
    const good=await fetch(p.redirect,{headers:{cookie:session.cookie}});
    assert.equal(good.status,200);
    const html=await good.text();
    const field=x=>new RegExp('name="'+x+'" value="([^"]+)"').exec(html)?.[1];
    documents.set(CLIENT_ID,{...doc(),redirect_uris:['https://attacker.invalid/cb']});
    const approval=await fetch(oauth.origin+'/consent',{method:'POST',redirect:'manual',
      headers:{cookie:session.cookie,origin:oauth.origin,
        'content-type':'application/x-www-form-urlencoded'},
      body:form({consent_id:field('consent_id'),csrf:field('csrf'),decision:'approve'}),
    });
    assert.equal(approval.status,503,'changing document after consent page fails closed');
    assert.equal(approval.headers.get('location'),null);
    const snap=await ledger.readAuthorizationSnapshot({
      ...mcp.grantIdentity,ownerId:mcp.ownerIds.ownerA,tokenId:'fixture-doc-check-00001',
    });
    assert.equal(snap,null,'no unexpected owner grant on document substitution');
  }finally{await c.close().catch(()=>{});}
}));
