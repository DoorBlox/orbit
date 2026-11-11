/** EX-02: framework-neutral bridge between Excalidraw binary image files and
 * ORBIT's owner-private, portable media path references. No inline binaries in snapshots.
 * This module contains NO React imports or browser side effects.
 */
import { emptyScene, normalizeScene } from './scene.js';
import { validateImage, validMediaOwner } from './cloud/media.js';

const MAX_ELEMENTS=400;
const BLOCKED_TYPES=new Set(['embeddable','iframe']);
const MAX_IMAGE_BYTES=5*1024*1024;
const IMAGE_TYPES=new Set(['image/png','image/jpeg','image/webp']);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const hexColor=value=>typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value);
const safeUrl=href=>{
  if(typeof href!=='string'||href.length>1000)return false;
  let url;
  try{url=new URL(href);}catch{return false;}
  return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password;
};
const sanitizeAppState=appState=>({
  viewBackgroundColor:hexColor(appState?.viewBackgroundColor)
    ? appState.viewBackgroundColor
    : emptyScene().appState.viewBackgroundColor,
});

function assertSceneSafety(elements,files,{allowImages=false}={}){
  if(!Array.isArray(elements)||!object(files)||(!allowImages&&Object.keys(files).length))
    throw Error('Drawing scene has unsupported embedded files.');
  const ids=new Set();
  for(const item of elements){
    if(!object(item)||BLOCKED_TYPES.has(item.type)||(!allowImages&&item.type==='image'))
      throw Error('Drawing scene contains unsupported images or remote embeds.');
    if(ids.has(item.id))throw Error('Duplicate drawing element ID.');
    ids.add(item.id);
    if(item.link&&!safeUrl(item.link))throw Error('Drawing scene contains an unsafe external link.');
    if(item.type==='image'&&(typeof item.fileId!=='string'||!item.fileId||item.fileId.length>100))
      throw Error('Invalid Excalidraw image file ID.');
  }
}

const toBase64=bytes=>{
  let text='';
  for(let i=0;i<bytes.length;i+=24576)
    text+=btoa(String.fromCharCode(...bytes.subarray(i,i+24576)));
  return text;
};

async function embeddedBlob(file){
  if(!object(file)||!IMAGE_TYPES.has(file.mimeType)||typeof file.dataURL!=='string')
    throw Error('Only private PNG, JPEG and WebP images under 5 MB can be saved.');
  const prefix='data:'+file.mimeType+';base64,';
  const encoded=file.dataURL.startsWith(prefix)?file.dataURL.slice(prefix.length):'';
  if(!encoded||encoded.length>4*Math.ceil(MAX_IMAGE_BYTES/3)||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))
    throw Error('Invalid or oversized Excalidraw image data.');
  let bytes;
  try{bytes=Uint8Array.from(atob(encoded),char=>char.charCodeAt(0));}
  catch{throw Error('Invalid Excalidraw base64 image.');}
  const blob=new Blob([bytes],{type:file.mimeType});
  await validateImage(blob);
  return blob;
}

/** Data for official <Excalidraw initialData={...}/>; never hands it the live ORBIT object. */
export function createEmbeddedInitialData(savedScene){
  const normalized=normalizeScene(savedScene)||emptyScene();
  assertSceneSafety(normalized.elements,normalized.files,{allowImages:true});
  // The legacy native pen allows a single-pointer click: 0x0 with one point.
  // Upstream Excalidraw treats such strokes as invisible and drops them during
  // restoration. Expand the *clone* to a minimal visible dot, never mutate the
  // original saved scene. Otherwise merely opening the editor could erase it.
  const elements=structuredClone(normalized.elements).map(element=>{
    if(element.type!=='freedraw'||element.isDeleted||
       element.width!==0||element.height!==0||
       !Array.isArray(element.points)||element.points.length!==1)return element;
    const start=element.points[0];
    return {...element,width:4,height:4,
      points:[[start[0],start[1]],[start[0]+4,start[1]+4]],
      pressures:[0.5,0.5]};
  });
  return {
    elements,
    appState:sanitizeAppState(normalized.appState),
    files:{}, // populated through authenticated loadEmbeddedFiles before mounting React
  };
}

