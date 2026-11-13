// W4 BP-15: deterministic offline tests for a disabled, unwired HTTPS port.
// Every address, DNS, TLS and response is synthetic: ZERO real network I/O.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPublicCimdIp,createCimdHttpsRetrievalAdapter,
} from '../server/mcp/cimd-https-retrieval.mjs';
import {
  pinnedCimdRequestOptions,verifyPinnedCimdTlsPeer,
  createNodeCimdDnsPort,createNodeCimdHttpsPort,
} from '../server/mcp/cimd-node-https.mjs';

const ID='https://client.example.test/oauth/client.json';
const ORIGIN='https://client.example.test';
const REDIRECT='http://127.0.0.1:8765/oauth/callback';
const document=()=>({
  client_id:ID,client_name:'Synthetic CIMD HTTPS client',
  redirect_uris:[REDIRECT],grant_types:['authorization_code','refresh_token'],
  response_types:['code'],token_endpoint_auth_method:'none',
  application_type:'native',
});
const body=()=>Buffer.from(JSON.stringify(document()),'utf8');
const request={clientId:ID,redirectUri:REDIRECT};
function reply(plan,overrides={}){
  const data=body();
  return {
    requestUrl:plan.url,peerAddress:plan.address,
    tlsHostname:plan.hostname,tlsAuthorized:true,tlsProtocol:'TLSv1.3',
    followedRedirect:false,proxyUsed:false,statusCode:200,
    headers:{'content-type':'application/json','content-length':String(data.length)},
    body:data,...overrides,
  };
}
function adapter(changes={}){
  let dns=0,wire=0,egress=0,plans=[];
  const service=createCimdHttpsRetrievalAdapter({
    enabled:true,trustedOrigins:[ORIGIN],allowedRedirectUris:[REDIRECT],
    resolveAll:async()=>{dns++;return ['8.8.8.8','2606:4700:4700::1111'];},
    egressPolicy:async()=>{egress++;return true;},
    requestPinned:async p=>{wire++;plans.push(p);return reply(p);},
    ...changes,
  });
  return {service,stats:()=>({dns,wire,egress,plans})};
}

test('OFF by default, even when bogus DNS/transport functions are provided',async()=>{
  let invoked=0;
  const retrieval=createCimdHttpsRetrievalAdapter({
    trustedOrigins:[ORIGIN],allowedRedirectUris:[REDIRECT],
    resolveAll:async()=>{invoked++;return ['8.8.8.8'];},
    requestPinned:async()=>{invoked++;return {};},
    egressPolicy:()=>{invoked++;return true;},
  });
  await assert.rejects(()=>retrieval.resolve(request),/MCP_CIMD_NETWORK_DENIED/);
  assert.equal(invoked,0);
  for(const factory of [createNodeCimdDnsPort,createNodeCimdHttpsPort])
    assert.throws(()=>factory(),/MCP_CIMD_TRANSPORT_DENIED/);
});

test('IPv4/IPv6 special-use, mapped, private and transitional addresses are rejected',()=>{
  for(const valid of ['8.8.8.8','1.1.1.1','9.9.9.9',
    '2606:4700:4700::1111','2001:4860:4860::8888']){
    assert.equal(isPublicCimdIp(valid),true,valid);
  }
  for(const unsafe of [
    '','not-an-ip','10.0.0.1','127.0.0.1','0.0.0.0','100.64.0.1',
    '169.254.169.254','172.31.255.255','192.168.1.1',
    '192.0.0.9','192.0.2.1','192.88.99.1',
    '198.19.1.3','198.51.100.2','203.0.113.1',
    '224.0.0.1','240.0.0.1','255.255.255.255',
    '::','::1','::ffff:8.8.8.8','::ffff:808:808',
    '64:ff9b::808:808','64:ff9b:1::1','100::1',
    '2001:db8::1','2001::1','2002::1','3fff::1',
    'fc00::1','fe80::1','fe80::1%lo0','ff02::1',
    ' 8.8.8.8 ','010.0.0.1',
  ])assert.equal(isPublicCimdIp(unsafe),false,unsafe);
});

test('all DNS results must be public, sane and egress-approved before ANY request',async()=>{
  const invalidAnswerSets=[
    [],['8.8.8.8','10.0.0.1'],['8.8.8.8','::ffff:7f00:1'],
    ['1.1.1.1','fc00::1'],['8.8.8.8','8.8.8.8'],
    ['8.8.8.8','bad'],['8.8.8.8',null],
    Array.from({length:9},()=> '8.8.8.8'),
  ];
  for(const addresses of invalidAnswerSets){
    let contacted=0;
    const service=adapter({
      resolveAll:async()=>addresses,
      requestPinned:async()=>{contacted++;return {}},
    }).service;
    await assert.rejects(()=>service.resolve(request),
      /MCP_CIMD_NETWORK_DENIED/);
    assert.equal(contacted,0,JSON.stringify(addresses));
  }
  const blocked=adapter({
    egressPolicy:({address})=>address==='8.8.8.8',
  });
  await assert.rejects(()=>blocked.service.resolve(request),
    /MCP_CIMD_NETWORK_DENIED/);
  assert.equal(blocked.stats().wire,0,'one denied A/AAAA address blocks the whole set');
});

