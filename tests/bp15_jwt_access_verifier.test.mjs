import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, sign as signBytes} from 'node:crypto';
import {createMcpJwtAccessVerifier, createOneTimeProofGate} from '../server/mcp/jwt-access-verifier.mjs';
import {createPrivateMcpReadBoundary} from '../server/mcp/read-boundary.mjs';

const issuer='https://auth.example.test/';
const resource='https://mcp.example.test/mcp';
const owner='12345678-1234-4123-8123-123456789abc';
const other='abcdefab-cdef-4abc-8abc-abcdefabcdef';
const now=1800000000000;
const seconds=Math.floor(now/1000);
const keys=generateKeyPairSync('rsa',{modulusLength:2048});
const foreign=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk=(pair,kid='key-1')=>({...pair.publicKey.export({format:'jwk'}),kid,alg:'RS256',use:'sig',key_ops:['verify']});
const signed=(claims={},header={},pair=keys)=>{
  const head={alg:'RS256',typ:'at+jwt',kid:'key-1',...header};
  const payload={iss:issuer,sub:owner,aud:resource,exp:seconds+300,iat:seconds-10,nbf:seconds-10,
    jti:'token-jti-123456789',client_id:'test-client',role:'authenticated',token_use:'access',scope:'tasks:read',...claims};
  const body=[head,payload].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
  return body+'.'+signBytes('RSA-SHA256',Buffer.from(body,'ascii'),pair.privateKey).toString('base64url');
};
const verifier=(overrides={})=>createMcpJwtAccessVerifier({issuer,resource,
  clock:()=>now,
  loadJwks:async()=>({keys:[jwk(keys)]}),
  isRevoked:async()=>false,
  hasConsent:async()=>true,
  ...overrides});
const deny=async(fn)=>assert.rejects(fn,/^Error: MCP_TOKEN_DENIED$/);

test('valid signed at+jwt is verified and can be reused without false replay lockout',async()=>{
  const verify=verifier();const token=signed();
  const a=await verify(token),b=await verify(token);
  assert.equal(a.sub,owner);assert.equal(a.aud,resource);assert.equal(a.scope,'tasks:read');
  assert.equal(b.sub,owner);
  assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort());
});

test('signed token header is purpose and algorithm bound; never follow remote URLs',async()=>{
  for(const header of [{typ:'JWT'},{typ:'id+jwt'},{alg:'none'},{alg:'HS256'},{alg:'PS256'},
    {kid:'unknown'}, {kid:'../../keys'}, {jku:'https://attacker.test/keys'},
    {x5u:'https://attacker.test/cert'}, {crit:['exp']}, {b64:false}, {enc:'A256GCM'},
    {zip:'DEF'}, {kid:''}, {typ:'application/id+jwt'}])await deny(()=>verifier()(signed({},header)));
  assert.equal((await verifier()(signed({},{typ:'application/at+jwt'}))).sub,owner);
  await deny(()=>verifier()('a.b'));
  await deny(()=>verifier()('a.b.c.d'));
  await deny(()=>verifier()(signed().replace(/.$/,'!')));
  await deny(()=>verifier()(signed().padEnd(8000,'A')));
});

test('invalid signature, wrong key, algorithm confusion and non-RSA keys fail',async()=>{
  await deny(()=>verifier()(signed({}, {},foreign)));
  await deny(()=>verifier({loadJwks:async()=>({keys:[jwk(foreign)]})})(signed()));
  for(const bad of [
    {...jwk(keys),alg:'HS256'}, {...jwk(keys),kty:'oct',k:'c2VjcmV0'},
    {...jwk(keys),use:'enc'}, {...jwk(keys),key_ops:['sign']},
    {...jwk(keys),d:'private'}, {...jwk(keys),e:'AQI'},
  ])await deny(()=>verifier({loadJwks:async()=>({keys:[bad]})})(signed()));
});

test('JWKS duplicate kid and malformed shape fail closed, key rotation selects only the named trusted key',async()=>{
  const extra=jwk(foreign,'key-2');
  await deny(()=>verifier({loadJwks:async()=>({keys:[jwk(keys),jwk(foreign,'key-1')]})})(signed()));
  for(const response of [null,{}, {keys:[]},{keys:{}},{keys:[null]},
    {keys:Array.from({length:20},(_,i)=>jwk(keys,'k'+i))}])
    await deny(()=>verifier({loadJwks:async()=>response})(signed()));
  const rotate=verifier({loadJwks:async()=>({keys:[jwk(keys),extra]})});
  assert.equal((await rotate(signed({}, {kid:'key-2'},foreign))).sub,owner);
  await deny(()=>rotate(signed({}, {kid:'key-2'},keys)));
});

test('identity, issuer, audience, token lifetime, user role and exact scope are strict',async()=>{
  const bad=[{iss:'https://evil.test/'},{aud:'https://other.test/mcp'},
    {aud:[resource,'https://other.test/mcp']},{sub:other,role:'service_role'},
    {sub:'../admin'},{exp:seconds},{exp:seconds-1},{iat:seconds+80},
    {nbf:seconds+1},{exp:seconds+1800},{iat:seconds-2000},
    {scope:'tasks:write'}, {scope:'tasks:read tasks:write'},
    {scope:'journals:read tasks:read'},{scope:['tasks:read']},
    {cnf:{jkt:'synthetic-key-thumbprint'}},
    {role:'service_role'},{role:'anon'},{role:undefined},
    {token_use:'id'}, {token_use:undefined}, {jti:undefined}, {client_id:undefined},
    {client_id:'../../foo'},{jti:'../../foo'}];
  for(const claims of bad)await deny(()=>verifier()(signed(claims)));
});

