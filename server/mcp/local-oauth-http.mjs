/** BP-15: disposable, loopback-only OAuth authorization-code HTTP acceptance.
 * Test-only. Owner sessions are minted through a trusted in-process API,
 * never through an untrusted HTTP login or an owner-selecting parameter.
 * No hosted OAuth, user credentials, public listener, or Production imports.
 */
import {createServer} from 'node:http';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {createDurableLocalPkce} from './durable-local-oauth-pkce.mjs';

const CLIENT='fixture-local-client';
const REDIRECT='http://127.0.0.1:8765/oauth/callback';
const COOKIE='orbit_local_session',MAX_BODY=8192;
const secretRe=/^[A-Za-z0-9_-]{43}$/,stateRe=/^[A-Za-z0-9._~-]{16,128}$/;
const random=()=>randomBytes(32).toString('base64url');
const hash=x=>createHash('sha256').update(x).digest('hex');
const fail=()=>{throw Error('LOCAL_OAUTH_DENIED');};
const equal=(a,b)=>{
  if(typeof a!=='string'||typeof b!=='string'||!secretRe.test(a)||!secretRe.test(b))
    return false;
  return timingSafeEqual(Buffer.from(a),Buffer.from(b));
};
const securityHeaders={
  'cache-control':'no-store','pragma':'no-cache',
  'referrer-policy':'no-referrer','x-content-type-options':'nosniff',
  'x-frame-options':'DENY',
  'content-security-policy':"default-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'",
};
function send(res,status,body='',headers={}){
  const content=typeof body==='string'?body:JSON.stringify(body);
  res.writeHead(status,{...securityHeaders,
    'content-type':typeof body==='string'?'text/plain; charset=utf-8':'application/json; charset=utf-8',
    'content-length':Buffer.byteLength(content),...headers});
  res.end(content);
}
const reject=(res,status,reason='invalid_request')=>send(res,status,{error:reason});
const htmlEscape=s=>String(s).replace(/[&<>"']/g,c=>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function strictParams(input,allowed,required=allowed){
  const p=new URLSearchParams(input),names=[...p.keys()];
  if(names.length>allowed.length||new Set(names).size!==names.length||
    names.some(name=>!allowed.includes(name))||required.some(name=>!p.has(name)))fail();
  return p;
}
async function readForm(req){
  if((req.headers['content-type']||'').split(';')[0].trim().toLowerCase()!==
    'application/x-www-form-urlencoded')return null;
  const announced=Number(req.headers['content-length']);
  if(Number.isFinite(announced)&&announced>MAX_BODY)fail();
  let bytes=0;const chunks=[];
  for await(const chunk of req){
    bytes+=chunk.length;if(bytes>MAX_BODY)fail();chunks.push(chunk);
  }
  return Buffer.concat(chunks,bytes).toString('utf8');
}
function cookieSession(header,sessions,now){
  if(typeof header!=='string'||header.length>512)return null;
  const matches=header.split(';').map(s=>s.trim())
    .filter(s=>s.startsWith(COOKIE+'='));
  if(matches.length!==1)return null;
  const raw=matches[0].slice(COOKIE.length+1);
  if(!secretRe.test(raw))return null;
  const key=hash(raw),value=sessions.get(key);
  return value&&now()<value.expiresAt?{...value,key}:null;
}

export async function startLocalOAuthHttpFixture({
  fixture,ledger,refreshBindingKey,clock=Date.now,
}={}){
  if(typeof fixture?.trustedIssueForEpoch!=='function'||
    typeof ledger?.revokeRefresh!=='function'||
    typeof ledger?.readAuthorizationSnapshot!=='function'||
    !Buffer.isBuffer(refreshBindingKey)||refreshBindingKey.length!==32||
    typeof clock!=='function')fail();
  const grant=fixture.grantIdentity,owners=fixture.ownerIds;
  if(grant?.clientId!==CLIENT||typeof grant.issuer!=='string'||
    typeof grant.resource!=='string'||!owners||typeof owners!=='object')fail();
  const resource=grant.resource,flow=createDurableLocalPkce({fixture,ledger,clock});
  const bindingKey=Buffer.from(refreshBindingKey);
  const sessions=new Map(),pending=new Map();
  const now=()=>{
    const ms=clock();if(!Number.isSafeInteger(ms)||ms<0)fail();return ms;
  };
  const sign=(purpose,body)=>createHmac('sha256',bindingKey)
    .update('ORBIT-LOCAL-'+purpose+'-v1:'+body).digest('base64url');
  function pack(purpose,owner,raw){
    if(!Object.hasOwn(owners,owner)||!secretRe.test(raw))fail();
    const body=Buffer.from(JSON.stringify([1,owner,raw])).toString('base64url');
    return body+'.'+sign(purpose,body);
  }
  function unpack(purpose,value){
    if(typeof value!=='string'||value.length>512)fail();
    const parts=value.split('.');
    if(parts.length!==2||!/^[A-Za-z0-9_-]{1,400}$/.test(parts[0])||
      !secretRe.test(parts[1])||!equal(parts[1],sign(purpose,parts[0])))fail();
    const decoded=Buffer.from(parts[0],'base64url');
    if(decoded.toString('base64url')!==parts[0])fail();
    const a=JSON.parse(decoded.toString('utf8'));
    if(!Array.isArray(a)||a.length!==3||a[0]!==1||
      typeof a[1]!=='string'||!Object.hasOwn(owners,a[1])||
      typeof a[2]!=='string'||!secretRe.test(a[2]))fail();
    return {owner:a[1],raw:a[2]};
  }
  let port=0,lastMinute=-1,requests=0;
  const origin=()=> 'http://127.0.0.1:'+port;
  function preflight(req,res){
    const counts=new Map(),headers=req.rawHeaders||[];
    for(let i=0;i<headers.length;i+=2){
      const name=headers[i].toLowerCase();
      counts.set(name,(counts.get(name)||0)+1);
    }
    if(['host','origin','cookie','content-type'].some(n=>(counts.get(n)||0)>1)||
      counts.get('host')!==1||req.headers.host!=='127.0.0.1:'+port||
      (req.headers.origin!==undefined&&req.headers.origin!==origin())||
      typeof req.url!=='string'||!req.url.startsWith('/')||req.url.startsWith('//')){
      reject(res,403,'access_denied');return false;
    }
    const minute=Math.floor(now()/60000);
    if(minute!==lastMinute){lastMinute=minute;requests=0;}
    if(++requests>250){reject(res,429,'temporarily_unavailable');return false;}
    return true;
  }
  function requireSession(req,res){
    const s=cookieSession(req.headers.cookie,sessions,now);
    if(!s)reject(res,401,'login_required');
    return s;
  }
  function redirect(res,location){send(res,303,'',{location});}
  async function handle(req,res){
    if(!preflight(req,res)){req.resume();return;}
    let parsed;
    try{parsed=new URL(req.url,origin());}catch{reject(res,400);return;}
    const path=parsed.pathname;
    if(path==='/authorize'){
      if(req.method!=='GET'){reject(res,405);return;}
      const session=requireSession(req,res);if(!session)return;
      let q;
      try{
        q=strictParams(parsed.searchParams,['client_id','redirect_uri',
          'response_type','scope','code_challenge','code_challenge_method',
          'state','resource']);
        if(q.get('client_id')!==CLIENT||q.get('redirect_uri')!==REDIRECT||
          q.get('response_type')!=='code'||q.get('scope')!=='tasks:read'||
          q.get('code_challenge_method')!=='S256'||q.get('resource')!==resource||
          !secretRe.test(q.get('code_challenge')||'')||
          !stateRe.test(q.get('state')||''))fail();
      }catch{reject(res,400);return;}
      if(pending.size>=64){reject(res,429);return;}
      const consentId=random(),csrf=random();
      pending.set(hash(consentId),{
        sessionKey:session.key,owner:session.owner,csrf,
        request:Object.fromEntries(q),expiresAt:now()+120000,
      });
      const html='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
        '<title>ORBIT synthetic consent</title></head><body><main>'+
        '<h1>Test-only OAuth consent</h1><p>Client '+htmlEscape(CLIENT)+
        ' requests <strong>tasks:read</strong> for resource '+
        htmlEscape(resource)+'.</p>'+
        '<p>No journals or write tools are authorized.</p>'+
        '<form method="post" action="/consent">'+
        '<input type="hidden" name="consent_id" value="'+consentId+'">'+
        '<input type="hidden" name="csrf" value="'+csrf+'">'+
        '<button type="submit" name="decision" value="approve">Allow read-only tasks</button>'+
        '<button type="submit" name="decision" value="deny">Deny</button>'+
        '</form></main></body></html>';
      send(res,200,html,{'content-type':'text/html; charset=utf-8'});
      return;
    }
    if(path==='/consent'){
      if(req.method!=='POST'){reject(res,405);return;}
      if(req.headers.origin!==origin()){reject(res,403,'access_denied');return;}
      const session=requireSession(req,res);if(!session)return;
      let p;
      try{
        const input=await readForm(req);if(input===null){reject(res,415);return;}
        p=strictParams(input,['consent_id','csrf','decision']);
      }catch{reject(res,400);return;}
      if(!secretRe.test(p.get('consent_id')||'')){reject(res,403,'access_denied');return;}
      const key=hash(p.get('consent_id')),record=pending.get(key);
      pending.delete(key);
      if(!record||record.sessionKey!==session.key||record.owner!==session.owner||
        record.expiresAt<=now()||!equal(p.get('csrf'),record.csrf)||
        !['approve','deny'].includes(p.get('decision'))){
        reject(res,403,'access_denied');return;
      }
      const state=record.request.state;
      if(p.get('decision')==='deny'){
        const destination=new URL(REDIRECT);
        destination.searchParams.set('error','access_denied');
        destination.searchParams.set('state',state);
        redirect(res,destination.href);return;
      }
      try{
        const r=await flow.authorize({
          owner:record.owner,clientId:record.request.client_id,
          redirectUri:record.request.redirect_uri,scope:record.request.scope,
          state,codeChallenge:record.request.code_challenge,consent:true,
        });
        const destination=new URL(r.redirectUri);
        destination.searchParams.set('code',pack('CODE',record.owner,r.code));
        redirect(res,destination.href);
      }catch{reject(res,503,'temporarily_unavailable');}
      return;
    }
    if(path==='/token'){
      if(req.method!=='POST'){reject(res,405);return;}
      if(parsed.search){reject(res,404);return;}
      let p;
      try{
        const input=await readForm(req);if(input===null){reject(res,415);return;}
        p=strictParams(input,['grant_type','client_id','redirect_uri','code',
          'code_verifier','resource','refresh_token'],
          ['grant_type','client_id','resource']);
        if(p.get('client_id')!==CLIENT||p.get('resource')!==resource)fail();
      }catch{reject(res,400);return;}
      if(p.get('grant_type')==='authorization_code'){
        const fields=['grant_type','client_id','redirect_uri','code',
          'code_verifier','resource'];
        if([...p.keys()].sort().join(',')!==fields.sort().join(',')){
          reject(res,400);return;
        }
        try{
          const {owner,raw}=unpack('CODE',p.get('code'));
          const tokens=await flow.exchange({
            grantType:'authorization_code',clientId:CLIENT,
            redirectUri:p.get('redirect_uri'),code:raw,
            codeVerifier:p.get('code_verifier'),
          });
          send(res,200,{...tokens,
            refresh_token:pack('REFRESH',owner,tokens.refresh_token)});
        }catch{reject(res,400,'invalid_grant');}
        return;
      }
      if(p.get('grant_type')==='refresh_token'){
        const fields=['grant_type','client_id','resource','refresh_token'];
        if([...p.keys()].sort().join(',')!==fields.sort().join(',')){
          reject(res,400);return;
        }
        try{
          const {owner,raw}=unpack('REFRESH',p.get('refresh_token'));
          const tokens=await flow.refresh({grantType:'refresh_token',
            clientId:CLIENT,owner,refreshToken:raw});
          send(res,200,{...tokens,
            refresh_token:pack('REFRESH',owner,tokens.refresh_token)});
        }catch{reject(res,400,'invalid_grant');}
        return;
      }
      reject(res,400,'unsupported_grant_type');return;
    }
    if(path==='/revoke'){
      if(req.method!=='POST'){reject(res,405);return;}
      if(parsed.search){reject(res,404);return;}
      let p;
      try{
        const input=await readForm(req);if(input===null){reject(res,415);return;}
        p=strictParams(input,['client_id','token']);
        if(p.get('client_id')!==CLIENT)fail();
      }catch{reject(res,400);return;}
      try{
        const {owner,raw}=unpack('REFRESH',p.get('token'));
        await ledger.revokeRefresh({
          ...grant,ownerId:owners[owner],refreshToken:raw,
        });
      }catch(e){
        // OAuth token-revocation endpoint must not disclose token existence.
        // Actual ledger corruption/outage is a failure, never false success.
        if(e?.message==='MCP_LEDGER_DENIED'){
          reject(res,503,'temporarily_unavailable');return;
        }
      }
      send(res,200,'');return;
    }
    reject(res,404);
  }
  const server=createServer(async(req,res)=>{
    try{await handle(req,res);}
    catch{
      if(!res.headersSent)reject(res,400);
      else res.end();
    }
  });
  server.requestTimeout=10000;server.headersTimeout=10000;
  server.keepAliveTimeout=5000;server.maxRequestsPerSocket=200;
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>{
      server.removeListener('error',reject);resolve();
    });
  });
  port=server.address().port;
  return Object.freeze({
    origin:origin(),resource,issuer:grant.issuer,
    mintSyntheticSession(owner){
      if(typeof owner!=='string'||!Object.hasOwn(owners,owner)||
        sessions.size>=32)fail();
      const value=random();
      sessions.set(hash(value),{owner,expiresAt:now()+300000});
      // Cookie flags shown for documentation; actual login is NOT HTTP.
      return Object.freeze({cookie:COOKIE+'='+value,
        setCookie:COOKIE+'='+value+'; HttpOnly; SameSite=Strict; Path=/'});
    },
    async close(){await new Promise((resolve,reject)=>
      server.close(e=>e?reject(e):resolve()));},
  });
}
