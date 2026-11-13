import {canonicalMcpIdentifier} from './identifier.mjs';
import {validMcpClientId} from './cimd-client-metadata.mjs';
/** BP-15 owner-grant decision: source-only contract for a future durable store.
 *
 * readAuthorizationSnapshot MUST return one committed, tenant-scoped projection
 * of the consent grant AND the token's revocation state, not two independent
 * queries or a process-local cache. This code performs NO persistence/writes,
 * API calls, database schema migrations or external service interactions.
 */
const deny=()=>{throw Error('MCP_GRANT_DENIED');};
const own=Object.prototype.hasOwnProperty;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const token=/^[A-Za-z0-9_.:-]{8,128}$/;
const expectedKeys=Object.freeze([
  'clientId','consentExpiresAt','consentRevokedAt','grantEpoch',
  'grantedAt','issuer','ownerId','resource','scopes','status',
  'tokenId','tokenRevokedAt',
]);
const validEpoch=n=>Number.isSafeInteger(n)&&n>=1&&n<=2147483647;

function exactHttps(value,allowLoopbackHttp=false){
  if(!canonicalMcpIdentifier(value,{allowLoopbackHttp}))deny();
  return value;
}

function validScopes(scopes){
  return Array.isArray(scopes)&&scopes.length===1&&scopes[0]==='tasks:read';
}
function validContext(ctx,now,allowLoopbackHttp,allowCimdClientIds){
  if(!plain(ctx)||!Number.isSafeInteger(now)||now<0)deny();
  exactHttps(ctx.issuer,allowLoopbackHttp);exactHttps(ctx.resource,allowLoopbackHttp);
  if(!uuid.test(ctx.subject||'')||!validMcpClientId(ctx.clientId,{allowCimdClientIds})||
    !token.test(ctx.jti||'')||!validScopes(ctx.scopes)||
    !validEpoch(ctx.grantEpoch)||
    !Number.isSafeInteger(ctx.issuedAt)||ctx.issuedAt<0||
    ctx.issuedAt>Math.floor(now/1000)+30||
    !Number.isSafeInteger(ctx.expiresAt)||ctx.expiresAt<=Math.floor(now/1000)||
    ctx.expiresAt<=ctx.issuedAt)deny();
}
function activeSnapshot(snapshot,ctx,seconds){
  if(!plain(snapshot)||Object.keys(snapshot).length!==expectedKeys.length||
    expectedKeys.some(key=>!own.call(snapshot,key)))deny();
  if(snapshot.issuer!==ctx.issuer||snapshot.resource!==ctx.resource||
    snapshot.ownerId!==ctx.subject||snapshot.clientId!==ctx.clientId||
    snapshot.tokenId!==ctx.jti||snapshot.grantEpoch!==ctx.grantEpoch||
    !validScopes(snapshot.scopes)||snapshot.status!=='active'||
    snapshot.consentRevokedAt!==null||snapshot.tokenRevokedAt!==null||
    !Number.isSafeInteger(snapshot.grantedAt)||snapshot.grantedAt<0||
    snapshot.grantedAt>ctx.issuedAt||
    !Number.isSafeInteger(snapshot.consentExpiresAt)||
    snapshot.consentExpiresAt<=seconds||
    snapshot.consentExpiresAt<=snapshot.grantedAt)deny();
  return true;
}

/** Inject only a durable, consistently-read projection:
 *
 * readAuthorizationSnapshot({issuer,resource,ownerId,clientId,tokenId})
 *   -> {issuer,resource,ownerId,clientId,tokenId,grantEpoch,status,
 *       scopes,grantedAt,consentExpiresAt,consentRevokedAt,tokenRevokedAt}
 *
 * The adapter MUST key by all five trusted fields and read current grant
 * and per-token revocation in one transaction/snapshot at READ COMMITTED+
 * with a documented consistency point. A revoked/reconsented grant MUST
 * increment its monotonically persisted epoch. Each access invokes the
 * source again, with no positive caching. A response whose fields differ
 * from the verified token context is denied, not used as an authority.
 */
export function createMcpGrantAuthorizer({readAuthorizationSnapshot,clock=Date.now,allowLoopbackHttp=false,allowCimdClientIds=false}={}){
  if(typeof readAuthorizationSnapshot!=='function'||typeof clock!=='function')deny();
  return async function authorizeGrant(context){
    try{
      const ms=clock();
      validContext(context,ms,allowLoopbackHttp,allowCimdClientIds);
      const request=Object.freeze({
        issuer:context.issuer,resource:context.resource,ownerId:context.subject,
        clientId:context.clientId,tokenId:context.jti,
      });
      const snapshot=await readAuthorizationSnapshot(request);
      return activeSnapshot(snapshot,context,Math.floor(ms/1000));
    }catch{
      // No database identifiers, grants, token IDs or internal failures leak.
      return false;
    }
  };
}
