import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createPinnedIssuerJwksLoader,rfc8414MetadataUri} from '../server/mcp/trusted-jwks.mjs';
import {createMcpJwtAccessVerifier} from '../server/mcp/jwt-access-verifier.mjs';
import {createPrivateMcpReadBoundary} from '../server/mcp/read-boundary.mjs';

const issuer='https://auth.example.test/tenant';
const jwksUri='https://auth.example.test/keys';
const metadataUri='https://auth.example.test/.well-known/oauth-authorization-server/tenant';
const resource='https://mcp.example.test/mcp';
const owner='12345678-1234-4123-8123-123456789abc';
const other='abcdefab-cdef-4abc-8abc-abcdefabcdef';
const start=1800000000000;
const mainKey=generateKeyPairSync('rsa',{modulusLength:2048});
const nextKey=generateKeyPairSync('rsa',{modulusLength:2048});
const key=(pair,kid='key-a')=>({...pair.publicKey.export({format:'jwk'}),kid,alg:'RS256',use:'sig',key_ops:['verify']});
const goodMetadata=()=>({issuer,jwks_uri:jwksUri});
function fixture(){
  const state={clock:start,keys:[key(mainKey)],metadata:goodMetadata(),requests:[],
    custom:null};
  const fetcher=async (url,opts)=>{
    state.requests.push({url,opts});
    if(state.custom)return state.custom(url,opts);
    if(url===metadataUri)return Response.json(state.metadata);
    if(url===jwksUri)return Response.json({keys:state.keys});
    throw Error('unexpected URL');
  };
  const loader=createPinnedIssuerJwksLoader({issuer,jwksUri,fetcher,
    clock:()=>state.clock,ttlMs:1000,unknownKidRefreshMs:1000});
  return {state,fetcher,loader};
}
const rejected=fn=>assert.rejects(fn,/MCP_JWKS_DENIED/);
const validToken=(pair=mainKey,kid='key-a')=>{
  const now=Math.floor(start/1000);
  const header={alg:'RS256',typ:'at+jwt',kid};
  const claims={iss:issuer,aud:resource,sub:owner,client_id:'client-test',
    scope:'tasks:read',role:'authenticated',token_use:'access',
    iat:now-10,exp:now+300,jti:'synthetic-jti-001'};
  const body=[header,claims].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
  return body+'.'+sign('RSA-SHA256',Buffer.from(body,'ascii'),pair.privateKey).toString('base64url');
};
function tokenVerifier(loader){
  return createMcpJwtAccessVerifier({issuer,resource,loadJwks:loader.loadJwks,
    isRevoked:async()=>false,hasConsent:async()=>true,clock:()=>start});
}

test('metadata path inserts .well-known before tenant path; fetch stays dormant until use',async()=>{
  assert.equal(rfc8414MetadataUri(issuer),metadataUri);
  assert.equal(rfc8414MetadataUri('https://auth.example.test/'),
    'https://auth.example.test/.well-known/oauth-authorization-server');
  const {loader,state}=fixture();
  assert.equal(state.requests.length,0);
  const keys=await loader.loadJwks({issuer,kid:'key-a'});
  assert.equal(keys.keys.length,1);
  assert.equal(state.requests.length,2);
  assert.deepEqual(state.requests.map(r=>r.url),[metadataUri,jwksUri]);
  for(const {opts} of state.requests){
    assert.equal(opts.redirect,'error');
    assert.equal(opts.cache,'no-store');
    assert.equal(opts.credentials,'omit');
    assert.equal(opts.referrerPolicy,'no-referrer');
    assert.equal(opts.method,'GET');
    assert.ok(opts.signal);
  }
  const again=await loader.loadJwks({issuer,kid:'key-a'});
  assert.strictEqual(again,keys);
  assert.equal(state.requests.length,2);
});

test('signed access token verifies through pinned transport and read-only MCP boundary',async()=>{
  const {loader}=fixture();
  const verify=tokenVerifier(loader);
  assert.equal((await verify(validToken())).sub,owner);
  const boundary=createPrivateMcpReadBoundary({issuer,resource,clock:()=>start,
    verifyAccessToken:verify,dataSource:{
      listBranches:async id=>[{owner_id:id,id:'inbox',parent_id:null,label:'Private'}],
      searchTasks:async id=>[{owner_id:id,id:'task-1',project_id:'inbox',
        title:'Private task',status:'open',due_date:null,urgency:'low',effort_minutes:2}],
      getTask:async id=>({owner_id:id,id:'task-1',project_id:'inbox',
        title:'Private task',status:'open',due_date:null,urgency:'low',
        effort_minutes:2,description:'owner-only',criteria:'private'}),
    }});
  const accepted=await boundary.invoke({authorization:'Bearer '+validToken(),
    name:'list_branches',arguments:{}});
  assert.deepEqual(accepted,{branches:[{id:'inbox',parentId:null,label:'Private'}]});
  await assert.rejects(()=>boundary.invoke({authorization:'Bearer '+validToken(),
    name:'list_branches',arguments:{ownerId:other}}),/MCP_DENIED/);
});

