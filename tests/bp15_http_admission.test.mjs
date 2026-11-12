import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createMcpStreamableReadAdmission,McpHttpAdmissionError} from '../server/mcp/http-admission.mjs';
import {createPrivateMcpReadBoundary} from '../server/mcp/read-boundary.mjs';
import {createMcpJwtAccessVerifier} from '../server/mcp/jwt-access-verifier.mjs';
import {createMcpGrantAuthorizer} from '../server/mcp/grant-decision.mjs';

const issuer='https://auth.example.test/tenant';
const resource='https://mcp.example.test/mcp';
const origin='https://orbit.example.test';
const owner='12345678-1234-4123-8123-123456789abc';
const foreignOwner='abcdefab-cdef-4abc-8abc-abcdefabcdef';
const when=1800000000000,sec=when/1000;
const pair=generateKeyPairSync('rsa',{modulusLength:2048});
const publicJwk={...pair.publicKey.export({format:'jwk'}),
  alg:'RS256',kid:'http-test-key',use:'sig',key_ops:['verify']};
function signed(claimChanges={}){
  const head={alg:'RS256',typ:'at+jwt',kid:'http-test-key'};
  const claims={iss:issuer,aud:resource,sub:owner,client_id:'client-alpha',
    jti:'http-test-jti-001',grant_epoch:7,scope:'tasks:read',
    role:'authenticated',token_use:'access',iat:sec-30,nbf:sec-30,exp:sec+180,
    ...claimChanges};
  const msg=[head,claims].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
  return msg+'.'+sign('RSA-SHA256',Buffer.from(msg,'ascii'),pair.privateKey).toString('base64url');
}
function payload(patch={}){
  return {jsonrpc:'2.0',id:'r1',method:'tools/call',
    params:{name:'list_branches',arguments:{},
      _meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}},
    ...patch};
}
function request(body=payload(),{method='POST',path='/mcp',headers={},extraHeaders=[]}={}){
  const buffer=body instanceof Uint8Array?body:Buffer.from(typeof body==='string'?body:JSON.stringify(body));
  const base=[
    ['Origin',origin],['Accept','application/json, text/event-stream'],
    ['Content-Type','application/json'],['MCP-Protocol-Version','2026-07-28'],
    ['Mcp-Method','tools/call'],['Mcp-Name','list_branches'],
    ['Authorization','Bearer '+signed()],['Content-Length',String(buffer.byteLength)],
  ];
  const map=new Map(base.map(([k,v])=>[k.toLowerCase(),[k,v]]));
  for(const [k,v] of Object.entries(headers)){
    if(v===null)map.delete(k.toLowerCase());
    else map.set(k.toLowerCase(),[k,v]);
  }
  return {method,path,headers:[...map.values(),...extraHeaders],body:buffer};
}
function admission({invokeReadBoundary=async()=>({ok:true}),allowedOrigins=[origin],...other}={}){
  return createMcpStreamableReadAdmission({
    allowedOrigins,invokeReadBoundary,clock:()=>when,...other});
}
async function denied(input,{status,code}){
  await assert.rejects(()=>input(),err=>{
    assert.ok(err instanceof McpHttpAdmissionError);
    assert.equal(err.httpStatus,status);
    if(code!==undefined)assert.equal(err.rpcCode,code);
    assert.equal(err.message,'MCP_HTTP_DENIED');
    return true;
  });
}
function actualBoundary(){
  const grant=createMcpGrantAuthorizer({clock:()=>when,
    readAuthorizationSnapshot:async()=>({
      issuer,resource,ownerId:owner,clientId:'client-alpha',
      tokenId:'http-test-jti-001',grantEpoch:7,status:'active',
      scopes:['tasks:read'],grantedAt:sec-100,consentExpiresAt:sec+400,
      consentRevokedAt:null,tokenRevokedAt:null,
    })});
  const verify=createMcpJwtAccessVerifier({issuer,resource,clock:()=>when,
    loadJwks:async()=>({keys:[publicJwk]}),authorizeGrant:grant});
  const dataSource={
    listBranches:async subject=>[{owner_id:subject,id:'inbox',parent_id:null,label:'Private'}],
    searchTasks:async subject=>[{owner_id:subject,id:'task1',project_id:'inbox',
      title:'Owner only',status:'open',due_date:null,urgency:'low',effort_minutes:3}],
    getTask:async subject=>({owner_id:subject,id:'task1',project_id:'inbox',
      title:'Owner only',status:'open',due_date:null,urgency:'low',effort_minutes:3}),
  };
  const boundary=createPrivateMcpReadBoundary({issuer,resource,clock:()=>when,
    verifyAccessToken:verify,dataSource});
  return boundary.invoke.bind(boundary);
}
const http=()=>admission({invokeReadBoundary:actualBoundary()});
const headerMismatch={status:400,code:-32020};