test('valid synthetic DNS and TLS produce an exact client identity, one pinned IP and no second lookup',async()=>{
  const x=adapter(),doc=await x.service.resolve(request);
  assert.deepEqual(doc,{clientId:ID,clientName:document().client_name,
    redirectUri:REDIRECT,redirectHost:'127.0.0.1'});
  const stats=x.stats();
  assert.deepEqual({dns:stats.dns,wire:stats.wire,egress:stats.egress},
    {dns:1,wire:1,egress:2});
  assert.deepEqual(stats.plans[0],{
    url:ID,hostname:'client.example.test',port:443,
    servername:'client.example.test',address:'8.8.8.8',family:4,
    method:'GET',allowRedirects:false,allowProxy:false,
    maxBytes:8192,deadlineMs:3000,
  });
  assert.equal(Object.isFrozen(stats.plans[0]),true);
});

test('wrong origin, callback, network capability, malformed config fail BEFORE DNS',async()=>{
  for(const req of [
    {clientId:'https://attacker.invalid/oauth/client.json',redirectUri:REDIRECT},
    {clientId:'http://client.example.test/oauth/client.json',redirectUri:REDIRECT},
    {clientId:'https://127.0.0.1/oauth/client.json',redirectUri:REDIRECT},
    {clientId:ID,redirectUri:'https://evil.example.test/callback'},
    {clientId:ID,redirectUri:REDIRECT+'/suffix'},
  ]){
    const x=adapter();
    await assert.rejects(()=>x.service.resolve(req),/MCP_CIMD_NETWORK_DENIED/);
    assert.equal(x.stats().dns,0);
  }
  for(const changes of [
    {trustedOrigins:['https://attacker.invalid']},
    {trustedOrigins:[ORIGIN,ORIGIN]},
    {allowedRedirectUris:[REDIRECT,REDIRECT]},
    {resolveAll:null},{requestPinned:null},{egressPolicy:null},
    {deadlineMs:30000},{maxBytes:100000},{maxConcurrent:0},
  ])assert.throws(()=>adapter(changes),/MCP_CIMD_NETWORK_DENIED/);
});

test('TLS, DNS pin, protocol, redirect, proxy and HTTP response-substitution fail closed',async()=>{
  const x=adapter();
  const changes=[
    {requestUrl:'https://evil.example.test/oauth/client.json'},
    {peerAddress:'10.0.0.1'}, {peerAddress:'1.1.1.1'},
    {tlsHostname:'evil.example.test'}, {tlsAuthorized:false},
    {tlsProtocol:'TLSv1.1'}, {followedRedirect:true},
    {proxyUsed:true},{statusCode:302,headers:{location:'http://127.0.0.1'}},
    {statusCode:301},{statusCode:304},{statusCode:503},
    {headers:{'content-type':'text/html'}},
    {headers:{'content-type':'application/json','content-encoding':'gzip'}},
    {headers:{'content-type':'application/json','content-length':'1'}},
    {headers:{'content-type':'application/json','set-cookie':'session=leak'}},
    {body:Buffer.alloc(8193,0)},
    {body:Buffer.from('invalid json')},
  ];
  for(const change of changes){
    const service=adapter({requestPinned:async plan=>reply(plan,change)}).service;
    await assert.rejects(()=>service.resolve(request),/MCP_CIMD_NETWORK_DENIED/,
      JSON.stringify(Object.keys(change)));
  }
  assert.equal((await x.service.resolve(request)).clientId,ID);
});

test('malicious client metadata JSON never bypasses prior document redirect registration',async()=>{
  for(const doc of [
    {...document(),client_id:'https://evil.example.test/oauth/client.json'},
    {...document(),redirect_uris:['http://127.0.0.1:9000/callback']},
    {...document(),client_name:'<script>alert(1)</script>'},
    {...document(),grant_types:['client_credentials']},
    {...document(),client_uri:'http://169.254.169.254'},
    {...document(),redirect_uris:[REDIRECT,REDIRECT]},
  ]){
    const service=adapter({requestPinned:async plan=>reply(plan,{
      body:Buffer.from(JSON.stringify(doc)),
      headers:{'content-type':'application/json'},
    })}).service;
    await assert.rejects(()=>service.resolve(request),/MCP_CIMD_NETWORK_DENIED/);
  }
});

