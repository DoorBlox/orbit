/** BP-15: synthetic, loopback-only MCP 2026-07-28 HTTP integration.
 * Start explicitly in tests/demo. NEVER import this fixture into Production.
 * Every user, task, signing key, grant and revocation is disposable in memory.
 */
import {createServer} from 'node:http';
import {generateKeyPairSync,sign as signJws} from 'node:crypto';
import {createMcpStreamableReadAdmission} from './http-admission.mjs';
import {createMcpHttpResponseHandler} from './mcp-http-handler.mjs';
import {createMcpJwtAccessVerifier} from './jwt-access-verifier.mjs';
import {createMcpGrantAuthorizer} from './grant-decision.mjs';
import {createPrivateMcpReadBoundary} from './read-boundary.mjs';

const syntheticIssuer='https://synthetic-auth.example.test/tenant';
const syntheticResource='https://synthetic-mcp.example.test/mcp';
const clientId='fixture-local-client';
const ownerIds=Object.freeze({
  ownerA:'11111111-1111-4111-8111-111111111111',
  ownerB:'22222222-2222-4222-8222-222222222222',
});
const MAX_INPUT=65536;
const rows=Object.freeze({
  ownerA:Object.freeze({
    branches:[{owner_id:ownerIds.ownerA,id:'inbox-a',parent_id:null,label:'Owner A'}],
    tasks:[{owner_id:ownerIds.ownerA,id:'alpha-task',project_id:'inbox-a',
      title:'Alpha secret plan',status:'open',due_date:null,urgency:'normal',
      effort_minutes:20,description:'A private task description',criteria:'Alpha only'}],
  }),
  ownerB:Object.freeze({
    branches:[{owner_id:ownerIds.ownerB,id:'inbox-b',parent_id:null,label:'Owner B'}],
    tasks:[{owner_id:ownerIds.ownerB,id:'beta-task',project_id:'inbox-b',
      title:'Beta independent task',status:'open',due_date:null,urgency:'normal',
      effort_minutes:10,description:'B private description',criteria:'Beta only'}],
  }),
});

const denyResult=(res,status)=>{
  const body=JSON.stringify({jsonrpc:'2.0',
    error:{code:-32000,message:'Request denied'}});
  res.writeHead(status,{'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff',
    'content-length':Buffer.byteLength(body)});
  res.end(body);
};

/** Return a disposable A/B fixture bound to 127.0.0.1 on an ephemeral port.
 * Deliberately not configurable to public interfaces, permanent storage,
 * production project IDs, hosted JWT signing keys or third-party accounts.
 */
