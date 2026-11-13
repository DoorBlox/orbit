/** Unwired Node 22 HTTPS transport ports for an APPROVED future CIMD fetcher.
 * No route or runtime imports this module, and constructing real DNS/HTTPS
 * ports needs explicit authorization plus an exact host/origin allowlist.
 * Offline unit tests inspect the pinned request and TLS contract; they do
 * NOT connect to the Internet or certify a deployed egress firewall.
 */
import {Resolver} from 'node:dns/promises';
import {request as httpsRequest} from 'node:https';
import {isIP} from 'node:net';
import {checkServerIdentity} from 'node:tls';
import {isCimdClientId} from './cimd-client-metadata.mjs';
import {isPublicCimdIp} from './cimd-https-retrieval.mjs';

const deny=()=>{throw Error('MCP_CIMD_TRANSPORT_DENIED');};
const hosts=values=>{
  if(!Array.isArray(values)||values.length<1||values.length>8||
    new Set(values).size!==values.length)deny();
  for(const host of values)
    if(typeof host!=='string'||
      !isCimdClientId('https://'+host+'/oauth/client.json')||
      new URL('https://'+host+'/').hostname!==host)deny();
  return new Set(values);
};
const origins=values=>{
  if(!Array.isArray(values)||values.length<1||values.length>8||
    new Set(values).size!==values.length)deny();
  for(const origin of values){
    if(typeof origin!=='string')deny();
    const url=new URL(origin);
    if(url.origin!==origin||url.href!==origin+'/'||
      !isCimdClientId(origin+'/oauth/client.json'))deny();
  }
  return new Set(values);
};
/** Optional source ports are inert until deliberately instantiated by a
 * future owner-approved network path. No default Node DNS adapter exists.
 * Resolve both A and AAAA; any unexpected resolver error fails closed.
 */
export function createNodeCimdDnsPort({
  explicitNetworkAuthorization=false,allowedHosts,
}={}){
  if(explicitNetworkAuthorization!==true)deny();
  const hostSet=hosts(allowedHosts);
  const resolver=new Resolver({timeout:800,tries:1});
  return async(hostname,{signal}={})=>{
    if(!hostSet.has(hostname)||signal?.aborted)deny();
    const results=await Promise.allSettled([
      resolver.resolve4(hostname),resolver.resolve6(hostname),
    ]);
    if(signal?.aborted)deny();
    const addresses=[];
    for(const row of results){
      if(row.status==='fulfilled'){
        if(!Array.isArray(row.value))deny();
        addresses.push(...row.value);
      }else if(!['ENODATA','ENOTFOUND'].includes(row.reason?.code)){
        deny();
      }
    }
    if(addresses.length<1||addresses.length>8)deny();
    return addresses;
  };
}
/** Contract-checked TLS endpoint. The chosen IP is injected as the ONLY
 * resolver answer for THIS connection: no DNS between validation and use.
 * Servername remains original hostname for SNI and CA/SAN verification.
 * No proxy agent, no connection pooling, no redirect-following mechanism.
 */
export function pinnedCimdRequestOptions(plan,allowedOrigins){
  const trusted=origins(allowedOrigins);
  if(plan===null||typeof plan!=='object'||Array.isArray(plan)||
    !isCimdClientId(plan.url))deny();
  const url=new URL(plan.url);
  if(!trusted.has(url.origin)||plan.hostname!==url.hostname||
    plan.servername!==url.hostname||plan.port!==443||
    plan.method!=='GET'||plan.allowRedirects!==false||
    plan.allowProxy!==false||!isPublicCimdIp(plan.address)||
    plan.family!==isIP(plan.address)||
    !Number.isSafeInteger(plan.maxBytes)||plan.maxBytes<128||
    plan.maxBytes>8192||!Number.isSafeInteger(plan.deadlineMs)||
    plan.deadlineMs<100||plan.deadlineMs>5000)deny();
  const lookup=(hostname,options,callback)=>{
    if(hostname!==url.hostname){callback(Error('MCP_CIMD_TRANSPORT_DENIED'));return;}
    if(options?.all===true){
      callback(null,[{address:plan.address,family:plan.family}]);return;
    }
    callback(null,plan.address,plan.family);
  };
  return Object.freeze({
    protocol:'https:',hostname:url.hostname,port:443,
    path:url.pathname,method:'GET',family:plan.family,agent:false,
    servername:url.hostname,rejectUnauthorized:true,checkServerIdentity,
    minVersion:'TLSv1.2',maxHeaderSize:4096,lookup,
    headers:Object.freeze({
      Host:url.hostname,Accept:'application/json',
      'Accept-Encoding':'identity',Connection:'close',
      'User-Agent':'ORBIT-CIMD-SOURCE-ONLY/1',
    }),
  });
}
/** Pure contract check before handling HTTP response data. An authenticated
 * TLS session on a different IP still fails; hostname certificate validity
 * is verified against the original client-document host, never a DNS alias.
 */