test('valid 2026-07-28 POST passes exact header-body checks into cryptographic, owner-scoped boundary',async()=>{
  const a=http();
  const expected={branches:[{id:'inbox',parentId:null,label:'Private'}]};
  assert.deepEqual(await a.invoke(request()),expected);
  assert.deepEqual(await a.invoke(request()),expected,'Bearer reads must remain reusable');
});

test('no Origin is valid for authenticated non-browser clients; invalid supplied Origins fail 403',async()=>{
  const a=http();
  assert.deepEqual((await a.invoke(request(payload(),{headers:{Origin:null}}))).branches[0].id,'inbox');
  for(const bad of ['null','http://orbit.example.test','https://evil.example.test',
    'https://orbit.example.test.evil.test','https://orbit.example.test/',
    'https://orbit.example.test:443','https://orbit.example.test@evil.test',
    'https://orbit.example.test%00.evil.test']){
    await denied(()=>a.invoke(request(payload(),{headers:{Origin:bad}})),{status:403});
  }
  await denied(()=>a.invoke(request(payload(),{method:'GET',
    headers:{Origin:'https://evil.example.test'}})),{status:403});
  assert.throws(()=>admission({allowedOrigins:['*']}),/MCP_HTTP_DENIED/);
  assert.throws(()=>admission({allowedOrigins:['http://127.0.0.1']}),/MCP_HTTP_DENIED/);
});

test('POST only; old GET/DELETE streams, unsupported paths and unrelated verbs are never dispatched',async()=>{
  const a=http();
  for(const method of ['GET','DELETE','PUT','PATCH','HEAD','OPTIONS'])
    await denied(()=>a.invoke(request(payload(),{method})),{status:405});
  await denied(()=>a.invoke(request(payload(),{path:'/mcp?token=secret'})),{status:404});
});

