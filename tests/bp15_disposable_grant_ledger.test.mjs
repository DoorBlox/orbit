import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,chmod,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createDisposableGrantLedger} from '../server/mcp/disposable-grant-ledger.mjs';
import {createMcpGrantAuthorizer} from '../server/mcp/grant-decision.mjs';

const issuer='https://synthetic-auth.example.test/tenant';
const resource='https://synthetic-mcp.example.test/mcp';
const ownerA='11111111-1111-4111-8111-111111111111';
const ownerB='22222222-2222-4222-8222-222222222222';
const clientId='fixture-local-client';
const a=Object.freeze({issuer,resource,ownerId:ownerA,clientId});
const b=Object.freeze({issuer,resource,ownerId:ownerB,clientId});
const jti='fixture-owner-token-001';
const envelope=id=>({...id,tokenId:jti});
const ctx=(id,epoch,tokenId=jti)=>({
  issuer:id.issuer,resource:id.resource,subject:id.ownerId,
  clientId:id.clientId,jti:tokenId,grantEpoch:epoch,
  scopes:['tasks:read'],issuedAt:Math.floor(Date.now()/1000),
  expiresAt:Math.floor(Date.now()/1000)+300,
});
async function sandbox(fn){
  const directory=await mkdtemp(join(tmpdir(),'orbit-disposable-grants-'));
  const macKey=randomBytes(32);
  try{
    const open=()=>createDisposableGrantLedger({directory,macKey});
    const ledger=open();await ledger.initialize();
    await fn({directory,macKey,ledger,open});
  }finally{
    // Only the exact mkdtemp-created disposable test directory.
    await rm(directory,{recursive:true,force:true});
  }
}

test('atomic persisted tenant/client/resource grant projection survives reopening and invalidates earlier epochs',()=>sandbox(async({ledger,open})=>{
  const g1=await ledger.consent(a);
  const gb=await ledger.consent(b);
  const auth=createMcpGrantAuthorizer({
    readAuthorizationSnapshot:ledger.readAuthorizationSnapshot,
  });
  assert.equal(await auth(ctx(a,g1.grantEpoch)),true);
  assert.equal(await auth(ctx(b,gb.grantEpoch)),true);
  assert.equal(await auth(ctx({...a,resource:'https://wrong.example.test/mcp'},g1.grantEpoch)),false);
  assert.equal(await auth(ctx({...a,clientId:'other-client'},g1.grantEpoch)),false);
  const reopened=open();
  await reopened.initialize();
  const auth2=createMcpGrantAuthorizer({
    readAuthorizationSnapshot:reopened.readAuthorizationSnapshot,
  });
  assert.equal(await auth2(ctx(a,g1.grantEpoch)),true);
  const revoked=await reopened.revoke(a);
  assert.ok(revoked.grantEpoch>g1.grantEpoch);
  assert.equal(await auth(ctx(a,g1.grantEpoch)),false);
  assert.equal(await auth2(ctx(b,gb.grantEpoch)),true);
  const again=await ledger.consent(a);
  assert.ok(again.grantEpoch>revoked.grantEpoch);
  assert.equal(await auth(ctx(a,g1.grantEpoch)),false);
  assert.equal(await auth(ctx(a,again.grantEpoch)),true);
  await reopened.revokeToken({...a,tokenId:jti});
  assert.equal(await auth(ctx(a,again.grantEpoch)),false);
  assert.equal(await auth(ctx(a,again.grantEpoch,'another-jti-00001')),true);
}));