export async function startLocalMcpFixture({maxRequestsPerMinute=120,trustedGrantStore=null,loopbackDiscovery=false,clock=Date.now}={}){
  // Opt-in durable adapter is still a synthetic trusted test fixture; NEVER
  // mount its owner-selection/token signer as an untrusted/public route.
  if(trustedGrantStore!==null&&
    typeof trustedGrantStore.readAuthorizationSnapshot!=='function')
    throw Error('MCP_FIXTURE_DENIED');
  if(!Number.isSafeInteger(maxRequestsPerMinute)||
    maxRequestsPerMinute<1||maxRequestsPerMinute>1000)
    throw Error('MCP_FIXTURE_DENIED');
  if(typeof loopbackDiscovery!=='boolean'||typeof clock!=='function')throw Error('MCP_FIXTURE_DENIED');
  let issuer=syntheticIssuer,resource=syntheticResource;
  let oauthRoutes=null;
  const keys=generateKeyPairSync('rsa',{modulusLength:2048});
  const key={...keys.publicKey.export({format:'jwk'}),kid:'local-synthetic-1',
    kty:'RSA',alg:'RS256',use:'sig',key_ops:['verify']};
  const grants=new Map();
  const lastTokens=new Map();
  const quota=new Map();
  let serial=0;
  const now=()=>Math.floor(clock()/1000);
  for(const label of ['ownerA','ownerB']){
    grants.set(ownerIds[label],{epoch:1,active:true,grantedAt:now()-200,
      expiresAt:now()+3600,revokedTokens:new Set()});
  }
  const labelFor=id=>Object.keys(ownerIds).find(x=>ownerIds[x]===id);
  const dataSource={
    async listBranches(owner){
      const label=labelFor(owner);
      return label?rows[label].branches.map(x=>({...x})):[];
    },
    async searchTasks(owner,query,limit){
      const label=labelFor(owner);
      return label?rows[label].tasks.filter(x=>x.title.toLowerCase().includes(
        query.toLowerCase())).slice(0,limit).map(x=>({...x})):[];
    },
    async getTask(owner,taskId){
      const label=labelFor(owner);
      const found=label&&rows[label].tasks.find(x=>x.id===taskId);
      return found?{...found}:null;
    },
  };
  let handler;
  const issueForEpoch=(label,epoch)=>{
    if(!Object.hasOwn(ownerIds,label)||!Number.isSafeInteger(epoch)||
      epoch<1||epoch>2147483647)throw Error('MCP_FIXTURE_DENIED');
    const sec=now(),jti='fixture-'+label+'-token-'+(++serial);
    const header={alg:'RS256',typ:'at+jwt',kid:'local-synthetic-1'};
    const claims={iss:issuer,aud:resource,sub:ownerIds[label],client_id:clientId,
      jti,grant_epoch:epoch,role:'authenticated',token_use:'access',
      scope:'tasks:read',iat:sec,nbf:sec,exp:sec+300};
    const body=[header,claims].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
    lastTokens.set(label,jti);
    return body+'.'+signJws('RSA-SHA256',Buffer.from(body),keys.privateKey).toString('base64url');
  };
  const tokenFor=label=>{
    if(trustedGrantStore||!Object.hasOwn(ownerIds,label))
      throw Error('MCP_FIXTURE_DENIED');
    return issueForEpoch(label,grants.get(ownerIds[label]).epoch);
  };
  // No pre-issued bypass tokens when a persisted consent ledger is active.
  let tokens;

  let listeningPort=0;
  const server=createServer(async (req,res)=>{
    try{
      const raw=req.rawHeaders||[];
      const hosts=[];
      const pairs=[];
      for(let i=0;i<raw.length;i+=2){
        pairs.push([raw[i],raw[i+1]]);
        if(raw[i].toLowerCase()==='host')hosts.push(raw[i+1]);
      }
      if(hosts.length!==1||hosts[0]!=='127.0.0.1:'+listeningPort){
        denyResult(res,403);req.resume();return;
      }
      const route=req.url?.split('?')[0];
      if(loopbackDiscovery&&oauthRoutes&&[
        '/.well-known/oauth-authorization-server',
        '/.well-known/oauth-protected-resource/mcp',
        '/authorize','/consent','/token','/revoke',
      ].includes(route)){
        await oauthRoutes(req,res);return;
      }
      const announced=Number(req.headers['content-length']);
      if(Number.isFinite(announced)&&announced>MAX_INPUT){
        denyResult(res,413);req.resume();return;
      }
      const chunks=[];let length=0;
      for await(const chunk of req){
        length+=chunk.length;
        if(length>MAX_INPUT){
          denyResult(res,413);return;
        }
        chunks.push(chunk);
      }
      const reply=await handler.handle({
        method:req.method,path:req.url,headers:pairs,
        body:Buffer.concat(chunks,length),
      });
      const headers={...reply.headers};
      if(loopbackDiscovery&&reply.status===401)
        headers['www-authenticate']='Bearer resource_metadata="'+
          issuer+'.well-known/oauth-protected-resource/mcp", scope="tasks:read"';
      res.writeHead(reply.status,{...headers,
        'content-length':Buffer.byteLength(reply.body)});
      res.end(reply.body);
    }catch{
      if(!res.headersSent)denyResult(res,400);
      else res.end();
    }
  });
  server.requestTimeout=10000;
  server.headersTimeout=10000;
  server.keepAliveTimeout=5000;
  server.maxRequestsPerSocket=150;
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>{
      server.removeListener('error',reject);resolve();
    });
  });
  listeningPort=server.address().port;
  if(loopbackDiscovery){
    issuer='http://127.0.0.1:'+listeningPort+'/';
    resource='http://127.0.0.1:'+listeningPort+'/mcp';
  }
  const grantAuthorizer=createMcpGrantAuthorizer({
    allowLoopbackHttp:loopbackDiscovery,clock,
    readAuthorizationSnapshot:trustedGrantStore?async query=>
      trustedGrantStore.readAuthorizationSnapshot(query):async ({issuer:iss,resource:res,ownerId,clientId:client,
      tokenId})=>{
      const current=grants.get(ownerId);
      if(iss!==issuer||res!==resource||client!==clientId||!current)return null;
      return {issuer,resource,ownerId,clientId,tokenId,
        grantEpoch:current.epoch,status:current.active?'active':'revoked',
        scopes:['tasks:read'],grantedAt:current.grantedAt,
        consentExpiresAt:current.expiresAt,
        consentRevokedAt:current.active?null:now(),
        tokenRevokedAt:current.revokedTokens.has(tokenId)?now():null};
    },
  });
  const verify=createMcpJwtAccessVerifier({issuer,resource,
    allowLoopbackHttp:loopbackDiscovery,clock,
    loadJwks:async()=>({keys:[key]}),authorizeGrant:grantAuthorizer});
  const boundary=createPrivateMcpReadBoundary({issuer,resource,
    allowLoopbackHttp:loopbackDiscovery,clock,
    verifyAccessToken:verify,dataSource});
  const admission=createMcpStreamableReadAdmission({
    allowedOrigins:['https://orbit.example.test'],
    invokeReadBoundary:boundary.invoke.bind(boundary),
  });
  handler=createMcpHttpResponseHandler({
    admission,verifyAccessToken:verify,issuer,resource,
    allowLoopbackHttp:loopbackDiscovery,
    consumeQuota:async ctx=>{
      const minute=Math.floor(clock()/60000);
      const key=ctx.subject+'|'+ctx.clientId+'|'+minute;
      // Bounded synthetic state. This Map MUST NOT serve as a hosted
      // multi-instance rate-limit adapter or a durable consent ledger.
      if(quota.size>24)quota.clear();
      const count=quota.get(key)||0;
      if(count>=maxRequestsPerMinute)return false;
      quota.set(key,count+1);
      return true;
    },
  });
  tokens=trustedGrantStore?Object.freeze({}):
    Object.freeze({ownerA:tokenFor('ownerA'),ownerB:tokenFor('ownerB')});
  return Object.freeze({
    url:'http://127.0.0.1:'+listeningPort+'/mcp',
    tokens,ownerIds,tokenFor,
    ...(loopbackDiscovery?{
      attachLocalOAuthRoutes(fn){
        if(typeof fn!=='function'||oauthRoutes)throw Error('MCP_FIXTURE_DENIED');
        oauthRoutes=fn;
        return ()=>{if(oauthRoutes===fn)oauthRoutes=null;};
      },
    }:{}),
    ...(trustedGrantStore?{
      trustedIssueForEpoch:issueForEpoch,
      grantIdentity:Object.freeze({issuer,resource,clientId}),
    }:{}),
    revoke(label){
      if(trustedGrantStore)throw Error('MCP_FIXTURE_DENIED');
      const id=ownerIds[label];if(!id)throw Error('MCP_FIXTURE_DENIED');
      const entry=grants.get(id);entry.active=false;entry.epoch++;
    },
    regrant(label){
      if(trustedGrantStore)throw Error('MCP_FIXTURE_DENIED');
      const id=ownerIds[label];if(!id)throw Error('MCP_FIXTURE_DENIED');
      const entry=grants.get(id);
      entry.active=true;entry.epoch++;entry.grantedAt=now()-1;
    },
    revokeToken(label){
      if(trustedGrantStore)throw Error('MCP_FIXTURE_DENIED');
      const id=ownerIds[label];if(!id)throw Error('MCP_FIXTURE_DENIED');
      const current=lastTokens.get(label);
      if(current)grants.get(id).revokedTokens.add(current);
    },
    async close(){await new Promise((resolve,reject)=>
      server.close(err=>err?reject(err):resolve()));},
  });
}
