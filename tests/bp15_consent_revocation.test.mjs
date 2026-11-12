import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, sign} from 'node:crypto';
import {createMcpJwtAccessVerifier} from '../server/mcp/jwt-access-verifier.mjs';
import {createPrivateMcpReadBoundary} from '../server/mcp/read-boundary.mjs';
import {createMcpGrantAuthorizer} from '../server/mcp/grant-decision.mjs';

const issuer='https://auth.example.test/tenant';
const resource='https://mcp.example.test/mcp';
const ownerA='12345678-1234-4123-8123-123456789abc';
const ownerB='abcdefab-cdef-4abc-8abc-abcdefabcdef';
const clientId='client-alpha';
const jti='token-jti-alpha-001';
const now=1800000000000;
const sec=now/1000;
const pair=generateKeyPairSync('rsa',{modulusLength:2048});
const publicJwk={...pair.publicKey.export({format:'jwk'}),
  alg:'RS256',kid:'test-key',use:'sig',key_ops:['verify']};

function signed(overrides={}){
  const payload={iss:issuer,sub:ownerA,aud:resource,client_id:clientId,
    jti,grant_epoch:7,exp:sec+240,iat:sec-60,nbf:sec-60,
    token_use:'access',role:'authenticated',scope:'tasks:read',...overrides};
  const header={alg:'RS256',typ:'at+jwt',kid:'test-key'};
  const body=[header,payload].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
  return body+'.'+sign('RSA-SHA256',Buffer.from(body),pair.privateKey).toString('base64url');
}
function snapshot(overrides={}){
  return {issuer,resource,ownerId:ownerA,clientId,tokenId:jti,
    grantEpoch:7,scopes:['tasks:read'],status:'active',
    grantedAt:sec-200,consentExpiresAt:sec+360,
    consentRevokedAt:null,tokenRevokedAt:null,...overrides};
}
function setup({readAuthorizationSnapshot=async()=>snapshot(),clock=()=>now,
  grantOverride={}}={}){
  const authorizeGrant=createMcpGrantAuthorizer({readAuthorizationSnapshot,clock,...grantOverride});
  const verifier=createMcpJwtAccessVerifier({issuer,resource,
    loadJwks:async()=>({keys:[publicJwk]}),clock,authorizeGrant});
  return {authorizeGrant,verifier};
}
const deny=async call=>assert.rejects(call,/MCP_TOKEN_DENIED/);

test('a signed epoch-bound access token repeatedly reads through one atomic grant decision per invocation',async()=>{
  const calls=[];
  const {verifier}=setup({readAuthorizationSnapshot:async key=>{
    calls.push(key);return snapshot();
  }});
  assert.equal((await verifier(signed())).sub,ownerA);
  assert.equal((await verifier(signed())).sub,ownerA);
  assert.equal(calls.length,2,'No cross-request authorization cache is permitted');
  assert.deepEqual(calls[0],{issuer,resource,ownerId:ownerA,clientId,tokenId:jti});
  assert.deepEqual(calls[1],calls[0]);
});

test('atomic grant authorizer integrates with real read-only MCP boundary, not caller owner overrides',async()=>{
  const {verifier}=setup();
  const boundary=createPrivateMcpReadBoundary({issuer,resource,
    verifyAccessToken:verifier,clock:()=>now,dataSource:{
      listBranches:async id=>[{owner_id:id,id:'inbox',parent_id:null,label:'Private'}],
      searchTasks:async id=>[{owner_id:id,id:'task1',project_id:'inbox',
        title:'Private task',status:'open',due_date:null,urgency:'low',effort_minutes:2}],
      getTask:async id=>({owner_id:id,id:'task1',project_id:'inbox',
        title:'Private task',status:'open',due_date:null,urgency:'low',effort_minutes:2,
        description:'Secret',criteria:'Private'}),
    }});
  const req={authorization:'Bearer '+signed(),name:'list_branches',arguments:{}};
  assert.deepEqual(await boundary.invoke(req),{branches:[{id:'inbox',parentId:null,label:'Private'}]});
  await assert.rejects(()=>boundary.invoke({...req,arguments:{ownerId:ownerB}}),/MCP_DENIED/);
  await assert.rejects(()=>boundary.invoke({...req,name:'delete_task'}),/MCP_DENIED/);
});

test('new atomic grant mode requires a signed positive grant_epoch; rejects invalid or absent values before store access',async()=>{
  let reads=0;
  const {verifier}=setup({readAuthorizationSnapshot:async()=>{
    reads++;return snapshot();
  }});
  for(const value of [undefined,null,0,-1,1.1,'7',Number.MAX_SAFE_INTEGER+1]){
    await deny(()=>verifier(signed({grant_epoch:value})));
  }
  assert.equal(reads,0);
});

test('legacy two-hook mode remains compatible but cannot mix with atomic authorizer',async()=>{
  const verifyLegacy=createMcpJwtAccessVerifier({issuer,resource,
    loadJwks:async()=>({keys:[publicJwk]}),clock:()=>now,
    isRevoked:async()=>false,hasConsent:async()=>true});
  assert.equal((await verifyLegacy(signed({grant_epoch:undefined}))).sub,ownerA);
  assert.throws(()=>createMcpJwtAccessVerifier({issuer,resource,
    loadJwks:async()=>({keys:[publicJwk]}),clock:()=>now,
    isRevoked:async()=>false,hasConsent:async()=>true,
    authorizeGrant:async()=>true}),/MCP_TOKEN_DENIED/);
  assert.throws(()=>createMcpJwtAccessVerifier({issuer,resource,
    loadJwks:async()=>({keys:[publicJwk]}),clock:()=>now,
    authorizeGrant:null}),/MCP_TOKEN_DENIED/);
});

