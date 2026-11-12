/* Shared .excalidraw scene interchange for journals and spatial stickies.
 * EX-02 keeps binary image assets in authenticated private Storage; scenes save
 * only bounded fileId -> owner-scoped file references, never data URLs.
 */
import { normalizeTaskChecklist } from './model.js';
import { normalizeExtraWidgetLayout } from './widget-registry.js';
import { normalizeProjects } from './projects.js';
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
    !object(scene.files)||Object.keys(scene.files).length>32||!Array.isArray(scene.elements)||scene.elements.length>400)
    throw Error('Invalid drawing scene or too many elements or image references.');
  const serial=JSON.stringify(scene);
  if(serial.length>180000)throw Error('Drawing is larger than 180 KB.');
  for(const [id,file] of Object.entries(scene.files)){
    if(!validId(id)||!object(file)||Object.keys(file).length!==2||
      !Object.hasOwn(file,'path')||!Object.hasOwn(file,'mimeType'))
      throw Error('Invalid private canvas image reference.');
    const path=assertImagePath(file.path);
    const extension=path.split('.').at(-1).toLowerCase();
    const type={png:'image/png',jpg:'image/jpeg',webp:'image/webp'}[extension];
    if(file.mimeType!==type)throw Error('Canvas image MIME and file path disagree.');
  }
  for(const item of scene.elements){
    if(!object(item)||!validId(item.id)||typeof item.type!=='string'||!coord(item.x)||
      !coord(item.y)||!coord(item.width)||!coord(item.height))throw Error('Invalid drawing element.');
    if(item.points!==undefined&&(!Array.isArray(item.points)||item.points.length>2000||item.points.some(p=>
      !Array.isArray(p)||p.length<2||!coord(p[0])||!coord(p[1]))))throw Error('Invalid drawing points.');
    if(item.text!==undefined&&(typeof item.text!=='string'||item.text.length>4000))throw Error('Invalid drawing text.');
    if(['embeddable','iframe'].includes(item.type))throw Error('Remote embeds are not allowed.');
    if(item.type==='image'&&(!validId(item.fileId)||!Object.hasOwn(scene.files,item.fileId)))
      throw Error('Canvas image requires an authenticated private file reference.');
  }
  return JSON.parse(serial);
}
export function normalizeExtensions(raw={}){
  if(raw===undefined||raw===null)raw={};
  if(!object(raw)||JSON.stringify(raw).length>900000)throw Error('Invalid or oversized workspace extensions.');
  const notes=raw.notes??[],taskLinks=raw.taskLinks??{},journalScenes=raw.journalScenes??{},journalImages=raw.journalImages??{},journalModes=raw.journalModes??{},journalPaperStyles=raw.journalPaperStyles??{};
  const taskChecklists=raw.taskChecklists??{};
  const spatialWidgets=normalizeExtraWidgetLayout(raw.spatialWidgets);
  const projects=normalizeProjects(raw.projects);
  const rawAppearance=raw.appearance??{};
  if(!object(rawAppearance)||!['parchment','garden','frost','celestial','ember','tidepool','sundown','sakura','graphite','linen'].includes(rawAppearance.theme??'parchment')||
     !['system','off'].includes(rawAppearance.motion??'system')||
     (rawAppearance.ambient!==undefined&&typeof rawAppearance.ambient!=='boolean'))throw Error('Invalid workspace appearance.');
  const appearance={theme:rawAppearance.theme??'parchment',motion:rawAppearance.motion??'system',
    ambient:rawAppearance.ambient??false};
  if(!Array.isArray(notes)||notes.length>80||!object(taskLinks)||Object.keys(taskLinks).length>10000||
     !object(journalScenes)||Object.keys(journalScenes).length>600||!object(journalImages)||Object.keys(journalImages).length>600||
     !object(journalModes)||Object.keys(journalModes).length>600||
     !object(journalPaperStyles)||Object.keys(journalPaperStyles).length>600||
     !object(taskChecklists)||Object.keys(taskChecklists).length>10000)throw Error('Invalid workspace extensions.');
  const ids=new Set();
  const cleanNotes=notes.map(n=>{
    if(!object(n)||!validId(n.id)||ids.has(n.id)||typeof n.text!=='string'||n.text.length>6000||
      typeof n.title!=='string'||n.title.length>100||!coord(n.x)||!coord(n.y)||
      !Number.isFinite(n.width)||n.width<220||n.width>5000||
      !Number.isFinite(n.height)||n.height<160||n.height>5000||
      !['sand','peach','lavender','mint'].includes(n.color)||
      (n.mode!==undefined&&!['write','canvas'].includes(n.mode)))throw Error('Invalid sticky note.');
    ids.add(n.id);
    return {id:n.id,title:n.title,text:n.text,x:n.x,y:n.y,width:n.width,height:n.height,color:n.color,
      ...(n.mode==='canvas'?{mode:'canvas'}:{}),
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
  const pageModes={};
  for(const [id,mode] of Object.entries(journalModes)){
    if(!validId(id)||mode!=='canvas')throw Error('Invalid journal content mode.');
    pageModes[id]='canvas';
  }
  const pagePaper={};
  for(const [id,style] of Object.entries(journalPaperStyles)){
    if(!validId(id)||!['plain','grid'].includes(style))throw Error('Invalid journal paper texture.');
    pagePaper[id]=style;
  }
  const images={};
  for(const [id,path] of Object.entries(journalImages)){
    if(!validId(id))throw Error('Invalid journal image ID.');
    images[id]=assertImagePath(path);
  }
  return {notes:cleanNotes,taskLinks:links,taskChecklists:checklists,journalScenes:scenes,journalImages:images,
    ...(Object.keys(pageModes).length?{journalModes:pageModes}:{}),
    ...(Object.keys(pagePaper).length?{journalPaperStyles:pagePaper}:{}),spatialWidgets,projects,appearance};
}
/** Fit the entire retained drawing, not an arbitrary 800×460 crop. No mutation. */
export function scenePreviewBounds(scene){
  const elements=(normalizeScene(scene)?.elements||[]).filter(item=>!item.isDeleted);
  if(!elements.length)return {x:0,y:0,width:800,height:460};
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  const add=(x,y)=>{
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    minX=Math.min(minX,x);minY=Math.min(minY,y);
    maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
  };
  for(const item of elements){
    const x=item.x,y=item.y,w=item.width,h=item.height;
    add(x,y);add(x+w,y+h);add(x+w,y);add(x,y+h);
    // A freehand path can extend outside the element's stored width/height,
    // including strokes drawn upwards and to the left of the starting point.
    if(Array.isArray(item.points))for(const p of item.points)add(x+p[0],y+p[1]);
    if(item.type==='text'){
      const font=Math.min(120,Math.max(8,item.fontSize||20));
      const lines=String(item.text||'').split('\n');
      add(x+Math.max(Math.abs(w),Math.max(...lines.map(v=>v.length),1)*font*.58),y+
        Math.max(Math.abs(h),font*1.3*lines.length));
    }
  }
  if(!Number.isFinite(minX))return {x:0,y:0,width:800,height:460};
  const padding=32;
  const width=Math.max(180,maxX-minX+padding*2);
  const height=Math.max(132,maxY-minY+padding*2);
  const x=(minX+maxX-width)/2,y=(minY+maxY-height)/2;
  return {x,y,width,height};
}
const fontFamilies={1:'Virgil, Excalifont, cursive',2:'Arial, Helvetica, sans-serif',
  3:'Cascadia, monospace',5:'Excalifont, cursive',6:'Nunito, sans-serif',
  7:'Lilita One, sans-serif',8:'Comic Shanns, monospace',9:'Liberation Sans, sans-serif',
  10:'Assistant, sans-serif'};
let previewFontSheet=null;
function ensureCanvasPreviewFonts(){
  if(previewFontSheet||document.querySelector('link[data-orbit-excalidraw-styles]'))return;
  const style=document.createElement('link');style.rel='stylesheet';
  style.href=new URL('./excalidraw-island.css',import.meta.url).href;
  style.dataset.orbitExcalidrawStyles='loading';
  style.onload=()=>{style.dataset.orbitExcalidrawStyles='ready';};
  style.onerror=()=>{style.remove();previewFontSheet=null;};
  document.head.append(style);previewFontSheet=style;
}
export function renderScene(scene,target,{media=null}={}){
  target.replaceChildren();
  scene=normalizeScene(scene);if(!scene||!scene.elements.length)return;
  const b=scenePreviewBounds(scene);
  const canvas=svgNode('svg',{viewBox:[b.x,b.y,b.width,b.height].join(' '),
    preserveAspectRatio:'xMidYMid meet',role:'img','aria-label':'Full drawing preview'});
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
    }else if(item.type==='image'){
      const file=scene.files[item.fileId];
      const x=Math.min(item.x,item.x+item.width),y=Math.min(item.y,item.y+item.height);
      const width=Math.abs(item.width),height=Math.abs(item.height);
      const outline=svgNode('rect',{x,y,width,height,fill:color('#ded8cf'),stroke:color('#8e8378'),'stroke-width':1});
      const image=svgNode('image',{x,y,width,height,preserveAspectRatio:'none'});
      if(Number.isFinite(item.angle)&&item.angle){
        const degrees=item.angle*180/Math.PI,cx=x+width/2,cy=y+height/2;
        const flip=Array.isArray(item.scale)&&item.scale.length===2&&item.scale.every(v=>v===1||v===-1)?item.scale:[1,1];
        image.setAttribute('transform',`translate(${cx} ${cy}) rotate(${degrees}) scale(${flip[0]} ${flip[1]}) translate(${-cx} ${-cy})`);
      }
      canvas.append(outline,image);
      if(file&&media?.previewUrl){
        Promise.resolve().then(()=>media.previewUrl(file.path)).then(url=>{
          if(image.isConnected&&target.firstChild===canvas)image.setAttribute('href',url);
        }).catch(()=>{image.setAttribute('aria-label','Private image unavailable');});
      }
    }else if(item.type==='text'&&typeof item.text==='string'){
      ensureCanvasPreviewFonts();
      const font=Math.min(120,Math.max(8,item.fontSize||20));
      const family=fontFamilies[item.fontFamily]||fontFamilies[5];
      const align=['center','right'].includes(item.textAlign)?item.textAlign:'left';
      const lineHeight=Number.isFinite(item.lineHeight)?Math.min(2,Math.max(1,item.lineHeight)):1.25;
      const anchor=align==='center'?'middle':align==='right'?'end':'start';
      const textX=item.x+(align==='center'?item.width/2:align==='right'?item.width:0);
      const t=svgNode('text',{x:textX,y:item.y+font,fill:attrs.stroke,
        'font-family':family,'font-size':font,'text-anchor':anchor,
        'font-weight':item.fontFamily===7?700:400});
      if(Number.isFinite(item.angle)&&item.angle){
        const centerX=item.x+item.width/2,centerY=item.y+item.height/2;
        t.setAttribute('transform',`rotate(${item.angle*180/Math.PI} ${centerX} ${centerY})`);
      }
      String(item.text).slice(0,4000).split('\n').forEach((line,i)=>{
        const span=svgNode('tspan',{x:textX,dy:i?font*lineHeight:0});
        span.textContent=line;t.append(span);
      });
      canvas.append(t);
    }
  }
  target.append(canvas);
}
function downloadScene(scene){
  if(Object.keys(normalizeScene(scene)?.files||{}).length)
    throw Error('Use Download full backup (.orbit) to include all private canvas image bytes.');
  const blob=new Blob([JSON.stringify(normalizeScene(scene)||emptyScene(),null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download='orbit-drawing.excalidraw';document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
}
/** Run at most one paint per display frame while keeping pointer samples in memory.
 * flush() renders the final stroke before Save or pointer capture release.
 * No animation is needed in reduced-motion mode; input correctness is unchanged. */
export function createFrameCoalescer(paint,{requestFrame=callback=>requestAnimationFrame(callback),
  cancelFrame=handle=>cancelAnimationFrame(handle)}={}){
  if(typeof paint!=='function')throw Error('A paint callback is required.');
  let handle=null,disposed=false;
  const cancel=()=>{if(handle!==null){cancelFrame(handle);handle=null;}};
  return {
    request(){
      if(disposed||handle!==null)return;
      handle=requestFrame(()=>{handle=null;if(!disposed)paint();});
    },
    flush(){if(disposed)return;cancel();paint();},
    cancel,
    dispose(){disposed=true;cancel();}
  };
}
/** PointerEvent.getCoalescedEvents retains fine pen strokes on fast tablets. */
export function pointerSamples(event){
  const samples=event?.getCoalescedEvents?.();
  return Array.isArray(samples)&&samples.length?samples:[event];
}
export function openSceneEditor(initial,{title='Drawing',onSave,notify=()=>{},media=null}={}){
  let scene=normalizeScene(initial)||emptyScene(),active=null,embedded=null,disposed=false;
  const dialog=document.createElement('dialog');dialog.className='orbit-scene-dialog';
  const panel=document.createElement('div');panel.className='orbit-scene-panel';
  const heading=document.createElement('h2');heading.textContent=title;
  const help=document.createElement('p');help.textContent='Opening your full drawing canvas. Text, shapes, arrows and freehand belong together here.';
  const bar=document.createElement('div');bar.className='orbit-scene-tools';
  const surface=document.createElement('div');surface.className='orbit-scene-surface';
  const preview=document.createElement('div');preview.className='orbit-scene-preview';surface.append(preview);
  const repaint=()=>renderScene({...scene,elements:active?[...scene.elements,active]:scene.elements},preview,{media});
  const strokePaint=createFrameCoalescer(()=>{if(!disposed&&!embedded)repaint();});
  const button=(label,handler,parent=bar)=>{const b=document.createElement('button');b.type='button';
    b.className='glass-button';b.textContent=label;b.addEventListener('click',handler);parent.append(b);return b;};
  button('Undo',()=>{scene={...scene,elements:scene.elements.slice(0,-1)};repaint();});
  button('Export .excalidraw',()=>{try{downloadScene(scene);}catch(error){notify(error.message,6500);}});
  const file=document.createElement('input');file.type='file';file.accept='.excalidraw,.json,application/json';file.hidden=true;
  file.addEventListener('change',async()=>{
    try{const selected=file.files?.[0];if(!selected)return;if(selected.size>180000)throw Error('File exceeds 180 KB.');
      scene=normalizeScene(JSON.parse(await selected.text()));repaint();notify('Drawing imported. Save it to keep the changes.');
    }catch(e){notify('Drawing import failed: '+e.message);}finally{file.value='';}
  });
  button('Import .excalidraw',()=>file.click());
  button('Edit externally at Excalidraw.com',()=>{try{downloadScene(scene);}catch(error){notify(error.message,6500);return;}
    window.open('https://excalidraw.com/','_blank','noopener,noreferrer');
    notify('Import the downloaded file into Excalidraw, export it when done, then import the updated file here.');});
  // Full upstream Excalidraw is the DEFAULT editor for both Journals and Stickies;
  // the old minimal pen remains a local fallback only if the editor fails to load.
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
      initialData.files=await adapter.loadEmbeddedFiles(scene,{media});
      if(disposed||!dialog.open)return;
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
      strokePaint.cancel();surface.replaceChildren(host);
      surface.classList.add('orbit-scene-surface--embedded');
      let latest={elements:initialData.elements,appState:initialData.appState,files:initialData.files};
      mounted=mountEmbeddedEditor(host,{
        initialData,theme:adapter.embeddedEditorTheme(document.documentElement.dataset.theme),
        uiOptions:adapter.embeddedEditorOptions,
        onChange:(elements,appState,files)=>{if(!disposed)latest={elements,appState,files};},
      });
      embedded={dispose:mounted.dispose,currentElements:()=>latest.elements,read:()=>adapter.captureEmbeddedSceneWithMedia(
        latest.elements,latest.appState,latest.files,{media,originalScene:scene})};
      help.textContent='Draw and place text, arrows, shapes and private images anywhere. Save drawing stores images privately, with the full .orbit backup carrying their bytes.';
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
  let saving=false;
  const saveDrawing=button('Save drawing',async()=>{
    if(saving||disposed)return;
    saving=true;saveDrawing.disabled=true;saveDrawing.textContent='Saving private canvas…';
    try{
      if(embedded){
        const savedIds=new Set(embedded.currentElements().filter(el=>!el.isDeleted).map(el=>el.id));
        const disappeared=scene.elements.filter(el=>!el.isDeleted&&!savedIds.has(el.id));
        if(disappeared.length&&!window.confirm(
          'Saving would remove '+disappeared.length+' drawing element(s). Continue? Cancel to keep the original unchanged.'))return;
      }
      const saved=embedded?await embedded.read():normalizeScene(scene);
      if(disposed)return;
      await onSave?.(saved);close();
    }catch(error){if(!disposed)notify('Drawing not saved: '+error.message,6500);}
    finally{saving=false;if(!disposed){saveDrawing.disabled=false;saveDrawing.textContent='Save drawing';}}
  },footer);
  panel.append(heading,help,bar,surface,file,footer);dialog.append(panel);document.body.append(dialog);
  const point=(e,r=preview.getBoundingClientRect())=>[
    Math.max(0,Math.min(800,Math.round((e.clientX-r.left)*800/r.width))),
    Math.max(0,Math.min(460,Math.round((e.clientY-r.top)*460/r.height)))];
  preview.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;e.preventDefault();e.stopPropagation();preview.setPointerCapture(e.pointerId);
    const [x,y]=point(e);
    active={type:'freedraw',id:'orbit_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8),
      x,y,width:0,height:0,angle:0,strokeColor:'#745943',backgroundColor:'transparent',
      fillStyle:'solid',strokeWidth:2,strokeStyle:'solid',roughness:0,opacity:100,seed:1,
      version:1,versionNonce:1,isDeleted:false,groupIds:[],points:[[0,0]],pressures:[],simulatePressure:false};
    strokePaint.flush();
  });
  preview.addEventListener('pointermove',e=>{
    if(!active||active.points.length>=2000)return;
    const bounds=preview.getBoundingClientRect();
    for(const sample of pointerSamples(e)){
      if(active.points.length>=2000)break;
      const [x,y]=point(sample,bounds);
      active.points.push([x-active.x,y-active.y]);
      active.width=x-active.x;active.height=y-active.y;
    }
    strokePaint.request();
  });
  const finishStroke=()=>{if(!active)return;
    scene={...scene,elements:[...scene.elements,active]};active=null;strokePaint.flush();};
  preview.addEventListener('pointerup',finishStroke);
  preview.addEventListener('lostpointercapture',finishStroke);
  preview.addEventListener('pointercancel',()=>{if(!active)return;active=null;strokePaint.flush();});
  dialog.addEventListener('close',()=>{disposed=true;strokePaint.dispose();embedded?.dispose?.();embedded=null;dialog.remove();});
  dialog.showModal();repaint();
  // Lazy load on the user's explicit Draw/Edit canvas action, no second click.
  // If the official island cannot mount, preserve the original scene and leave
  // the fallback pen plus import/export controls operable.
  queueMicrotask(()=>{if(!disposed&&dialog.open)fullButton.click();});
  return dialog;
}
