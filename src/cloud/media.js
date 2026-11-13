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
    let result;
    try{result=await run();}
    catch{
      // A Storage rejection can coincide with sign-out. Recheck the account
      // before reporting a safe provider error and revoke any old Blob leases.
      await checkUser();
      throw Error(message);
    }
    // Recheck even on an SDK {error} or malformed response. The caller will
    // validate the reply, but it must not hide a concurrent owner switch.
    await checkUser();
    return result;
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
    // storageResult has already checked for an owner switch after Storage IO.
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
      const seen=new Set(),items=[];
      let ignoredEntries=0;
      for(const item of result.data){
        if(!item||typeof item.name!=='string'||!item.id){
          ignoredEntries++;
          continue;
        }
        const path=ownerId+'/'+item.name;
        if(!validMediaOwner(path,ownerId)||seen.has(path)){
          ignoredEntries++;
          continue;
        }
        seen.add(path);
        const mime=Object.entries(TYPES).find(([,ext])=>ext===item.name.split('.').at(-1).toLowerCase())?.[0];
        items.push({
          path,mime,
          size:Number.isSafeInteger(item.metadata?.size)&&item.metadata.size>=0?item.metadata.size:null,
          createdAt:typeof item.created_at==='string'?item.created_at:null
        });
      }
      return {items,nextOffset:offset+result.data.length,
        hasMore:result.data.length===limit,
        // Preserve owner privacy by returning only the omission count. A
        // usage total must not call a filtered view the complete bucket.
        ...(ignoredEntries?{ignoredEntries}:{})};
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
      // storageResult rechecked the account after IO. Never delete an
      // ambiguous upload or hand its path to a different signed-in account.
      return path;
    },
    async signedUrl(path){
      if(!validMediaOwner(path,ownerId))throw Error('Image belongs to another space or is invalid.');
      await checkUser();
      const result=await storageResult(()=>bucket.createSignedUrl(path,600),'Cannot load the private image.');
      if(result?.error||!result?.data?.signedUrl)throw Error('Cannot load the private image.');
      return result.data.signedUrl;
    },
    dispose:expire
  };
}

/**
 * Read-only bounded private Storage usage. Known bytes are a lower bound until
 * every owner-scoped page and every size is checked. No deletion or signed URLs.
 */
export async function summarizePrivateMediaUsage(media,{pageSize=100,maxPages=10}={}){
  if(typeof media?.listOwnMedia!=='function'||typeof media.ownerId!=='string'||
     !new RegExp('^'+ID+'$','i').test(media.ownerId))
    throw Error('Authenticated private media inventory is required.');
  if(!Number.isSafeInteger(pageSize)||pageSize<1||pageSize>100||
     !Number.isSafeInteger(maxPages)||maxPages<1||maxPages>50)
    throw Error('Invalid private media usage page budget.');
  const byPath=new Map();
  let knownBytes=0,unknownSizeFiles=0,offset=0,hasMore=true,consistent=true;
  for(let pageIndex=0;pageIndex<maxPages&&hasMore;pageIndex++){
    // listOwnMedia rechecks the signed-in account before and after each read.
    const page=await media.listOwnMedia({offset,limit:pageSize});
    if(!page||!Array.isArray(page.items)||page.items.length>pageSize||
       typeof page.hasMore!=='boolean'||!Number.isSafeInteger(page.nextOffset)||
       page.nextOffset<offset||page.nextOffset>offset+pageSize||
       (page.hasMore&&page.nextOffset===offset))
      throw Error('Private media usage inventory is unavailable.');
    const ignoredEntries=page.ignoredEntries??0;
    if(!Number.isSafeInteger(ignoredEntries)||ignoredEntries<0||
       ignoredEntries>pageSize||
       ignoredEntries+page.items.length>page.nextOffset-offset)
      throw Error('Private media usage inventory is unavailable.');
    // Unsupported legacy object names, malformed rows and in-page
    // duplicates may carry bytes we cannot safely account for.
    if(ignoredEntries>0)consistent=false;
    for(const item of page.items){
      if(!item||!validMediaOwner(item.path,media.ownerId)||
         (item.size!==null&&(!Number.isSafeInteger(item.size)||item.size<0)))
        throw Error('Private media usage inventory is invalid.');
      if(byPath.has(item.path)){
        if(byPath.get(item.path)!==item.size)consistent=false;
        continue;
      }
      byPath.set(item.path,item.size);
      if(item.size===null)unknownSizeFiles++;
      else{
        if(!Number.isSafeInteger(knownBytes+item.size))
          throw Error('Private media usage size is not safely representable.');
        knownBytes+=item.size;
      }
    }
    offset=page.nextOffset;
    hasMore=page.hasMore;
  }
  const complete=!hasMore&&consistent;
  return {files:byPath.size,knownBytes,unknownSizeFiles,complete,
    totalBytes:complete&&unknownSizeFiles===0?knownBytes:null};
}
