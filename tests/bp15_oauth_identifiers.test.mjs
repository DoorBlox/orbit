// W4 BP-15: local HTTP is an explicit disposable exception, never a
// relaxation of the production JWT/grant/read-boundary identifier contract.
import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalMcpIdentifier} from '../server/mcp/identifier.mjs';
import {createMcpJwtAccessVerifier} from '../server/mcp/jwt-access-verifier.mjs';
import {createPrivateMcpReadBoundary} from '../server/mcp/read-boundary.mjs';

const ISS='http://127.0.0.1:12877/';
const RESOURCE=ISS+'mcp';
test('exact HTTPS remains the default; explicit localhost is IPv4 loopback and canonical only',()=>{
  assert.equal(canonicalMcpIdentifier('https://example.test/tenant'),true);
  assert.equal(canonicalMcpIdentifier(ISS),false);
  assert.equal(canonicalMcpIdentifier(RESOURCE),false);
  assert.equal(canonicalMcpIdentifier(ISS,{allowLoopbackHttp:true}),true);
  assert.equal(canonicalMcpIdentifier(RESOURCE,{allowLoopbackHttp:true}),true);
  for(const invalid of [
    'http://localhost:12877/','http://[::1]:12877/',
    'http://0.0.0.0:12877/','http://127.0.0.2:12877/',
    'http://192.168.1.1:12877/','http://127.0.0.1:80/',
    'http://127.0.0.1:65536/','http://127.0.0.1:012877/',
    'http://127.0.0.1:12877/other?user=a',
    'http://127.0.0.1:12877/#fragment',
    'http://user:pass@127.0.0.1:12877/',
    'http://127.0.0.1:12877',
    'HTTP://127.0.0.1:12877/',
    'https://example.test/tenant?redirect=evil',
    'https://example.test/tenant#piece',
    'https://user@trusted.example.test/path',
  ]){
    assert.equal(canonicalMcpIdentifier(invalid,{allowLoopbackHttp:true}),
      false,invalid);
  }
});
test('JWT verifier and private MCP boundary default to HTTPS even with valid synthetic callbacks',()=>{
  const opts={issuer:ISS,resource:RESOURCE,
    loadJwks:async()=>({keys:[]}),authorizeGrant:async()=>true};
  assert.throws(()=>createMcpJwtAccessVerifier(opts),/MCP_TOKEN_DENIED/);
  assert.equal(typeof createMcpJwtAccessVerifier({
    ...opts,allowLoopbackHttp:true}), 'function');
  const read={issuer:ISS,resource:RESOURCE,
    verifyAccessToken:async()=>null,
    dataSource:{listBranches:async()=>[],searchTasks:async()=>[],getTask:async()=>null},
  };
  assert.throws(()=>createPrivateMcpReadBoundary(read),/MCP_DENIED/);
  assert.equal(typeof createPrivateMcpReadBoundary({
    ...read,allowLoopbackHttp:true}).invoke,'function');
});
