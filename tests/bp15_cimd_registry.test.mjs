// BP-15: URL-formatted client IDs are never dereferenced by arbitrary HTTP.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createPinnedCimdRegistry,isCimdClientId,validMcpClientId} from '../server/mcp/cimd-client-metadata.mjs';
import {createMcpJwtAccessVerifier} from '../server/mcp/jwt-access-verifier.mjs';
import {createMcpGrantAuthorizer} from '../server/mcp/grant-decision.mjs';
import {createDisposableGrantLedger} from '../server/mcp/disposable-grant-ledger.mjs';
import {randomBytes} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

const ID='https://cimd.example.test/oauth/client.json';
const REDIRECT='http://127.0.0.1:8765/oauth/callback';
const doc=()=>({
  client_id:ID,client_name:'Synthetic ORBIT metadata client',
  redirect_uris:[REDIRECT],grant_types:['authorization_code','refresh_token'],
  response_types:['code'],token_endpoint_auth_method:'none',application_type:'native',
});
const registry=(documents=new Map([[ID,doc()]]))=>createPinnedCimdRegistry({
  documents,trustedOrigins:['https://cimd.example.test'],
  allowedRedirectUris:[REDIRECT],
});

test('HTTPS CIMD is opt-in, exact, non-IP, path-bound and distinct from static client IDs',()=>{
  assert.equal(validMcpClientId('fixture-local-client'),true);
  assert.equal(validMcpClientId(ID),false);
  assert.equal(validMcpClientId(ID,{allowCimdClientIds:true}),true);
  assert.equal(isCimdClientId(ID),true);
  for(const candidate of [
    'http://cimd.example.test/oauth/client.json',
    'https://127.0.0.1/oauth/client.json',
    'https://[::1]/oauth/client.json',
    'https://localhost/oauth/client.json',
    'https://cimd.example.test/',
    'https://cimd.example.test/client',
    'https://cimd.example.test:8443/oauth/client.json',
    'https://cimd.example.test/oauth/client.json?name=stolen',
    'https://cimd.example.test/oauth/client.json#fragment',
    'https://alice@cimd.example.test/oauth/client.json',
    'https://cimd.example.test/%2e%2e/client.json',
    'HTTPS://cimd.example.test/oauth/client.json',
    'https://cimd.example.test/oauth/../client.json',
    'https://cimd.example.test//client.json',
    'https://169.254.169.254/latest/meta-data.json',
  ]){
    assert.equal(isCimdClientId(candidate),false,candidate);
    assert.equal(validMcpClientId(candidate,{allowCimdClientIds:true}),false,candidate);
  }
});

test('pinned registry rejects arbitrary URL/SSRF before resolving anything outside trusted in-memory documents',async()=>{
  const docs=new Map([[ID,doc()]]);
  const r=registry(docs);
  const accepted=await r.resolve({clientId:ID,redirectUri:REDIRECT});
  assert.deepEqual(accepted,{clientId:ID,clientName:doc().client_name,
    redirectUri:REDIRECT,redirectHost:'127.0.0.1'});
  for(const candidate of [
    'https://evil.example.test/oauth/client.json',
    'https://169.254.169.254/meta.json',
    'http://127.0.0.1:8090/metadata.json',
    'https://cimd.example.test/unregistered.json',
    'https://cimd.example.test:443/oauth/client.json',
  ]){
    await assert.rejects(()=>r.resolve({clientId:candidate,redirectUri:REDIRECT}),
      /MCP_CIMD_DENIED/,candidate);
  }
  await assert.rejects(()=>r.resolve({clientId:ID,
    redirectUri:'https://attacker.invalid/callback'}),/MCP_CIMD_DENIED/);
  await assert.rejects(()=>r.resolve({clientId:ID,
    redirectUri:REDIRECT+'/suffix'}),/MCP_CIMD_DENIED/);
});

test('untrusted metadata substitutions, unexpected URL fields and misleading redirect lists fail closed',async()=>{
  const changes=[
    {client_id:'https://evil.example.test/oauth/client.json'},
    {client_name:'<script>alert(1)</script>'},
    {redirect_uris:['https://evil.example.test/oauth/callback']},
    {redirect_uris:[REDIRECT,REDIRECT]},
    {redirect_uris:[REDIRECT,'http://127.0.0.1:7788/stolen']},
    {redirect_uris:[]},
    {response_types:['token']},
    {grant_types:['authorization_code']},
    {token_endpoint_auth_method:'client_secret_post'},
    {application_type:'web'},
    {client_uri:'http://169.254.169.254/latest/meta-data'},
  ];
  const docs=new Map([[ID,doc()]]);
  const r=registry(docs);
  for(const entry of changes){
    docs.set(ID,{...doc(),...entry});
    await assert.rejects(()=>r.resolve({clientId:ID,redirectUri:REDIRECT}),
      /MCP_CIMD_DENIED/,JSON.stringify(entry));
  }
  docs.set(ID,doc());
  assert.equal((await r.resolve({clientId:ID,redirectUri:REDIRECT})).clientId,ID);
});

test('only explicit loopback fixture ledger and verifier can accept a URL client ID',async()=>{
  const issuer='http://127.0.0.1:12877/';
  const resource=issuer+'mcp';
  const opts={issuer,resource,allowLoopbackHttp:true,
    loadJwks:async()=>({keys:[]}),authorizeGrant:async()=>true};
  assert.equal(typeof createMcpJwtAccessVerifier(opts),'function');
  const authorizer=createMcpGrantAuthorizer({
    readAuthorizationSnapshot:async()=>null,allowLoopbackHttp:true,
    allowCimdClientIds:true,
  });
  assert.equal(await authorizer({
    issuer,resource,subject:'11111111-1111-4111-8111-111111111111',
    clientId:ID,jti:'fixture-test-jti-123456',scopes:['tasks:read'],
    grantEpoch:1,issuedAt:1,expiresAt:9999999999,
  }),false);
  const directory=await mkdtemp(join(tmpdir(),'orbit-cimd-ledger-'));
  try{
    const key=randomBytes(32);
    const defaultLedger=createDisposableGrantLedger({
      directory,macKey:key,allowLoopbackHttp:true,
    });
    await defaultLedger.initialize();
    await assert.rejects(()=>defaultLedger.consent({
      issuer,resource,ownerId:'11111111-1111-4111-8111-111111111111',
      clientId:ID,
    }),/MCP_LEDGER_DENIED/);
    const allowed=createDisposableGrantLedger({
      directory,macKey:key,allowLoopbackHttp:true,allowCimdClientIds:true,
    });
    await allowed.initialize();
    const row=await allowed.consent({
      issuer,resource,ownerId:'11111111-1111-4111-8111-111111111111',
      clientId:ID,
    });
    assert.equal(row.grantEpoch,1);
  }finally{await rm(directory,{recursive:true,force:true});}
});
