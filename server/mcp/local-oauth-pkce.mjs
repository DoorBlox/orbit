/** Disposable test-only OAuth 2.1 PKCE flow; never expose authorize() as
 * unauthenticated HTTP. The caller is the trusted synthetic owner/consent UX.
 * Actual short-lived signed access JWTs use the existing private MCP fixture.
 */
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
const deny=()=>{throw Error('OAUTH_FIXTURE_DENIED');};
const CLIENT='fixture-local-client';
const REDIRECT='http://127.0.0.1:8765/oauth/callback';
const SCOPE='tasks:read';
const verifierPattern=/^[A-Za-z0-9._~-]{43,128}$/;
const secretPattern=/^[A-Za-z0-9_-]{43}$/;
const statePattern=/^[A-Za-z0-9._~-]{16,128}$/;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  Object.getPrototypeOf(x)===Object.prototype;
const sha=x=>createHash('sha256').update(x).digest('hex');
const secret=()=>randomBytes(32).toString('base64url');

export function createDisposableOAuthPkce({fixture,clock=Date.now}={}){
  if(typeof fixture?.tokenFor!=='function'||typeof fixture?.revoke!=='function'||
     typeof fixture?.regrant!=='function'||!plain(fixture.ownerIds)||
     typeof clock!=='function')deny();
  const known=new Set(Object.keys(fixture.ownerIds));
  const codes=new Map(),activeRefresh=new Map(),usedRefresh=new Map(),owners=new Map();
  const now=()=>{
    const n=clock();
    if(!Number.isSafeInteger(n)||n<0)deny();
    return n;
  };
  const owner=label=>{
    if(typeof label!=='string'||!known.has(label))deny();
    return label;
  };
  function clearOwner(label){
    for(const [key,row] of codes)if(row.label===label)codes.delete(key);
    for(const [key,row] of activeRefresh)if(row.label===label)activeRefresh.delete(key);
    for(const [key,row] of usedRefresh)if(row.label===label)usedRefresh.delete(key);
  }
  function grant(label,generation){
    const current=owners.get(label);
    if(current?.generation!==generation||current?.active!==true)deny();
    const refreshToken=secret();
    activeRefresh.set(sha(refreshToken),{label,generation,expiry:now()+3600_000});
    return Object.freeze({access_token:fixture.tokenFor(label),refresh_token:refreshToken,
      token_type:'Bearer',expires_in:300,scope:SCOPE});
  }
  function disconnect(label){
    owner(label);
    const prior=owners.get(label);
    owners.set(label,{active:false,generation:(prior?.generation||0)+1});
    clearOwner(label);
    fixture.revoke(label);
    return true;
  }
  return Object.freeze({
    authorize(req){
      if(!plain(req)||!known.has(req.owner)||req.clientId!==CLIENT||
        req.redirectUri!==REDIRECT||req.scope!==SCOPE||
        typeof req.state!=='string'||!statePattern.test(req.state)||
        typeof req.codeChallenge!=='string'||!secretPattern.test(req.codeChallenge))deny();
      if(req.consent!==true)return Object.freeze({approved:false});
      if(codes.size>=256||activeRefresh.size>=256)deny();
      clearOwner(req.owner);
      fixture.regrant(req.owner);
      const generation=(owners.get(req.owner)?.generation||0)+1;
      owners.set(req.owner,{active:true,generation});
      const code=secret(),callback=new URL(REDIRECT);
      codes.set(sha(code),{label:req.owner,generation,expiry:now()+60_000,
        challenge:req.codeChallenge,clientId:CLIENT,redirectUri:REDIRECT});
      callback.searchParams.set('code',code);
      callback.searchParams.set('state',req.state);
      return Object.freeze({approved:true,code,state:req.state,redirectUri:callback.href});
    },
    exchange(req){
      if(!plain(req)||req.grantType!=='authorization_code'||
        typeof req.code!=='string'||!secretPattern.test(req.code))deny();
      const key=sha(req.code),data=codes.get(key);
      // Consume before validation: one-time codes cannot be brute-forced.
      codes.delete(key);
      if(!data||req.clientId!==data.clientId||req.redirectUri!==data.redirectUri||
        typeof req.codeVerifier!=='string'||!verifierPattern.test(req.codeVerifier)||
        now()>=data.expiry)deny();
      const actual=createHash('sha256').update(req.codeVerifier).digest();
      const expected=Buffer.from(data.challenge,'base64url');
      if(expected.length!==32||!timingSafeEqual(actual,expected))deny();
      return grant(data.label,data.generation);
    },
    refresh(req){
      if(!plain(req)||req.grantType!=='refresh_token'||req.clientId!==CLIENT||
        typeof req.refreshToken!=='string'||!secretPattern.test(req.refreshToken))deny();
      const key=sha(req.refreshToken),replayed=usedRefresh.get(key);
      if(replayed){
        if(owners.get(replayed.label)?.generation===replayed.generation)
          disconnect(replayed.label);
        deny();
      }
      const data=activeRefresh.get(key);
      if(!data||now()>=data.expiry)deny();
      activeRefresh.delete(key);
      if(owners.get(data.label)?.generation!==data.generation||
        owners.get(data.label)?.active!==true)deny();
      usedRefresh.set(key,{label:data.label,generation:data.generation});
      if(usedRefresh.size>256)usedRefresh.delete(usedRefresh.keys().next().value);
      return grant(data.label,data.generation);
    },
    disconnect,
  });
}
