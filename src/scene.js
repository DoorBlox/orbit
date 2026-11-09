/* Shared .excalidraw scene interchange for journals and spatial stickies.
 * Inline pen editing is intentionally native; the full upstream React editor
 * is not bundled. Binary image payloads await private media storage.
 */
import { normalizeTaskChecklist } from './model.js';
import { normalizeExtraWidgetLayout } from './widget-registry.js';
const object = value => !!value && typeof value==='object' && !Array.isArray(value);
const validId = value => typeof value==='string' && /^[A-Za-z0-9_-]{1,100}$/.test(value) && !['__proto__','constructor','prototype'].includes(value);
const coord = value => Number.isFinite(value) && Math.abs(value)<=10000;
const color = value => typeof value==='string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#755c49';
const ns='http://www.w3.org/2000/svg';
const svgNode=(tag,attrs={})=>{const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));return node;};
const imagePathPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:png|jpg|webp)$/i;
function assertImagePath(value){
  if(typeof value!=='string'||!imagePathPattern.test(value))throw Error('Invalid private image path.');
  return value;
}
export const emptyScene=()=>({type:'excalidraw',version:2,source:'https://orbit.starscene.com/',
  elements:[],appState:{viewBackgroundColor:'#f9edda'},files:{}});
export function normalizeScene(scene){
  if(scene===undefined||scene===null)return null;
  if(!object(scene)||scene.type!=='excalidraw'||scene.version!==2||!object(scene.appState)||
    !object(scene.files)||Object.keys(scene.files).length||!Array.isArray(scene.elements)||scene.elements.length>400)
    throw Error('Invalid drawing scene or embedded image files (not supported yet).');
  const serial=JSON.stringify(scene);
  if(serial.length>180000)throw Error('Drawing is larger than 180 KB.');
  for(const item of scene.elements){
    if(!object(item)||!validId(item.id)||typeof item.type!=='string'||!coord(item.x)||
      !coord(item.y)||!coord(item.width)||!coord(item.height))throw Error('Invalid drawing element.');
    if(item.points!==undefined&&(!Array.isArray(item.points)||item.points.length>2000||item.points.some(p=>
      !Array.isArray(p)||p.length<2||!coord(p[0])||!coord(p[1]))))throw Error('Invalid drawing points.');
    if(item.text!==undefined&&(typeof item.text!=='string'||item.text.length>4000))throw Error('Invalid drawing text.');
  }
  return JSON.parse(serial);
}
export function normalizeExtensions(raw={}){
  if(raw===undefined||raw===null)raw={};
  if(!object(raw)||JSON.stringify(raw).length>900000)throw Error('Invalid or oversized workspace extensions.');
  const notes=raw.notes??[],taskLinks=raw.taskLinks??{},journalScenes=raw.journalScenes??{},journalImages=raw.journalImages??{};
  const taskChecklists=raw.taskChecklists??{};
  const spatialWidgets=normalizeExtraWidgetLayout(raw.spatialWidgets);
  const rawAppearance=raw.appearance??{};
  if(!object(rawAppearance)||!['parchment','garden','frost','celestial','ember','tidepool','sundown','sakura','graphite','linen'].includes(rawAppearance.theme??'parchment')||
     !['system','off'].includes(rawAppearance.motion??'system')||
     (rawAppearance.ambient!==undefined&&typeof rawAppearance.ambient!=='boolean'))throw Error('Invalid workspace appearance.');
  const appearance={theme:rawAppearance.theme??'parchment',motion:rawAppearance.motion??'system',
    ambient:rawAppearance.ambient??false};
  if(!Array.isArray(notes)||notes.length>80||!object(taskLinks)||Object.keys(taskLinks).length>10000||
     !object(journalScenes)||Object.keys(journalScenes).length>600||!object(journalImages)||Object.keys(journalImages).length>600||
     !object(taskChecklists)||Object.keys(taskChecklists).length>10000)throw Error('Invalid workspace extensions.');
  const ids=new Set();
  const cleanNotes=notes.map(n=>{
    if(!object(n)||!validId(n.id)||ids.has(n.id)||typeof n.text!=='string'||n.text.length>6000||
      typeof n.title!=='string'||n.title.length>100||!coord(n.x)||!coord(n.y)||
      !Number.isFinite(n.width)||n.width<220||n.width>850||
      !Number.isFinite(n.height)||n.height<160||n.height>850||
      !['sand','peach','lavender','mint'].includes(n.color))throw Error('Invalid sticky note.');
    ids.add(n.id);
    return {id:n.id,title:n.title,text:n.text,x:n.x,y:n.y,width:n.width,height:n.height,color:n.color,
      ...(n.scene?{scene:normalizeScene(n.scene)}:{}),
      ...(n.imagePath?{imagePath:assertImagePath(n.imagePath)}:{})};
  });
  const links={};
  for(const [id,values] of Object.entries(taskLinks)){
    if(!validId(id)||!Array.isArray(values)||values.length>12)throw Error('Invalid task links.');
    links[id]=values.map(value=>{
      if(!object(value)||typeof value.label!=='string'||value.label.length>120||
        typeof value.url!=='string'||value.url.length>1000)throw Error('Invalid task link.');
      let u;try{u=new URL(value.url);}catch{throw Error('Invalid task URL.');}
      if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('Invalid task URL.');
      return {label:value.label.trim().slice(0,120)||u.hostname,url:u.href};
    });
  }
  const checklists={};
  for(const [id,items] of Object.entries(taskChecklists)){
    if(!validId(id))throw Error('Invalid task checklist ID.');
    checklists[id]=normalizeTaskChecklist(items);
  }
  const scenes={};
  for(const [id,scene] of Object.entries(journalScenes)){
    if(!validId(id))throw Error('Invalid journal drawing ID.');
    scenes[id]=normalizeScene(scene);
  }
  const images={};
  for(const [id,path] of Object.entries(journalImages)){
    if(!validId(id))throw Error('Invalid journal image ID.');
    images[id]=assertImagePath(path);
  }
  return {notes:cleanNotes,taskLinks:links,taskChecklists:checklists,journalScenes:scenes,journalImages:images,spatialWidgets,appearance};
}
export function renderScene(scene,target){
  target.replaceChildren();
  scene=normalizeScene(scene);if(!scene||!scene.elements.length)return;
  const canvas=svgNode('svg',{viewBox:'0 0 800 460',role:'img','aria-label':'Drawing preview'});
  for(const item of scene.elements){
    if(item.isDeleted)continue;
    const attrs={stroke:color(item.strokeColor),'stroke-width':Number.isFinite(item.strokeWidth)?Math.min(15,Math.max(1,item.strokeWidth)):2,fill:'none'};
    if(['freedraw','line','arrow'].includes(item.type)&&Array.isArray(item.points)){
      canvas.append(svgNode('path',{...attrs,d:item.points.map((p,i)=>(i?'L':'M')+
        (item.x+p[0])+' '+(item.y+p[1])).join(' '),'stroke-linecap':'round','stroke-linejoin':'round'}));
    }else if(item.type==='rectangle'){
      canvas.append(svgNode('rect',{...attrs,x:item.x,y:item.y,width:Math.max(0,item.width),height:Math.max(0,item.height)}));
    }else if(item.type==='ellipse'){
      canvas.append(svgNode('ellipse',{...attrs,cx:item.x+item.width/2,cy:item.y+item.height/2,
        rx:Math.abs(item.width/2),ry:Math.abs(item.height/2)}));
    }else if(item.type==='text'&&typeof item.text==='string'){
      const t=svgNode('text',{x:item.x,y:item.y+20,fill:attrs.stroke,'font-size':20});
      t.textContent=item.text.slice(0,1000);canvas.append(t);
    }
  }
  target.append(canvas);
}
function downloadScene(scene){
  const blob=new Blob([JSON.stringify(normalizeScene(scene)||emptyScene(),null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download='orbit-drawing.excalidraw';document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
}
export function openSceneEditor(initial,{title='Drawing',onSave,notify=()=>{}}={}){
  let scene=normalizeScene(initial)||emptyScene(),active=null,embedded=null,disposed=false;
  const dialog=document.createElement('dialog');dialog.className='orbit-scene-dialog';
  const panel=document.createElement('div');panel.className='orbit-scene-panel';
  const heading=document.createElement('h2');heading.textContent=title;
  const help=document.createElement('p');help.textContent='Draw here or use Export, edit the file at Excalidraw.com, and Import it back. Image files are not supported yet.';
  const bar=document.createElement('div');bar.className='orbit-scene-tools';
  const surface=document.createElement('div');surface.className='orbit-scene-surface';
  const preview=document.createElement('div');preview.className='orbit-scene-preview';surface.append(preview);
  const repaint=()=>renderScene({...scene,elements:active?[...scene.elements,active]:scene.elements},preview);
  const button=(label,handler,parent=bar)=>{const b=document.createElement('button');b.type='button';
    b.className='glass-button';b.textContent=label;b.addEventListener('click',handler);parent.append(b);return b;};
  button('Undo',()=>{scene={...scene,elements:scene.elements.slice(0,-1)};repaint();});
  button('Export .excalidraw',()=>downloadScene(scene));
  const file=document.createElement('input');file.type='file';file.accept='.excalidraw,.json,application/json';file.hidden=true;
  file.addEventListener('change',async()=>{
    try{const selected=file.files?.[0];if(!selected)return;if(selected.size>180000)throw Error('File exceeds 180 KB.');
      scene=normalizeScene(JSON.parse(await selected.text()));repaint();notify('Drawing imported. Save it to keep the changes.');
    }catch(e){notify('Drawing import failed: '+e.message);}finally{file.value='';}
  });
  button('Import .excalidraw',()=>file.click());
  button('Edit externally at Excalidraw.com',()=>{downloadScene(scene);
    window.open('https://excalidraw.com/','_blank','noopener,noreferrer');
    notify('Import the downloaded file into Excalidraw, export it when done, then import the updated file here.');});
  // The actual upstream React Excalidraw editor loads ONLY on an explicit click.
  // Both Journal and spatial stickies enter through this same shared function.
  const fullButton=button('Open full Excalidraw inside ORBIT',async()=>{
    if(disposed||embedded||fullButton.disabled)return;
    fullButton.disabled=true;
    const previousHelp=help.textContent;
    help.textContent='Loading the locally hosted official Excalidraw editor…';
    let host=null,mounted=null;
    try{
      const adapter=await import('./excalidraw-adapter.js');
      if(disposed||!dialog.open)return;
      const initialData=adapter.createEmbeddedInitialData(scene);
      const stylesheetHref=new URL('./excalidraw-island.css',import.meta.url).href;
      let stylesheet=document.querySelector('link[data-orbit-excalidraw-styles]');
      if(!stylesheet){
        stylesheet=document.createElement('link');
        stylesheet.rel='stylesheet';
        stylesheet.href=stylesheetHref;
        stylesheet.dataset.orbitExcalidrawStyles='loading';
        const loaded=new Promise((resolve,reject)=>{
          stylesheet.onload=()=>{stylesheet.dataset.orbitExcalidrawStyles='ready';resolve();};
          stylesheet.onerror=()=>{stylesheet.remove();reject(Error('Excalidraw styles unavailable.'));};
        });
        document.head.append(stylesheet);
        await loaded;
      }else if(stylesheet.dataset.orbitExcalidrawStyles==='loading'){
        await new Promise((resolve,reject)=>{
          stylesheet.addEventListener('load',resolve,{once:true});
          stylesheet.addEventListener('error',()=>reject(Error('Excalidraw styles unavailable.')),{once:true});
        });
      }
      if(disposed||!dialog.open)return;
      // No remote CDN or executable inline scripts: the font asset path is same-origin.
      window.EXCALIDRAW_ASSET_PATH=new URL('../assets/excalidraw/',import.meta.url).href;
      const {mountEmbeddedEditor}=await import('./excalidraw-island.js');
      if(disposed||!dialog.open)return;
      host=document.createElement('div');host.className='orbit-excalidraw-host';
      surface.replaceChildren(host);
      surface.classList.add('orbit-scene-surface--embedded');
      let latest={elements:initialData.elements,appState:initialData.appState,files:{}};
      mounted=mountEmbeddedEditor(host,{
        initialData,theme:adapter.embeddedEditorTheme(document.documentElement.dataset.theme),
        uiOptions:adapter.embeddedEditorOptions,
        onChange:(elements,appState,files)=>{if(!disposed)latest={elements,appState,files};},
      });
      embedded={dispose:mounted.dispose,read:()=>adapter.captureEmbeddedScene(
        latest.elements,latest.appState,latest.files)};
      help.textContent='Full Excalidraw: draw shapes, arrows, text and freehand. Images/remote embeds await private media support. Use Save drawing below to keep changes.';
      bar.style.display='none';
    }catch(error){
      mounted?.dispose?.();
      if(!disposed&&dialog.open){
        embedded=null;
        surface.classList.remove('orbit-scene-surface--embedded');
        surface.replaceChildren(preview);
        repaint();bar.style.display='';
        help.textContent=previousHelp;
        notify('Full Excalidraw unavailable in this build: '+error.message+'. The original pen editor is still available.');
      }
    }finally{if(!disposed&&!embedded)fullButton.disabled=false;}
  });
  const footer=document.createElement('div');footer.className='orbit-scene-footer';
  const close=()=>{if(dialog.open)dialog.close();else dialog.remove();};
  button('Cancel',close,footer);
  button('Save drawing',()=>{
    try{
      const saved=embedded?embedded.read():normalizeScene(scene);
      if(embedded){
        const savedIds=new Set(saved.elements.map(item=>item.id));
        const disappeared=scene.elements.filter(item=>!item.isDeleted&&!savedIds.has(item.id));
        if(disappeared.length&&!window.confirm(
          'Saving would remove '+disappeared.length+' existing drawing element(s). Continue? Cancel to keep the original drawing unchanged.'))
          return;
      }
      onSave?.(saved);close();
    }catch(e){notify('Drawing not saved: '+e.message);}
  },footer);
  panel.append(heading,help,bar,surface,file,footer);dialog.append(panel);document.body.append(dialog);
  const point=e=>{const r=preview.getBoundingClientRect();return [
    Math.max(0,Math.min(800,Math.round((e.clientX-r.left)*800/r.width))),
    Math.max(0,Math.min(460,Math.round((e.clientY-r.top)*460/r.height)))];};
  preview.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;e.preventDefault();e.stopPropagation();preview.setPointerCapture(e.pointerId);
    const [x,y]=point(e);
    active={type:'freedraw',id:'orbit_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8),
      x,y,width:0,height:0,angle:0,strokeColor:'#745943',backgroundColor:'transparent',
      fillStyle:'solid',strokeWidth:2,strokeStyle:'solid',roughness:0,opacity:100,seed:1,
      version:1,versionNonce:1,isDeleted:false,groupIds:[],points:[[0,0]],pressures:[],simulatePressure:false};
    repaint();
  });
  preview.addEventListener('pointermove',e=>{
    if(!active||active.points.length>=2000)return;
    const [x,y]=point(e);active.points.push([x-active.x,y-active.y]);
    active.width=x-active.x;active.height=y-active.y;repaint();
  });
  preview.addEventListener('pointerup',()=>{if(!active)return;
    scene={...scene,elements:[...scene.elements,active]};active=null;repaint();});
  preview.addEventListener('pointercancel',()=>{active=null;repaint();});
  dialog.addEventListener('close',()=>{disposed=true;embedded?.dispose?.();embedded=null;dialog.remove();});
  dialog.showModal();repaint();return dialog;
}