export function verifyPinnedCimdTlsPeer(socket,plan){
  if(socket?.authorized!==true||
    socket.remoteAddress!==plan?.address||
    typeof socket.getProtocol!=='function'||
    !['TLSv1.2','TLSv1.3'].includes(socket.getProtocol())||
    typeof socket.getPeerCertificate!=='function'||
    !isCimdClientId(plan?.url)||new URL(plan.url).hostname!==plan?.servername)
    deny();
  let certificate;
  try{certificate=socket.getPeerCertificate();}
  catch{deny();}
  if(!certificate||checkServerIdentity(plan.servername,certificate))
    deny();
  return true;
}
const validHeaders=(res,maxBytes)=>{
  const counts=new Map();
  for(let i=0;i<(res.rawHeaders||[]).length;i+=2){
    const k=String(res.rawHeaders[i]).toLowerCase();
    counts.set(k,(counts.get(k)||0)+1);
  }
  if(['content-length','content-type','content-encoding','location',
    'set-cookie','transfer-encoding'].some(k=>(counts.get(k)||0)>1))
    deny();
  const headers=res.headers||{};
  const contentType=headers['content-type'];
  if(res.statusCode!==200||typeof contentType!=='string'||
    !/^application\/json(?:;[ \t]*charset=utf-8)?$/i.test(contentType)||
    ![undefined,'identity'].includes(headers['content-encoding'])||
    headers.location!==undefined||headers['set-cookie']!==undefined)
    deny();
  if(headers['content-length']!==undefined){
    const n=headers['content-length'];
    if(typeof n!=='string'||!/^(?:0|[1-9][0-9]{0,5})$/.test(n)||
      Number(n)>maxBytes)deny();
  }
};
/** Actual core HTTPS implementation, NOT wired to server startup or hosted
 * OAuth. A deployer MUST additionally supply a separately reviewed firewall,
 * origin allowlist, DNS policy and explicit owner authorization. Node core
 * https.request uses NO environment-proxy auto-following here (agent:false).
 */
export function createNodeCimdHttpsPort({
  explicitNetworkAuthorization=false,allowedOrigins,
}={}){
  if(explicitNetworkAuthorization!==true)deny();
  const trusted=origins(allowedOrigins);
  return async(plan,{signal}={})=>{
    const options=pinnedCimdRequestOptions(plan,[...trusted]);
    if(signal?.aborted)deny();
    return new Promise((resolve,reject)=>{
      let settled=false;
      let timer,request;
      const finish=(error,value)=>{
        if(settled)return;
        settled=true;clearTimeout(timer);
        if(error)reject(Error('MCP_CIMD_TRANSPORT_DENIED'));
        else resolve(value);
      };
      const stop=()=>{
        request?.destroy();finish(true);
      };
      try{
        request=httpsRequest({...options,signal},response=>{
          let socket;
          try{
            socket=response.socket;
            verifyPinnedCimdTlsPeer(socket,plan);
            validHeaders(response,plan.maxBytes);
          }catch{
            response.destroy();stop();return;
          }
          const chunks=[];let bytes=0;
          response.on('data',chunk=>{
            bytes+=chunk.length;
            if(bytes>plan.maxBytes){response.destroy();stop();return;}
            chunks.push(chunk);
          });
          response.on('aborted',stop);
          response.on('error',stop);
          response.on('end',()=>{
            if(settled)return;
            const body=Buffer.concat(chunks,bytes);
            const declared=response.headers['content-length'];
            if(declared!==undefined&&Number(declared)!==body.length){
              stop();return;
            }
            finish(null,Object.freeze({
              requestUrl:plan.url,peerAddress:socket.remoteAddress,
              tlsHostname:plan.hostname,tlsAuthorized:true,
              tlsProtocol:socket.getProtocol(),followedRedirect:false,
              proxyUsed:false,statusCode:response.statusCode,
              headers:response.headers,body,
            }));
          });
        });
        request.on('error',stop);
        request.setTimeout(plan.deadlineMs,stop);
        timer=setTimeout(stop,plan.deadlineMs);
        request.end();
      }catch{stop();}
    });
  };
}