test('the committed grant tuple must match issuer, resource, owner, client and token ID exactly',async()=>{
  for(const bad of [
    {issuer:'https://evil.example.test/'},{resource:'https://other.example.test/mcp'},
    {ownerId:ownerB},{clientId:'client-beta'},{tokenId:'token-other-0001'},
    {grantEpoch:6},{grantEpoch:8},
  ]){
    const {verifier}=setup({readAuthorizationSnapshot:async()=>snapshot(bad)});
    await deny(()=>verifier(signed()));
  }
  const {verifier}=setup({readAuthorizationSnapshot:async key=>
    key.ownerId===ownerA?snapshot({ownerId:ownerB}):snapshot()});
  await deny(()=>verifier(signed()));
});

test('consent must be active, unexpired, not revoked, and have exactly the token scope',async()=>{
  for(const bad of [
    {status:'pending'},{status:'revoked'},{status:'active '},
    {scopes:[]},{scopes:['tasks:write']},{scopes:['tasks:read','tasks:write']},
    {scopes:'tasks:read'},{consentExpiresAt:sec},{consentExpiresAt:sec-1},
    {consentExpiresAt:'1800000000'},
    {grantedAt:sec+1},{grantedAt:'1700000000'},
    {consentRevokedAt:sec-1},{consentRevokedAt:0},
    {tokenRevokedAt:sec-1},{tokenRevokedAt:0},
  ]){
    const {verifier}=setup({readAuthorizationSnapshot:async()=>snapshot(bad)});
    await deny(()=>verifier(signed()));
  }
});

test('grant-epoch increments invalidate previously signed access tokens even after reconsent',async()=>{
  let grant=snapshot();
  const {verifier}=setup({readAuthorizationSnapshot:async()=>structuredClone(grant)});
  await verifier(signed());
  grant=snapshot({grantEpoch:8});
  await deny(()=>verifier(signed({grant_epoch:7})));
  assert.equal((await verifier(signed({grant_epoch:8}))).grant_epoch,8);
  // A token signed for a future epoch cannot borrow a current grant.
  await deny(()=>verifier(signed({grant_epoch:9})));
});

test('revoking a single token does not revoke a distinct token under the same grant',async()=>{
  const revoked=new Set([jti]);
  const {verifier}=setup({readAuthorizationSnapshot:async key=>snapshot({
    tokenId:key.tokenId,tokenRevokedAt:revoked.has(key.tokenId)?sec-1:null,
  })});
  await deny(()=>verifier(signed()));
  assert.equal((await verifier(signed({jti:'token-jti-bravo-002'}))).sub,ownerA);
  revoked.add('token-jti-bravo-002');
  await deny(()=>verifier(signed({jti:'token-jti-bravo-002'})));
});

test('withdrawn consent and expired grants are denied on the next request without in-process caches',async()=>{
  let grant=snapshot();
  const {verifier}=setup({readAuthorizationSnapshot:async()=>structuredClone(grant)});
  await verifier(signed());await verifier(signed());
  grant=snapshot({consentRevokedAt:sec});
  await deny(()=>verifier(signed()));
  grant=snapshot({consentExpiresAt:sec});
  await deny(()=>verifier(signed()));
});

test('missing records, unexpected fields and persistence errors fail closed without reflecting secrets',async()=>{
  for(const record of [null,undefined,false,{},[],{...snapshot(),secret:'private'},
    {...snapshot(),ownerId:undefined},{...snapshot(),tokenRevokedAt:undefined}]){
    const {verifier}=setup({readAuthorizationSnapshot:async()=>record});
    await deny(()=>verifier(signed()));
  }
  for(const error of [new Error('DATABASE_PASSWORD_SECRET'),new Error('RPC_OFFLINE')]){
    const {verifier}=setup({readAuthorizationSnapshot:async()=>{throw error;}});
    try{await verifier(signed());assert.fail('must deny');}
    catch(e){assert.equal(e.message,'MCP_TOKEN_DENIED');}
  }
  assert.throws(()=>createMcpGrantAuthorizer(),/MCP_GRANT_DENIED/);
  const gate=createMcpGrantAuthorizer({readAuthorizationSnapshot:async()=>snapshot(),
    clock:()=>NaN});
  assert.equal(await gate({}),false);
});

test('concurrent revocation is linearized at storage snapshot acquisition; post-commit checks deny',async()=>{
  let grant=snapshot(),wakeRead,releaseRead,readCount=0;
  const arrived=new Promise(resolve=>{wakeRead=resolve;});
  const pause=new Promise(resolve=>{releaseRead=resolve;});
  const {verifier}=setup({readAuthorizationSnapshot:async()=>{
    const historical=structuredClone(grant);
    if(++readCount===1){wakeRead();await pause;}
    return historical;
  }});
  const preCommit=verifier(signed());await arrived;
  grant=snapshot({consentRevokedAt:sec});
  await deny(()=>verifier(signed())); // Acquires new committed state.
  releaseRead();
  assert.equal((await preCommit).sub,ownerA); // Authorized before commit.
  await deny(()=>verifier(signed()));
  assert.equal(readCount,3);
});

test('the authorization snapshot cannot broaden a token scope or bypass signature validation',async()=>{
  let calls=0;
  const {verifier}=setup({readAuthorizationSnapshot:async()=>{
    calls++;return snapshot({scopes:['tasks:read','journals:read']});
  }});
  await deny(()=>verifier(signed()));
  assert.equal(calls,1);
  await deny(()=>verifier(signed({scope:'tasks:read tasks:write'})));
  await deny(()=>verifier(signed({iss:'https://evil.example.test/'})));
  await deny(()=>verifier(signed({role:'service_role'})));
  assert.equal(calls,1,'Invalid JWT claims must be rejected before durable grant read');
});
