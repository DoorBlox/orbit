import { markStorageIssue,isStorageWriteBlocked } from './storage.js';
import { DEFAULT_WIDGET_REGISTRY,CORE_WIDGET_IDS,extendWidgetRegistry,normalizeExtraWidgetLayout } from './widget-registry.js';
/* The spatial scrapbook is one coordinate space. Widgets are positions, never page sections. */
const KEY='orbit.v5.spatial-layout';
const SIZE_KEY='orbit.v6.spatial-sizes';
const CAMERA_KEY='orbit.v5.spatial-camera';
const WORLD={w:2990,h:2740};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function readSizes(registry){try{
  const data=JSON.parse(localStorage.getItem(SIZE_KEY)||'{}');const output={};
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error();
  for(const [id,size] of Object.entries(data))
    if(!registry.has(id)||!Number.isFinite(size?.w)||!Number.isFinite(size?.h))
      markStorageIssue(SIZE_KEY,'Some saved sizes need recovery.');
  for(const id of registry.ids){
    const lim=registry.get(id).limits;
    if(Number.isFinite(data[id]?.w)&&Number.isFinite(data[id]?.h))
      output[id]={w:clamp(data[id].w,lim.minW,lim.maxW),h:clamp(data[id].h,lim.minH,lim.maxH)};
  }
  return output;
}catch{markStorageIssue(SIZE_KEY,'Saved sizes need recovery.');return {};}}
const prefersReduce=()=>globalThis.document?.documentElement?.dataset?.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;
function readPositions(registry){try{
  const data=JSON.parse(localStorage.getItem(KEY)||'{}'),next=registry.defaults();
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error();
  for(const [id,pos] of Object.entries(data))
    if(!registry.has(id)||!Number.isFinite(pos?.x)||!Number.isFinite(pos?.y))
      markStorageIssue(KEY,'Some saved positions need recovery.');
  for(const id of registry.ids)
    if(data[id]&&Number.isFinite(data[id].x)&&Number.isFinite(data[id].y))
      next[id]={x:clamp(data[id].x,-5000,7500),y:clamp(data[id].y,-5000,7500)};
  return next;
}catch{markStorageIssue(KEY,'Saved positions need recovery.');return registry.defaults();}}
export function clampNavigatorPercent(value,pixels,diameter=31){
  const inset=Math.min(49,(diameter/2+2)/Math.max(1,pixels)*100);
  return clamp(value,inset,100-inset);
}
export function navigatorWorldPoint(px,py,bounds){
  const x=clamp(px,0,1),y=clamp(py,0,1);
  return {x:bounds.x0+(bounds.x1-bounds.x0)*x,y:bounds.y0+(bounds.y1-bounds.y0)*y};
}
export function navigatorGrabOffset(pointer,center,size){
  const {x,y}=pointer??{}, {x:cx,y:cy}=center??{};
  const {width,height}=size??{};
  if(![x,y,cx,cy,width,height].every(Number.isFinite)||width<=0||height<=0)return null;
  const dx=x-cx,dy=y-cy;
  // A small tolerance makes the viewport outline touchable without grabbing
  // the map for a tap significantly outside it.
  if(Math.abs(dx)>width/2+2||Math.abs(dy)>height/2+2)return null;
  return {x:dx,y:dy};
}
export class SpatialBoard {
  constructor({notify=()=>{},initialLayout,readOnly=false,persistLocally=true,onLayoutChange=()=>{},
    optionalWidgetLayout={},onOptionalLayoutChange=()=>{},widgetRegistry=DEFAULT_WIDGET_REGISTRY}={}){
    if(!widgetRegistry||!Array.isArray(widgetRegistry.ids)||
       typeof widgetRegistry.get!=='function'||typeof widgetRegistry.defaults!=='function')
      throw Error('A validated spatial widget registry is required.');
    this.widgetRegistry=widgetRegistry;
    this.defaultInlineSizes=new Map();
    this.extraIds=new Set(widgetRegistry.ids.filter(id=>!CORE_WIDGET_IDS.includes(id)));
    this.optionalLayout=normalizeExtraWidgetLayout(optionalWidgetLayout);
    this.onOptionalLayoutChange=onOptionalLayoutChange;
    this.defaultPositions=widgetRegistry.defaults();
    this.limits=Object.fromEntries(widgetRegistry.ids.map(id=>[id,widgetRegistry.get(id).limits]));
    this.icons=Object.fromEntries(widgetRegistry.ids.map(id=>[id,widgetRegistry.get(id).icon]));
    this.readOnly=readOnly;this.persistLocally=persistLocally;this.onLayoutChange=onLayoutChange;this.events=new AbortController();
    this.notify=notify;
    this.viewport=document.getElementById('spatial-viewport');this.world=document.getElementById('spatial-world');
    this.positions=initialLayout?structuredClone(this.defaultPositions):readPositions(widgetRegistry);this.sizes=initialLayout?{}:readSizes(widgetRegistry);
    for(const id of this.extraIds){
      const saved=this.optionalLayout[id],def=widgetRegistry.get(id);
      this.positions[id]={x:saved?.x??def.position.x,y:saved?.y??def.position.y};
      if(saved?.width!==undefined){
        const lim=def.limits;
        this.sizes[id]={w:clamp(saved.width,lim.minW,lim.maxW),h:clamp(saved.height,lim.minH,lim.maxH)};
      }
    }
    this.scale=1;this.pan={x:0,y:0};this.gesture=null;this.pointers=new Map();this.raf=0;
    this.widgets=new Map();this.stickyNotes=[];this.navPointer=null;this.navDragStart=null;
    this.nav=document.getElementById('space-nav-map');
    // Keep touch drag gestures in the map even if style bundles or theme overrides lag.
    // Native panning must never cancel the active pointer stream on hybrid devices.
    this.nav.style.setProperty('touch-action','none','important');
    this.nav.tabIndex=0;this.nav.setAttribute('role','group');
    this.nav.setAttribute('aria-label','Spatial map: click or drag to travel, arrow keys to move the focus');
    this.navContainer=this.nav.closest('.space-navigator');this.navToggle=document.getElementById('space-nav-toggle');
    this.navToggle?.addEventListener('click',()=>{
      const open=this.navContainer.classList.toggle('is-open');this.navToggle.setAttribute('aria-expanded',String(open));
      this.navToggle.setAttribute('aria-label',open?'Close places map':'Open places map');
    });
    for(const id of this.widgetRegistry.ids){
      const widget=this.world.querySelector('[data-widget="'+id+'"]');
      if(widget)this.attachWidget(id,widget);
    }
    this.buildNavigator();
    this.nav.addEventListener('pointerdown',e=>this.startNavigatorPan(e),{signal:this.events.signal});
    // Hybrid touchscreen laptops sometimes lose pointer capture when a finger
    // leaves the mini-map. Keep tracking on the window until up/cancel/blur.
    window.addEventListener('pointermove',e=>this.moveNavigatorPan(e),{
      passive:false,signal:this.events.signal});
    window.addEventListener('pointerup',e=>this.endNavigatorPan(e),{signal:this.events.signal});
    window.addEventListener('pointercancel',e=>this.endNavigatorPan(e),{signal:this.events.signal});
    window.addEventListener('blur',()=>this.cancelNavigatorPan(),{signal:this.events.signal});
    this.nav.addEventListener('keydown',e=>{
      if(e.target!==this.nav)return;
      const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
      if(!d){if(e.key==='Home'){e.preventDefault();this.fitAll();}return;}
      e.preventDefault();const {w,h}=this.viewportSize();
      const shift=e.shiftKey?270:90;
      this.pan.x-=d[0]*shift*this.scale;this.pan.y-=d[1]*shift*this.scale;
      cancelAnimationFrame(this.raf);this.raf=0;this.render();
    },{signal:this.events.signal});
    if(typeof ResizeObserver!=='undefined'){
      this.navigatorObserver=new ResizeObserver(()=>this.drawNavigatorCursor());
      this.navigatorObserver.observe(this.nav);
    }
    this.viewport.addEventListener('pointerdown',e=>this.startPan(e));
    this.viewport.addEventListener('pointermove',e=>this.onPointerMove(e));
    this.viewport.addEventListener('pointerup',e=>this.onPointerEnd(e));
    this.viewport.addEventListener('pointercancel',e=>this.onPointerEnd(e));
    this.viewport.addEventListener('wheel',e=>this.onWheel(e),{passive:false});
    // CSS transforms do not bring offscreen controls into view when Tab focuses them.
    this.viewport.addEventListener('focusin',e=>{
      if(e.target.matches(':focus-visible'))this.ensureVisible(e.target);
    });
    document.getElementById('board-zoom-in').addEventListener('click',()=>this.zoomBy(1.23));
    document.getElementById('board-zoom-out').addEventListener('click',()=>this.zoomBy(1/1.23));
    document.getElementById('board-home').addEventListener('click',()=>this.fitAll());
    window.addEventListener('resize',()=>this.render(),{signal:this.events.signal});
    if(initialLayout)this.setLayout(initialLayout,{persist:false});
    this.render();
    // Open near the constellation and leave adjacent glass objects discoverable by drifting sideways.
    this.raf=requestAnimationFrame(()=>{this.raf=0;this.focus('constellation',{initial:true});});
  }

