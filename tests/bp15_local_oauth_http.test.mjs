import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {request as httpRequest} from 'node:http';
import {join} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {startLocalMcpFixture} from '../server/mcp/local-fixture.mjs';
import {createDisposableGrantLedger} from '../server/mcp/disposable-grant-ledger.mjs';
import {startLocalOAuthHttpFixture} from '../server/mcp/local-oauth-http.mjs';

const CLIENT='fixture-local-client',REDIRECT='http://127.0.0.1:8765/oauth/callback';
const verifier='v'.repeat(64),challenge=createHash('sha256').update(verifier).digest('base64url');
const random=()=>randomBytes(24).toString('base64url');
const authorizeParams=(resource,overrides={})=>({
  client_id:CLIENT,redirect_uri:REDIRECT,response_type:'code',scope:'tasks:read',
  code_challenge:challenge,code_challenge_method:'S256',
  state:random(),resource,...overrides,
});
const form=values=>new URLSearchParams(values).toString();
const action=async(auth,path,body,headers={})=>fetch(auth.origin+path,{
  method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded',
    origin:auth.origin,...headers},body:form(body),
});
async function sandbox(fn,{clock}={}){
  const directory=await mkdtemp(join(tmpdir(),'orbit-w4-oauth-http-'));
  const macKey=randomBytes(32),refreshBindingKey=randomBytes(32);
  let mcp,auth;
  try{
    const ledger=createDisposableGrantLedger({directory,macKey});
    await ledger.initialize();
    mcp=await startLocalMcpFixture({trustedGrantStore:ledger});
    auth=await startLocalOAuthHttpFixture({fixture:mcp,ledger,refreshBindingKey,clock});
    await fn({ledger,mcp,auth,directory,refreshBindingKey,
      reopen:async()=>{
        const next=createDisposableGrantLedger({directory,macKey});
        await next.initialize();return next;
      },
      restart:async()=>{
        await auth.close();
        const reopened=createDisposableGrantLedger({directory,macKey});
        await reopened.initialize();
        auth=await startLocalOAuthHttpFixture({
          fixture:mcp,ledger:reopened,refreshBindingKey,clock,
        });
        return auth;
      },
    });
  }finally{
    await auth?.close().catch(()=>{});
    await mcp?.close().catch(()=>{});
    await rm(directory,{recursive:true,force:true});
  }
}
async function begin(auth,session,params,headers={}){
  const response=await fetch(auth.origin+'/authorize?'+form(params),{
    redirect:'manual',headers:{cookie:session.cookie,...headers},
  });
  const html=await response.text();
  const get=name=>new RegExp('name="'+name+'" value="([^"]+)"').exec(html)?.[1];
  return {response,html,consent_id:get('consent_id'),csrf:get('csrf')};
}
async function decide(auth,session,view,decision='approve',more={}){
  return action(auth,'/consent',{consent_id:view.consent_id,
    csrf:view.csrf,decision,...more},{cookie:session.cookie});
}
async function exchange(auth,url,overrides={}){
  const code=new URL(url).searchParams.get('code');
  const response=await action(auth,'/token',{grant_type:'authorization_code',
    client_id:CLIENT,redirect_uri:REDIRECT,code,code_verifier:verifier,
    resource:auth.resource,...overrides},{origin:auth.origin});
  return {response,body:await response.json()};
}
async function approve(auth,owner='ownerA',paramChanges={}){
  const session=auth.mintSyntheticSession(owner);
  const params=authorizeParams(auth.resource,paramChanges);
  const view=await begin(auth,session,params);
  assert.equal(view.response.status,200);
  assert.match(view.html,/tasks:read/);
  const decision=await decide(auth,session,view);
  assert.equal(decision.status,303);
  const redirect=decision.headers.get('location');
  assert.ok(redirect?.startsWith(REDIRECT+'?'));
  assert.equal(new URL(redirect).searchParams.get('state'),params.state);
  const token=await exchange(auth,redirect);
  assert.equal(token.response.status,200);
  assert.equal(token.body.token_type,'Bearer');
  return {...token.body,session,view,redirect};
}
async function listBranches(mcp,token){
  const request={jsonrpc:'2.0',id:'http-local-1',method:'tools/call',
    params:{name:'list_branches',arguments:{},
      _meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}};
  const response=await fetch(mcp.url,{method:'POST',headers:{
    'content-type':'application/json','accept':'application/json, text/event-stream',
    'mcp-protocol-version':'2026-07-28',
    'mcp-method':'tools/call','mcp-name':'list_branches',
    authorization:'Bearer '+token,
  },body:JSON.stringify(request)});
  const json=await response.json();
  return {status:response.status,
    labels:response.status===200?JSON.parse(json.result.content[0].text).branches.map(x=>x.label):[]};
}
test('HTTP authorization requires a trusted owner session and gives two private JWT readers no cross-account access',()=>sandbox(async({mcp,auth})=>{
  const unauth=await fetch(auth.origin+'/authorize?'+form(authorizeParams(auth.resource)),
    {redirect:'manual'});
  assert.equal(unauth.status,401);
  const a=await approve(auth,'ownerA'),b=await approve(auth,'ownerB');
  assert.deepEqual((await listBranches(mcp,a.access_token)).labels,['Owner A']);
  assert.deepEqual((await listBranches(mcp,b.access_token)).labels,['Owner B']);
  assert.equal((await listBranches(mcp,'forged-access-token')).status,401,
    'malformed bearer is an authentication failure, not a grant denial');
  assert.ok(!a.access_token.includes('ownerA'));
  assert.equal(a.scope,'tasks:read');
  assert.equal(a.expires_in,300);
  assert.equal(a.session.cookie.includes('ownerA'),false);
  assert.equal(a.view.response.headers.get('cache-control'),'no-store');
}));