test('opaque refresh credentials survive restart; rotation and replay revoke only the original grant',()=>sandbox(async({directory,ledger,open})=>{
  const ga=await ledger.consent(a);
  const gb=await ledger.consent(b);
  const issued=await ledger.issueRefresh(a);
  assert.equal(issued.grantEpoch,ga.grantEpoch);
  assert.match(issued.refreshToken,/^[A-Za-z0-9_-]{43}$/);
  const onDisk=await readFile(join(directory,'.orbit-grants.json'),'utf8');
  assert.ok(!onDisk.includes(issued.refreshToken),'never persist refresh bearer in plaintext');
  const second=open();await second.initialize();
  const rotated=await second.rotateRefresh({...a,refreshToken:issued.refreshToken});
  assert.notEqual(rotated.refreshToken,issued.refreshToken);
  assert.equal(rotated.grantEpoch,ga.grantEpoch);
  await assert.rejects(()=>ledger.rotateRefresh({...a,refreshToken:issued.refreshToken}),/MCP_LEDGER_DENIED/);
  const after=await second.readAuthorizationSnapshot(envelope(a));
  assert.equal(after.status,'revoked');
  assert.ok(after.grantEpoch>ga.grantEpoch);
  await assert.rejects(()=>second.rotateRefresh({...a,refreshToken:rotated.refreshToken}),/MCP_LEDGER_DENIED/);
  assert.equal((await second.readAuthorizationSnapshot(envelope(b))).grantEpoch,gb.grantEpoch);
  assert.equal((await second.readAuthorizationSnapshot(envelope(b))).status,'active');
  const newConsent=await ledger.consent(a);
  assert.ok(newConsent.grantEpoch>ga.grantEpoch);
  await assert.rejects(()=>second.rotateRefresh({...a,refreshToken:issued.refreshToken}),/MCP_LEDGER_DENIED/);
  assert.equal((await ledger.readAuthorizationSnapshot(envelope(a))).status,'active',
    'stale reused token cannot revoke a later explicit re-consent');
}));

test('two independent adapters serialize concurrent refresh rotation and per-JTI revocations',()=>sandbox(async({ledger,open})=>{
  const g=await ledger.consent(a);
  const token=await ledger.issueRefresh(a);
  const another=open();await another.initialize();
  const attempts=await Promise.allSettled(Array.from({length:8},(_,i)=>
    (i%2?ledger:another).rotateRefresh({...a,refreshToken:token.refreshToken})));
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1,
    'one and only one concurrent rotate can succeed');
  assert.equal((await ledger.readAuthorizationSnapshot(envelope(a))).status,'revoked',
    'replay of rotated credential revokes current authorization family');
  await ledger.consent(a);
  const ids=Array.from({length:14},(_,i)=>'revoked-jti-'+String(i).padStart(3,'0'));
  await Promise.all(ids.map((tokenId,i)=>(i%2?ledger:another).revokeToken({...a,tokenId})));
  for(const tokenId of ids){
    const snap=await ledger.readAuthorizationSnapshot({...a,tokenId});
    assert.equal(typeof snap.tokenRevokedAt,'number');
  }
  assert.equal((await another.readAuthorizationSnapshot(envelope(a))).status,'active');
  assert.ok((await ledger.readAuthorizationSnapshot(envelope(a))).grantEpoch>g.grantEpoch);
}));

test('corruption, wrong HMAC key, insecure mode, and missing ledger all fail closed without reset',()=>sandbox(async({directory,macKey,ledger,open})=>{
  const ga=await ledger.consent(a);
  const file=join(directory,'.orbit-grants.json');
  await assert.rejects(()=>createDisposableGrantLedger({directory,
    macKey:randomBytes(32)}).initialize(),/MCP_LEDGER_DENIED/);
  await chmod(file,0o644);
  await assert.rejects(()=>ledger.readAuthorizationSnapshot(envelope(a)),/MCP_LEDGER_DENIED/);
  await chmod(file,0o600);
  const bytes=await readFile(file,'utf8');
  await writeFile(file,bytes.replace('"version":1','"version":2'),{mode:0o600});
  await assert.rejects(()=>open().initialize(),/MCP_LEDGER_DENIED/);
  await writeFile(file,'{truncated',{mode:0o600});
  await assert.rejects(()=>ledger.readAuthorizationSnapshot(envelope(a)),/MCP_LEDGER_DENIED/);
  await writeFile(file,bytes,{mode:0o600});
  assert.equal((await ledger.readAuthorizationSnapshot(envelope(a))).grantEpoch,ga.grantEpoch);
  await rm(file);
  await assert.rejects(()=>open().initialize(),/MCP_LEDGER_DENIED/,
    'missing established ledger must never silently regenerate grants');
}));