test('unknown kid can refresh rotated keys exactly once per bounded cooldown',async()=>{
  const {loader,state}=fixture();
  await loader.loadJwks({issuer,kid:'key-a'});
  state.keys=[key(nextKey,'key-b')];
  assert.equal((await tokenVerifier(loader)(validToken(nextKey,'key-b'))).sub,owner);
  assert.equal(state.requests.length,4);
  await rejected(()=>loader.loadJwks({issuer,kid:'invalid-kid'}));
  await rejected(()=>loader.loadJwks({issuer,kid:'invalid-kid'}));
  assert.equal(state.requests.length,4,'unknown kid must not create a fetch storm');
  state.clock+=1001;
  await rejected(()=>loader.loadJwks({issuer,kid:'invalid-kid'}));
  assert.equal(state.requests.length,6);
  // Public JWT boundary must hide internal JWKS errors from callers.
  await assert.rejects(()=>tokenVerifier(loader)(validToken(mainKey,'key-a')),
    /MCP_TOKEN_DENIED/);
});

test('concurrent first-use requests share exactly one metadata/JWKS fetch pair',async()=>{
  const {loader,state}=fixture();
  const calls=Array.from({length:20},()=>loader.loadJwks({issuer,kid:'key-a'}));
  const all=await Promise.all(calls);
  assert.equal(state.requests.length,2);
  assert.ok(all.every(x=>x===all[0]));
});

test('stale cache never permits keys when refreshed metadata or JWKS fails',async()=>{
  const {loader,state}=fixture();
  await loader.loadJwks({issuer,kid:'key-a'});
  state.clock+=1001;
  state.metadata={issuer:'https://attacker.test/',jwks_uri:jwksUri};
  await rejected(()=>loader.loadJwks({issuer,kid:'key-a'}));
  state.metadata=goodMetadata();
  state.custom=()=>{throw Error('secret network failure');};
  await rejected(()=>loader.loadJwks({issuer,kid:'key-a'}));
  state.custom=null;
  assert.equal((await loader.loadJwks({issuer,kid:'key-a'})).keys.length,1);
});

test('metadata issuer, JWKS URI, signed metadata, and response redirect are pinned',async()=>{
  for(const metadata of [
    {issuer:'https://attacker.test/',jwks_uri:jwksUri},
    {issuer,jwks_uri:'https://attacker.test/keys'},
    {...goodMetadata(),signed_metadata:'unverified.jwt'},
    {issuer},null,
  ]){
    const {loader,state}=fixture();
    state.metadata=metadata;
    await rejected(()=>loader.loadJwks({issuer,kid:'key-a'}));
  }
  const {loader,state}=fixture();
  state.custom=async()=>Response.redirect('https://attacker.test/keys',302);
  await rejected(()=>loader.loadJwks({issuer,kid:'key-a'}));
  assert.equal(state.requests.length,1);
});

test('rejects hostname tricks, local address fetches and unapproved metadata origins',()=>{
  for(const unsafe of [
    'http://auth.example.test/', 'https://localhost/', 'https://foo.local/',
    'https://127.0.0.1/', 'https://[::1]/', 'https://foo.internal/',
    'https://u:p@auth.example.test/', 'https://auth.example.test/?x=1',
    'https://auth.example.test/#frag','https://auth.example.test:444/',
  ]){
    assert.throws(()=>rfc8414MetadataUri(unsafe),/MCP_JWKS_DENIED/,unsafe);
  }
  assert.throws(()=>createPinnedIssuerJwksLoader({issuer,
    jwksUri:'http://auth.example.test/keys'}),/MCP_JWKS_DENIED/);
  assert.throws(()=>createPinnedIssuerJwksLoader({issuer,jwksUri,ttlMs:999}),
    /MCP_JWKS_DENIED/);
});

test('all JWKS keys are public, uniquely identified and valid RSA-2048+',async()=>{
  const corrupt=[
    [key(mainKey),key(nextKey,'key-a')],
    [key(mainKey),{...key(nextKey,'key-b'),d:'private'}],
    [{...key(mainKey),alg:'HS256'}],
    [{...key(mainKey),use:'enc'}],
    [{...key(mainKey),kty:'oct',k:'shared'}],
    [{...key(mainKey),key_ops:['sign']}],
    [{...key(mainKey),e:'AQI'}],
    [],
    Array.from({length:13},(_,i)=>key(mainKey,'key-'+i)),
  ];
  for(const keys of corrupt){
    const {loader,state}=fixture();state.keys=keys;
    await rejected(()=>loader.loadJwks({issuer,kid:'key-a'}));
  }
});

test('reject oversized, malformed and media-type spoofed responses without logging secrets',async()=>{
  const variations=[
    ()=>new Response('x'.repeat(70000),{status:200,headers:{'content-type':'application/json'}}),
    ()=>new Response('{"issuer":', {status:200,headers:{'content-type':'application/json'}}),
    ()=>new Response('{}',{status:200,headers:{'content-type':'text/plain'}}),
    ()=>new Response('{}',{status:200,headers:{'content-type':'application/json','content-length':'999999'}}),
    ()=>new Response('{}',{status:503,headers:{'content-type':'application/json'}}),
  ];
  for(const build of variations){
    const {loader,state}=fixture();
    state.custom=async()=>build();
    await rejected(()=>loader.loadJwks({issuer,kid:'key-a'}));
  }
  const {loader,state}=fixture();
  state.custom=async()=>{throw Error('PRIVATE_NETWORK_URL_SECRET');};
  try{await loader.loadJwks({issuer,kid:'key-a'});assert.fail('expected reject');}
  catch(e){assert.equal(e.message,'MCP_JWKS_DENIED');}
});

test('invalid or attacker-selected issuer and kid never trigger network access',async()=>{
  const {loader,state}=fixture();
  for(const params of [
    {issuer:'https://attacker.test/',kid:'key-a'},
    {issuer,kid:'../../passwd'}, {issuer,kid:'a'.repeat(100)}, {},
  ])await rejected(()=>loader.loadJwks(params));
  assert.equal(state.requests.length,0);
});
