/** Auth-scoped private image storage. Browser receives no service-role key. */
const BUCKET='orbit-private-media';
const TYPES={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
const MAX=5*1024*1024;
const ID='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const pathPattern=new RegExp('^('+ID+')/('+ID+')\\.(png|jpg|webp)$','i');
export function validMediaPath(path){
  return typeof path==='string'&&path.length<=100&&pathPattern.test(path);
}
export function validMediaOwner(path,userId){
  return validMediaPath(path)&&typeof userId==='string'&&path.toLowerCase().startsWith(userId.toLowerCase()+'/');
}
export async function validateImage(file){
  if(!file||typeof file.slice!=='function'||!Number.isInteger(file.size)||
    file.size<12||file.size>MAX||!Object.hasOwn(TYPES,file.type))
    throw Error('Choose a PNG, JPEG or WebP image under 5 MB.');
  const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
  const png=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&
    String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if((file.type==='image/png'&&!png)||(file.type==='image/jpeg'&&!jpg)||
    (file.type==='image/webp'&&!webp))throw Error('The image file signature does not match its type.');
  return TYPES[file.type];
}
/**
 * Auth-scoped private media. Every visible Blob URL is held by an explicit lease.
 * Idle previews have a small LRU byte/count budget; active previews are never
 * evicted while an image or canvas uses them. An owner switch revokes all URLs.
 */
export function createPrivateMedia(client,{ownerId,maxIdlePreviews=8,maxIdleBytes=12*1024*1024}={}){
  if(!client?.storage||!client?.auth?.getUser||typeof ownerId!=='string'||!ownerId)
    throw Error('Authenticated media access is required.');
  if(!Number.isSafeInteger(maxIdlePreviews)||maxIdlePreviews<0||
    !Number.isSafeInteger(maxIdleBytes)||maxIdleBytes<0)
    throw Error('Invalid private preview cache limits.');
  const bucket=client.storage.from(BUCKET);
  const previews=new Map();
  let disposed=false,sequence=0;

  function expire(){
    if(disposed)return;
    disposed=true;
    for(const entry of previews.values())if(entry.url)URL.revokeObjectURL(entry.url);
    previews.clear();
    // Pending downloads verify disposed before creating or retaining Blob URLs.
  }
  function trim(){
    if(disposed)return;
    const idle=[...previews.values()].filter(entry=>entry.refs===0&&entry.url)
      .sort((a,b)=>a.lastUsed-b.lastUsed);
    let bytes=idle.reduce((sum,entry)=>sum+entry.bytes,0);
    while(idle.length>maxIdlePreviews||bytes>maxIdleBytes){
      const entry=idle.shift();
      if(previews.get(entry.path)!==entry||entry.refs!==0)continue;
      previews.delete(entry.path);
      URL.revokeObjectURL(entry.url);
      bytes-=entry.bytes;
    }
  }
  // A Storage SDK may reject rather than return {error}. Never expose provider
  // diagnostic details to gallery or restore consumers; keep auth failures separate.
  async function storageResult(run,message){
    try{return await run();}catch{throw Error(message);}
  }
  async function checkUser(){
    if(disposed)throw Error('Your media session expired. Sign in again.');
    let response;
    try{response=await client.auth.getUser();}
    catch{
      // An unverified session cannot retain already-displayed private Blob URLs.
      // Do not surface provider error details or silently revive this cache.
      expire();
      throw Error('Your media session expired. Sign in again.');
    }
    if(disposed)throw Error('Your media session expired. Sign in again.');
    if(response?.error||response?.data?.user?.id!==ownerId){
      // The same fail-closed lifetime applies to auth errors, missing sessions
      // and an actual account switch; Storage writes are never undone here.
      expire();
      throw Error('Your media session expired. Sign in again.');
    }
  }
  async function download(path){
    if(!validMediaOwner(path,ownerId))throw Error('Image belongs to another space or is invalid.');
    await checkUser();
    const result=await storageResult(()=>bucket.download(path),'Private image could not be downloaded.');
    if(result?.error||!(result?.data instanceof Blob)||result.data.size<12||result.data.size>MAX)
      throw Error('Private image could not be downloaded.');
    // A long-running Storage request must not survive a sign-out/account switch.
    await checkUser();
    const extension=path.split('.').at(-1).toLowerCase();
    const mime=Object.keys(TYPES).find(type=>TYPES[type]===extension);
    const blob=new Blob([result.data],{type:mime});
    await validateImage(blob);
    // Signature verification reads Blob bytes asynchronously. The owner may
    // sign out or switch accounts after the Storage response was checked.
    // Recheck before any private bytes escape or a preview URL can be made.
    await checkUser();
    return blob;
  }
  async function acquirePreview(path){
    if(!validMediaOwner(path,ownerId))throw Error('Image belongs to another space or is invalid.');
    await checkUser();
    let entry=previews.get(path);
    if(!entry){
      entry={path,refs:0,url:null,bytes:0,lastUsed:++sequence,promise:null};
      previews.set(path,entry);
      entry.promise=(async()=>{
        const blob=await download(path);
        const url=URL.createObjectURL(blob);
        if(disposed){URL.revokeObjectURL(url);throw Error('Your media session expired. Sign in again.');}
        entry.url=url;entry.bytes=blob.size;
        return url;
      })().catch(error=>{
        if(previews.get(path)===entry){
          previews.delete(path);
          if(entry.url)URL.revokeObjectURL(entry.url);
        }
        throw error;
      });
    }
    ++entry.refs;
    try{
      const url=await entry.promise;
      // Each coalesced caller must still belong to the original account.
      await checkUser();
      entry.lastUsed=++sequence;
      let released=false;
      return Object.freeze({
        url,
        release(){
          if(released)return;
          released=true;
          entry.refs=Math.max(0,entry.refs-1);
          entry.lastUsed=++sequence;
          trim();
        }
      });
    }catch(error){
      entry.refs=Math.max(0,entry.refs-1);
      trim();
      throw error;
    }
  }
  return {
    ownerId, // public owner identifier for private path validation, never a credential
    download,acquirePreview,
    /**
     * Read-only, paginated private file inventory. Storage list results are never
     * treated as authorization: the folder is owner-scoped, every returned name
     * is path-validated, and the authenticated account is checked again after IO.
     * Do not derive a permanent delete action from this inventory.
     */
    async listOwnMedia({offset=0,limit=40}={}){
      if(!Number.isSafeInteger(limit)||limit<1||limit>100||
         !Number.isSafeInteger(offset)||offset<0||offset>1000000)
        throw Error('Invalid private media page limit or offset.');
      await checkUser();
      const result=await storageResult(()=>bucket.list(ownerId,{
        limit,offset,sortBy:{column:'name',order:'asc'}
      }),'Private media list is unavailable.');
      if(result?.error||!Array.isArray(result?.data))
        throw Error('Private media list is unavailable.');
      await checkUser();
      const seen=new Set(),items=[];
      for(const item of result.data){
        if(!item||typeof item.name!=='string'||!item.id)continue;
        const path=ownerId+'/'+item.name;
        if(!validMediaOwner(path,ownerId)||seen.has(path))continue;
        seen.add(path);
        const mime=Object.entries(TYPES).find(([,ext])=>ext===item.name.split('.').at(-1).toLowerCase())?.[0];
        items.push({
          path,mime,
          size:Number.isSafeInteger(item.metadata?.size)&&item.metadata.size>=0?item.metadata.size:null,
          createdAt:typeof item.created_at==='string'?item.created_at:null
        });
      }
      return {items,nextOffset:offset+result.data.length,
        hasMore:result.data.length===limit};
    },
    async upload(file){
      const extension=await validateImage(file);
      await checkUser();
      const filename=globalThis.crypto.randomUUID();
      const path=ownerId+'/'+filename+'.'+extension;
      const result=await storageResult(()=>bucket.upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'}),'Private upload failed. Try again.');
      // Publish a reference only after Storage confirms the generated path.
      // Ambiguous results may leave an orphan, so retries use new object names.
      if(result?.error||result?.data?.path!==path)throw Error('Private upload failed. Try again.');
      // Never hand a path back to a different account after in-flight upload.
      // Storage deletion is intentionally NOT attempted on session expiry.
      await checkUser();
      return path;
    },
    async signedUrl(path){
      if(!validMediaOwner(path,ownerId))throw Error('Image belongs to another space or is invalid.');
      await checkUser();
      const result=await storageResult(()=>bucket.createSignedUrl(path,600),'Cannot load the private image.');
      if(result?.error||!result?.data?.signedUrl)throw Error('Cannot load the private image.');
      await checkUser();
      return result.data.signedUrl;
    },
    dispose:expire
  };
}