test('orphan lock and left-behind temp file are fail-closed / non-authoritative',()=>sandbox(async({directory,ledger})=>{
  await ledger.consent(a);
  await writeFile(join(directory,'.abandoned-partial.tmp'),'not-a-ledger',{mode:0o600});
  assert.equal((await ledger.readAuthorizationSnapshot(envelope(a))).status,'active');
  const lock=join(directory,'.orbit-grants.lock');
  await mkdir(lock,{mode:0o700});
  try{
    await assert.rejects(()=>ledger.readAuthorizationSnapshot(envelope(a)),
      /MCP_LEDGER_DENIED/);
    await assert.rejects(()=>ledger.consent(b),/MCP_LEDGER_DENIED/);
  }finally{await rm(lock,{recursive:true,force:true});}
  assert.equal(await ledger.readAuthorizationSnapshot(envelope(b)),null);
  assert.equal((await ledger.readAuthorizationSnapshot(envelope(a))).status,'active');
}));

test('strict owner UUID/client/HTTPS validation and no cross-tenant refresh issuance',()=>sandbox(async({ledger})=>{
  await ledger.consent(a);
  await assert.rejects(()=>ledger.consent({...a,ownerId:ownerA.slice(0,-1)+'z'}),/MCP_LEDGER_DENIED/);
  await assert.rejects(()=>ledger.consent({...a,clientId:'../spoof'}),/MCP_LEDGER_DENIED/);
  await assert.rejects(()=>ledger.consent({...a,issuer:'http://synthetic-auth.example.test'}),/MCP_LEDGER_DENIED/);
  await assert.rejects(()=>ledger.issueRefresh({...a,resource:'https://other.example.test/mcp'}),/MCP_LEDGER_DENIED/);
  await assert.rejects(()=>ledger.rotateRefresh({...b,refreshToken:'a'.repeat(43)}),/MCP_LEDGER_DENIED/);
  assert.equal((await ledger.readAuthorizationSnapshot(envelope(a))).status,'active');
}));

test('JTI names overlapping object prototypes cannot forge or evade revocation',()=>sandbox(async({ledger,open})=>{
  const g=await ledger.consent(a);
  const auth=createMcpGrantAuthorizer({
    readAuthorizationSnapshot:ledger.readAuthorizationSnapshot,
  });
  assert.equal(await auth(ctx(a,g.grantEpoch,'constructor')),true);
  assert.equal(await auth(ctx(a,g.grantEpoch,'__proto__')),true);
  const fresh=open();await fresh.initialize();
  await fresh.revokeToken({...a,tokenId:'__proto__'});
  assert.equal(await auth(ctx(a,g.grantEpoch,'__proto__')),false);
  assert.equal(await auth(ctx(a,g.grantEpoch,'constructor')),true);
  await ledger.revokeToken({...a,tokenId:'constructor'});
  assert.equal(await auth(ctx(a,g.grantEpoch,'constructor')),false);
  assert.equal(await auth(ctx(a,g.grantEpoch,'normal-token-001')),true);
}));

test('revoking only the currently active refresh bearer is atomic and cannot revoke re-consent',()=>sandbox(async({ledger,open})=>{
  const ownerA=await ledger.consent(a),ownerB=await ledger.consent(b);
  const first=await ledger.issueRefresh(a);
  const reopened=open();await reopened.initialize();
  assert.equal(await reopened.revokeRefresh({...a,refreshToken:first.refreshToken}),true);
  assert.equal((await ledger.readAuthorizationSnapshot(envelope(a))).status,'revoked');
  assert.equal((await ledger.readAuthorizationSnapshot(envelope(b))).status,'active');
  const freshGrant=await ledger.consent(a);
  assert.ok(freshGrant.grantEpoch>ownerA.grantEpoch);
  const second=await ledger.issueRefresh(a);
  assert.equal(await reopened.revokeRefresh({...a,refreshToken:first.refreshToken}),false,
    'previously signed token must never revoke a newly consented grant');
  assert.equal((await ledger.readAuthorizationSnapshot(envelope(a))).status,'active');
  assert.equal(await reopened.revokeRefresh({...b,refreshToken:second.refreshToken}),false);
  assert.equal(await ledger.revokeRefresh({...a,refreshToken:second.refreshToken}),true);
  assert.equal((await reopened.readAuthorizationSnapshot(envelope(a))).status,'revoked');
  assert.equal((await reopened.readAuthorizationSnapshot(envelope(b))).grantEpoch,ownerB.grantEpoch);
}));