test('CSRF and session-swapping denial cannot authorize somebody else or reuse the pending consent',()=>sandbox(async({ledger,mcp,auth})=>{
  const a=auth.mintSyntheticSession('ownerA'),b=auth.mintSyntheticSession('ownerB');
  const view=await begin(auth,a,authorizeParams(auth.resource));
  assert.equal(view.response.status,200);
  const swapped=await decide(auth,b,view);
  assert.equal(swapped.status,403);
  const replay=await decide(auth,a,view);
  assert.equal(replay.status,403);
  const other=await begin(auth,a,authorizeParams(auth.resource));
  assert.equal((await action(auth,'/consent',{consent_id:other.consent_id,csrf:other.csrf,
    decision:'approve'},{cookie:a.cookie,origin:'https://evil.example'})).status,403);
  // Cross-origin requests are blocked before consuming the pending approval;
  // the genuine owner can still submit it (but this test leaves it unused).
  const missing=await begin(auth,a,authorizeParams(auth.resource));
  const noOrigin=await fetch(auth.origin+'/consent',{method:'POST',redirect:'manual',
    headers:{cookie:a.cookie,'content-type':'application/x-www-form-urlencoded'},
    body:form({consent_id:missing.consent_id,csrf:missing.csrf,decision:'approve'})});
  assert.equal(noOrigin.status,403);
  const snapshot=await ledger.readAuthorizationSnapshot({
    ...mcp.grantIdentity,ownerId:mcp.ownerIds.ownerA,tokenId:'fixture-check-001',
  });
  assert.equal(snapshot,null);
}));

test('strict redirect, resource, scope, method, PKCE and duplicate form keys fail closed',()=>sandbox(async({auth})=>{
  const session=auth.mintSyntheticSession('ownerA');
  const bad=[
    {redirect_uri:'http://127.0.0.1:8765/oauth/callback/other'},
    {redirect_uri:'https://evil.example/callback'},
    {resource:'https://evil.example/mcp'},
    {scope:'journals:read'},{client_id:'evil-client'},
    {code_challenge_method:'plain'}, {response_type:'token'},
    {code_challenge:'x'.repeat(42)},
  ];
  for(const change of bad){
    const result=await begin(auth,session,authorizeParams(auth.resource,change));
    assert.equal(result.response.status,400,JSON.stringify(change));
  }
  const url=auth.origin+'/authorize?'+form(authorizeParams(auth.resource))+'&scope=tasks%3Aread';
  assert.equal((await fetch(url,{headers:{cookie:session.cookie}})).status,400);
  assert.equal((await fetch(auth.origin+'/token',{method:'GET'})).status,405);
  const missing=await action(auth,'/token',{grant_type:'authorization_code',client_id:CLIENT});
  assert.equal(missing.status,400);
  const malformed=await fetch(auth.origin+'/token',{method:'POST',headers:{
    'content-type':'application/json'},body:'{}'});
  assert.equal(malformed.status,415);
  const token=await approve(auth);
  assert.equal((await exchange(auth,token.redirect)).response.status,400,
    'authorization code is single-use even after successful exchange');
}));

