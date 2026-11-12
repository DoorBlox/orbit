/** BP-15: OFFLINE OAuth JWT access-token verification for an injected MCP boundary.
 * No endpoint, dynamic key URL, live credentials, token storage or Supabase access.
 * The issuer-bound JWKS loader and consent/revocation checks MUST be trusted,
 * current and fail closed. Uses platform RSA verification, not bespoke crypto.
 */
import {constants, createPublicKey, verify as verifySignature} from 'node:crypto';

const denied = () => { throw Error('MCP_TOKEN_DENIED'); };
const plain = value => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);
const kidPattern=/^[A-Za-z0-9_-]{1,64}$/;
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenIdPattern=/^[A-Za-z0-9_.:-]{8,128}$/;
const clientPattern=/^[A-Za-z0-9_-]{1,128}$/;
const b64Pattern=/^[A-Za-z0-9_-]+$/;
const MAX_BEARER=4096;
const MAX_TTL_SECONDS=15*60;

function exactHttps(value) {
  if(typeof value!=='string') denied();
  let url;
  try { url=new URL(value); } catch { denied(); }
  if(url.protocol!=='https:' || url.username || url.password || url.hash || url.search ||
    url.origin==='null' || url.href!==value) denied();
  return value;
}

function fromB64(segment,limit) {
  if(typeof segment!=='string'||segment.length===0||segment.length>limit||
    !b64Pattern.test(segment))denied();
  const bytes=Buffer.from(segment,'base64url');
  if(bytes.toString('base64url')!==segment)denied();
  return bytes;
}

function strictJson(segment,limit) {
  const bytes=fromB64(segment,limit);
  let value;
  try { value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)); }
  catch { denied(); }
  if(!plain(value))denied();
  return value;
}

function resolveIssuerPublicKey(jwks,kid) {
  if(!plain(jwks)||!Array.isArray(jwks.keys)||jwks.keys.length<1||jwks.keys.length>12)
    denied();
  const seen=new Set();let selected;
  for(const jwk of jwks.keys){
    if(!plain(jwk)||!kidPattern.test(jwk.kid||'')||seen.has(jwk.kid))denied();
    seen.add(jwk.kid);
    if(jwk.kid===kid)selected=jwk;
  }
  if(!selected || selected.kty!=='RSA' || selected.alg!=='RS256' ||
    selected.use!=='sig' || selected.e!=='AQAB' ||
    !b64Pattern.test(selected.n||'') ||
    (selected.key_ops!==undefined && (!Array.isArray(selected.key_ops)||
      selected.key_ops.length!==1||selected.key_ops[0]!=='verify')) ||
    Object.keys(selected).some(k=>!['kid','kty','alg','use','key_ops','n','e'].includes(k)))
    denied();
  let key;
  try { key=createPublicKey({key:{kty:'RSA',n:selected.n,e:selected.e},format:'jwk'}); }
  catch { denied(); }
  if(key.asymmetricKeyType!=='rsa'||key.asymmetricKeyDetails?.modulusLength<2048||
    key.asymmetricKeyDetails?.modulusLength>8192)denied();
  return key;
}

/** Signature-verified RFC 9068 RS256 access tokens only. The key loader MUST
 * bind its result to a fixed trusted issuer; never use JWT token key URLs
 * as a network address. Consent and revocation checks must be durable in a
 * future hosted adapter (not local process memory).
 */
