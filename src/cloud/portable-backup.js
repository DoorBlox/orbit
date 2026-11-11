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

async function sha256(bytes){
  if(!globalThis.crypto?.subtle)throw Error('Secure browser crypto is needed to verify image backups.');
  return toHex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)));
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

export function collectReferencedPaths(snapshot){
  const extensions=snapshot?.extensions;
  const paths=[];
  if(!extensions)return paths;
  if(!object(extensions))throw imageError();
  for(const note of extensions.notes??[]){
    if(note?.imagePath)paths.push(note.imagePath);
  }
  for(const path of Object.values(extensions.journalImages??{})){
    if(path)paths.push(path);
  }
  const addCanvasFiles=scene=>{
    if(!scene)return;
    if(!object(scene.files))throw imageError();
    for(const ref of Object.values(scene.files)){
      if(!object(ref)||!validMediaPath(ref.path))throw imageError();
      paths.push(ref.path);
    }
  };
  for(const note of extensions.notes??[])addCanvasFiles(note?.scene);
  for(const scene of Object.values(extensions.journalScenes??{}))addCanvasFiles(scene);
  if(paths.some(path=>!validMediaPath(path)))throw imageError();
  return [...new Set(paths)].sort();
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
export async function createPortableArchive(snapshot,{ownerId:currentOwnerId,download,sanitizeHtml}={}){
  if(typeof download!=='function'||typeof currentOwnerId!=='string')throw Error('Signed-in private image access is required.');
  const clean=prepareSnapshot(snapshot,sanitizeHtml);
  const paths=collectReferencedPaths(clean);
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
    manifest:{assetCount:assets.length,totalBytes},
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
  const expected=collectReferencedPaths(snapshot);
  if(expected.length!==value.assets.length)throw imageError();
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
  return {snapshot,files,manifest:{assetCount:files.length,totalBytes}};
}

/** Stage private uploads into NEW owner-scoped paths; no snapshot replacement occurs here.
 * A partially failed upload can leave harmless unreferenced private files; never auto-delete.
 */
export async function rehydratePortableArchive(inspection,{ownerId:targetOwnerId,upload}={}){
  if(!object(inspection)||!object(inspection.snapshot)||!Array.isArray(inspection.files)||
     typeof upload!=='function'||typeof targetOwnerId!=='string')
    throw Error('Reviewed backup and authenticated target are required.');
  const remap=new Map(),created=new Set();
  for(const {path,blob} of inspection.files){
    if(!validMediaPath(path)||!(blob instanceof Blob))throw imageError();
    const newPath=await upload(blob);
    if(!validMediaOwner(newPath,targetOwnerId)||mimeFor(newPath)!==mimeFor(path)||
       created.has(newPath))throw Error('Uploaded image does not belong to the current account.');
    created.add(newPath);remap.set(path,newPath);
  }
  const restored=structuredClone(inspection.snapshot);
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
