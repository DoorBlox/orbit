/** Portable browser-only backup. Images remain private until explicitly exported by their owner.
 * Unlike the legacy JSON snapshot, this version includes referenced image bytes and hashes.
 * This deliberately does not list or delete orphaned media; #29 will own the media library.
 */
import { validateBackup } from '../backup.js';
import { validMediaPath, validMediaOwner, validateImage } from './media.js';

const FORMAT='orbit-portable-backup';
const VERSION=1;
export const PORTABLE_MAX_IMAGE_BYTES=5*1024*1024;
export const PORTABLE_MAX_TOTAL_BYTES=64*1024*1024;
export const PORTABLE_MAX_IMAGES=96;
export const PORTABLE_MAX_TEXT_BYTES=96*1024*1024;
const MIME={png:'image/png',jpg:'image/jpeg',webp:'image/webp'};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const mimeFor=path=>MIME[path.split('.').at(-1).toLowerCase()];
const imageError=()=>Error('Private image archive is incomplete or invalid.');
const bytesLimit=()=>Error('Private images exceed the 64 MB / 96-image portable backup limit. Keep the legacy JSON as an additional recovery copy.');
const toHex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
// Proof of review stays private to this module; callers cannot forge an
// inspected archive or silently replace its bytes/snapshot between UI steps.
const reviewedArchives=new WeakMap();

async function sha256(bytes){
  if(!globalThis.crypto?.subtle)throw Error('Secure browser crypto is needed to verify image backups.');
  return toHex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)));
}

async function snapshotFingerprint(snapshot){
  let serialized;
  try{serialized=JSON.stringify(snapshot);}catch{throw imageError();}
  if(typeof serialized!=='string')throw imageError();
  return sha256(new TextEncoder().encode(serialized));
}

function encodeBase64(bytes){
  const chunks=[];
  // Each non-final chunk is divisible by three, so encoding may be concatenated.
  for(let i=0;i<bytes.length;i+=24576){
    const portion=bytes.subarray(i,i+24576);
    chunks.push(btoa(String.fromCharCode(...portion)));
  }
  return chunks.join('');
}

function decodeBase64(data,size){
  if(typeof data!=='string'||data.length!==4*Math.ceil(size/3)||
     !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data))
    throw imageError();
  let binary;
  try{binary=atob(data);}catch{throw imageError();}
  if(binary.length!==size)throw imageError();
  const bytes=new Uint8Array(size);
  for(let i=0;i<size;i++)bytes[i]=binary.charCodeAt(i);
  if(encodeBase64(bytes)!==data)throw imageError();
  return bytes;
}

/**
 * Every referenced private image, including scene file metadata, is indexed
 * against its actual owner. Scene file entries remain references even when no
 * element currently draws them, so backup and deletion preflights stay safe.
 * This function never lists/queries/deletes Storage.
 */
export function collectMediaReferenceUsage(snapshot,{ownerId}={}){
  if(ownerId!==undefined&&(typeof ownerId!=='string'||!ownerId))
    throw Error('A valid private media owner is required.');
  const extensions=snapshot?.extensions;
  const usage=new Map();
  if(extensions===undefined||extensions===null)return usage;
  if(!object(extensions))throw imageError();
  const add=(path,kind,id,fileId)=>{
    if(!validMediaPath(path))throw imageError();
    if(ownerId&&!validMediaOwner(path,ownerId))
      throw Error('Private image belongs to another account.');
    if(!usage.has(path))usage.set(path,[]);
    usage.get(path).push(Object.freeze({
      kind,id,...(fileId?{fileId}:{})
    }));
  };
  const canvas=(scene,kind,id)=>{
    if(scene===null||scene===undefined)return;
    if(!object(scene)||!object(scene.files))throw imageError();
    for(const [fileId,ref] of Object.entries(scene.files)){
      if(!object(ref))throw imageError();
      add(ref.path,kind,id,fileId);
    }
  };
  const notes=extensions.notes??[];
  if(!Array.isArray(notes))throw imageError();
  for(const note of notes){
    if(!object(note)||typeof note.id!=='string')throw imageError();
    if(note.imagePath)add(note.imagePath,'note-attachment',note.id);
    canvas(note.scene,'note-canvas',note.id);
  }
  const images=extensions.journalImages??{};
  if(!object(images))throw imageError();
  for(const [id,path] of Object.entries(images)){
    if(path)add(path,'journal-attachment',id);
  }
  const scenes=extensions.journalScenes??{};
  if(!object(scenes))throw imageError();
  for(const [id,scene] of Object.entries(scenes))canvas(scene,'journal-canvas',id);
  return usage;
}

