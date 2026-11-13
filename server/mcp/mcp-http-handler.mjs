/** BP-15: MCP 2026-07-28 JSON-RPC read-only response composition.
 * This module is independent of hosting: no listener, no OAuth provider,
 * no Supabase service-role access, no data fixture and no network calls.
 */
import {McpHttpAdmissionError} from './http-admission.mjs';
import {validateMcpAccessClaims} from './read-boundary.mjs';

const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const VERSION='2026-07-28';
const tools=Object.freeze([
  Object.freeze({
    name:'list_branches',title:'List my branches',
    description:'List the authenticated owner’s private spatial branches (read only).',
    inputSchema:{type:'object',properties:{},required:[],additionalProperties:false},
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
  }),
  Object.freeze({
    name:'search_tasks',title:'Search my tasks',
    description:'Search only my own tasks, returning up to 20 safe projections.',
    inputSchema:{type:'object',properties:{
      query:{type:'string',minLength:2,maxLength:100},
      limit:{type:'integer',minimum:1,maximum:20},
    },required:['query'],additionalProperties:false},
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
  }),
  Object.freeze({
    name:'get_task',title:'Get my task',
    description:'Read one of my own tasks by ID, including its safe description.',
    inputSchema:{type:'object',properties:{
      taskId:{type:'string',pattern:'^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,99}$'},
    },required:['taskId'],additionalProperties:false},
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
  }),
]);
const safeResponse=(status,payload,extra={})=>Object.freeze({
  status,
  headers:Object.freeze({'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff',...extra}),
  body:JSON.stringify(payload),
});
const rpcError=(status,code,data)=>{
  const error={code,message:'Request denied'};
  if(code===-32022&&plain(data)&&Array.isArray(data.supported)&&
    data.supported.length===1&&data.supported[0]===VERSION&&
    typeof data.requested==='string')
    error.data={supported:[VERSION],requested:data.requested.slice(0,64)};
  return safeResponse(status,{jsonrpc:'2.0',error},
    status===401?{'www-authenticate':'Bearer'}:{});
};

/** Build a standard per-request MCP envelope. Authentication and current
 * grant/revocation decisions are required even for tools/list/discover.
 *
 * invokeReadBoundary is wrapped inside admission.invoke; never call a raw
 * owner data source from here. consumeQuota receives verified owner/client
 * identity and MUST return literal true; a real hosted adapter must be
 * atomic and durable across workers, not a process-local Map.
 */
export function createMcpHttpResponseHandler({
  admission,verifyAccessToken,issuer,resource,consumeQuota,allowLoopbackHttp=false,
}={}){
  if(typeof admission?.inspect!=='function'||typeof admission?.invoke!=='function'||
    typeof verifyAccessToken!=='function'||typeof consumeQuota!=='function'||
    typeof issuer!=='string'||typeof resource!=='string')
    throw Error('MCP_HTTP_HANDLER_DENIED');
  return Object.freeze({
    async handle(raw){
      try{
        const accepted=admission.inspect(raw);
        // A real grant decision is required for metadata and for every tool.
        // For tools/call admission.invoke checks the token AGAIN immediately
        // before reading user records, narrowing a revoke/read race window.
        // Expired/revoked access is 401 so standard OAuth clients can refresh.
        let claims;
        try{claims=await verifyAccessToken(accepted.authorization.slice(7));}
        catch{if(allowLoopbackHttp)return rpcError(401,-32000);throw Error('token');}
        const identity=validateMcpAccessClaims(claims,{issuer,resource,allowLoopbackHttp});
        if(!identity.scopes.includes('tasks:read'))throw Error('scope');
        const quota=Object.freeze({subject:identity.sub,
          clientId:claims.client_id,resource,issuer});
        if(await consumeQuota(quota)!==true)
          return rpcError(429,-32000);
        let result;
        if(accepted.method==='server/discover'){
          result={resultType:'complete',supportedVersions:[VERSION],
            capabilities:{tools:{}},ttlMs:0,cacheScope:'private',
            _meta:{'io.modelcontextprotocol/serverInfo':
              {name:'orbit-readonly',version:'0.1.0'}},
            instructions:'Owner-private ORBIT tasks and spatial branches. Read-only.',
          };
        }else if(accepted.method==='tools/list'){
          result={resultType:'complete',tools,ttlMs:0,cacheScope:'private'};
        }else if(accepted.method==='tools/call'){
          const value=await admission.invoke(raw);
          result={resultType:'complete',
            content:[{type:'text',text:JSON.stringify(value)}],isError:false};
        }else throw Error('Unsupported');
        return safeResponse(200,{jsonrpc:'2.0',id:accepted.id,result});
      }catch(e){
        if(e instanceof McpHttpAdmissionError)
          return rpcError(e.httpStatus,e.rpcCode,e.data);
        // Any JWT, tenant, store, quota or data-source exception is private.
        return rpcError(403,-32000);
      }
    },
  });
}
