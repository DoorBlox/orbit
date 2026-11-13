/** BP-15 experimental HTTPS CIMD retrieval policy.
 * NOT used by a hosted route. OFF by default; source-only test ports.
 * DNS results are checked as a set, then ONE validated IP is pinned
 * for a single HTTPS request. No fallback or second DNS lookup is allowed.
 */
import {BlockList,isIP} from 'node:net';
import {createPinnedCimdRegistry,isCimdClientId} from './cimd-client-metadata.mjs';

const deny=()=>{throw Error('MCP_CIMD_NETWORK_DENIED');};
const cidrs4=[
  ['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],
  ['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],
  ['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],
  ['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],
  ['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4],
  ['192.31.196.0',24],['192.175.48.0',24],
];
const cidrs6=[
  ['::',96],['::ffff:0:0',96],['64:ff9b::',96],
  ['64:ff9b:1::',48],['100::',64],['2001::',23],
  ['2001:db8::',32],['2002::',16],['3fff::',20],
  ['fc00::',7],['fe80::',10],['ff00::',8],
];
const blocked4=new BlockList(),blocked6=new BlockList(),global6=new BlockList();
for(const [addr,prefix] of cidrs4)blocked4.addSubnet(addr,prefix,'ipv4');
for(const [addr,prefix] of cidrs6)blocked6.addSubnet(addr,prefix,'ipv6');
global6.addSubnet('2000::',3,'ipv6');

/** Conservative IANA-special-use deny policy, PLUS a global IPv6-only gate.
 * Node net.BlockList parses addresses; no homegrown hexadecimal IP parser.
 * A deployment must additionally enforce an independent egress firewall.
 * Review these CIDR exclusions against the IANA registries before hosting.
 */
export function isPublicCimdIp(address){
  if(typeof address!=='string'||address.length>64||
    address!==address.trim()||address.includes('%'))return false;
  const family=isIP(address);
  if(family===4)return !blocked4.check(address,'ipv4');
  // Mapped/embedded IPv4 and incompatible transition formats are denied,
  // not transformed into a second address family after DNS validation.
  if(family!==6||address.includes('.'))return false;
  return global6.check(address,'ipv6')&&!blocked6.check(address,'ipv6');
}
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  (Object.getPrototypeOf(x)===Object.prototype||
    Object.getPrototypeOf(x)===null);
const exactOrigin=value=>{
  if(typeof value!=='string')deny();
  let u;
  try{u=new URL(value);}catch{deny();}
  if(u.href!==value+'/'||u.origin!==value||u.protocol!=='https:'||
    u.port!==''||u.username||u.password||u.search||u.hash||
    !isCimdClientId(value+'/oauth/client.json'))deny();
  return value;
};
function uniqueStrings(values,max){
  if(!Array.isArray(values)||values.length<1||values.length>max||
    values.some(x=>typeof x!=='string'||x.length>512)||
    new Set(values).size!==values.length)deny();
  return Object.freeze([...values]);
}
function vettedAnswers(records){
  if(!Array.isArray(records)||records.length<1||records.length>8)deny();
  const seen=new Set();
  const addresses=records.map(item=>{
    if(typeof item!=='string'||seen.has(item)||
      !isPublicCimdIp(item))deny();
    seen.add(item);
    return Object.freeze({address:item,family:isIP(item)});
  });
  return Object.freeze(addresses);
}
const contentTypeOK=x=>typeof x==='string'&&
  /^application\/json(?:;[ \t]*charset=utf-8)?$/i.test(x);
function validateTransportReply(reply,plan,maxBytes){
  if(!plain(reply)||reply.requestUrl!==plan.url||
    reply.peerAddress!==plan.address||
    reply.tlsHostname!==plan.hostname||
    reply.tlsAuthorized!==true||
    !['TLSv1.2','TLSv1.3'].includes(reply.tlsProtocol)||
    reply.followedRedirect!==false||reply.proxyUsed!==false||
    reply.statusCode!==200||!plain(reply.headers)||
    !Buffer.isBuffer(reply.body)||reply.body.length>maxBytes||
    !contentTypeOK(reply.headers['content-type'])||
    reply.headers.location!==undefined||
    reply.headers['set-cookie']!==undefined||
    ![undefined,'identity'].includes(reply.headers['content-encoding']))
    deny();
  if(reply.headers['content-length']!==undefined){
    const x=reply.headers['content-length'];
    if(typeof x!=='string'||!/^(?:0|[1-9][0-9]{0,5})$/.test(x)||
      Number(x)!==reply.body.length)deny();
  }
  return reply.body;
}
function abortable(promise,signal){
  return new Promise((resolve,reject)=>{
    if(signal.aborted){reject(Error('CIMD_ABORTED'));return;}
    const onAbort=()=>{signal.removeEventListener('abort',onAbort);
      reject(Error('CIMD_ABORTED'));};
    signal.addEventListener('abort',onAbort,{once:true});
    Promise.resolve(promise).then(
      x=>{signal.removeEventListener('abort',onAbort);resolve(x);},
      e=>{signal.removeEventListener('abort',onAbort);reject(e);},
    );
  });
}
/** Inert by default and NOT wired to any OAuth endpoint.
 * To exercise: explicitly inject synthetic resolver, pinned HTTPS port
 * and trusted egress policy. Future real network operations require a
 * separately owner-approved deployment and independently enforced firewall.
 *
 * resolveAll(hostname,{signal}) -> all A+AAAA address STRINGS (1..8).
 * requestPinned(frozenPlan,{signal}) -> bounded, TLS-verified response proof.
 * The port MUST connect only to plan.address (NEVER resolve hostname again),
 * verify CA and hostname at plan.servername, forbid redirects/proxies, and
 * terminate on the deadline BEFORE reading any disallowed HTTP body.
 */
export function createCimdHttpsRetrievalAdapter({
  enabled=false,trustedOrigins,allowedRedirectUris,
  resolveAll,requestPinned,egressPolicy,
  maxBytes=8192,deadlineMs=3000,maxConcurrent=2,
}={}){
  if(enabled!==true&&enabled!==false)deny();
  if(enabled!==true)return Object.freeze({resolve:async()=>deny()});
  const origins=uniqueStrings(trustedOrigins,8).map(exactOrigin);
  const redirects=uniqueStrings(allowedRedirectUris,8);
  if(typeof resolveAll!=='function'||typeof requestPinned!=='function'||
    typeof egressPolicy!=='function'||
    !Number.isSafeInteger(maxBytes)||maxBytes<128||maxBytes>8192||
    !Number.isSafeInteger(deadlineMs)||deadlineMs<100||deadlineMs>5000||
    !Number.isSafeInteger(maxConcurrent)||maxConcurrent<1||maxConcurrent>4)deny();
  const allowedOrigins=new Set(origins),allowedRedirects=new Set(redirects);
  let active=0;
  return Object.freeze({
    async resolve({clientId,redirectUri}={}){
      if(active>=maxConcurrent)deny();
      if(!isCimdClientId(clientId)||!allowedOrigins.has(new URL(clientId).origin)||
        !allowedRedirects.has(redirectUri))deny();
      active++;
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),deadlineMs);
      try{
        const url=new URL(clientId),hostname=url.hostname;
        const records=await abortable(resolveAll(hostname,{
          signal:controller.signal,
        }),controller.signal);
        const addresses=vettedAnswers(records);
        // Every returned address must be public AND permitted by trusted
        // egress policy. A single private/denied DNS answer denies the set.
        for(const answer of addresses){
          const accepted=await abortable(egressPolicy(Object.freeze({
            origin:url.origin,hostname,address:answer.address,
            family:answer.family,
          })),controller.signal);
          if(accepted!==true)deny();
        }
        const chosen=addresses[0];
        const plan=Object.freeze({
          url:clientId,hostname,port:443,servername:hostname,
          address:chosen.address,family:chosen.family,
          method:'GET',allowRedirects:false,allowProxy:false,
          maxBytes,deadlineMs,
        });
        const reply=await abortable(requestPinned(plan,{
          signal:controller.signal,
        }),controller.signal);
        if(controller.signal.aborted)deny();
        const body=validateTransportReply(reply,plan,maxBytes);
        let document;
        try{document=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body));}
        catch{deny();}
        // Reuse the exact existing owner/redirect/client-ID metadata contract.
        return await createPinnedCimdRegistry({
          documents:new Map([[clientId,document]]),
          trustedOrigins:origins,allowedRedirectUris:redirects,
        }).resolve({clientId,redirectUri});
      }catch{deny();}
      finally{clearTimeout(timer);active--;}
    },
  });
}