export function createMcpJwtAccessVerifier({issuer,resource,loadJwks,isRevoked,hasConsent,authorizeGrant,clock=Date.now}={}) {
  exactHttps(issuer);exactHttps(resource);
  const atomic=typeof authorizeGrant==='function';
  // Never allow silent downgrade or a mixed atomic/split authorization path.
  if(typeof loadJwks!=='function'||typeof clock!=='function'||
    (atomic ? isRevoked!==undefined||hasConsent!==undefined :
      authorizeGrant!==undefined||typeof isRevoked!=='function'||
      typeof hasConsent!=='function'))denied();
  return async function verifyAccessToken(token){
    try {
      if(typeof token!=='string'||token.length<30||token.length>MAX_BEARER)denied();
      const parts=token.split('.');
      if(parts.length!==3)denied();
      const header=strictJson(parts[0],1024);
      if(Object.keys(header).length!==3||header.alg!=='RS256'||
        !['at+jwt','application/at+jwt'].includes(header.typ)||
        !kidPattern.test(header.kid||''))denied();
      const signature=fromB64(parts[2],1024);
      const jwks=await loadJwks({issuer,kid:header.kid});
      const publicKey=resolveIssuerPublicKey(jwks,header.kid);
      if(!verifySignature('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1],'ascii'),
        {key:publicKey,padding:constants.RSA_PKCS1_PADDING},signature))denied();
      // Do not process unverified claims, even to decide a key URL or client.
      const claims=strictJson(parts[1],3072);
      const now=clock(),seconds=Math.floor(now/1000);
      if(!Number.isSafeInteger(now)||claims.iss!==issuer||
        !(claims.aud===resource || (Array.isArray(claims.aud)&&
          claims.aud.length===1&&claims.aud[0]===resource))||
        !uuidPattern.test(claims.sub||'')||
        !tokenIdPattern.test(claims.jti||'')||
        !clientPattern.test(claims.client_id||'')||
        Object.hasOwn(claims,'cnf')||
        (atomic&&(!uuidPattern.test(claims.orbit_grant_id||'')||
          !Number.isSafeInteger(claims.orbit_grant_epoch)||
          claims.orbit_grant_epoch<1))||
        claims.role!=='authenticated'||claims.token_use!=='access'||
        claims.scope!=='tasks:read'||
        !Number.isSafeInteger(claims.exp)||!Number.isSafeInteger(claims.iat)||
        claims.exp<=seconds||claims.iat>seconds+30||claims.iat<0||
        claims.exp<=claims.iat||claims.exp-claims.iat>MAX_TTL_SECONDS||
        (claims.nbf!==undefined && (!Number.isSafeInteger(claims.nbf)||
          claims.nbf>seconds||claims.nbf<0)))denied();
      const context=Object.freeze({issuer,subject:claims.sub,clientId:claims.client_id,
        jti:claims.jti,scopes:Object.freeze(['tasks:read']),expiresAt:claims.exp,
        ...(atomic ? {resource,issuedAt:claims.iat,
          grantId:claims.orbit_grant_id,grantEpoch:claims.orbit_grant_epoch} : {})});
      // A single transactionally coherent consent+revocation decision avoids
      // the split-hook consistency gap. Legacy two-port source callers remain
      // supported but must not be combined with the atomic path.
      if(atomic){
        if(await authorizeGrant(context)!==true)denied();
      }else{
        if(await isRevoked(context)!==false)denied();
        if(await hasConsent(context)!==true)denied();
      }
      return Object.freeze({...claims});
    } catch { denied(); } // No token, cryptographic/key or backend detail leaks.
  };
}

/** Separate one-time proof/state replay guard. verifyProof MUST first verify
 * the proof's signature, method and URI binding. consume MUST be atomic
 * across instances and persist until expiry. Not invoked for Bearer tokens.
 */
export function createOneTimeProofGate({verifyProof,consume,clock=Date.now}={}) {
  if(typeof verifyProof!=='function'||typeof consume!=='function'||
    typeof clock!=='function')denied();
  return async function checkProof(proof,{method,resource}={}){
    try {
      exactHttps(resource);
      if(typeof method!=='string'||!['GET','POST'].includes(method))denied();
      const verified=await verifyProof(proof);
      const now=clock(),seconds=Math.floor(now/1000);
      if(!Number.isSafeInteger(now)||!plain(verified)||
        !tokenIdPattern.test(verified.jti||'')||
        !Number.isSafeInteger(verified.iat)||
        verified.iat<seconds-300||verified.iat>seconds+30||
        verified.method!==method||verified.resource!==resource)denied();
      const replayKey='mcp-proof:'+method+':'+resource+':'+verified.jti;
      if(await consume(replayKey,{expiresAt:Math.max(seconds,verified.iat)+300})!==true)denied();
      return true;
    }catch{denied();}
  };
}