export function collectReferencedPaths(snapshot){
  return [...collectMediaReferenceUsage(snapshot).keys()].sort();
}

/**
 * Non-destructive immutable detach. A consumer can explicitly save the returned
 * snapshot using the existing CAS revision path. Storage bytes are never removed.
 * Canvas image elements can share one fileId; retain its metadata until the
 * final element using that fileId is detached.
 */
export function detachMediaReference(snapshot,{kind,id,elementId,ownerId}={}){
  if(!object(snapshot)||typeof kind!=='string'||typeof id!=='string'||!id)
    throw Error('Invalid private media detach target.');
  const usage=collectMediaReferenceUsage(snapshot,{ownerId});
  const clone=structuredClone(snapshot);
  const extensions=clone.extensions;
  if(!object(extensions))throw Error('Invalid private media detach target.');
  let path;
  if(kind==='note-attachment'||kind==='note-canvas-image'){
    const matches=(extensions.notes??[]).filter(note=>note?.id===id);
    if(matches.length!==1)throw Error('Invalid or ambiguous private media note.');
    const note=matches[0];
    if(kind==='note-attachment'){
      path=note.imagePath;
      if(!path)throw Error('Private image attachment does not exist.');
      delete note.imagePath;
    }else{
      path=detachCanvasElement(note.scene,elementId);
    }
  }else if(kind==='journal-attachment'){
    if(!Object.hasOwn(extensions.journalImages??{},id))
      throw Error('Private journal image attachment does not exist.');
    path=extensions.journalImages[id];
    delete extensions.journalImages[id];
  }else if(kind==='journal-canvas-image'){
    if(!Object.hasOwn(extensions.journalScenes??{},id))
      throw Error('Private journal canvas does not exist.');
    path=detachCanvasElement(extensions.journalScenes[id],elementId);
  }else{
    throw Error('Unsupported private media detach target.');
  }
  if(!validMediaPath(path)||ownerId&&!validMediaOwner(path,ownerId)||
     !usage.has(path))throw imageError();
  const remaining=collectMediaReferenceUsage(clone,{ownerId});
  return {snapshot:clone,detachedPath:path,
    remainingReferences:remaining.get(path)?.length??0};
}

function detachCanvasElement(scene,elementId){
  if(!object(scene)||!Array.isArray(scene.elements)||!object(scene.files)||
     typeof elementId!=='string'||!elementId)throw Error('Invalid private canvas image target.');
  const matching=scene.elements.filter(element=>element?.id===elementId);
  if(matching.length!==1||matching[0].type!=='image')
    throw Error('Invalid or ambiguous private canvas image element.');
  const fileId=matching[0].fileId;
  const file=scene.files[fileId];
  if(!object(file)||!validMediaPath(file.path))
    throw Error('Invalid private canvas image metadata.');
  scene.elements=scene.elements.filter(element=>element?.id!==elementId);
  if(!scene.elements.some(element=>element?.type==='image'&&element.fileId===fileId))
    delete scene.files[fileId];
  return file.path;
}

async function validatedBlob(data,path){
  if(!(data instanceof Blob)||!Number.isSafeInteger(data.size)||
     data.size<12||data.size>PORTABLE_MAX_IMAGE_BYTES)throw imageError();
  const blob=new Blob([data],{type:mimeFor(path)});
  await validateImage(blob);
  return blob;
}

function prepareSnapshot(snapshot,sanitizeHtml){
  return validateBackup(snapshot,{sanitizeHtml});
}

