/** #171 Crash-safe owner draft vault.
 *
 * Authenticated owner snapshots are sealed with a nonextractable AES-256-GCM
 * CryptoKey held in IndexedDB, never plaintext localStorage/sessionStorage.
 * AAD binds encrypted drafts to their owner, cloud CAS base revision and format.
 * No cloud request, auto-replay or account switching is permitted here.
 */
const DATABASE='orbit-private-drafts-v1';
const STORE='private';
const MAX_BYTES=8*1024*1024;
const text=new TextEncoder();
const decoder=new TextDecoder('utf-8',{fatal:true});
const isId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(id)&&
  !['__proto__','prototype','constructor'].includes(id);
const validRevision=n=>Number.isSafeInteger(n)&&n>=0;
function openDatabase(factory){
  return new Promise((resolve,reject)=>{
    const request=factory.open(DATABASE,1);
    request.onupgradeneeded=()=>{
      if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);
    };
    request.onerror=()=>reject(Error('Private recovery storage could not open.'));
    request.onblocked=()=>reject(Error('Private recovery storage is blocked by another tab.'));
    request.onsuccess=()=>{
      const db=request.result;
      db.onversionchange=()=>db.close();
      resolve(db);
    };
  });
}
function transaction(db,mode,action){
  return new Promise((resolve,reject)=>{
    let value,request;
    try{
      const tx=db.transaction(STORE,mode);
      request=action(tx.objectStore(STORE));
      request.onsuccess=()=>{value=request.result;};
      tx.oncomplete=()=>resolve(value);
      tx.onerror=()=>reject(tx.error||Error('Private recovery transaction failed.'));
      tx.onabort=()=>reject(tx.error||Error('Private recovery transaction aborted.'));
    }catch(error){reject(error);}
  });
}
/** A separate record is created for each authenticated owner. */
export async function createOwnerDraftVault(ownerId,{
  indexedDB:database=globalThis.indexedDB,
  cryptoProvider=globalThis.crypto,
  secureContext=globalThis.isSecureContext
}={}){
  if(!isId(ownerId))throw Error('Invalid private recovery owner.');
  if(!database||!cryptoProvider?.subtle||!cryptoProvider?.getRandomValues||secureContext===false)
    throw Error('Secure private recovery is unavailable in this browser.');
  const db=await openDatabase(database);
  const keyId='key:'+ownerId,recordId='draft:'+ownerId;
  let closed=false,serial=Promise.resolve();
  const failClosed=()=>{
    if(closed)throw Error('Private recovery vault is closed.');
  };
  const sequence=job=>{
    const result=serial.catch(()=>{}).then(()=>{failClosed();return job();});
    serial=result;return result;
  };
  async function getKey({create=false}={}){
    const found=await transaction(db,'readonly',store=>store.get(keyId));
    if(found||!create)return found;
    // IndexedDB.add wins atomically even if two tabs create a key at once.
    const generated=await cryptoProvider.subtle.generateKey({name:'AES-GCM',length:256},false,
      ['encrypt','decrypt']);
    try{await transaction(db,'readwrite',store=>store.add(generated,keyId));return generated;}
    catch(error){
      if(error?.name!=='ConstraintError')throw error;
      const stored=await transaction(db,'readonly',store=>store.get(keyId));
      if(!stored)throw Error('Private recovery key could not be read.');
      return stored;
    }
  }
  async function write(snapshot,revision){
    if(!validRevision(revision)||!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))
      throw Error('Invalid private draft for crash recovery.');
    const serialized=text.encode(JSON.stringify(snapshot));
    if(serialized.byteLength>MAX_BYTES)throw Error('Private draft exceeds the safe 8 MiB recovery limit.');
    const key=await getKey({create:true});
    const iv=cryptoProvider.getRandomValues(new Uint8Array(12));
    const aad=text.encode('orbit-draft-v1:'+ownerId+':'+revision);
    const ciphertext=await cryptoProvider.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},
      key,serialized);
    await transaction(db,'readwrite',store=>store.put({
      version:1,ownerId,revision,iv,ciphertext:new Uint8Array(ciphertext)
    },recordId));
    return true;
  }
  async function read(){
    const row=await transaction(db,'readonly',store=>store.get(recordId));
    if(!row)return null;
    if(row.version!==1||row.ownerId!==ownerId||!validRevision(row.revision)||
      !(row.iv instanceof Uint8Array)||row.iv.byteLength!==12||
      !(row.ciphertext instanceof Uint8Array)||row.ciphertext.byteLength>MAX_BYTES+32)
      throw Error('Encrypted recovery draft is invalid.');
    const key=await getKey();
    if(!key)throw Error('Private recovery key is unavailable.');
    let bytes;
    try{bytes=await cryptoProvider.subtle.decrypt({name:'AES-GCM',iv:row.iv,
      additionalData:text.encode('orbit-draft-v1:'+ownerId+':'+row.revision)},
    key,row.ciphertext);}
    catch{throw Error('Private draft authentication failed. No data was applied.');}
    if(bytes.byteLength>MAX_BYTES)throw Error('Private recovery size limit exceeded.');
    let snapshot;
    try{snapshot=JSON.parse(decoder.decode(bytes));}
    catch{throw Error('Private recovery data is malformed.');}
    if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))
      throw Error('Private recovery snapshot is invalid.');
    return {snapshot,revision:row.revision};
  }
  return {
    save:(snapshot,revision)=>sequence(()=>write(snapshot,revision)),
    load:()=>serial.catch(()=>{}).then(()=>{failClosed();return read();}),
    clear:()=>sequence(async()=>{await transaction(db,'readwrite',store=>store.delete(recordId));return true;}),
    /** For sign-out: remove the owner draft and the nonextractable key. */
    forget:()=>sequence(async()=>{await transaction(db,'readwrite',store=>store.delete(recordId));
      await transaction(db,'readwrite',store=>store.delete(keyId));return true;}),
    close:()=>{closed=true;db.close();}
  };
}
