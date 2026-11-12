/** BP-15 disposable, file-backed consent + refresh-family adapter.
 * Only for local synthetic acceptance. NOT a production grant database, OAuth
 * issuer or HTTP entry point. Caller MUST independently authenticate owner.
 *
 * Linux/POSIX local filesystem contract: private 0700 directory, 0600 files;
 * exclusive directory lock, bounded waits (an abandoned lock denies access),
 * fsync(temp) -> atomic rename -> fsync(directory). Every read takes the same
 * lock and verifies HMAC. No positive authorization cache or silent reset.
 * An independently-held 32-byte key is REQUIRED and never saved to disk.
 */
import * as fs from 'node:fs/promises';
import {constants as flags} from 'node:fs';
import {join} from 'node:path';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';

const denied=()=>{throw Error('MCP_LEDGER_DENIED');};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const client=/^[A-Za-z0-9_-]{1,128}$/;
const tokenId=/^[A-Za-z0-9_.:-]{8,128}$/;
const refreshToken=/^[A-Za-z0-9_-]{43}$/;
const MAX_BYTES=256*1024,MAX_EPOCH=2147483647,MAX_SPENT=256;
const fileName='.orbit-grants.json',markerName='.orbit-grants.initialized';
const lockName='.orbit-grants.lock',markerPurpose='ORBIT-LOCAL-GRANT-LEDGER-v1';
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  Object.getPrototypeOf(x)===Object.prototype;
const hash=x=>createHash('sha256').update(x).digest('hex');

function exactHttps(value){
  try{
    if(typeof value!=='string')denied();
    const url=new URL(value);
    if(url.protocol!=='https:'||url.username||url.password||url.search||
      url.hash||url.origin==='null'||url.href!==value)denied();
  }catch{denied();}
}
function identity(x){
  if(!plain(x))denied();
  exactHttps(x.issuer);exactHttps(x.resource);
  if(!uuid.test(x.ownerId||'')||!client.test(x.clientId||''))denied();
  return hash(JSON.stringify([x.issuer,x.resource,x.ownerId,x.clientId]));
}
function validateRow(row,id){
  if(!plain(row)||row.issuer!==id.issuer||row.resource!==id.resource||
    row.ownerId!==id.ownerId||row.clientId!==id.clientId||
    !Number.isSafeInteger(row.epoch)||row.epoch<1||row.epoch>MAX_EPOCH||
    !['active','revoked'].includes(row.status)||
    !Number.isSafeInteger(row.grantedAt)||row.grantedAt<0||
    !Number.isSafeInteger(row.expiresAt)||row.expiresAt<=row.grantedAt||
    !(row.revokedAt===null||(Number.isSafeInteger(row.revokedAt)&&row.revokedAt>=0))||
    !plain(row.revokedTokens)||!plain(row.spent)||
    !(row.currentRefresh===null||plain(row.currentRefresh)))denied();
}
function secureStat(stat,kind){
  if((kind==='directory'?!stat.isDirectory():!stat.isFile())||
    (stat.mode&0o077)!==0||stat.nlink!==1||
    (typeof process.getuid==='function'&&stat.uid!==process.getuid()))denied();
}
function plus(epoch){
  if(!Number.isSafeInteger(epoch)||epoch<0||epoch>=MAX_EPOCH)denied();
  return epoch+1;
}

