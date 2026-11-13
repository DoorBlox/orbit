/** BP-15 synthetic CIMD policy. No network I/O, DNS resolution, external
 * redirects, or production client registration. Authoritative per-use
 * HTTPS document contents are injected by a test-only pinned Map.
 * Real HTTPS fetching requires separate DNS/IP pinning and egress review.
 */
import {isIP} from 'node:net';

const denied=()=>{throw Error('MCP_CIMD_DENIED');};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  Object.getPrototypeOf(x)===Object.prototype;
const simpleClient=/^[A-Za-z0-9_-]{1,128}$/;
const safePath=/^\/[A-Za-z0-9/_-]{1,240}\.json$/;
export function isCimdClientId(value){
  if(typeof value!=='string'||value.length<20||value.length>512)return false;
  let u;
  try{u=new URL(value);}catch{return false;}
  return u.href===value&&u.protocol==='https:'&&u.port===''&&
    !u.username&&!u.password&&!u.search&&!u.hash&&
    u.hostname.includes('.')&&isIP(u.hostname)===0&&
    safePath.test(u.pathname)&&!u.pathname.includes('//')&&
    !u.pathname.includes('/../')&&!u.pathname.includes('/./');
}
export function validMcpClientId(value,{allowCimdClientIds=false}={}){
  return typeof value==='string'&&
    (simpleClient.test(value)||(allowCimdClientIds===true&&isCimdClientId(value)));
}
function validRedirect(value){
  if(typeof value!=='string'||value.length>512)return false;
  let u;
  try{u=new URL(value);}catch{return false;}
  if(u.href!==value||u.username||u.password||u.hash||u.search||
    u.pathname==='/'||u.origin==='null')return false;
  return u.protocol==='https:'||(u.protocol==='http:'&&
    u.hostname==='127.0.0.1'&&u.port!==''&&Number(u.port)>0);
}
/** The test fixture can resolve ONLY explicitly trusted HTTPS origins and
 * ONLY documents already supplied in memory. Never substitute fetch() here:
 * a real network adapter must block special-use IPs after *every* DNS lookup,
 * pin the connected address, disallow redirects and enforce egress policy.
 */
export function createPinnedCimdRegistry({documents,trustedOrigins,allowedRedirectUris}={}){
  if(!(documents instanceof Map)||documents.size<1||documents.size>8||
    !Array.isArray(trustedOrigins)||trustedOrigins.length<1||
    trustedOrigins.length>8||!Array.isArray(allowedRedirectUris)||
    allowedRedirectUris.length<1||allowedRedirectUris.length>8)denied();
  const origins=new Set();
  for(const origin of trustedOrigins){
    if(typeof origin!=='string')denied();
    let u;
    try{u=new URL(origin);}catch{denied();}
    if(u.origin!==origin||u.href!==origin+'/'||u.protocol!=='https:'||
      u.port!==''||!u.hostname.includes('.')||isIP(u.hostname)!==0||
      origins.has(origin))denied();
    origins.add(origin);
  }
  const redirects=new Set();
  for(const redirect of allowedRedirectUris){
    if(!validRedirect(redirect)||redirects.has(redirect))denied();
    redirects.add(redirect);
  }
  for(const clientId of documents.keys())
    if(!isCimdClientId(clientId)||!origins.has(new URL(clientId).origin))denied();
  return Object.freeze({
    async resolve({clientId,redirectUri}={}){
      if(!isCimdClientId(clientId)||!origins.has(new URL(clientId).origin)||
        !redirects.has(redirectUri))denied();
      // No DNS, socket, HTTP request, redirect handling, proxy or URL-derived
      // network address: this read is an in-memory, trusted test projection.
      const doc=documents.get(clientId);
      if(!plain(doc)||Buffer.byteLength(JSON.stringify(doc))>8192||
        Object.keys(doc).some(k=>![
          'client_id','client_name','redirect_uris','grant_types',
          'response_types','token_endpoint_auth_method','application_type',
        ].includes(k))||
        doc.client_id!==clientId||typeof doc.client_name!=='string'||
        doc.client_name.length<1||doc.client_name.length>120||
        /[\x00-\x1f\x7f<>]/.test(doc.client_name)||
        !Array.isArray(doc.redirect_uris)||doc.redirect_uris.length<1||
        doc.redirect_uris.length>8||
        new Set(doc.redirect_uris).size!==doc.redirect_uris.length||
        doc.redirect_uris.some(uri=>!validRedirect(uri)||!redirects.has(uri))||
        !doc.redirect_uris.includes(redirectUri)||
        !Array.isArray(doc.grant_types)||doc.grant_types.length!==2||
        !doc.grant_types.includes('authorization_code')||
        !doc.grant_types.includes('refresh_token')||
        !Array.isArray(doc.response_types)||doc.response_types.length!==1||
        doc.response_types[0]!=='code'||
        doc.token_endpoint_auth_method!=='none'||
        (doc.application_type!==undefined&&doc.application_type!=='native'))denied();
      return Object.freeze({clientId,clientName:doc.client_name,
        redirectUri,redirectHost:new URL(redirectUri).hostname});
    },
  });
}
