/** BP-15 offline read-only MCP policy core. NOT a network endpoint or token verifier.
 * The host MUST cryptographically verify token signatures, issuer, expiry, audience,
 * grant/revocation and use user-delegated RLS credentials before this boundary.
 */
const deny = () => { throw new Error('MCP_DENIED'); };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID = /^[a-z0-9][a-z0-9:_-]{0,99}$/i;
const own = (value,key) => Object.prototype.hasOwnProperty.call(value,key);
const object = x => x !== null && typeof x==='object' && !Array.isArray(x) &&
  (Object.getPrototypeOf(x)===Object.prototype || Object.getPrototypeOf(x)===null);
const str = (value,max,allowEmpty=false) => typeof value==='string' && value.length<=max &&
  (allowEmpty || value.trim().length>0) && !/[\u0000-\u0008\u000B-\u001F\u007F]/.test(value);
const canonicalHttps = value => {
  if(typeof value!=='string')deny();
  let url; try{url=new URL(value);}catch{deny();}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.origin==='null'||url.href!==value)deny();
  return value;
};
const validId = value => typeof value==='string' && ID.test(value);
const validDate = value => value===null || (typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value));
const exactArgs = (args,required,optional=[]) => {
  if(!object(args))deny();
  const keys=Object.keys(args);
  if(required.some(key=>!own(args,key))||keys.some(key=>![...required,...optional].includes(key)))deny();
};

export const MCP_READ_TOOLS = Object.freeze({
  list_branches: Object.freeze({scope:'tasks:read'}),
  search_tasks: Object.freeze({scope:'tasks:read'}),
  get_task: Object.freeze({scope:'tasks:read'}),
});

/** Claims MUST be produced by a real cryptographic verifier, never parsed by the client. */
export function validateMcpAccessClaims(claims,{issuer,resource,now=Date.now()}={}) {
  canonicalHttps(issuer); canonicalHttps(resource);
  if(!object(claims)||!Number.isFinite(now)||claims.iss!==issuer||
     !UUID.test(claims.sub||'')||claims.role==='service_role'||
     (claims.token_use!==undefined&&claims.token_use!=='access')||
     (claims.role!==undefined&&claims.role!=='authenticated'))deny();
  const audiences=typeof claims.aud==='string'?[claims.aud]:claims.aud;
  if(!Array.isArray(audiences)||!audiences.includes(resource)||
     audiences.some(a=>typeof a!=='string'))deny();
  const seconds=Math.floor(now/1000);
  if(!Number.isSafeInteger(claims.exp)||claims.exp<=seconds||
     !Number.isSafeInteger(claims.iat)||claims.iat>seconds+120||claims.iat<0||
     (claims.nbf!==undefined&&(!Number.isSafeInteger(claims.nbf)||claims.nbf>seconds+120)))deny();
  if(typeof claims.scope!=='string'||claims.scope.length>256||
     !claims.scope.split(' ').includes('tasks:read'))deny();
  return Object.freeze({sub:claims.sub,scopes:Object.freeze(claims.scope.split(' '))});
}

const projectBranch=(row,ownerId)=>{
  if(!object(row)||row.owner_id!==ownerId||!validId(row.id)||
     !(row.parent_id===null||validId(row.parent_id))||!str(row.label,120))deny();
  return {id:row.id,parentId:row.parent_id,label:row.label};
};
const projectTask=(row,ownerId,detailed=false)=>{
  if(!object(row)||row.owner_id!==ownerId||!validId(row.id)||!validId(row.project_id)||
     !str(row.title,180)||!str(row.status,40)||!validDate(row.due_date)||
     !str(row.urgency,30)||!Number.isSafeInteger(row.effort_minutes)||
     row.effort_minutes<0||row.effort_minutes>100000)deny();
  const safe={id:row.id,projectId:row.project_id,title:row.title,status:row.status,
    dueDate:row.due_date,urgency:row.urgency,effortMinutes:row.effort_minutes};
  if(detailed){
    if(!str(row.description,10000,true)||!str(row.criteria,5000,true))deny();
    return {...safe,description:row.description,criteria:row.criteria};
  }
  return safe;
};

/** Dependencies deliberately injected: DO NOT build a public route before OAuth
 * metadata, signature verification, RLS-delegated adapter and A/B integration pass.
 */
export function createPrivateMcpReadBoundary({issuer,resource,verifyAccessToken,dataSource,clock=Date.now}={}){
  canonicalHttps(issuer);canonicalHttps(resource);
  if(typeof verifyAccessToken!=='function'||typeof clock!=='function'||
     !object(dataSource)||['listBranches','searchTasks','getTask'].some(k=>typeof dataSource[k]!=='function'))deny();
  return Object.freeze({
    async invoke({authorization,name,arguments:args}={}){
      // No paths, arbitrary account ids, query tokens or user-selected tool names.
      try{
        const tool=typeof name==='string'&&own(MCP_READ_TOOLS,name)?MCP_READ_TOOLS[name]:null;
        if(!tool||typeof authorization!=='string'||
           !/^Bearer [A-Za-z0-9._~+\/-]{1,4096}$/.test(authorization))deny();
        const verified=await verifyAccessToken(authorization.slice(7));
        const identity=validateMcpAccessClaims(verified,{issuer,resource,now:clock()});
        if(!identity.scopes.includes(tool.scope))deny();
        if(name==='list_branches'){
          exactArgs(args,[]);
          const rows=await dataSource.listBranches(identity.sub);
          if(!Array.isArray(rows)||rows.length>100)deny();
          return {branches:rows.map(row=>projectBranch(row,identity.sub))};
        }
        if(name==='search_tasks'){
          exactArgs(args,['query'],['limit']);
          if(!str(args.query,100)||args.query.trim().length<2)deny();
          const limit=args.limit===undefined?20:args.limit;
          if(!Number.isSafeInteger(limit)||limit<1||limit>20)deny();
          const rows=await dataSource.searchTasks(identity.sub,args.query,limit);
          if(!Array.isArray(rows)||rows.length>limit)deny();
          return {tasks:rows.map(row=>projectTask(row,identity.sub))};
        }
        exactArgs(args,['taskId']);
        if(!validId(args.taskId))deny();
        const row=await dataSource.getTask(identity.sub,args.taskId);
        if(row===null)return {task:null};
        const projected=projectTask(row,identity.sub,true);
        if(projected.id!==args.taskId)deny();
        return {task:projected};
      }catch{
        // A single non-reflective error code: no private row, token, SQL or path leaks.
        deny();
      }
    },
  });
}