export function createDisposableGrantLedger({directory,macKey,clock=Date.now}={}){
  if(typeof directory!=='string'||!directory.startsWith('/')||
    directory.includes('\0')||!Buffer.isBuffer(macKey)||macKey.byteLength!==32||
    typeof clock!=='function')denied();
  const secret=Buffer.from(macKey);
  const file=join(directory,fileName),marker=join(directory,markerName),
    lock=join(directory,lockName);
  const now=()=>{
    const ms=clock();
    if(!Number.isSafeInteger(ms)||ms<0)denied();
    return ms;
  };
  const sign=body=>createHmac('sha256',secret).update(body).digest('hex');
  const secureDirectory=async()=>secureStat(await fs.lstat(directory),'directory');
  async function readPrivate(path,max=MAX_BYTES){
    const handle=await fs.open(path,flags.O_RDONLY|flags.O_NOFOLLOW);
    try{
      const stat=await handle.stat();
      secureStat(stat,'file');
      if(stat.size>max||stat.size===0)denied();
      return await handle.readFile('utf8');
    }finally{await handle.close();}
  }
  async function durableWrite(path,body,{exclusive=false}={}){
    let tmp=null,handle=null;
    try{
      if(exclusive){
        handle=await fs.open(path,'wx',0o600);
      }else{
        tmp=join(directory,'.orbit-'+randomBytes(16).toString('hex')+'.tmp');
        handle=await fs.open(tmp,'wx',0o600);
      }
      await handle.writeFile(body,'utf8');
      await handle.sync();
      await handle.close();handle=null;
      if(tmp)await fs.rename(tmp,path);
      const dirHandle=await fs.open(directory,'r');
      try{await dirHandle.sync();}finally{await dirHandle.close();}
    }finally{
      if(handle)await handle.close().catch(()=>{});
      if(tmp)await fs.unlink(tmp).catch(()=>{});
    }
  }
  async function withLock(action){
    let held=false;
    try{
      await secureDirectory();
      for(let i=0;i<30;i++){
        try{
          await fs.mkdir(lock,{mode:0o700});
          held=true;break;
        }catch(e){
          if(e?.code!=='EEXIST')throw e;
          if(i===29)denied();
          await sleep(20);
        }
      }
      return await action();
    }catch{denied();}
    finally{if(held)await fs.rmdir(lock).catch(()=>denied());}
  }
  const empty=()=>({version:1,grants:{}});
  async function load(){
    const markerText=await readPrivate(marker,128);
    const expected=sign(markerPurpose);
    if(markerText!==expected)denied();
    const content=await readPrivate(file);
    const envelope=JSON.parse(content);
    if(!plain(envelope)||!plain(envelope.payload)||
      typeof envelope.mac!=='string'||!/^[0-9a-f]{64}$/.test(envelope.mac))denied();
    const computed=sign(JSON.stringify(envelope.payload));
    if(!timingSafeEqual(Buffer.from(envelope.mac,'hex'),
      Buffer.from(computed,'hex')))denied();
    const state=envelope.payload;
    if(state.version!==1||!plain(state.grants)||
      Object.keys(state).length!==2)denied();
    return state;
  }
  async function save(state){
    const payload=JSON.stringify(state);
    const body=JSON.stringify({payload:state,mac:sign(payload)});
    if(Buffer.byteLength(body)>MAX_BYTES)denied();
    await durableWrite(file,body);
  }
  async function transact(action){
    return withLock(async()=>{
      const state=await load();
      const output=await action(state);
      if(!plain(output)||typeof output.changed!=='boolean')denied();
      if(output.changed)await save(state);
      return output.value;
    });
  }
  const get=(state,id)=>{
    const key=identity(id),row=state.grants[key]||null;
    if(row)validateRow(row,id);
    return {key,row};
  };
  async function initialize(){
    return withLock(async()=>{
      const [fileExists,markerExists]=await Promise.all([
        fs.lstat(file).then(()=>true,e=>e.code==='ENOENT'?false:Promise.reject(e)),
        fs.lstat(marker).then(()=>true,e=>e.code==='ENOENT'?false:Promise.reject(e)),
      ]);
      if(!fileExists&&!markerExists){
        await save(empty());
        await durableWrite(marker,sign(markerPurpose),{exclusive:true});
      }else if(!fileExists||!markerExists)denied();
      await load();
      return true;
    });
  }
  async function consent(id){
    identity(id);
    const sec=Math.floor(now()/1000);
    return transact(state=>{
      const {key,row}=get(state,id);
      const epoch=plus(row?.epoch||0);
      state.grants[key]={issuer:id.issuer,resource:id.resource,
        ownerId:id.ownerId,clientId:id.clientId,epoch,status:'active',
        grantedAt:Math.max(0,sec-1),expiresAt:sec+3600,revokedAt:null,
        revokedTokens:{},spent:{},currentRefresh:null};
      return {changed:true,value:Object.freeze({grantEpoch:epoch})};
    });
  }
  async function revoke(id){
    identity(id);
    const sec=Math.floor(now()/1000);
    return transact(state=>{
      const {row}=get(state,id);
      if(!row)denied();
      if(row.status==='revoked')
        return {changed:false,value:Object.freeze({grantEpoch:row.epoch})};
      row.epoch=plus(row.epoch);
      row.status='revoked';row.revokedAt=sec;row.currentRefresh=null;
      return {changed:true,value:Object.freeze({grantEpoch:row.epoch})};
    });
  }
  async function revokeToken(id){
    identity(id);
    if(!tokenId.test(id.tokenId||''))denied();
    const sec=Math.floor(now()/1000);
    return transact(state=>{
      const {row}=get(state,id);
      if(!row)denied();
      if(Object.hasOwn(row.revokedTokens,id.tokenId))
        return {changed:false,value:true};
      if(Object.keys(row.revokedTokens).length>=MAX_SPENT)denied();
      row.revokedTokens[id.tokenId]=sec;
      return {changed:true,value:true};
    });
  }
  async function readAuthorizationSnapshot(id){
    identity(id);
    if(!tokenId.test(id.tokenId||''))denied();
    return transact(state=>{
      const {row}=get(state,id);
      if(!row)return {changed:false,value:null};
      return {changed:false,value:Object.freeze({
        issuer:id.issuer,resource:id.resource,ownerId:id.ownerId,
        clientId:id.clientId,tokenId:id.tokenId,grantEpoch:row.epoch,
        scopes:['tasks:read'],status:row.status,
        grantedAt:row.grantedAt,consentExpiresAt:row.expiresAt,
        consentRevokedAt:row.revokedAt,
        tokenRevokedAt:row.revokedTokens[id.tokenId]??null,
      })};
    });
  }
  async function issueRefresh(id){
    identity(id);
    const ms=now();
    const token=randomBytes(32).toString('base64url');
    return transact(state=>{
      const {row}=get(state,id);
      if(!row||row.status!=='active'||row.expiresAt<=Math.floor(ms/1000)||
        (row.currentRefresh&&row.currentRefresh.expiresAt>ms))denied();
      row.currentRefresh={hash:hash(token),expiresAt:ms+3600_000};
      return {changed:true,value:Object.freeze({refreshToken:token,grantEpoch:row.epoch})};
    });
  }
  async function rotateRefresh(id){
    identity(id);
    if(!refreshToken.test(id.refreshToken||''))denied();
    const ms=now(),digest=hash(id.refreshToken);
    const next=randomBytes(32).toString('base64url');
    const result=await transact(state=>{
      const {row}=get(state,id);
      if(!row)return {changed:false,value:null};
      if(Object.hasOwn(row.spent,digest)){
        // Replay after successful rotation invalidates the current family
        // and all currently signed access JWTs through durable epoch bump.
        if(row.status==='active'){
          row.epoch=plus(row.epoch);row.status='revoked';
          row.revokedAt=Math.floor(ms/1000);row.currentRefresh=null;
          return {changed:true,value:null};
        }
        return {changed:false,value:null};
      }
      if(row.status!=='active'||!row.currentRefresh||
        row.currentRefresh.hash!==digest||row.currentRefresh.expiresAt<=ms||
        row.expiresAt<=Math.floor(ms/1000))return {changed:false,value:null};
      if(Object.keys(row.spent).length>=MAX_SPENT)denied();
      row.spent[digest]=row.epoch;
      row.currentRefresh={hash:hash(next),expiresAt:row.currentRefresh.expiresAt};
      return {changed:true,value:Object.freeze({
        refreshToken:next,grantEpoch:row.epoch,
      })};
    });
    if(!result)denied();
    return result;
  }
  return Object.freeze({
    initialize,consent,revoke,revokeToken,readAuthorizationSnapshot,
    issueRefresh,rotateRefresh,
  });
}