test('consent and revocation are mandatory authoritative asynchronous gates',async()=>{
  assert.throws(()=>createMcpJwtAccessVerifier({issuer,resource,loadJwks:async()=>({keys:[jwk(keys)]})}),/MCP_TOKEN_DENIED/);
  let calls=[];
  const approved=verifier({isRevoked:async ctx=>{calls.push(['revoked',ctx.jti]);return false;},
    hasConsent:async ctx=>{calls.push(['consent',ctx.clientId,ctx.scopes]);return true;}});
  assert.equal((await approved(signed())).sub,owner);
  assert.deepEqual(calls,[['revoked','token-jti-123456789'],['consent','test-client',['tasks:read']]]);
  await deny(()=>verifier({isRevoked:async()=>true})(signed()));
  await deny(()=>verifier({hasConsent:async()=>false})(signed()));
  await deny(()=>verifier({isRevoked:async()=>undefined})(signed()));
  await deny(()=>verifier({hasConsent:async()=>1})(signed()));
  await deny(()=>verifier({isRevoked:async()=>{throw Error('database details private');}})(signed()));
  await deny(()=>verifier({loadJwks:async()=>{throw Error('backend secret');}})(signed()));
});

test('verification failures never reveal tokens or internal exceptions',async()=>{
  const original=signed();
  try{await verifier({hasConsent:async()=>{throw Error('SUPER_SECRET');}})(original);assert.fail('must deny');}
  catch(e){assert.equal(e.message,'MCP_TOKEN_DENIED');assert.doesNotMatch(e.message,/SUPER_SECRET|eyJ|123456/);}
});

test('one-time proof replay is separate from reusable access tokens and requires atomic storage',async()=>{
  const seen=new Set();
  const gate=createOneTimeProofGate({clock:()=>now,verifyProof:async proof=>proof==='valid'?{
    jti:'proof-123456789',iat:seconds,method:'POST',resource,
  }:null,consume:async key=>{if(seen.has(key))return false;seen.add(key);return true;}});
  assert.equal(await gate('valid',{method:'POST',resource}),true);
  await deny(()=>gate('valid',{method:'POST',resource}));
  await deny(()=>gate('other',{method:'POST',resource}));
  await deny(()=>gate('valid',{method:'GET',resource}));
  await deny(()=>gate('valid',{method:'POST',resource:'https://evil.test/mcp'}));
  assert.throws(()=>createOneTimeProofGate({clock:()=>now,verifyProof:()=>true}),/MCP_TOKEN_DENIED/);
});

test('verified JWT feeds real MCP read boundary without owner-ID overrides or cross-tenant data',async()=>{
  const verify=verifier();
  const dataSource={
    listBranches:async subject=>[{owner_id:subject,id:'inbox',parent_id:null,label:'Private Inbox',private_note:'hidden'}],
    searchTasks:async subject=>[{owner_id:subject,id:'task-1',project_id:'inbox',title:'Secret task',status:'open',due_date:null,urgency:'low',effort_minutes:1,description:'private',criteria:'private',token:'must strip'}],
    getTask:async subject=>({owner_id:subject,id:'task-1',project_id:'inbox',title:'Secret task',status:'open',due_date:null,urgency:'low',effort_minutes:1,description:'private',criteria:'private'}),
  };
  const mcp=createPrivateMcpReadBoundary({issuer,resource,verifyAccessToken:verify,
    dataSource,clock:()=>now});
  const authorize=name=>({authorization:'Bearer '+signed(),name,arguments:name==='search_tasks'?{query:'secret'}:name==='get_task'?{taskId:'task-1'}:{}});
  const branches=await mcp.invoke(authorize('list_branches'));
  assert.deepEqual(branches.branches,[{id:'inbox',parentId:null,label:'Private Inbox'}]);
  const result=await mcp.invoke(authorize('search_tasks'));
  assert.equal(result.tasks[0].title,'Secret task');
  assert.equal(result.tasks[0].description,undefined);
  await assert.rejects(()=>mcp.invoke({...authorize('list_branches'),arguments:{ownerId:other}}),/MCP_DENIED/);
  await assert.rejects(()=>mcp.invoke({...authorize('list_branches'),name:'delete_task'}),/MCP_DENIED/);
  const crossTenant=createPrivateMcpReadBoundary({issuer,resource,verifyAccessToken:verify,
    dataSource:{...dataSource,getTask:async()=>({...await dataSource.getTask(owner),owner_id:other})},clock:()=>now});
  await assert.rejects(()=>crossTenant.invoke(authorize('get_task')),/MCP_DENIED/);
});

test('consent grant and revocation changes take effect on next request; access token remains reusable until revoked',async()=>{
  let allowed=true,revoked=false;
  const verify=verifier({hasConsent:async()=>allowed,isRevoked:async()=>revoked});
  const token=signed();
  await verify(token);await verify(token);
  allowed=false;await deny(()=>verify(token));
  allowed=true;revoked=true;await deny(()=>verify(token));
});

test('two concurrent identical one-time proofs cannot both pass with an atomic consume adapter',async()=>{
  const used=new Set();
  const gate=createOneTimeProofGate({clock:()=>now,
    verifyProof:async()=>({jti:'concurrent-proof-001',iat:seconds,method:'POST',resource}),
    consume:async key=>{if(used.has(key))return false;used.add(key);return true;}});
  const results=await Promise.allSettled([gate('signed-proof',{method:'POST',resource}),gate('signed-proof',{method:'POST',resource})]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(results.filter(x=>x.status==='rejected'&&x.reason.message==='MCP_TOKEN_DENIED').length,1);
});
