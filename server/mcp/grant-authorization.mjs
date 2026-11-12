/** BP-15: atomic, owner-scoped consent and revocation DECISION contract.
 * A future datastore adapter MUST return one coherent durable snapshot from a
 * tenant-filtered, transactionally consistent read. This module neither stores
 * grants nor opens a network/database connection, and is not a live OAuth API.
 */
const fail=()=>{throw Error('MCP_CONSENT_DENIED');};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const client=/^[A-Za-z0-9_-]{1,128}$/;
const tokenId=/^[A-Za-z0-9_.:-]{8,128}$/;
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const scopeOnly=values=>Array.isArray(values)&&values.length===1&&values[0]==='tasks:read';
function canonicalHttps(value){
  if(typeof value!=='string')fail();
  let url;
  try{url=new URL(value);}catch{fail();}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
    url.origin==='null'||url.href!==value)fail();
}

/** Design-only runtime port: readSnapshot(query) MUST query grant + exact JTI
 * revocation in ONE serializable or equivalently coherent committed snapshot.
 * Passing separate consent and revocation queries reintroduces TOCTOU risk.
 *
 * Expected projection:
 * {decisionRevision, grant:{issuer,ownerId,clientId,resource,grantId,
 *   epoch,scopes:['tasks:read'],consentedAt,expiresAt,revokedAt:null},
 *   token:{jti,revoked:false}}
 *
 * No in-process cache. A later user-controlled revoke needs a committed epoch
 * bump or revocation before it acknowledges success; only subsequent decisions
 * are guaranteed to reject. In-flight reads that preceded revoke are not
 * magically cancelled.
 */
export function createAtomicMcpGrantAuthorizer({readSnapshot,clock=Date.now}={}){
  if(typeof readSnapshot!=='function'||typeof clock!=='function')fail();
  return async function authorizeGrant(context){
    try {
      if(!plain(context))fail();
      const nowMs=clock();
      if(!integer(nowMs))fail();
      const seconds=Math.floor(nowMs/1000);
      canonicalHttps(context.issuer);
      canonicalHttps(context.resource);
      if(!uuid.test(context.subject||'')||!uuid.test(context.grantId||'')||
        !client.test(context.clientId||'')||!tokenId.test(context.jti||'')||
        !integer(context.grantEpoch)||context.grantEpoch<1||
        !scopeOnly(context.scopes)||
        !integer(context.issuedAt)||context.issuedAt>seconds+30||
        !integer(context.expiresAt)||context.expiresAt<=seconds||
        context.issuedAt>=context.expiresAt)fail();
      const query=Object.freeze({issuer:context.issuer,subject:context.subject,
        clientId:context.clientId,resource:context.resource,
        grantId:context.grantId,jti:context.jti});
      const decision=await readSnapshot(query);
      if(!plain(decision)||!integer(decision.decisionRevision)||
        decision.decisionRevision<1||!plain(decision.grant)||
        !plain(decision.token))fail();
      const grant=decision.grant;
      if(grant.issuer!==context.issuer||
        grant.ownerId!==context.subject||grant.clientId!==context.clientId||
        grant.resource!==context.resource||grant.grantId!==context.grantId||
        !integer(grant.epoch)||grant.epoch!==context.grantEpoch||
        !scopeOnly(grant.scopes)||!integer(grant.consentedAt)||
        grant.consentedAt>context.issuedAt||grant.consentedAt>seconds||
        !integer(grant.expiresAt)||grant.expiresAt<=seconds||
        grant.revokedAt!==null||decision.token.jti!==context.jti||
        decision.token.revoked!==false)fail();
      return true;
    }catch{fail();} // No owner IDs, grant rows, token JTI or store error leaks.
  };
}