/** Fetch every referenced asset, never silently producing an incomplete backup. */
export async function createPortableArchive(snapshot,{ownerId:currentOwnerId,download,sanitizeHtml,libraryPaths=[]}={}){
  if(typeof download!=='function'||typeof currentOwnerId!=='string')throw Error('Signed-in private image access is required.');
  if(!Array.isArray(libraryPaths))throw Error('Private media library paths must be an array.');
  const clean=prepareSnapshot(snapshot,sanitizeHtml);
  const referenced=collectReferencedPaths(clean);
  if(libraryPaths.length>PORTABLE_MAX_IMAGES)throw bytesLimit();
  // Detached media is explicitly opted in. A path already used by a note or
  // canvas is backed up once, not redundantly classified as library-only.
  const refs=new Set(referenced),extras=new Set();
  for(const path of libraryPaths){
    if(!validMediaOwner(path,currentOwnerId))throw Error('Private library image belongs to another account or is invalid.');
    if(!refs.has(path))extras.add(path);
  }
  const libraryOnlyPaths=[...extras].sort();
  const paths=[...new Set([...referenced,...libraryOnlyPaths])].sort();
  if(paths.length>PORTABLE_MAX_IMAGES)throw bytesLimit();
  const assets=[];let totalBytes=0;
  for(const path of paths){
    if(!validMediaOwner(path,currentOwnerId))throw Error('Private image belongs to another account.');
    const blob=await validatedBlob(await download(path),path);
    totalBytes+=blob.size;
    if(totalBytes>PORTABLE_MAX_TOTAL_BYTES)throw bytesLimit();
    const bytes=new Uint8Array(await blob.arrayBuffer());
    assets.push({path,mime:blob.type,size:blob.size,sha256:await sha256(bytes),data:encodeBase64(bytes)});
  }
  return {format:FORMAT,version:VERSION,exportedAt:new Date().toISOString(),
    manifest:{assetCount:assets.length,totalBytes,
      ...(libraryOnlyPaths.length?{libraryOnlyPaths}:{})},
    snapshot:clean,assets};
}

/** Fully validate the archive before the first Storage upload or workspace change. */
export async function inspectPortableArchive(input,{sanitizeHtml}={}){
  if(typeof input==='string'&&input.length>PORTABLE_MAX_TEXT_BYTES)throw Error('Portable backup file is too large.');
  let value;
  try{value=typeof input==='string'?JSON.parse(input):input;}catch{throw Error('Invalid portable backup JSON.');}
  if(!object(value)||value.format!==FORMAT||value.version!==VERSION)throw Error('Unsupported ORBIT portable backup.');
  if(!object(value.manifest)||!Number.isSafeInteger(value.manifest.assetCount)||
     !Number.isSafeInteger(value.manifest.totalBytes)||!Array.isArray(value.assets)||
     value.assets.length>PORTABLE_MAX_IMAGES||value.manifest.assetCount!==value.assets.length)
    throw imageError();
  const snapshot=prepareSnapshot(value.snapshot,sanitizeHtml);
  const referenced=collectReferencedPaths(snapshot),refs=new Set(referenced);
  const extras=Object.hasOwn(value.manifest,'libraryOnlyPaths')
    ?value.manifest.libraryOnlyPaths:[];
  if(!Array.isArray(extras)||extras.length>PORTABLE_MAX_IMAGES||
     (Object.hasOwn(value.manifest,'libraryOnlyPaths')&&extras.length===0))
    throw imageError();
  // Canonical sorted/unique library-only paths are part of the integrity
  // contract. Never import foreign-owner media, even if its bytes are valid.
  const owner=referenced[0]?.split('/')[0]??extras[0]?.split('/')[0];
  for(let i=0;i<extras.length;i++){
    const path=extras[i];
    if(!validMediaPath(path)||refs.has(path)||
       (i>0&&extras[i-1]>=path)||
       (owner&&!validMediaOwner(path,owner)))throw imageError();
  }
  const expected=[...referenced,...extras].sort();
  // A portable private archive describes exactly ONE source account, even
  // when image bytes/checksums and the object-path manifest agree.
  if(expected.some(path=>!validMediaOwner(path,owner)))throw imageError();
  if(expected.length>PORTABLE_MAX_IMAGES||expected.length!==value.assets.length)
    throw imageError();
  const files=[];let totalBytes=0;
  for(let i=0;i<expected.length;i++){
    const entry=value.assets[i],path=expected[i];
    if(!object(entry)||entry.path!==path||!validMediaPath(path)||
       entry.mime!==mimeFor(path)||!Number.isSafeInteger(entry.size)||
       entry.size<12||entry.size>PORTABLE_MAX_IMAGE_BYTES||
       typeof entry.sha256!=='string'||!/^[a-f0-9]{64}$/.test(entry.sha256))
      throw imageError();
    totalBytes+=entry.size;
    if(totalBytes>PORTABLE_MAX_TOTAL_BYTES)throw bytesLimit();
    const bytes=decodeBase64(entry.data,entry.size);
    if(await sha256(bytes)!==entry.sha256)throw Error('Private image checksum mismatch. Do not import this backup.');
    const blob=await validatedBlob(new Blob([bytes],{type:entry.mime}),path);
    files.push({path,blob});
  }
  if(totalBytes!==value.manifest.totalBytes)throw imageError();
  const inspection={snapshot,files,manifest:{assetCount:files.length,totalBytes,
    ...(extras.length?{libraryOnlyPaths:[...extras]}:{})}};
  // The seal is in memory only; it is NOT a signature of the user's .orbit
  // file and does not alter the version-1 archive or serialized backup.
  reviewedArchives.set(inspection,{
    fingerprint:await snapshotFingerprint(snapshot),
    assets:value.assets.map(({path,mime,size,sha256})=>({path,mime,size,sha256})),
    libraryOnlyPaths:[...extras],totalBytes
  });
  return inspection;
}