/** Load only referenced owner-private images. BinaryFiles live only in editor memory. */
export async function loadEmbeddedFiles(savedScene,{media}={}){
  const normalized=normalizeScene(savedScene)||emptyScene();
  const entries=Object.entries(normalized.files);
  if(!entries.length)return {};
  if(!media?.download||typeof media.ownerId!=='string')
    throw Error('Sign in to access private Excalidraw images. Your scene has not changed.');
  const files={};
  for(const [id,ref] of entries){
    if(!validMediaOwner(ref.path,media.ownerId))throw Error('A canvas image belongs to another account.');
    const blob=await media.download(ref.path);
    if(blob.type!==ref.mimeType)throw Error('Private canvas image type mismatch.');
    await validateImage(blob);
    const bytes=new Uint8Array(await blob.arrayBuffer());
    files[id]={id,mimeType:ref.mimeType,dataURL:'data:'+ref.mimeType+';base64,'+toBase64(bytes),created:Date.now()};
  }
  return files;
}

/** From official onChange(elements, appState, files) at EXPLICIT Save time only.
 * No transient appState (collaborators, selections, dialogs, menus) enters storage.
 * A failed save leaves the previous drawing intact.
 */
export function captureEmbeddedScene(elements,appState,files){
  assertSceneSafety(elements,files);
  const visible=elements.filter(element=>element.isDeleted!==true);
  if(visible.length>MAX_ELEMENTS)throw Error('Drawing scene is larger than the supported 400 elements.');
  return normalizeScene({...emptyScene(),elements:visible,appState:sanitizeAppState(appState),files:{}});
}

/** Explicit Save only. Upload images first; never modify a scene on partial failure.
 * Old stored references can be reused, and deleted image elements are pruned.
 * Uploaded but unreferenced files are kept private for later safe media cleanup.
 */
export async function captureEmbeddedSceneWithMedia(elements,appState,files,{media,originalScene}={}){
  assertSceneSafety(elements,files,{allowImages:true});
  const visible=elements.filter(element=>element.isDeleted!==true);
  if(visible.length>MAX_ELEMENTS)throw Error('Drawing scene is larger than the supported 400 elements.');
  const previous=normalizeScene(originalScene)||emptyScene();
  const ids=[...new Set(visible.filter(el=>el.type==='image').map(el=>el.fileId))];
  if(ids.length>32)throw Error('A canvas supports at most 32 private images.');
  const references={};
  for(const id of ids){
    if(Object.hasOwn(previous.files,id)){
      // A stored reference must always belong to the current authenticated owner.
      // Existing file IDs must not be usable to bypass private Storage checks.
      if(!media?.ownerId||!validMediaOwner(previous.files[id].path,media.ownerId))
        throw Error('A canvas image belongs to another account; nothing was saved.');
      references[id]=previous.files[id];
      continue;
    }
    if(!media?.upload||typeof media.ownerId!=='string')
      throw Error('Sign in to save private images in Excalidraw. Nothing was changed.');
    if(!Object.hasOwn(files,id))throw Error('Excalidraw image data is missing; nothing was saved.');
    const blob=await embeddedBlob(files[id]);
    const path=await media.upload(blob);
    if(!validMediaOwner(path,media.ownerId))
      throw Error('A private image upload returned the wrong account path. No scene was saved.');
    references[id]={path,mimeType:blob.type};
  }
  // The native Excalidraw app transitions image elements to saved after its
  // file manager has persisted their bytes. ORBIT owns that persistence here.
  const durable=visible.map(el=>el.type==='image'?{...el,status:'saved'}:el);
  return normalizeScene({...emptyScene(),elements:durable,
    appState:sanitizeAppState(appState),files:references});
}

/** Curated page themes; dark canvas only for intentionally dark themes. */
export function embeddedEditorTheme(themeId){
  return ['garden','graphite'].includes(themeId)?'dark':'light';
}

/** Images may be placed freely in the editor. ORBIT owns private file upload,
 * portable backup and explicit Save/Cancel, not upstream remote exports.
 */
export const embeddedEditorOptions=Object.freeze({
  tools:Object.freeze({image:true}),
  canvasActions:Object.freeze({
    changeViewBackgroundColor:true,
    clearCanvas:true,
    loadScene:false,
    saveToActiveFile:false,
    export:false,
    saveAsImage:false,
    toggleTheme:false,
  }),
});