test('concurrency and wall-time budgets fail closed when synthetic resolver never answers',async()=>{
  let entered;
  const started=new Promise(resolve=>{entered=resolve;});
  const service=adapter({
    maxConcurrent:1,deadlineMs:100,
    resolveAll:async()=>{entered();return new Promise(()=>{});},
  }).service;
  const first=service.resolve(request);
  await started;
  await assert.rejects(()=>service.resolve(request),/MCP_CIMD_NETWORK_DENIED/);
  await assert.rejects(()=>first,/MCP_CIMD_NETWORK_DENIED/);
});

test('Node port request options pin ONE verified IP while retaining hostname SNI and strict no-proxy TLS',()=>{
  const plan=adapter().stats; // helpers do not call network on construction
  void plan;
  const requestPlan=Object.freeze({
    url:ID,hostname:'client.example.test',port:443,
    servername:'client.example.test',address:'8.8.8.8',family:4,
    method:'GET',allowRedirects:false,allowProxy:false,
    maxBytes:8192,deadlineMs:3000,
  });
  const opts=pinnedCimdRequestOptions(requestPlan,[ORIGIN]);
  assert.equal(opts.protocol,'https:');
  assert.equal(opts.agent,false);
  assert.equal(opts.port,443);
  assert.equal(opts.servername,'client.example.test');
  assert.equal(opts.rejectUnauthorized,true);
  assert.equal(opts.minVersion,'TLSv1.2');
  assert.equal(opts.path,'/oauth/client.json');
  assert.equal(opts.headers['Accept-Encoding'],'identity');
  let lookup;
  opts.lookup('client.example.test',{family:4},(err,ip,family)=>{
    lookup={err,ip,family};
  });
  assert.deepEqual(lookup,{err:null,ip:'8.8.8.8',family:4});
  opts.lookup('evil.example.test',{},(error)=>{
    assert.match(error.message,/MCP_CIMD_TRANSPORT_DENIED/);
  });
  assert.throws(()=>pinnedCimdRequestOptions({
    ...requestPlan,address:'169.254.169.254',
  },[ORIGIN]),/MCP_CIMD_TRANSPORT_DENIED/);
  assert.throws(()=>pinnedCimdRequestOptions({
    ...requestPlan,servername:'evil.example.test',
  },[ORIGIN]),/MCP_CIMD_TRANSPORT_DENIED/);
  assert.throws(()=>pinnedCimdRequestOptions({
    ...requestPlan,allowProxy:true,
  },[ORIGIN]),/MCP_CIMD_TRANSPORT_DENIED/);
});

test('TLS hostname, CA authorization, protocol and actual peer IP are independently required',()=>{
  const plan={
    url:ID,servername:'client.example.test',address:'8.8.8.8',
  };
  const certificate={
    subject:{CN:'client.example.test'},
    subjectaltname:'DNS:client.example.test',
  };
  const sock={
    authorized:true,remoteAddress:'8.8.8.8',
    getProtocol:()=> 'TLSv1.3',
    getPeerCertificate:()=>certificate,
  };
  assert.equal(verifyPinnedCimdTlsPeer(sock,plan),true);
  for(const change of [
    {authorized:false},{remoteAddress:'8.8.4.4'},
    {getProtocol:()=> 'TLSv1.0'},
    {getPeerCertificate:()=>({...certificate,
      subjectaltname:'DNS:evil.example.test'})},
  ])assert.throws(()=>verifyPinnedCimdTlsPeer({...sock,...change},plan),
    /MCP_CIMD_TRANSPORT_DENIED/);
  assert.throws(()=>verifyPinnedCimdTlsPeer(sock,{
    ...plan,servername:'evil.example.test',
  }),/MCP_CIMD_TRANSPORT_DENIED/);
});

test('unwired DNS and HTTPS ports require explicit permission and allowed origins',()=>{
  assert.throws(()=>createNodeCimdDnsPort({
    allowedHosts:['client.example.test'],
  }),/MCP_CIMD_TRANSPORT_DENIED/);
  assert.throws(()=>createNodeCimdHttpsPort({
    allowedOrigins:[ORIGIN],
  }),/MCP_CIMD_TRANSPORT_DENIED/);
  assert.throws(()=>createNodeCimdDnsPort({
    explicitNetworkAuthorization:true,
    allowedHosts:['127.0.0.1'],
  }),/MCP_CIMD_TRANSPORT_DENIED/);
  assert.throws(()=>createNodeCimdHttpsPort({
    explicitNetworkAuthorization:true,
    allowedOrigins:['http://client.example.test'],
  }),/MCP_CIMD_TRANSPORT_DENIED/);
  // Merely constructing a permitted port opens no sockets and does not
  // invoke DNS; do not call these functions in offline acceptance.
  assert.equal(typeof createNodeCimdDnsPort({
    explicitNetworkAuthorization:true,allowedHosts:['client.example.test'],
  }),'function');
  assert.equal(typeof createNodeCimdHttpsPort({
    explicitNetworkAuthorization:true,allowedOrigins:[ORIGIN],
  }),'function');
});