/** Stage private uploads into NEW owner-scoped paths; no snapshot replacement occurs here.
 * A partially failed upload can leave harmless unreferenced private files; never auto-delete.
 */
export async function rehydratePortableArchive(inspection,{ownerId:targetOwnerId,upload}={}){
  if(!object(inspection)||!object(inspection.snapshot)||!Array.isArray(inspection.files)||
     typeof upload!=='function'||typeof targetOwnerId!=='string'||!targetOwnerId)
    throw Error('Reviewed backup and authenticated target are required.');
  const reviewed=reviewedArchives.get(inspection);
  if(!reviewed)throw Error('Review the complete private backup before restoring.');
  if(!object(inspection.manifest)||inspection.files.length!==reviewed.assets.length||
     inspection.manifest.assetCount!==reviewed.assets.length||
     inspection.manifest.totalBytes!==reviewed.totalBytes||
     JSON.stringify(inspection.manifest.libraryOnlyPaths??[])!==JSON.stringify(reviewed.libraryOnlyPaths))
    throw imageError();
  // Make a stable private copy before the first asynchronous upload. A user
  // editing a reviewed draft during upload cannot mutate the restored result.
  let restored;
  try{restored=structuredClone(inspection.snapshot);}catch{throw imageError();}
  if(await snapshotFingerprint(restored)!==reviewed.fingerprint)
    throw Error('Reviewed private backup changed. Review the file again.');
  const expected=[...new Set([...collectReferencedPaths(restored),...reviewed.libraryOnlyPaths])].sort();
  if(expected.length!==reviewed.assets.length||
     expected.some((path,i)=>path!==reviewed.assets[i].path))throw imageError();

  // All media bytes and graph references are verified before any Storage
  // mutation, not lazily after partially uploading a malformed archive.
  const staged=[];
  for(let i=0;i<reviewed.assets.length;i++){
    const file=inspection.files[i],expectedFile=reviewed.assets[i];
    if(!object(file)||file.path!==expectedFile.path||!(file.blob instanceof Blob)||
       file.blob.type!==expectedFile.mime||file.blob.size!==expectedFile.size)
      throw imageError();
    const blob=await validatedBlob(file.blob,file.path);
    const bytes=new Uint8Array(await blob.arrayBuffer());
    if(await sha256(bytes)!==expectedFile.sha256)
      throw Error('Private image checksum mismatch. Review the backup again.');
    staged.push({path:expectedFile.path,blob});
  }

  const remap=new Map(),created=new Set();
  for(const {path,blob} of staged){
    const newPath=await upload(blob);
    if(!validMediaOwner(newPath,targetOwnerId)||mimeFor(newPath)!==mimeFor(path)||
       created.has(newPath))throw Error('Uploaded image does not belong to the current account.');
    created.add(newPath);remap.set(path,newPath);
  }
  if(restored.extensions){
    for(const note of restored.extensions.notes??[]){
      if(note.imagePath){
        if(!remap.has(note.imagePath))throw imageError();
        note.imagePath=remap.get(note.imagePath);
      }
    }
    for(const [id,path] of Object.entries(restored.extensions.journalImages??{})){
      if(!remap.has(path))throw imageError();
      restored.extensions.journalImages[id]=remap.get(path);
    }
    const remapCanvas=scene=>{
      if(!scene)return;
      for(const file of Object.values(scene.files??{})){
        if(!remap.has(file.path))throw imageError();
        file.path=remap.get(file.path);
      }
    };
    for(const note of restored.extensions.notes??[])remapCanvas(note.scene);
    for(const scene of Object.values(restored.extensions.journalScenes??{}))remapCanvas(scene);
  }
  return restored;
}
