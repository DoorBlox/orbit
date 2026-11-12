/** BP-15: pinned RFC 8414 issuer metadata + JWKS loader (Node only).
 * Offline until a separately approved server invokes it. Never use JWT jku/x5u,
 * user-controlled issuer URLs, ambient credentials, redirects or stale key fallback.
 */
import {createPublicKey} from 'node:crypto';
import {isIP} from 'node:net';

const fail=()=>{throw Error('MCP_JWKS_DENIED');};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const kid=/^[A-Za-z0-9_-]{1,64}$/;
const b64=/^[A-Za-z0-9_-]+$/;

function pinnedHttps(value){
  if(typeof value!=='string')fail();
  let url;
  try{url=new URL(value);}catch{fail();}
  const host=url.hostname.toLowerCase();
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
    url.href!==value||url.port||url.origin==='null'||!host||isIP(host)||
    host.startsWith('[')||host==='localhost'||host.endsWith('.localhost')||
    host.endsWith('.local')||host.endsWith('.internal'))fail();
  return url;
}

/** RFC 8414 inserts the well-known path before any issuer path component. */
export function rfc8414MetadataUri(issuer){
  const url=pinnedHttps(issuer);
  const path=url.pathname==='/'?'':url.pathname.replace(/\/$/,'');
  return url.origin+'/.well-known/oauth-authorization-server'+path;
}

function validateJwks(input){
  if(!plain(input)||!Array.isArray(input.keys)||input.keys.length<1||
    input.keys.length>12)fail();
  const seen=new Set(),publicKeys=[];
  for(const k of input.keys){
    if(!plain(k)||!kid.test(k.kid||'')||seen.has(k.kid)||
      k.kty!=='RSA'||k.use!=='sig'||k.alg!=='RS256'||k.e!=='AQAB'||
      typeof k.n!=='string'||!b64.test(k.n)||
      (k.key_ops!==undefined&&(!Array.isArray(k.key_ops)||
        k.key_ops.length!==1||k.key_ops[0]!=='verify'))||
      Object.keys(k).some(field=>!['kid','kty','use','alg','n','e','key_ops'].includes(field)))
      fail();
    let key;
    try{key=createPublicKey({format:'jwk',key:{kty:'RSA',n:k.n,e:k.e}});}
    catch{fail();}
    const bits=key.asymmetricKeyDetails?.modulusLength;
    if(key.asymmetricKeyType!=='rsa'||!Number.isSafeInteger(bits)||
      bits<2048||bits>8192)fail();
    seen.add(k.kid);
    publicKeys.push(Object.freeze({
      kid:k.kid,kty:'RSA',use:'sig',alg:'RS256',n:k.n,e:'AQAB',
      ...(k.key_ops?{key_ops:Object.freeze(['verify'])}:{}),
    }));
  }
  return Object.freeze({keys:Object.freeze(publicKeys)});
}

async function fetchPinnedJson(fetcher,url,limit,timeoutMs){
  const controller=new AbortController();
  const timeout=AbortSignal.timeout(timeoutMs);
  const signal=AbortSignal.any([controller.signal,timeout]);
  try{
    const res=await fetcher(url,{
      method:'GET',redirect:'error',credentials:'omit',cache:'no-store',
      referrerPolicy:'no-referrer',headers:{accept:'application/json'},
      signal,
    });
    if(!res||res.status!==200||res.redirected===true||
      (typeof res.url==='string'&&res.url!==''&&res.url!==url)||
      !res.headers||typeof res.headers.get!=='function')fail();
    const mime=res.headers.get('content-type')||'';
    if(!/^application\/(?:json|jwk-set\+json)\s*(?:;|$)/i.test(mime))fail();
    const len=res.headers.get('content-length');
    if(len!==null&&(!/^\d+$/.test(len)||Number(len)>limit))fail();
    const reader=res.body?.getReader?.();
    if(!reader)fail();
    const chunks=[];let size=0;
    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      if(!(value instanceof Uint8Array))fail();
      size+=value.byteLength;
      if(size>limit)fail(); // Prevent unbounded JSON downloads.
      chunks.push(value);
    }
    if(size<2)fail();
    let obj;
    try{obj=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(
      Buffer.concat(chunks,size)));}catch{fail();}
    if(!plain(obj))fail();
    return obj;
  }finally{controller.abort();}
}

/** Bound to independently configured trusted issuer and *exact* jwksUri.
 * Unknown kid triggers at most one forced refresh per cooldown. Concurrent
 * requests share refresh. Expired cache is never used on an upstream error.
 */
export function createPinnedIssuerJwksLoader({
  issuer,jwksUri,fetcher=fetch,clock=Date.now,ttlMs=60000,
  unknownKidRefreshMs=60000,timeoutMs=5000,
}={}){
  pinnedHttps(issuer);pinnedHttps(jwksUri);
  const metadataUri=rfc8414MetadataUri(issuer);
  if(typeof fetcher!=='function'||typeof clock!=='function'||
    !Number.isSafeInteger(ttlMs)||ttlMs<1000||ttlMs>300000||
    !Number.isSafeInteger(unknownKidRefreshMs)||unknownKidRefreshMs<1000||
    unknownKidRefreshMs>300000||
    !Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>10000)fail();
  let cached=null,inflight=null,lastUnknownRefresh=-Infinity;
  const time=()=>{
    const value=clock();
    if(!Number.isSafeInteger(value)||value<0)fail();
    return value;
  };
  async function refresh(){
    if(inflight)return inflight;
    inflight=(async()=>{
      const metadata=await fetchPinnedJson(fetcher,metadataUri,16384,timeoutMs);
      // RFC 8414 issuer must match exactly; do not silently process
      // signed_metadata without independently verifying its signature.
      if(metadata.issuer!==issuer||metadata.jwks_uri!==jwksUri||
        Object.hasOwn(metadata,'signed_metadata'))fail();
      const raw=await fetchPinnedJson(fetcher,jwksUri,65536,timeoutMs);
      const keys=validateJwks(raw);
      const at=time();
      const candidate=Object.freeze({keys,at,expiresAt:at+ttlMs});
      cached=candidate; // Only publish after BOTH trusted responses validate.
      return candidate;
    })();
    try{return await inflight;}finally{inflight=null;}
  }
  return Object.freeze({
    async loadJwks({issuer:requestedIssuer,kid:requestedKid}={}){
      try{
        if(requestedIssuer!==issuer||
          (requestedKid!==undefined&&!kid.test(requestedKid)))fail();
        const current=time();
        let justRefreshed=false;
        let state=cached;
        if(!state||current<state.at||current>=state.expiresAt){
          state=await refresh();
          justRefreshed=true;
        }
        if(requestedKid&&!state.keys.keys.some(k=>k.kid===requestedKid)){
          // Unauthenticated kid must never trigger an unbounded fetch storm.
          if(!justRefreshed&&time()-lastUnknownRefresh>=unknownKidRefreshMs){
            lastUnknownRefresh=time();
            state=await refresh();
          }
          if(!state.keys.keys.some(k=>k.kid===requestedKid))fail();
        }
        return state.keys;
      }catch{fail();} // No issuer metadata, internal network or key data leak.
    },
  });
}
