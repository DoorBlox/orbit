/** BP-15 disposable persistent OAuth PKCE bridge for localhost tests ONLY.
 * The owner label is asserted by a TRUSTED TEST HARNESS; this is not a
 * browser-authenticated owner or a public OAuth HTTP authorization endpoint.
 * Access JWTs are issued by local-fixture signing keys, while their current
 * grant epoch/JTI consent and opaque refresh family live in a durable ledger.
 */
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {isCimdClientId} from './cimd-client-metadata.mjs';

const fail=()=>{throw Error('OAUTH_FIXTURE_DENIED');};
const STATIC_CLIENT='fixture-local-client';
const REDIRECT='http://127.0.0.1:8765/oauth/callback';
const statePattern=/^[A-Za-z0-9._~-]{16,128}$/;
const verifierPattern=/^[A-Za-z0-9._~-]{43,128}$/;
const b64_43=/^[A-Za-z0-9_-]{43}$/;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  Object.getPrototypeOf(x)===Object.prototype;
const digest=x=>createHash('sha256').update(x).digest('hex');
const random=()=>randomBytes(32).toString('base64url');

export function createDurableLocalPkce({fixture,ledger,clock=Date.now}={}){
  if(typeof fixture?.trustedIssueForEpoch!=='function'||
    !plain(fixture.grantIdentity)||!plain(fixture.ownerIds)||
    typeof ledger?.consent!=='function'||typeof ledger?.revoke!=='function'||
    typeof ledger?.readAuthorizationSnapshot!=='function'||
    typeof ledger?.issueRefresh!=='function'||
    typeof ledger?.rotateRefresh!=='function'||typeof clock!=='function')
    fail();
  const {issuer,resource,clientId}=fixture.grantIdentity;
  if((clientId!==STATIC_CLIENT&&!isCimdClientId(clientId))||
    typeof issuer!=='string'||typeof resource!=='string')
    fail();
  const CLIENT=clientId;
  const codes=new Map(); // Authorization codes remain one-time and non-durable.
  const now=()=>{
    const n=clock();
    if(!Number.isSafeInteger(n)||n<0)fail();
    return n;
  };
  const identity=label=>{
    if(typeof label!=='string'||!Object.hasOwn(fixture.ownerIds,label))fail();
    return Object.freeze({issuer,resource,clientId,ownerId:fixture.ownerIds[label]});
  };
  const validConsent=x=>{
    if(!plain(x)||x.clientId!==CLIENT||x.redirectUri!==REDIRECT||
      x.scope!=='tasks:read'||typeof x.state!=='string'||
      !statePattern.test(x.state)||typeof x.codeChallenge!=='string'||
      !b64_43.test(x.codeChallenge))fail();
    return identity(x.owner);
  };
  const access=async(label,grantEpoch,refreshToken)=>{
    if(!Number.isSafeInteger(grantEpoch)||grantEpoch<1||grantEpoch>2147483647||
      !b64_43.test(refreshToken))fail();
    // Sign only for the grant epoch returned by a committed store operation.
    const accessToken=fixture.trustedIssueForEpoch(label,grantEpoch);
    return Object.freeze({access_token:accessToken,token_type:'Bearer',
      expires_in:300,refresh_token:refreshToken,scope:'tasks:read'});
  };
  return Object.freeze({
    async authorize(req){
      try{
        const id=validConsent(req);
        if(req.consent!==true)return Object.freeze({approved:false});
        if(codes.size>=256)fail();
        const authorized=await ledger.consent(id);
        const code=random();
        for(const [key,row] of codes)
          if(row.owner===req.owner)codes.delete(key);
        codes.set(digest(code),{
          owner:req.owner,epoch:authorized.grantEpoch,
          clientId:CLIENT,redirectUri:REDIRECT,
          challenge:req.codeChallenge,expiresAt:now()+60_000,
        });
        const callback=new URL(REDIRECT);
        callback.searchParams.set('code',code);
        callback.searchParams.set('state',req.state);
        return Object.freeze({approved:true,code,
          state:req.state,redirectUri:callback.href});
      }catch{fail();}
    },
    async exchange(req){
      try{
        if(!plain(req)||req.grantType!=='authorization_code'||
          typeof req.code!=='string'||!b64_43.test(req.code))fail();
        const hash=digest(req.code),row=codes.get(hash);
        // A bad verifier/redirect consumes an authorization code too.
        codes.delete(hash);
        if(!row||req.clientId!==row.clientId||
          req.redirectUri!==row.redirectUri||
          typeof req.codeVerifier!=='string'||
          !verifierPattern.test(req.codeVerifier)||now()>=row.expiresAt)fail();
        const proof=createHash('sha256').update(req.codeVerifier).digest();
        const expected=Buffer.from(row.challenge,'base64url');
        if(expected.byteLength!==32||!timingSafeEqual(proof,expected))fail();
        const id=identity(row.owner);
        const snapshot=await ledger.readAuthorizationSnapshot({
          ...id,tokenId:'fixture-code-check-000001',
        });
        if(snapshot?.status!=='active'||snapshot.grantEpoch!==row.epoch)
          fail();
        const refresh=await ledger.issueRefresh(id);
        if(refresh.grantEpoch!==row.epoch)fail();
        return await access(row.owner,refresh.grantEpoch,
          refresh.refreshToken);
      }catch{fail();}
    },
    async refresh(req){
      try{
        if(!plain(req)||req.grantType!=='refresh_token'||
          req.clientId!==CLIENT||typeof req.refreshToken!=='string'||
          !b64_43.test(req.refreshToken))fail();
        // Owner selection is a trusted test-harness operation, never an
        // external login statement. A wrong owner ID cannot redeem a token.
        const id=identity(req.owner);
        const rotated=await ledger.rotateRefresh({
          ...id,refreshToken:req.refreshToken,
        });
        return await access(req.owner,rotated.grantEpoch,
          rotated.refreshToken);
      }catch{fail();}
    },
    async disconnect(owner){
      try{return await ledger.revoke(identity(owner));}
      catch{fail();}
    },
  });
}