test('denied consent, verifier substitution and missing state never create a bearer grant',()=>sandbox(async({auth})=>{
  const session=auth.mintSyntheticSession('ownerA');
  const params=authorizeParams(auth.resource);
  const view=await begin(auth,session,params);
  const denied=await decide(auth,session,view,'deny');
  assert.equal(denied.status,303);
  const u=new URL(denied.headers.get('location'));
  assert.equal(u.searchParams.get('error'),'access_denied');
  assert.equal(u.searchParams.get('state'),params.state);
  assert.equal(u.searchParams.has('code'),false);
  const badState=await begin(auth,session,authorizeParams(auth.resource,{state:''}));
  assert.equal(badState.response.status,400);
  const good=await begin(auth,session,authorizeParams(auth.resource));
  const consent=await decide(auth,session,good);
  const substituted=await exchange(auth,consent.headers.get('location'),{
    code_verifier:'z'.repeat(64)});
  assert.equal(substituted.response.status,400);
  assert.equal(substituted.body.error,'invalid_grant');
  assert.equal((await exchange(auth,consent.headers.get('location'))).response.status,400);
}));

test('refresh after HTTP listener and adapter reopen, replay revoke, then owner re-consent',()=>sandbox(async({mcp,auth,restart})=>{
  const a=await approve(auth,'ownerA'),b=await approve(auth,'ownerB');
  const reopened=await restart();
  const rotated=await action(reopened,'/token',{grant_type:'refresh_token',
    client_id:CLIENT,refresh_token:a.refresh_token,resource:reopened.resource});
  assert.equal(rotated.status,200);
  const r=await rotated.json();
  assert.equal((await listBranches(mcp,r.access_token)).status,200);
  assert.notEqual(r.refresh_token,a.refresh_token);
  const reuse=await action(reopened,'/token',{grant_type:'refresh_token',
    client_id:CLIENT,refresh_token:a.refresh_token,resource:reopened.resource});
  assert.equal(reuse.status,400);
  assert.equal((await listBranches(mcp,r.access_token)).status,403);
  assert.equal((await listBranches(mcp,b.access_token)).status,200);
  const after=await approve(reopened,'ownerA');
  assert.equal((await listBranches(mcp,after.access_token)).status,200);
  assert.equal((await listBranches(mcp,a.access_token)).status,403);
}));

test('refresh/revocation credentials are owner-bound and neither token nor owner may be supplied by client override',()=>sandbox(async({mcp,auth})=>{
  const a=await approve(auth,'ownerA'),b=await approve(auth,'ownerB');
  const invalid=await action(auth,'/token',{grant_type:'refresh_token',client_id:CLIENT,
    resource:auth.resource,owner:'ownerB',refresh_token:a.refresh_token});
  assert.equal(invalid.status,400);
  const bad=await action(auth,'/revoke',{client_id:'evil',token:a.refresh_token});
  assert.equal(bad.status,400);
  assert.equal((await listBranches(mcp,a.access_token)).status,200);
  const revoked=await action(auth,'/revoke',{client_id:CLIENT,token:a.refresh_token});
  assert.equal(revoked.status,200);
  assert.equal((await listBranches(mcp,a.access_token)).status,403);
  assert.equal((await listBranches(mcp,b.access_token)).status,200);
  assert.equal((await action(auth,'/revoke',{client_id:CLIENT,token:a.refresh_token})).status,200);
}));

test('no private cache, no CORS, no redirect leaks, and Host/Origin rebinding denied',()=>sandbox(async({auth})=>{
  const session=auth.mintSyntheticSession('ownerA');
  const base=auth.origin+'/authorize?'+form(authorizeParams(auth.resource));
  // Fetch implementations may silently replace a caller-supplied Host header.
  // A raw Node HTTP request exercises the actual server-side Host preflight.
  const target=new URL(base);
  const badHost=await new Promise((resolve,reject)=>{
    const req=httpRequest({hostname:'127.0.0.1',port:Number(target.port),
      method:'GET',path:target.pathname+target.search,
      headers:{host:'evil.example',cookie:session.cookie}},res=>{
      res.resume();res.on('end',()=>resolve(res.statusCode));
    });
    req.once('error',reject);req.end();
  });
  assert.equal(badHost,403);
  const badOrigin=await fetch(base,{headers:{cookie:session.cookie,origin:'https://evil.example'}});
  assert.equal(badOrigin.status,403);
  const valid=await fetch(base,{headers:{cookie:session.cookie}});
  assert.equal(valid.status,200);
  assert.equal(valid.headers.get('access-control-allow-origin'),null);
  assert.equal(valid.headers.get('cache-control'),'no-store');
  assert.equal(valid.headers.get('referrer-policy'),'no-referrer');
  const weird=await fetch(auth.origin+'/token?owner=ownerA',{method:'POST',
    headers:{'content-type':'application/x-www-form-urlencoded',origin:auth.origin},
    body:form({grant_type:'client_credentials'})});
  assert.equal(weird.status,404);
  assert.equal((await weird.text()).includes('access_token'),false);
}));
