/** ORBIT inline canvas: a lazy Excalidraw island that belongs to the note,
 * not a floating modal. Only durable private file references enter snapshots.
 * A Preview transition awaits its last save; the currently edited scene stays
 * mounted when a save fails, so unsaved image strokes are never discarded.
 */
import {emptyScene,normalizeScene} from './scene.js';
import {createEmbeddedInitialData,loadEmbeddedFiles,captureEmbeddedSceneWithMedia,
  embeddedEditorTheme,embeddedEditorOptions} from './excalidraw-adapter.js';

let stylesheetPromise=null;
function ensureStyles(){
  if(stylesheetPromise)return stylesheetPromise;
  const href=new URL('./excalidraw-island.css',import.meta.url).href;
  let link=document.querySelector('link[data-orbit-excalidraw-styles]');
  if(link?.dataset.orbitExcalidrawStyles==='ready')return stylesheetPromise=Promise.resolve();
  stylesheetPromise=new Promise((resolve,reject)=>{
    if(!link){
      link=document.createElement('link');link.rel='stylesheet';link.href=href;
      link.dataset.orbitExcalidrawStyles='loading';document.head.append(link);
    }
    const loaded=()=>{link.dataset.orbitExcalidrawStyles='ready';resolve();};
    const failed=()=>{link.remove();stylesheetPromise=null;reject(Error('Excalidraw styles unavailable.'));};
    link.addEventListener('load',loaded,{once:true});
    link.addEventListener('error',failed,{once:true});
    if(link.sheet)loaded();
  });
  return stylesheetPromise;
}

const signature=(elements,files,appState)=>{
  // Compare real scene content, not only text/points lengths.
  return JSON.stringify({elements,files:Object.entries(files||{}).map(([id,file])=>
    [id,file?.created,file?.mimeType,file?.dataURL?.length]),background:appState?.viewBackgroundColor});
};

export function mountInlineCanvas({host,scene,media=null,notify=()=>{},onSave=()=>true,
  onDirty=()=>{},theme=document.documentElement.dataset.theme}={}){
  if(!(host instanceof HTMLElement))throw Error('Inline canvas requires its actual note host.');
  let original=normalizeScene(scene)||emptyScene(),latest=null,mounted=null,disposed=false;
  let pristine=scene==null;
  let version=0,savedVersion=0,priorSignature='',timer=0,inFlight=null,hasError=false;
  const status=document.createElement('p');status.className='inline-canvas-loading';
  status.setAttribute('role','status');status.textContent='Opening canvas…';
  host.replaceChildren(status);
  const markDirty=dirty=>{onDirty(Boolean(dirty),hasError);};
  const ready=(async()=>{
    const initial=createEmbeddedInitialData(original);
    initial.files=await loadEmbeddedFiles(original,{media});
    await ensureStyles();
    if(disposed)return;
    window.EXCALIDRAW_ASSET_PATH=new URL('../assets/excalidraw/',import.meta.url).href;
    const {mountEmbeddedEditor}=await import('./excalidraw-island.js');
    if(disposed)return;
    const surface=document.createElement('div');surface.className='orbit-inline-excalidraw';
    host.replaceChildren(surface);
    latest={elements:initial.elements,appState:initial.appState,files:initial.files};
    priorSignature=signature(initial.elements,initial.files,initial.appState);
    mounted=mountEmbeddedEditor(surface,{
      initialData:initial,theme:embeddedEditorTheme(theme),uiOptions:embeddedEditorOptions,
      onChange:(elements,appState,files)=>{
        if(disposed)return;
        latest={elements,appState,files};
        const next=signature(elements,files,appState);
        if(next===priorSignature)return;
        priorSignature=next;version++;markDirty(true);
        clearTimeout(timer);
        // Persist settled edits to prevent navigation/reload from silently
        // discarding them. The Preview button still explicitly flushes.
        timer=setTimeout(()=>{void save().catch(error=>{
          if(!disposed){hasError=true;markDirty(true);notify('Canvas was not saved: '+error.message,6500);}
        });},2800);
      }
    });
    markDirty(false);
  })().catch(error=>{
    if(disposed)return;
    status.textContent='Canvas unavailable: '+error.message+' — use Preview to keep the original.';
    status.classList.add('is-error');
    notify('Could not open Excalidraw inside the note: '+error.message,6500);
    throw error;
  });

  async function save(){
    clearTimeout(timer);
    await ready;
    if(disposed)throw Error('Canvas is no longer active.');
    if(inFlight)await inFlight;
    if(version===savedVersion){
      if(!pristine)return original;
      const result=await onSave(original);
      if(result===false)throw Error('Private workspace rejected the drawing; it remains open.');
      pristine=false;return original;
    }
    inFlight=(async()=>{
      // React may update the scene during an upload. Save the observed version,
      // then loop for any subsequent strokes before reporting success.
      while(version!==savedVersion){
        const observed=version,{elements,appState,files}=latest;
        const captured=await captureEmbeddedSceneWithMedia(elements,appState,files,
          {media,originalScene:original});
        if(disposed)throw Error('Canvas was closed before it could be saved.');
        const result=await onSave(captured);
        if(result===false)throw Error('Private workspace rejected the drawing; it remains open.');
        original=captured;savedVersion=observed;pristine=false;
      }
      hasError=false;markDirty(false);
      return original;
    })();
    try{return await inFlight;}
    finally{inFlight=null;}
  }
  function dispose(){
    if(disposed)return;
    disposed=true;clearTimeout(timer);mounted?.dispose?.();
    host.replaceChildren();
    markDirty(false);
  }
  return {ready,save,dispose,isDirty:()=>version!==savedVersion||Boolean(inFlight),hasError:()=>hasError};
}