test('protocol version header and params._meta must be exactly equal and supported',async()=>{
  const a=http();
  const renamed=payload({params:{...payload().params,
    _meta:{'io.modelcontextprotocol/protocolVersion':'2025-11-25'}}});
  await denied(()=>a.invoke(request(renamed)),headerMismatch);
  for(const value of [null,'2025-11-25','2026-07-27','2026-07-28, 2025-11-25','']){
    await denied(()=>a.invoke(request(payload(),{headers:{'MCP-Protocol-Version':value}})),
      value==='2025-11-25'?headerMismatch:headerMismatch);
  }
  const wrong=request(renamed,{headers:{'MCP-Protocol-Version':'2025-11-25'}});
  await assert.rejects(()=>a.invoke(wrong),err=>{
    assert.equal(err.httpStatus,400);assert.equal(err.rpcCode,-32022);
    assert.deepEqual(err.data,{supported:['2026-07-28'],requested:'2025-11-25'});
    return true;
  });
  await denied(()=>a.invoke(request(payload({params:{name:'list_branches',arguments:{}}})),headerMismatch);
});

test('Mcp-Method and Mcp-Name mirror the body exactly, including case and Base64 sentinel',async()=>{
  const a=http();
  for(const changed of [
    {headers:{'Mcp-Method':'tools/list'}},{headers:{'Mcp-Method':null}},
    {headers:{'Mcp-Name':null}},{headers:{'Mcp-Name':'get_task'}},
    {headers:{'Mcp-Name':'LIST_BRANCHES'}},{headers:{'Mcp-Name':'=?base64?%%%?='}},
    {headers:{'Mcp-Name':'=?Base64?bGlzdF9icmFuY2hlcw==?='}},
    {headers:{'Mcp-Method':'tools/call ','Mcp-Name':'list_branches '}},
  ])await denied(()=>a.invoke(request(payload(),changed)),headerMismatch);
  const encoded='=?base64?'+Buffer.from('list_branches').toString('base64')+'?=';
  assert.equal((await a.invoke(request(payload(),{headers:{'Mcp-Name':encoded}}))).branches[0].id,'inbox');
  await denied(()=>a.invoke(request(payload(),{headers:{'Mcp-Name':encoded.slice(0,-1)}})),headerMismatch);
});

test('unsupported RPC and tool names cannot bypass the read-only allowlist',async()=>{
  const a=http();
  const different=method=>payload({method});
  await denied(()=>a.invoke(request(different('resources/read'),{headers:{'Mcp-Method':'resources/read','Mcp-Name':null}})),{status:404,code:-32601});
  await denied(()=>a.invoke(request(different('tools/list'),{headers:{'Mcp-Method':'tools/list','Mcp-Name':null}})),{status:404,code:-32601});
  for(const name of ['create_task','delete_task','list_journals','toString','__proto__']){
    const body=payload({params:{...payload().params,name}});
    await denied(()=>a.invoke(request(body,{headers:{'Mcp-Name':name}})),{status:404,code:-32601});
  }
});

test('unsafe headers and duplicate case-insensitive names are rejected, not silently combined',async()=>{
  const a=http();
  for(const extra of [
    [['mcp-name','get_task']], [['ORIGIN','https://evil.example.test']],
    [['authorization','Bearer evil']], [['content-length','0']],
    [['MCP-PROTOCOL-VERSION','2025-11-25']],
  ])await denied(()=>a.invoke(request(payload(),{extraHeaders:extra})),headerMismatch);
  for(const changed of [
    {headers:{'Content-Encoding':'gzip'}},{headers:{'Transfer-Encoding':'chunked'}},
    {headers:{'Mcp-Param-OwnerId':'somebody'}},
    {headers:{'Mcp-Name':'list_branches\r\nX-Admin: yes'}},
  ])await denied(()=>a.invoke(request(payload(),changed)),{status:400});
  await denied(()=>a.invoke({...request(),headers:{authorization:'Bearer arbitrary'}}),{status:400});
});

test('Accept requires both JSON and SSE, Content-Type only UTF-8 JSON',async()=>{
  const a=http();
  for(const accept of ['application/json','text/event-stream','*/*','application/json;q=0, text/event-stream',
    'application/json, text/event-stream;q=0', '',null]){
    await denied(()=>a.invoke(request(payload(),{headers:{Accept:accept}})),{status:406});
  }
  for(const type of ['text/plain','application/x-www-form-urlencoded','application/json; charset=latin1',
    'application/json, text/plain',null]){
    await denied(()=>a.invoke(request(payload(),{headers:{'Content-Type':type}})),{status:415});
  }
  assert.equal((await a.invoke(request(payload(),{headers:{Accept:'application/json;q=1, text/event-stream;q=0.5',
    'Content-Type':'application/json; charset=utf-8'}}))).branches[0].id,'inbox');
});

test('invalid content length, truncated byte sequences, oversized and non-byte bodies fail closed',async()=>{
  const a=http();
  for(const length of ['1','99999','-1','NaN','5, 5']){
    await denied(()=>a.invoke(request(payload(),{headers:{'Content-Length':length}})),{status:400});
  }
  await denied(()=>a.invoke(request('{"jsonrpc":"2.0",',{headers:{'Content-Length':null}})),{status:400});
  await denied(()=>a.invoke(request(Buffer.from([0xc3,0x28]))),{status:400});
  const oversized=Buffer.from(JSON.stringify(payload({filler:'x'.repeat(70000)})));
  await denied(()=>a.invoke(request(oversized,{headers:{'Content-Length':null}})),{status:413});
  await denied(()=>a.invoke({...request(),body:JSON.stringify(payload())}),{status:400});
});

test('duplicate JSON member names, including Unicode-escaped or nested keys, cannot create parsing ambiguity',async()=>{
  const a=http();
  for(const body of [
    '{"jsonrpc":"2.0","id":1,"method":"tools/list","method":"tools/call","params":{}}',
    '{"jsonrpc":"2.0","id":1,"m\\u0065thod":"tools/list","method":"tools/call","params":{}}',
    '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_branches","name":"delete_task"}}',
    '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_branches","arguments":{"ownerId":"bad","ownerId":"good"}}}',
  ])await denied(()=>a.invoke(request(body,{headers:{'Content-Length':null}})),{status:400});
});

test('batches, results, notifications, malformed identifiers and protocol shapes are never admitted',async()=>{
  const a=http();
  for(const body of [
    [payload()],{jsonrpc:'2.0',id:1,result:{}},
    payload({id:undefined}),payload({id:null}),payload({id:{x:1}}),
    payload({id:1.5}),payload({jsonrpc:'1.0'}),
    payload({params:[]}),payload({params:{...payload().params,arguments:[]}}),
    payload({params:{...payload().params,_meta:null}}),
    payload({extra:{ownerId:foreignOwner}}),
  ])await denied(()=>a.invoke(request(body,{headers:{'Content-Length':null}})),{status:400});
});

test('Bearer authorization remains mandatory, forged JWTs never trigger private data reads',async()=>{
  let reads=0;
  const a=admission({invokeReadBoundary:async ({authorization})=>{
    reads++;
    return actualBoundary()({authorization,name:'list_branches',arguments:{}});
  }});
  for(const val of [null,'Basic fake','Bearer ','Bearer token another','bearer token'])
    await denied(()=>a.invoke(request(payload(),{headers:{Authorization:val}})),{status:401});
  assert.equal(reads,0);
  await denied(()=>a.invoke(request(payload(),{headers:{Authorization:'Bearer '+signed({sub:foreignOwner})}})),{status:403});
  assert.equal(reads,1);
});

test('the read boundary receives only validated authorization, tool and arguments; errors never disclose internals',async()=>{
  let seen;
  const a=admission({invokeReadBoundary:async req=>{seen=req;return {ok:true};}});
  assert.deepEqual(await a.invoke(request()),{ok:true});
  assert.equal(seen.name,'list_branches');
  assert.deepEqual(seen.arguments,{});
  assert.equal(Object.keys(seen).sort().join(','),'arguments,authorization,name');
  assert.ok(Object.isFrozen(seen));
  assert.ok(Object.isFrozen(seen.arguments));
  const failing=admission({invokeReadBoundary:async()=>{throw Error('PRIVATE_ROW_PASSWORD');}});
  try{await failing.invoke(request());assert.fail('must deny');}
  catch(err){assert.equal(err.message,'MCP_HTTP_DENIED');assert.equal(err.httpStatus,403);}
});

test('old transport session and resumability headers are ignored, never create state or new stream entrypoints',async()=>{
  const a=http();
  const r=request(payload(),{extraHeaders:[['Mcp-Session-Id','obsolete-session'],['Last-Event-ID','123']]});
  assert.equal((await a.invoke(r)).branches[0].id,'inbox');
});