  /** A DOM node must come from first-party UI code, never from a saved snapshot. */
  attachWidget(id,widget){
    if(this.widgets.has(id)||widget.parentElement!==this.world||
       widget.dataset.widget!==id||!widget.classList.contains('spatial-item')||
       !widget.querySelector('.widget-heading .widget-grip'))
      throw Error('Invalid spatial widget mount.');
    this.widgets.set(id,widget);
    if(this.extraIds.has(id))this.defaultInlineSizes.set(id,{
      width:widget.style.getPropertyValue('width'),height:widget.style.getPropertyValue('height'),
      widthPriority:widget.style.getPropertyPriority('width'),
      heightPriority:widget.style.getPropertyPriority('height')
    });
    widget.hidden=this.extraIds.has(id)&&this.optionalLayout[id]?.hidden===true;
    this.position(id);this.applySize(id);
    const grip=widget.querySelector('.widget-grip');
    grip.addEventListener('keydown',e=>this.moveViaKeyboard(e,id),{signal:this.events.signal});
    const heading=widget.querySelector('.widget-heading');
    heading.addEventListener('pointerdown',e=>{
      if(e.target.closest('button:not(.widget-grip),input,textarea,select,a,[contenteditable],.timeline-tools,.utility-bar'))return;
      this.dragStart(e,id,heading);
    },{signal:this.events.signal});
    heading.addEventListener('dblclick',e=>{
      if(e.target.closest('button:not(.widget-grip),input'))return;this.focus(id);
    },{signal:this.events.signal});
    const resizer=document.createElement('button');
    resizer.className='widget-resizer';resizer.type='button';
    resizer.setAttribute('aria-label','Resize '+id+' widget. Arrow keys change width or height.');
    resizer.title='Drag corner to resize · Arrow keys resize';
    resizer.innerHTML='<span aria-hidden="true">╱</span>';
    widget.append(resizer);
    if(this.readOnly){resizer.disabled=true;grip.disabled=true;}
    resizer.addEventListener('pointerdown',e=>this.resizeStart(e,id,resizer),{signal:this.events.signal});
    resizer.addEventListener('keydown',e=>this.resizeViaKeyboard(e,id),{signal:this.events.signal});
    if(this.extraIds.has(id)){
      const hide=document.createElement('button');
      hide.type='button';hide.className='widget-hide glass-button small';
      hide.textContent='Hide';
      hide.setAttribute('aria-label','Hide '+id+' widget');
      hide.disabled=this.readOnly;
      heading.append(hide);
      hide.addEventListener('click',()=>this.setWidgetVisible(id,false),{signal:this.events.signal});
    }
  }
  /** A real seventh first-party DOM widget can be mounted without changing V6 layout. */
  registerWidget(descriptor,element){
    if(this.disposed||!descriptor||this.widgetRegistry.has(descriptor.id)||
       !(element instanceof HTMLElement)||element.dataset.widget!==descriptor.id||
       !element.classList.contains('spatial-item')||
       !element.querySelector('.widget-heading .widget-grip')||
       (element.parentElement&&element.parentElement!==this.world))
      throw Error('Invalid or duplicate optional widget.');
    const next=extendWidgetRegistry(this.widgetRegistry,descriptor);
    const id=descriptor.id,def=next.get(id),saved=this.optionalLayout[id];
    this.widgetRegistry=next;this.extraIds.add(id);
    this.defaultPositions[id]={...def.position};this.limits[id]=def.limits;this.icons[id]=def.icon;
    this.positions[id]={x:saved?.x??def.position.x,y:saved?.y??def.position.y};
    if(saved?.width!==undefined){
      const lim=def.limits;
      this.sizes[id]={w:clamp(saved.width,lim.minW,lim.maxW),h:clamp(saved.height,lim.minH,lim.maxH)};
    }
    if(!element.parentElement)this.world.append(element);
    this.attachWidget(id,element);this.buildNavigator();
    return true;
  }
  /** Unknown optional IDs are inert until their first-party DOM is mounted. */
  getOptionalWidgetLayout(){
    const result=normalizeExtraWidgetLayout(this.optionalLayout);
    for(const id of this.extraIds){
      const element=this.widgets.get(id),position=this.positions[id];
      if(!element||!position)continue;
      const size=this.sizes[id];
      result[id]={x:position.x,y:position.y,
        ...(size?{width:size.w,height:size.h}:{}),hidden:element.hidden};
    }
    return normalizeExtraWidgetLayout(result);
  }
  setOptionalWidgetLayout(layout,{persist=false}={}){
    this.optionalLayout=normalizeExtraWidgetLayout(layout);
    for(const id of this.extraIds){
      const descriptor=this.widgetRegistry.get(id),saved=this.optionalLayout[id],element=this.widgets.get(id);
      this.positions[id]={x:saved?.x??descriptor.position.x,y:saved?.y??descriptor.position.y};
      if(saved?.width!==undefined){
        const lim=descriptor.limits;
        this.sizes[id]={w:clamp(saved.width,lim.minW,lim.maxW),h:clamp(saved.height,lim.minH,lim.maxH)};
      }else delete this.sizes[id];
      if(element){element.hidden=saved?.hidden===true;this.position(id);this.applySize(id);}
    }
    this.buildNavigator();
    if(persist)this.saveOptionalLayout();
  }
  setWidgetVisible(id,visible){
    if(this.readOnly||this.disposed||!this.extraIds.has(id)||typeof visible!=='boolean')return false;
    const element=this.widgets.get(id);if(!element)return false;
    if(element.hidden===!visible)return true;
    if(!visible&&element.contains(document.activeElement)){
      this.navToggle?.focus({preventScroll:true});
      this.navContainer?.classList.add('is-open');
      this.navToggle?.setAttribute('aria-expanded','true');
      this.navToggle?.setAttribute('aria-label','Close places map');
    }
    element.hidden=!visible;
    this.saveOptionalLayout();this.buildNavigator();
    return true;
  }
  saveOptionalLayout(){
    if(this.readOnly)return false;
    const next=this.getOptionalWidgetLayout();
    this.optionalLayout=next;
    this.onOptionalLayoutChange(structuredClone(next));
    return true;
  }
  getLayout(){
    const out={};
    for(const id of CORE_WIDGET_IDS){
      const p=this.positions[id];if(!p)continue;
      out[id]={...p,...(this.sizes[id]?{width:this.sizes[id].w,height:this.sizes[id].h}:{})};
    }
    return out;
  }
  setLayout(value,{persist=true}={}){
    const safe={...this.positions};
    for(const id of CORE_WIDGET_IDS){
      const pos=this.defaultPositions[id],given=value?.[id];
      safe[id]={x:Number.isFinite(given?.x)?clamp(given.x,-5000,7500):pos.x,
        y:Number.isFinite(given?.y)?clamp(given.y,-5000,7500):pos.y};
    }
    this.positions=safe;
    this.sizes=Object.fromEntries([...this.extraIds].filter(id=>this.sizes[id]).map(id=>[id,this.sizes[id]]));
    for(const id of CORE_WIDGET_IDS){
      const lim=this.limits[id];
      const obj=value?.[id];if(Number.isFinite(obj?.width)&&Number.isFinite(obj?.height))
        this.sizes[id]={w:clamp(obj.width,lim.minW,lim.maxW),h:clamp(obj.height,lim.minH,lim.maxH)};
    }
    for(const id of this.widgets.keys()){this.position(id);this.applySize(id);}
    if(persist)this.save();this.render();this.buildNavigator();
  }
  save(id=null){
    if(this.readOnly)return false;
    if(id&&this.extraIds.has(id))return this.saveOptionalLayout();
    if(!this.persistLocally){this.onLayoutChange(this.getLayout());return false;}
    try{
      if(isStorageWriteBlocked(KEY)||isStorageWriteBlocked(SIZE_KEY))throw Error();
      const legacy=this.getLayout();
      localStorage.setItem(KEY,JSON.stringify(Object.fromEntries(
        Object.entries(legacy).map(([key,p])=>[key,{x:p.x,y:p.y}]))));
      localStorage.setItem(SIZE_KEY,JSON.stringify(Object.fromEntries(
        Object.entries(legacy).filter(([,p])=>p.width!==undefined)
          .map(([key,p])=>[key,{w:p.width,h:p.height}]))));
      return true;
    }catch{this.notify('Layout not saved on this device. Export a backup to keep your changes.');return false;}
  }
  applySize(id){const item=this.widgets.get(id),s=this.sizes[id];if(!item)return;
    if(!s){
      const original=this.defaultInlineSizes.get(id);
      if(original){
        for(const key of ['width','height']){
          const value=original[key];
          if(value)item.style.setProperty(key,value,original[key+'Priority']);
          else item.style.removeProperty(key);
        }
      }else{item.style.removeProperty('width');item.style.removeProperty('height');}
      return;
    }
    item.style.setProperty('width',`${s.w}px`,'important');item.style.setProperty('height',`${s.h}px`,'important');
  }
  widgetSize(id){const el=this.widgets.get(id);return {w:el.offsetWidth,h:el.offsetHeight};}
  position(id){const item=this.widgets.get(id),p=this.positions[id];if(!item||!p)return;
    item.style.left=`${p.x}px`;item.style.top=`${p.y}px`;
  }
  viewportSize(){return {w:this.viewport.clientWidth||innerWidth,h:this.viewport.clientHeight||innerHeight};}
  setStickyNotes(notes=[]){
    if(this.disposed)return;
    this.stickyNotes=Array.isArray(notes)?notes.filter(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)&&
      Number.isFinite(n.width)&&Number.isFinite(n.height)).slice(0,80).map(n=>({
        id:String(n.id),title:String(n.title||'Untitled note'),x:n.x,y:n.y,width:n.width,height:n.height
      })):[];
    this.buildNavigator();
  }
  focusCoordinate(x,y,{scale=Math.max(.7,Math.min(1.12,this.scale))}={}){
    const {w,h}=this.viewportSize();
    this.animate({scale,x:w/2-x*scale,y:h/2-y*scale},420);
  }
  navigatorToWorld(e){
    if(!this.navBounds)return;
    const rect=this.nav.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    const point=navigatorWorldPoint((e.clientX-rect.left)/rect.width,(e.clientY-rect.top)/rect.height,this.navBounds);
    const {w,h}=this.viewportSize();
    cancelAnimationFrame(this.raf);this.raf=0;
    this.pan={x:w/2-point.x*this.scale,y:h/2-point.y*this.scale};
    this.render();
  }
  startNavigatorPan(e){
    if(this.disposed||this.navPointer!==null||
      (e.button!==0&&e.pointerType!=='touch')||e.target.closest('button'))return;
    e.preventDefault();e.stopPropagation();
    this.navPointer=e.pointerId;
    const cursor=this.nav.querySelector('#space-nav-cursor');
    const box=cursor?.getBoundingClientRect(),rect=this.nav.getBoundingClientRect();
    const offset=box?navigatorGrabOffset({x:e.clientX,y:e.clientY},
      {x:(box.left+box.right)/2,y:(box.top+box.bottom)/2},
      {width:box.width,height:box.height}):null;
    this.navDragStart=offset&&rect.width&&rect.height&&this.navBounds?{
      x:e.clientX,y:e.clientY,pan:{...this.pan},rect,
      bounds:{...this.navBounds},scale:this.scale
    }:null;
    try{this.nav.setPointerCapture(e.pointerId);}catch{}
    this.nav.classList.add('is-dragging');
    // Tap outside the outline keeps direct travel. Grabbing the outline must
    // NOT snap the camera to the finger, including when the cursor is clamped.
    if(!this.navDragStart)this.navigatorToWorld(e);
  }
  moveNavigatorPan(e){
    if(e.pointerId!==this.navPointer)return;
    e.preventDefault();
    const drag=this.navDragStart;
    if(!drag){this.navigatorToWorld(e);return;}
    const dx=(e.clientX-drag.x)/drag.rect.width*(drag.bounds.x1-drag.bounds.x0);
    const dy=(e.clientY-drag.y)/drag.rect.height*(drag.bounds.y1-drag.bounds.y0);
    cancelAnimationFrame(this.raf);this.raf=0;
    this.pan={x:drag.pan.x-dx*drag.scale,y:drag.pan.y-dy*drag.scale};
    this.render();
  }
  endNavigatorPan(e){
    if(e.pointerId!==this.navPointer)return;
    this.cancelNavigatorPan();
  }
  cancelNavigatorPan(){
    const id=this.navPointer;
    if(id==null)return;
    this.navPointer=null;this.navDragStart=null;this.nav?.classList?.remove('is-dragging');
    try{if(this.nav?.hasPointerCapture?.(id))this.nav.releasePointerCapture(id);}catch{}
  }
  render(){this.world.style.transform=`translate3d(${this.pan.x.toFixed(2)}px,${this.pan.y.toFixed(2)}px,0) scale(${this.scale.toFixed(4)})`;
    document.getElementById('board-scale-label').textContent=`${Math.round(this.scale*100)}%`;
    this.drawNavigatorCursor();
  }
  focus(id,{initial=false}={}){
    const item=this.widgets.get(id),p=this.positions[id];if(!item)return;
    if(item.hidden&&this.extraIds.has(id))this.setWidgetVisible(id,true);
    const {w,h}=this.viewportSize(),sw=item.offsetWidth,sh=item.offsetHeight;
    let scale;
    if(id==='constellation')scale=w<650?.94:clamp(Math.min((w-140)/sw,(h-135)/sh),.55,.90);
    else scale=w<650?clamp((w-24)/sw,.60,1):clamp(Math.min((w-200)/sw,(h-170)/sh),.7,1.07);
    // On a phone, zoom the map itself so tasks are legible. The spatial navigator still provides a global overview.
    const cx=p.x+sw/2,cy=p.y+sh/2;
    const target={scale,x:w/2-cx*scale,y:h/2-cy*scale};
    // Keep the heading reachable in short landscape windows without shrinking text.
    // Tab and spatial panning reveal the lower controls; saved coordinates stay intact.
    if(id!=='constellation'&&sh*scale>h-104)target.y=80-p.y*scale;
    // Cloud controls reserve viewport space. Keep quick capture reachable on
    // short phones without shrinking the graph or changing saved coordinates.
    if(id==='constellation'&&!this.persistLocally){
      const capture=item.querySelector('.capture-form');
      if(capture){
        const widgetRect=item.getBoundingClientRect(),captureRect=capture.getBoundingClientRect();
        const localBottom=(captureRect.bottom-widgetRect.top)/Math.max(this.scale,.001);
        const bottom=target.y+(p.y+localBottom)*scale;
        if(bottom>h-24)target.y-=bottom-(h-24);
      }
    }
    this.animate(target,initial?0:520);
  }
  ensureVisible(control){
    const rect=control.getBoundingClientRect(),view=this.viewport.getBoundingClientRect();
    const {w,h}=this.viewportSize(),left=view.left+24,right=view.left+w-24;
    const top=view.top+80,bottom=view.top+h-24;
    const dx=rect.left<left?left-rect.left:rect.right>right?right-rect.right:0;
    const dy=rect.top<top?top-rect.top:rect.bottom>bottom?bottom-rect.bottom:0;
    if(!dx&&!dy)return;
    cancelAnimationFrame(this.raf);this.pan.x+=dx;this.pan.y+=dy;this.render();
  }
  fitAll(){const pad=65,{w,h}=this.viewportSize();let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    for(const [id,item] of this.widgets){if(item.hidden)continue;const p=this.positions[id];x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x+item.offsetWidth);y1=Math.max(y1,p.y+item.offsetHeight);}
    for(const note of this.stickyNotes){x0=Math.min(x0,note.x);y0=Math.min(y0,note.y);x1=Math.max(x1,note.x+note.width);y1=Math.max(y1,note.y+note.height);}
    const scale=clamp(Math.min((w-pad*2)/Math.max(1,x1-x0),(h-pad*2)/Math.max(1,y1-y0)),.06,1.25);
    this.animate({scale,x:w/2-((x0+x1)/2)*scale,y:h/2-((y0+y1)/2)*scale},600);
  }
  animate(target,duration=350){cancelAnimationFrame(this.raf);
    this.raf=0;if(this.disposed)return;
    const finish=()=>{this.raf=0;this.scale=target.scale;this.pan={x:target.x,y:target.y};this.render();};
    if(duration===0||prefersReduce()){finish();return;}
    const from={x:this.pan.x,y:this.pan.y,scale:this.scale};const start=performance.now();
    const frame=now=>{this.raf=0;if(this.disposed)return;if(prefersReduce()){finish();return;}
      const t=clamp((now-start)/duration,0,1),e=1-Math.pow(1-t,3);
      this.pan.x=from.x+(target.x-from.x)*e;this.pan.y=from.y+(target.y-from.y)*e;this.scale=from.scale+(target.scale-from.scale)*e;
      this.render();if(t<1)this.raf=requestAnimationFrame(frame);
    };this.raf=requestAnimationFrame(frame);
  }
  zoomBy(mult,cx,cy){cancelAnimationFrame(this.raf);const {w,h}=this.viewportSize();cx??=w/2;cy??=h/2;
    const next=clamp(this.scale*mult,.08,2.2),anchorX=(cx-this.pan.x)/this.scale,anchorY=(cy-this.pan.y)/this.scale;
    this.scale=next;this.pan={x:cx-anchorX*next,y:cy-anchorY*next};this.render();
  }
  startPan(e){
    if(e.button!==0&&e.pointerType!=='touch')return;
    if(e.target.closest('.spatial-item,.space-navigator,.world-nav,button,input,textarea,[contenteditable]'))return;
    cancelAnimationFrame(this.raf);
    try{this.viewport.setPointerCapture(e.pointerId);}catch{}
    this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(this.pointers.size===2){const [a,b]=[...this.pointers.values()];const r=this.viewport.getBoundingClientRect(),mx=(a.x+b.x)/2-r.left,my=(a.y+b.y)/2-r.top;
      this.gesture={type:'pinch',dist:Math.hypot(a.x-b.x,a.y-b.y),scale:this.scale,anchor:{x:(mx-this.pan.x)/this.scale,y:(my-this.pan.y)/this.scale}};return;
    }
    this.gesture={type:'pan',id:e.pointerId,startX:e.clientX,startY:e.clientY,panX:this.pan.x,panY:this.pan.y};this.viewport.classList.add('is-panning');
  }
  onPointerMove(e){if(!this.pointers.has(e.pointerId)||!this.gesture)return;
    this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const g=this.gesture;
    if(g.type==='pinch'&&this.pointers.size>=2){const [a,b]=[...this.pointers.values()],r=this.viewport.getBoundingClientRect();
      const ratio=Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,g.dist),scale=clamp(g.scale*ratio,.08,2.2);
      const mx=(a.x+b.x)/2-r.left,my=(a.y+b.y)/2-r.top;
      this.scale=scale;this.pan={x:mx-g.anchor.x*scale,y:my-g.anchor.y*scale};this.render();return;}
    if(g.type==='pan'&&g.id===e.pointerId){this.pan={x:g.panX+e.clientX-g.startX,y:g.panY+e.clientY-g.startY};this.render();}
  }
  onPointerEnd(e){if(!this.pointers.has(e.pointerId))return;this.pointers.delete(e.pointerId);
    if(this.pointers.size===0){this.gesture=null;this.viewport.classList.remove('is-panning');}
    else if(this.gesture?.type==='pinch'&&this.pointers.size===1){const p=[...this.pointers.entries()][0];this.gesture={type:'pan',id:p[0],startX:p[1].x,startY:p[1].y,panX:this.pan.x,panY:this.pan.y};}
  }
  onWheel(e){
    if(e.target.closest('.map-viewport,.timeline-scroll,.rail-task-list,.journal-editor,.journal-paper input'))return;
    e.preventDefault();cancelAnimationFrame(this.raf);const rect=this.viewport.getBoundingClientRect();
    if(e.ctrlKey||e.metaKey){this.zoomBy(Math.exp(-e.deltaY*.0018),e.clientX-rect.left,e.clientY-rect.top);return;}
    this.pan.x-=e.deltaX;this.pan.y-=e.deltaY;this.render();
  }
  dragStart(e,id,handle){if(this.readOnly)return;
    if(e.button!==0&&e.pointerType!=='touch')return;e.preventDefault();e.stopPropagation();cancelAnimationFrame(this.raf);
    const p=this.positions[id];this.drag={id,handle,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,origin:{...p}};
    handle.setPointerCapture?.(e.pointerId);handle.classList.add('dragging');
    const move=ev=>{if(ev.pointerId!==this.drag?.pointer)return;
      const dx=(ev.clientX-this.drag.startX)/this.scale,dy=(ev.clientY-this.drag.startY)/this.scale;
      this.positions[id]={x:this.drag.origin.x+dx,y:this.drag.origin.y+dy};this.position(id);this.drawNavigatorCursor();};
    const end=ev=>{if(ev.pointerId!==this.drag?.pointer)return;
      handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',end);
      handle.classList.remove('dragging');this.drag=null;this.save(id);this.buildNavigator();};
    handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
  }
  resizeStart(e,id,handle){if(this.readOnly)return;
    if(e.button!==0&&e.pointerType!=='touch')return;
    e.preventDefault();e.stopPropagation();cancelAnimationFrame(this.raf);
    const lim=this.limits[id],size=this.widgetSize(id);if(!lim)return;
    const origin={...size};const pointer=e.pointerId,startX=e.clientX,startY=e.clientY;
    handle.setPointerCapture?.(pointer);handle.classList.add('is-resizing');
    const move=ev=>{if(ev.pointerId!==pointer)return;
      const next={w:clamp(origin.w+(ev.clientX-startX)/this.scale,lim.minW,lim.maxW),h:clamp(origin.h+(ev.clientY-startY)/this.scale,lim.minH,lim.maxH)};
      this.sizes[id]=next;this.applySize(id);this.drawNavigatorCursor();
      if(id==='constellation')this.onWidgetResize?.(id);
    };
    const end=ev=>{if(ev.pointerId!==pointer)return;
      handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',end);
      handle.classList.remove('is-resizing');this.save(id);this.buildNavigator();this.onWidgetResize?.(id);
    };
    handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
  }
  resizeViaKeyboard(e,id){if(this.readOnly)return;const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!d)return;
    e.preventDefault();e.stopPropagation();const lim=this.limits[id],size=this.widgetSize(id),step=e.shiftKey?100:24;
    this.sizes[id]={w:clamp(size.w+d[0]*step,lim.minW,lim.maxW),h:clamp(size.h+d[1]*step,lim.minH,lim.maxH)};
    this.applySize(id);this.save(id);this.buildNavigator();this.onWidgetResize?.(id);
  }
  moveViaKeyboard(e,id){if(this.readOnly)return;const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!d)return;
    e.preventDefault();e.stopPropagation();const n=e.shiftKey?100:24;
    this.positions[id].x+=d[0]*n;this.positions[id].y+=d[1]*n;this.position(id);this.save(id);this.buildNavigator();
  }
  buildNavigator(){
    this.nav.replaceChildren();
    const spots=[...this.widgets.keys()].map(id=>{const p=this.positions[id],el=this.widgets.get(id);
      return {id,x:p.x+el.offsetWidth/2,y:p.y+el.offsetHeight/2,hidden:el.hidden};});
    const notes=this.stickyNotes.map(n=>({id:n.id,title:n.title,x:n.x+n.width/2,y:n.y+n.height/2}));
    const all=[...spots,...notes];
    if(!all.length)return;
    const x0=Math.min(...all.map(s=>s.x))-350,x1=Math.max(...all.map(s=>s.x))+350;
    const y0=Math.min(...all.map(s=>s.y))-300,y1=Math.max(...all.map(s=>s.y))+300;
    this.navBounds={x0,x1,y0,y1};
    const place=(x,y,element)=>{element.style.left=`${(x-x0)/(x1-x0)*100}%`;
      element.style.top=`${(y-y0)/(y1-y0)*100}%`;};
    const caption=document.getElementById('space-nav-caption');
    for(const spot of spots){
      const btn=document.createElement('button');btn.type='button';btn.className=`space-point space-point-${spot.id}`;
      place(spot.x,spot.y,btn);
      btn.textContent=this.icons[spot.id]||'·';btn.classList.toggle('is-hidden',spot.hidden);
      btn.title=spot.hidden?`Reopen ${spot.id} widget`:`Go to ${spot.id}`;
      btn.setAttribute('aria-label',spot.hidden?`Reopen ${spot.id} widget`:`Go to ${spot.id} widget`);
      btn.addEventListener('click',()=>{this.focus(spot.id);this.navContainer.classList.remove('is-open');
        this.navToggle?.setAttribute('aria-expanded','false');this.navToggle?.setAttribute('aria-label','Open places map');});
      btn.addEventListener('pointerenter',()=>{caption.textContent=spot.id.replace('-',' ');});
      btn.addEventListener('pointerleave',()=>{caption.textContent='drag the outline to travel';});
      this.nav.append(btn);
    }
    for(const note of notes){
      const btn=document.createElement('button');btn.type='button';btn.className='space-point space-point-sticky';
      btn.textContent='▤';place(note.x,note.y,btn);btn.title=`Go to sticky note: ${note.title}`;
      btn.setAttribute('aria-label',`Go to sticky note: ${note.title}`);
      btn.addEventListener('click',()=>this.focusCoordinate(note.x,note.y));
      btn.addEventListener('pointerenter',()=>{caption.textContent=note.title;});
      btn.addEventListener('pointerleave',()=>{caption.textContent='drag the outline to travel';});
      this.nav.append(btn);
    }
    const cursor=document.createElement('div');cursor.id='space-nav-cursor';cursor.className='space-nav-cursor';
    cursor.setAttribute('aria-hidden','true');this.nav.append(cursor);this.drawNavigatorCursor();
  }
  drawNavigatorCursor(){if(!this.navBounds)return;const el=document.getElementById('space-nav-cursor');if(!el)return;
    const {w,h}=this.viewportSize(),wx=(w/2-this.pan.x)/this.scale,wy=(h/2-this.pan.y)/this.scale,{x0,x1,y0,y1}=this.navBounds;
    el.style.left=`${clampNavigatorPercent((wx-x0)/(x1-x0)*100,this.nav.clientWidth||180)}%`;
    el.style.top=`${clampNavigatorPercent((wy-y0)/(y1-y0)*100,this.nav.clientHeight||90)}%`;
  }
  dispose(){this.disposed=true;this.cancelNavigatorPan();this.navigatorObserver?.disconnect();cancelAnimationFrame(this.raf);this.raf=0;this.events.abort();this.pointers.clear();this.widgets.clear();}

}
