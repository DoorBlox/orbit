/** BP-15: source-only atomic, owner-scoped grant/revocation contract.
 * All keys and persistence rows are synthetic; no hosted Auth/SQL endpoint.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign as rsaSign} from 'node:crypto';
import {createAtomicMcpGrantAuthorizer} from '../server/mcp/grant-authorization.mjs';
import {createMcpJwtAccessVerifier} from '../server/mcp/jwt-access-verifier.mjs';
import {createPrivateMcpReadBoundary} from '../server/mcp/read-boundary.mjs';

const issuer='https://auth.example.test/';
const resource='https://orbit-mcp.example.test/mcp';
const owner='12345678-1234-4123-8123-123456789abc';
const foreignOwner='abcdefab-cdef-4abc-8abc-abcdefabcdef';
const grantId='87654321-4321-4321-8321-123456789abc';
const alternateGrant='12345678-1234-4123-8123-123456789abc';
const clientId='orbit-test-client';
const jti='grant-jti-123456789';
const nowMs=1800000000000;
const seconds=nowMs/1000;
const pair=generateKeyPairSync('rsa',{modulusLength:2048});
const otherPair=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...pair.publicKey.export({format:'jwk'}),alg:'RS256',
  use:'sig',kid:'grant-verified-key',key_ops:['verify']};

function context(extra={}){
  return {issuer,resource,subject:owner,clientId,jti,grantId,grantEpoch:3,
    scopes:['tasks:read'],issuedAt:seconds-20,expiresAt:seconds+300,...extra};
}
function snapshot(extraGrant={},extraSnapshot={}){
  return {
    decisionRevision:9,
    grant:{issuer,ownerId:owner,clientId,resource,grantId,epoch:3,
      scopes:['tasks:read'],consentedAt:seconds-100,expiresAt:seconds+900,
      revokedAt:null,...extraGrant},
    token:{jti,revoked:false},
    ...extraSnapshot,
  };
}
function authorizer(readSnapshot=async()=>snapshot()){
  return createAtomicMcpGrantAuthorizer({readSnapshot,clock:()=>nowMs});
}
function token(overrides={},keyPair=pair){
  const header={alg:'RS256',typ:'at+jwt',kid:jwk.kid};
  const body={iss:issuer,aud:resource,sub:owner,client_id:clientId,
    role:'authenticated',token_use:'access',scope:'tasks:read',
    jti,iat:seconds-20,nbf:seconds-20,exp:seconds+300,
    orbit_grant_id:grantId,orbit_grant_epoch:3,...overrides};
  const encoded=[header,body].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
  return encoded+'.'+rsaSign('RSA-SHA256',Buffer.from(encoded),keyPair.privateKey).toString('base64url');
}
function verify(authorizeGrant){
  return createMcpJwtAccessVerifier({issuer,resource,
    loadJwks:async()=>({keys:[jwk]}),authorizeGrant,clock:()=>nowMs});
}
async function refused(fn,code='MCP_CONSENT_DENIED'){
  await assert.rejects(fn,new RegExp(code));
}

test('a signed, grant-bound Bearer token is reusable with one authoritative persistence decision per invocation',async()=>{
  let calls=0,seen;
  const authorized=authorizer(async ctx=>{calls++;seen=ctx;return snapshot();});
  const verified=verify(authorized);
  for(let n=0;n<3;n++)assert.equal((await verified(token())).sub,owner);
  assert.equal(calls,3);
  assert.deepEqual(seen,{issuer,subject:owner,clientId,resource,grantId,jti});
});

test('verified token enters existing read-only MCP boundary without caller-chosen owner',async()=>{
  const authorized=authorizer();
  const mcp=createPrivateMcpReadBoundary({issuer,resource,
    verifyAccessToken:verify(authorized),clock:()=>nowMs,
    dataSource:{
      listBranches:async subject=>[{owner_id:subject,id:'inbox',parent_id:null,label:'Owner private'}],
      searchTasks:async()=>[],
      getTask:async()=>null,
    },
  });
  const authorization='Bearer '+token();
  assert.deepEqual((await mcp.invoke({authorization,name:'list_branches',arguments:{}})).branches,
    [{id:'inbox',parentId:null,label:'Owner private'}]);
  await assert.rejects(()=>mcp.invoke({authorization,name:'list_branches',
    arguments:{ownerId:foreignOwner}}),/MCP_DENIED/);
  await assert.rejects(()=>mcp.invoke({authorization,name:'delete_task',
    arguments:{}}),/MCP_DENIED/);
});

test('grant tuple is bound to exact owner, issuer, client, resource and grant ID',async()=>{
  for(const changed of [
    {issuer:'https://evil.example.test/'},{ownerId:foreignOwner},
    {clientId:'another-client'},{resource:'https://other.example.test/mcp'},
    {grantId:alternateGrant},
  ])await refused(()=>authorizer(async()=>snapshot(changed))(context()));
  await refused(()=>authorizer()(context({subject:foreignOwner})));
  await refused(()=>authorizer()(context({clientId:'another-client'})));
  await refused(()=>authorizer()(context({resource:'https://other.example.test/mcp'})));
});

test('grant epoch, current grant scope, consent expiry, and token JTI revocation fail closed',async()=>{
  for(const row of [
    snapshot({epoch:4}),snapshot({epoch:2}),snapshot({scopes:['tasks:read','journals:read']}),
    snapshot({scopes:['tasks:write']}),snapshot({scopes:[]}),
    snapshot({expiresAt:seconds}),snapshot({revokedAt:seconds-1}),
    snapshot({consentedAt:seconds+1}),snapshot({}, {token:{jti,revoked:true}}),
    snapshot({}, {token:{jti:'other-jti-123456789',revoked:false}}),
    snapshot({}, {decisionRevision:0}),
  ])await refused(()=>authorizer(async()=>row)(context()));
  await refused(()=>authorizer()(context({grantEpoch:4})));
  await refused(()=>authorizer()(context({issuedAt:seconds-150})));
});

test('missing or malformed persistence decisions, errors, and truthy substitutes must deny without leaking details',async()=>{
  for(const bad of [null,undefined,false,{},[],{...snapshot(),grant:null},
    {...snapshot(),token:null},{...snapshot(),token:{jti,revoked:0}},
    {...snapshot(),grant:{...snapshot().grant,revokedAt:undefined}},
    {...snapshot(),grant:{...snapshot().grant,expiresAt:'1800000900'}},
    {...snapshot(),grant:{...snapshot().grant,scopes:'tasks:read'}}]){
    await refused(()=>authorizer(async()=>bad)(context()));
  }
  try {
    await authorizer(async()=>{throw Error('PRIVATE_STORE_SECRET');})(context());
    assert.fail('must fail');
  } catch (err) { assert.equal(err.message,'MCP_CONSENT_DENIED'); }
  await refused(()=>authorizer(async()=>new Promise((_,reject)=>reject(Error('OUTAGE'))))(context()));
});

test('atomic verifier rejects missing or nonsensical signed grant binding before touching persistence',async()=>{
  let calls=0;
  const atomic=verify(authorizer(async()=>{calls++;return snapshot();}));
  for(const grants of [
    {orbit_grant_id:undefined},{orbit_grant_id:'../bad'},
    {orbit_grant_id:foreignOwner},{orbit_grant_epoch:undefined},
    {orbit_grant_epoch:0},{orbit_grant_epoch:-1},{orbit_grant_epoch:'3'},
    {orbit_grant_epoch:3.25},
  ])await refused(()=>atomic(token(grants)),'MCP_TOKEN_DENIED');
  assert.equal(calls,1,'only a well-shaped but wrong grant ID should reach store');
});

test('legacy paired hooks remain compatible, but atomic and legacy modes cannot silently mix',async()=>{
  const legacy=createMcpJwtAccessVerifier({issuer,resource,clock:()=>nowMs,
    loadJwks:async()=>({keys:[jwk]}),isRevoked:async()=>false,hasConsent:async()=>true});
  assert.equal((await legacy(token())).sub,owner);
  assert.throws(()=>createMcpJwtAccessVerifier({issuer,resource,
    loadJwks:async()=>({keys:[jwk]}),authorizeGrant:authorizer(),
    hasConsent:async()=>true,isRevoked:async()=>false}),/MCP_TOKEN_DENIED/);
  assert.throws(()=>createMcpJwtAccessVerifier({issuer,resource,
    loadJwks:async()=>({keys:[jwk]}),authorizeGrant:async()=>true,
    isRevoked:async()=>false}),/MCP_TOKEN_DENIED/);
});

test('invalid signatures never call the persistence adapter, and store internals are hidden by token verifier',async()=>{
  let calls=0;
  const checker=verify(authorizer(async()=>{calls++;throw Error('NEVER_EXPOSE_STORE_ROW');}));
  await refused(()=>checker(token({},otherPair)),'MCP_TOKEN_DENIED');
  assert.equal(calls,0);
  try{await checker(token());assert.fail('must deny');}
  catch(err){assert.equal(err.message,'MCP_TOKEN_DENIED');}
  assert.equal(calls,1);
});

test('withdrawal or epoch bump invalidates existing tokens on the next atomic check',async()=>{
  let row=snapshot();
  const verified=verify(authorizer(async()=>structuredClone(row)));
  const bearer=token();
  await verified(bearer);await verified(bearer);
  row=snapshot({epoch:4},{decisionRevision:10});
  await refused(()=>verified(bearer),'MCP_TOKEN_DENIED');
  row=snapshot({revokedAt:seconds},{decisionRevision:11});
  await refused(()=>verified(bearer),'MCP_TOKEN_DENIED');
  row=snapshot({},{decisionRevision:12,token:{jti,revoked:true}});
  await refused(()=>verified(bearer),'MCP_TOKEN_DENIED');
});

test('serialized decision snapshot yields coherent results during a concurrent revoke/read race',async()=>{
  let durable=snapshot();
  let chain=Promise.resolve();
  const serial=fn=>{
    const out=chain.then(fn);
    chain=out.then(()=>undefined,()=>undefined);
    return out;
  };
  const granted=authorizer(()=>serial(()=>structuredClone(durable)));
  const revoke=()=>serial(()=>{
    durable=snapshot({epoch:4,revokedAt:seconds},{decisionRevision:10});
  });
  const first=granted(context());
  const revokeCommitted=revoke();
  const afterRevoke=granted(context());
  assert.equal(await first,true,'read queued before the revoke may finish');
  await revokeCommitted;
  await refused(()=>afterRevoke);
  for(const decision of await Promise.allSettled(Array.from({length:8},()=>granted(context()))))
    assert.equal(decision.status,'rejected');
});

test('two-account isolation holds under concurrent reads and distinct grant identities',async()=>{
  const secondGrant='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const rows=new Map([
    [owner,snapshot()],
    [foreignOwner,snapshot({ownerId:foreignOwner,grantId:secondGrant})],
  ]);
  const atomic=authorizer(async ctx=>structuredClone(rows.get(ctx.subject)||null));
  const results=await Promise.allSettled([
    atomic(context()),
    atomic(context({subject:foreignOwner,grantId:secondGrant})),
    atomic(context({subject:foreignOwner})),
    atomic(context({clientId:'evil-client'})),
  ]);
  assert.equal(results[0].status,'fulfilled');
  assert.equal(results[1].status,'fulfilled');
  assert.equal(results[2].status,'rejected');
  assert.equal(results[3].status,'rejected');
});
