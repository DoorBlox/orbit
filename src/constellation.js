import { createLayout,getDisplayBounds } from './layout.js';
import { branchPath,descendantsOf } from './data.js';
import { taskColor,sortedProjectTasks,dueLabel,formatDate,STATUS,STATUS_LABEL,validateHttpUrl } from './model.js';

const node=(tag,className='',text=null)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==null)el.textContent=text;return el;};
const clamp=(n,low,high)=>Math.min(high,Math.max(low,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const reduceMotion=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
const hoverPossible=()=>matchMedia('(hover:hover) and (pointer:fine)').matches;
const NS='http://www.w3.org/2000/svg';

export class Constellation {
  constructor({viewport,world,edgesEl,nodesEl,decorEl,onBranchSelected,onBranchAdd,onBranchRename,onBranchMove,onTaskSelected,onTaskUpdate,onTaskDelete}) {
    Object.assign(this,{viewport,world,edgesEl,nodesEl,decorEl,onBranchSelected,onBranchAdd,onBranchRename,onBranchMove,onTaskSelected,onTaskUpdate,onTaskDelete});
    this.branches=[];this.tasks=[];this.mode='deadline';this.layout=createLayout([],[]);this.bounds=getDisplayBounds(this.layout);
    this.nodeMap=new Map();this.stackMap=new Map();this.domNodes=new Map();this.domStacks=new Map();this.edgeEntries=[];
    this.camera={x:0,y:0,scale:.2};this.cameraAnimation=0;this.springAnimation=0;
    this.focusedNode='';this.expandedTaskId='';this.selectedTaskId='';this.offsets=new Map();
    this.pointerPositions=new Map();this.gesture=null;this.mapInitialized=false;this.atOverview=true;this.matchIds=null;this.lastBackgroundTap=null;
    this.width=innerWidth;this.height=innerHeight;
    this.labelLayer=node('div','overview-label-layer');this.viewport.append(this.labelLayer);this.overviewLabels=new Map();
    this.decorate();this.attachEvents();
    this.observer=new ResizeObserver(()=>this.onResize());this.observer.observe(this.viewport);this.onResize();
  }
  decorate(){
    const ring=node('div','world-ring inner');this.decorEl.append(ring);
    this.decorEl.append(node('div','world-ring outer'));
  }
  setData(branches,tasks,mode='deadline'){
    const focus=this.focusedNode;
    this.branches=branches;this.tasks=tasks;this.mode=mode;
    this.layout=createLayout(branches,tasks);this.bounds=getDisplayBounds(this.layout);
    this.nodeMap=new Map(this.layout.nodes.map(n=>[n.id,n]));
    this.stackMap=new Map(this.layout.stacks.map(s=>[s.branchId,s]));
    if(!this.nodeMap.has(focus))this.focusedNode='';
    this.render();
  }
  onResize(){this.width=this.viewport.offsetWidth||this.viewport.clientWidth;this.height=this.viewport.offsetHeight||this.viewport.clientHeight;
    if(!this.mapInitialized||this.atOverview){this.camera={x:0,y:0,scale:this.fitScale()};this.mapInitialized=true;}
    this.applyCamera();
  }
  fitScale(){
    const padX=this.width<600?30:78;
    const padY=this.width<600?50:65;
    return clamp(Math.min(Math.max(1,this.width-padX)/(2*this.bounds.halfWidth),Math.max(1,this.height-padY)/(2*this.bounds.halfHeight)),.008,.95);
  }
  fitAll(){this.atOverview=true;this.focusedNode='';this.animateCamera({x:0,y:0,scale:this.fitScale()},450);this.applySelectedStyles();}
  getCamera(){return {...this.camera};}
  applyCamera(){this.world.style.transform=`translate3d(${this.camera.x.toFixed(2)}px,${this.camera.y.toFixed(2)}px,0) scale(${this.camera.scale.toFixed(4)})`;
    this.world.dataset.detail=this.camera.scale>.92?'near':this.camera.scale>.5?'mid':'far';
    this.updateOverviewLabels();}
  focusNode(id,{instant=false}={}){
    const item=this.nodeMap.get(id);if(!item)return;
    this.focusedNode=id;this.atOverview=false;
    const compact=this.width<650;
    let point={x:item.x,y:item.y};let scale;
    if(id==='root')scale=compact?1.12:1.35;
    else if(this.stackMap.has(id)){
      const s=this.stackMap.get(id);
      // On phones, center the terminal list at readable scale; structural node remains on the map.
      if(compact){point={x:s.x,y:s.y+Math.min(95,s.estimatedHeight/2)};scale=clamp((this.width-28)/285,.80,1.32);}
      else {point={x:item.x*.26+s.x*.74,y:item.y*.26+(s.y+Math.min(80,s.estimatedHeight/2))*.74};scale=1.12;}
    } else {scale=compact?1.08:1.13;}
    const target={x:-point.x*scale,y:-point.y*scale+(compact&&id!=='root'&&this.stackMap.has(id)?42:0),scale};
    if(instant){cancelAnimationFrame(this.cameraAnimation);this.camera=target;this.applyCamera();}
    else this.animateCamera(target,500);
    this.applySelectedStyles();
  }
  focusTask(task,{instant=false}={}){
    const s=this.stackMap.get(task.projectId);if(!s)return;
    this.focusedNode=task.projectId;this.atOverview=false;
    const scale=this.width<650?clamp((this.width-28)/285,.80,1.32):1.15;
    const target={x:-s.x*scale,y:-(s.y+Math.min(85,s.estimatedHeight/2))*scale,scale};
    if(instant){cancelAnimationFrame(this.cameraAnimation);this.camera=target;this.applyCamera();}
    else this.animateCamera(target,470);
    this.applySelectedStyles();
  }
  hostScale(){const r=this.viewport.getBoundingClientRect();return Math.max(.001,r.width/Math.max(1,this.width));}
  zoomBy(multiplier,cx,cy){
    cancelAnimationFrame(this.cameraAnimation);
    const r=this.viewport.getBoundingClientRect(),hs=this.hostScale();const lx=((cx??r.left+r.width/2)-r.left)/hs-this.width/2,ly=((cy??r.top+r.height/2)-r.top)/hs-this.height/2;
    this.atOverview=false;const old=this.camera.scale,scale=clamp(old*multiplier,.008,2.65);if(old===scale)return;
    const wx=(lx-this.camera.x)/old,wy=(ly-this.camera.y)/old;
    this.camera={x:lx-wx*scale,y:ly-wy*scale,scale};this.applyCamera();
  }
  animateCamera(target,duration=450){
    cancelAnimationFrame(this.cameraAnimation);this.cameraAnimation=0;if(this.disposed)return;
    if(reduceMotion()||duration<=0){this.camera={...target};this.applyCamera();return;}
    const start=performance.now(),from={...this.camera};
    const tick=(time)=>{
      this.cameraAnimation=0;if(this.disposed)return;
      if(reduceMotion()){this.camera={...target};this.applyCamera();return;}
      const t=clamp((time-start)/duration,0,1),e=1-Math.pow(1-t,3);
      this.camera={x:from.x+(target.x-from.x)*e,y:from.y+(target.y-from.y)*e,scale:from.scale+(target.scale-from.scale)*e};
      this.applyCamera();if(t<1)this.cameraAnimation=requestAnimationFrame(tick);
    };this.cameraAnimation=requestAnimationFrame(tick);
  }
  screenToWorld(x,y){const r=this.viewport.getBoundingClientRect(),hs=this.hostScale();return {x:((x-r.left)/hs-this.width/2-this.camera.x)/this.camera.scale,y:((y-r.top)/hs-this.height/2-this.camera.y)/this.camera.scale};}
  attachEvents(){
    this.viewport.addEventListener('wheel',e=>{e.preventDefault();cancelAnimationFrame(this.cameraAnimation);this.zoomBy(Math.exp(-e.deltaY*.0012),e.clientX,e.clientY);},{passive:false});
    for(const event of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])this.viewport.addEventListener(event,e=>this[event==='pointerdown'?'pointerDown':event==='pointermove'?'pointerMove':'pointerUp'](e));
  }
  pointerDown(e){
    if(e.button!==0&&e.pointerType!=='touch')return;
    if(e.target.closest('.task-stack,.node-actions,.node-inline-editor,.overview-label'))return;
    cancelAnimationFrame(this.cameraAnimation);
    this.viewport.setPointerCapture?.(e.pointerId);
    this.pointerPositions.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(this.pointerPositions.size>=2){
      const [a,b]=[...this.pointerPositions.values()],r=this.viewport.getBoundingClientRect();
      const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      this.gesture={type:'pinch',startDistance:distance(a,b),startScale:this.camera.scale,anchorWorld:this.screenToWorld(mid.x,mid.y),rect:r};
      this.viewport.classList.add('is-grabbing');return;
    }
    const clicked=e.target.closest('.graph-node'),id=clicked?.dataset.id;
    this.gesture={type:id?'node':'pan',nodeId:id||null,pointerId:e.pointerId,start:{x:e.clientX,y:e.clientY},startCamera:{...this.camera},moved:false,
      startOffset:id?{...(this.offsets.get(id)||{x:0,y:0,vx:0,vy:0})}:null};
    this.viewport.classList.add('is-grabbing');
  }
  pointerMove(e){
    if(!this.pointerPositions.has(e.pointerId))return;
    this.pointerPositions.set(e.pointerId,{x:e.clientX,y:e.clientY});const g=this.gesture;if(!g)return;
    if(g.type==='pinch'){
      if(this.pointerPositions.size<2)return;
      const [a,b]=[...this.pointerPositions.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      const scale=clamp(g.startScale*(distance(a,b)/Math.max(1,g.startDistance)),.008,2.65);
      this.atOverview=false;
      const hs=this.hostScale();this.camera={scale,x:(mid.x-g.rect.left)/hs-this.width/2-g.anchorWorld.x*scale,y:(mid.y-g.rect.top)/hs-this.height/2-g.anchorWorld.y*scale};
      this.applyCamera();return;
    }
    if(g.pointerId!==e.pointerId)return;
    const hs=this.hostScale(),dx=(e.clientX-g.start.x)/hs,dy=(e.clientY-g.start.y)/hs;if(Math.hypot(dx,dy)>5)g.moved=true;
    if(g.type==='pan'&&g.moved){this.atOverview=false;this.camera={...this.camera,x:g.startCamera.x+dx,y:g.startCamera.y+dy};this.applyCamera();}
    if(g.type==='node'&&g.moved){this.offsets.set(g.nodeId,{x:g.startOffset.x+dx/this.camera.scale,y:g.startOffset.y+dy/this.camera.scale,vx:0,vy:0});this.applyOffsets();}
  }
  pointerUp(e){
    if(!this.pointerPositions.has(e.pointerId))return;
    this.pointerPositions.delete(e.pointerId);const g=this.gesture;
    if(g?.type==='pinch'){if(this.pointerPositions.size<2){this.gesture=null;this.viewport.classList.remove('is-grabbing');}return;}
    if(g?.pointerId!==e.pointerId)return;
    this.gesture=null;this.viewport.classList.remove('is-grabbing');
    if(g.type==='node'){
      if(g.moved)this.startSpring();
      else if(e.type==='pointerup') {this.focusNode(g.nodeId);this.onBranchSelected?.(g.nodeId);}
    }else if(g.type==='pan'&&!g.moved&&e.type==='pointerup'&&e.pointerType==='touch'){
      const now=performance.now(),p=this.lastBackgroundTap;
      if(p&&now-p.time<350&&Math.hypot(e.clientX-p.x,e.clientY-p.y)<40){this.lastBackgroundTap=null;this.zoomBy(1.85,e.clientX,e.clientY);}
      else this.lastBackgroundTap={time:now,x:e.clientX,y:e.clientY};
    }
  }
  effectiveOffset(id){
    const o=this.offsets.get(id)||{x:0,y:0};let x=o.x,y=o.y;
    for(const [i,anc] of (this.layout.ancestry.get(id)||[]).entries()){
      const v=this.offsets.get(anc);if(v){const weight=i===0?.4:.19;x+=v.x*weight;y+=v.y*weight;}
    }return {x,y};
  }
  stackOffset(id){const o=this.effectiveOffset(id);return {x:o.x*.88,y:o.y*.88};}
  startSpring(){
    cancelAnimationFrame(this.springAnimation);this.springAnimation=0;if(this.disposed)return;
    if(reduceMotion()){this.offsets.clear();this.applyOffsets();return;}
    // Keep the original 60Hz spring, independent of display refresh rate.
    // At most four steps catch up after a background pause; never replay seconds.
    const stepMs=1000/60;let previous=performance.now(),accumulator=0;
    const tick=now=>{
      this.springAnimation=0;if(this.disposed)return;
      if(this.gesture?.type==='node')return;
      if(reduceMotion()){this.offsets.clear();this.applyOffsets();return;}
      accumulator+=clamp(now-previous,0,stepMs*4);previous=now;
      let moving=this.offsets.size>0;
      while(accumulator>=stepMs-1e-7&&moving){
        accumulator=Math.max(0,accumulator-stepMs);moving=false;
        for(const [id,p] of [...this.offsets]){
          const k=.088,friction=.77;p.vx=(p.vx-p.x*k)*friction;p.vy=(p.vy-p.y*k)*friction;p.x+=p.vx;p.y+=p.vy;
          if(Math.hypot(p.x,p.y)+Math.hypot(p.vx,p.vy)<.10)this.offsets.delete(id);
          else {this.offsets.set(id,p);moving=true;}
        }
      }
      this.applyOffsets();if(moving)this.springAnimation=requestAnimationFrame(tick);
    };this.springAnimation=requestAnimationFrame(tick);
  }
  applyOffsets(){
    for(const [id,el] of this.domNodes){const p=this.effectiveOffset(id);el.style.transform=`translate(-50%,-50%) translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`;}
    for(const [id,el] of this.domStacks){const p=this.stackOffset(id);el.style.transform=`translate(-50%,0) translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`;}
    for(const entry of this.edgeEntries){
      const a=this.nodeMap.get(entry.from),b=entry.toStack?this.stackMap.get(entry.to):this.nodeMap.get(entry.to);if(!a||!b)continue;
      const o=this.effectiveOffset(a.id),p=entry.toStack?this.stackOffset(b.branchId):this.effectiveOffset(b.id);
      const x1=a.x+o.x,y1=a.y+o.y,x2=(entry.toStack?b.attachX:b.x)+p.x,y2=(entry.toStack?b.attachY:b.y)+p.y;
      const dx=x2-x1,dy=y2-y1,dist=Math.hypot(dx,dy)||1;
      // A restrained elastic curve; no arbitrary loops or decorative tangles.
      const sweep=entry.toStack?8:17, nx=-dy/dist,ny=dx/dist;
      const cx=(x1+x2)/2+nx*sweep,cy=(y1+y2)/2+ny*sweep;
      entry.path.setAttribute('d',`M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
    }
  }
  render(){
    const active=document.activeElement;
    const activeTask=active?.closest('.task-row'),activeNode=active?.closest('.graph-node');
    const focusId=this.nodesEl.contains(active)?{task:activeTask?.dataset.taskId,branch:activeNode?.dataset.id,
      action:active?.getAttribute('aria-label'),button:active?.textContent}:null;
    this.nodesEl.replaceChildren();this.edgesEl.replaceChildren();this.domNodes.clear();this.domStacks.clear();this.edgeEntries=[];
    // Allocate SVG proportional to the real hierarchy, not a 24,000-pixel
    // graphic on every phone. Paths retain world-coordinate units.
    const half=Math.ceil(Math.max(1480,this.bounds.halfWidth,this.bounds.halfHeight,this.layout.RADIUS+440));
    this.edgesEl.style.left=`-${half}px`;this.edgesEl.style.top=`-${half}px`;
    this.edgesEl.style.width=`${half*2}px`;this.edgesEl.style.height=`${half*2}px`;
    this.edgesEl.setAttribute('viewBox',`${-half} ${-half} ${half*2} ${half*2}`);
    for(const [from,to] of this.layout.edges){const target=this.nodeMap.get(to);if(!target)continue;
      const path=document.createElementNS(NS,'path');path.classList.add('connection-path');path.setAttribute('stroke',target.color);path.setAttribute('stroke-opacity','.49');
      this.edgesEl.appendChild(path);this.edgeEntries.push({from,to,path});
    }
    for(const s of this.layout.stacks){const path=document.createElementNS(NS,'path');path.classList.add('connection-path','terminal-path');path.setAttribute('stroke',s.color);path.setAttribute('stroke-opacity','.39');
      this.edgesEl.appendChild(path);this.edgeEntries.push({from:s.branchId,to:s.branchId,path,toStack:true});}
    for(const n of this.layout.nodes){const el=this.buildNode(n);this.nodesEl.append(el);this.domNodes.set(n.id,el);}
    for(const s of this.layout.stacks){const el=this.buildStack(s);this.nodesEl.append(el);this.domStacks.set(s.branchId,el);}
    // Reflowing an inline description should never change the position of earlier tasks.
    // Stacks are anchored at their top, so later rows move down naturally.
    this.bounds=getDisplayBounds(this.layout);
    if(this.atOverview)this.camera={x:0,y:0,scale:this.fitScale()};
    this.applyOffsets();this.applySelectedStyles();this.applyCamera();
    if(this.matchIds)this.highlightTasks([...this.matchIds]);
    this.renderOverviewLabels();
    if(focusId){
      const owner=focusId.task?[...this.nodesEl.querySelectorAll('.task-row')].find(row=>row.dataset.taskId===focusId.task):this.domNodes.get(focusId.branch);
      const action=owner&&[...owner.querySelectorAll('button')].find(button=>
        focusId.action?button.getAttribute('aria-label')===focusId.action:button.textContent===focusId.button);
      (action||owner||this.domNodes.get(this.focusedNode)||this.domNodes.get('root'))?.focus({preventScroll:true});
    }
  }
  renderOverviewLabels(){
    this.labelLayer.replaceChildren();this.overviewLabels.clear();
    for(const entry of this.layout.nodes.filter(n=>n.id==='root'||n.depth===1)){
      const btn=node('button','overview-label',entry.id==='root'?'HISYAM':entry.label);
      btn.type='button';btn.dataset.branchId=entry.id;btn.style.setProperty('--label-accent',entry.color);
      btn.setAttribute('aria-label',`Focus ${entry.label}`);
      btn.addEventListener('click',e=>{e.stopPropagation();this.focusNode(entry.id);this.onBranchSelected?.(entry.id);});
      btn.addEventListener('pointerdown',e=>e.stopPropagation());
      this.labelLayer.append(btn);this.overviewLabels.set(entry.id,btn);
    }
    this.updateOverviewLabels();
  }
  updateOverviewLabels(){
    if(!this.overviewLabels)return;
    const show=this.camera.scale<.47;
    this.labelLayer.hidden=!show;if(!show)return;
    for(const [id,btn] of this.overviewLabels){
      const n=this.nodeMap.get(id);if(!n)continue;
      const spread=id==='root'?0:this.width<650?79:122;
      const angle=(n.angle||0)*Math.PI/180;
      const x=this.width/2+this.camera.x+n.x*this.camera.scale+Math.cos(angle)*spread;
      const y=this.height/2+this.camera.y+n.y*this.camera.scale+Math.sin(angle)*spread;
      btn.style.left=`${x}px`;btn.style.top=`${y}px`;
    }
  }
  buildNode(item){
    const el=node('div',`graph-node node-${item.type}`);el.dataset.id=item.id;el.style.left=item.x+'px';el.style.top=item.y+'px';
    el.style.setProperty('--branch-color',item.color);el.dataset.depth=String(item.depth||0);el.tabIndex=0;el.setAttribute('role','button');
    el.setAttribute('aria-label',item.id==='root'?`Hisyam, center of the constellation; focus`:`${branchPath(item.id,this.branches)}; focus, edit or add a branch`);
    el.addEventListener('keydown',e=>{
      if(e.target!==el)return;
      if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();this.focusNode(item.id);this.onBranchSelected?.(item.id);}
      if(e.key==='F2'&&item.id!=='root'){e.preventDefault();e.stopPropagation();this.focusNode(item.id);this.openBranchEditor(el,item,'rename');}
      if(e.key==='Insert'){e.preventDefault();e.stopPropagation();this.focusNode(item.id);this.openBranchEditor(el,item,'add');}
    });
    el.addEventListener('focus',()=>{if(el.matches(':focus-visible')&&this.camera.scale<.62)this.focusNode(item.id,{instant:true});});
    if(item.id==='root'){
      el.append(node('div','root-glyph','✳'));
      el.append(node('div','root-name','HISYAM'));
      el.append(node('div','root-desc','MY ENTIRE WORLD'));
    }else{
      el.append(node('div','node-label',item.label));
      const count=this.tasks.filter(t=>t.projectId===item.id&&t.status!=='completed').length;
      const ch=this.layout.children.get(item.id)||[];
      const small=[ch.length?`${ch.length} branch${ch.length===1?'':'es'}`:'',count?`${count} action${count===1?'':'s'}`:''].filter(Boolean).join(' · ');
      if(small)el.append(node('div','node-secondary',small));
    }
    const controls=node('div','node-actions');controls.setAttribute('aria-label','Branch actions');
    const action=(label,text,mode)=>{const b=node('button','node-action',text);b.type='button';b.setAttribute('aria-label',label);b.title=label;
      b.addEventListener('pointerdown',e=>e.stopPropagation());
      b.addEventListener('click',e=>{e.stopPropagation();this.focusNode(item.id);this.openBranchEditor(el,item,mode);});controls.append(b);};
    action('Add a child branch','+','add');
    if(item.id!=='root'){action('Rename branch','✎','rename');action('Move branch to another parent','↗','move');}
    el.append(controls);
    return el;
  }
  openBranchEditor(el,item,mode){
    el.querySelector('.node-inline-editor')?.remove();
    const div=node('div','node-inline-editor');
    div.addEventListener('pointerdown',e=>e.stopPropagation());div.addEventListener('click',e=>e.stopPropagation());
    const heading=node('span','node-inline-title',mode==='add'?'NEW BRANCH':mode==='rename'?'RENAME':'MOVE BRANCH');div.append(heading);
    const cancel=()=>{div.remove();this.domNodes.get(item.id)?.focus({preventScroll:true});};
    let input;
    if(mode==='move'){
      input=node('select','node-inline-input');
      const entries=[{id:'root',label:'Hisyam / Home'},...this.branches];
      const forbidden=descendantsOf(item.id,this.branches);forbidden.add(item.id);
      for(const b of entries){if(forbidden.has(b.id))continue;const opt=node('option','',b.id==='root'?b.label:branchPath(b.id,this.branches));opt.value=b.id;input.append(opt);}
      input.value=item.parentId;
    }else{input=node('input','node-inline-input');input.type='text';input.maxLength=72;input.value=mode==='rename'?item.label:'';input.placeholder='Name this branch…';}
    input.setAttribute('aria-label',mode==='move'?'Parent branch':mode==='add'?'New branch name':'Branch name');
    div.append(input);
    const buttons=node('div','node-inline-actions');
    const yes=node('button','node-mini-primary',mode==='move'?'Move':'Save');yes.type='button';
    const no=node('button','node-mini-secondary','Cancel');no.type='button';
    const submit=()=>{
      const value=input.value.trim();if(!value)return;
      if(mode==='add')this.onBranchAdd?.(item.id,value);
      else if(mode==='rename')this.onBranchRename?.(item.id,value);
      else this.onBranchMove?.(item.id,value);
      cancel();
    };
    yes.addEventListener('click',submit);no.addEventListener('click',cancel);buttons.append(yes,no);div.append(buttons);
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();submit();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel();}});
    el.append(div);input.focus({preventScroll:true});if(input instanceof HTMLInputElement)input.select();
  }
  buildStack(stack){
    const el=node('div','task-stack');el.dataset.branchId=stack.branchId;el.style.left=stack.x+'px';el.style.top=stack.y+'px';
    el.style.setProperty('--branch-color',stack.color);
    for(const task of sortedProjectTasks(this.tasks,stack.branchId,this.mode))el.append(this.buildTaskRow(task));
    if(!el.children.length)el.append(node('div','task-empty','add something here  +'));
    return el;
  }
  buildTaskRow(task){
    const row=node('div','task-row');row.dataset.taskId=task.id;row.tabIndex=0;row.setAttribute('role','button');
    row.setAttribute('aria-expanded',String(task.id===this.expandedTaskId));
    row.setAttribute('aria-label',`${task.title}. ${dueLabel(task.dueDate)}. Urgency ${task.urgency}/5. Tap or press Enter to reveal details.`);
    row.style.setProperty('--task-color',taskColor(task,this.mode));
    if(task.status==='completed')row.classList.add('completed');
    if(dueLabel(task.dueDate).includes('overdue')&&task.status!=='completed')row.classList.add('overdue');
    if(task.id===this.expandedTaskId)row.classList.add('is-expanded');
    const line=node('div','task-primary');line.append(node('span','task-text',task.title));
    const meta=node('span','task-inline-meta',this.mode==='urgency'?`U${task.urgency}`:dueLabel(task.dueDate));line.append(meta);row.append(line);
    const reveal=node('div','task-reveal');const content=node('div','task-reveal-content');
    const view=node('div','task-detail-view');
    const done=node('p','detail-criteria',task.criteria||'No completion criteria yet.');
    view.append(node('span','detail-label','DONE WHEN'),done);
    if(task.description)view.append(node('p','detail-description',task.description));
    const metadata=node('p','detail-meta',`${formatDate(task.dueDate)}   ·   U${task.urgency}/5   ·   ${STATUS_LABEL[task.status]||task.status}${task.effortMinutes?'   ·   '+task.effortMinutes+' min':''}`);
    view.append(metadata);
    const href=validateHttpUrl(task.resourceUrl);
    if(href){const a=node('a','detail-link','↗  Supporting link');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.addEventListener('click',e=>e.stopPropagation());view.append(a);}
    const actions=node('div','task-actions');
    const act=(label,callback)=>{const button=node('button','task-action',label);button.type='button';button.addEventListener('click',e=>{e.stopPropagation();callback();});actions.append(button);};
    act('Edit',()=>this.openTaskEditor(row,task));
    act(task.status==='completed'?'Reopen':'Complete',()=>this.onTaskUpdate?.(task.id,{status:task.status==='completed'?'ready':'completed',completedAt:task.status==='completed'?'':new Date().toISOString()}));
    act('Remove',()=>this.onTaskDelete?.(task.id));
    view.append(actions);content.append(view);reveal.append(content);row.append(reveal);
    // Hover expands *inside* the list: later tasks are pushed down, never overlaid.
    // Taps/keyboard pin the same expansion, because hover is not available on mobile.
    row.addEventListener('pointerdown',e=>e.stopPropagation());
    row.addEventListener('click',e=>{if(e.target.closest('button,a,input,textarea,select'))return;e.stopPropagation();
      const next=this.expandedTaskId===task.id?'':task.id;
      this.expandedTaskId=next;this.selectedTaskId=next;
      for(const other of this.nodesEl.querySelectorAll('.task-row')){
        const on=other.dataset.taskId===next;other.classList.toggle('is-expanded',on);other.setAttribute('aria-expanded',String(on));
      }
      this.onTaskSelected?.(task.id);
    });
    row.addEventListener('keydown',e=>{if(e.target!==row)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();row.click();}});
    row.addEventListener('focus',()=>{if(row.matches(':focus-visible')&&this.camera.scale<.82)this.focusTask(task,{instant:true});});
    return row;
  }
  openTaskEditor(row,task){
    this.expandedTaskId=task.id;row.classList.add('is-expanded');row.setAttribute('aria-expanded','true');
    const content=row.querySelector('.task-reveal-content'),view=content.querySelector('.task-detail-view');
    if(content.querySelector('.task-editor'))return;
    view.hidden=true;
    const form=node('form','task-editor');
    const field=(label,key,tag='input')=>{
      const wrapper=node('label','inline-field');wrapper.append(node('span','inline-field-title',label));
      const input=node(tag,'inline-input');input.name=key;
      if(tag==='textarea'){input.rows=2;}
      else if(key==='dueDate')input.type='date';else if(key==='effortMinutes') {input.type='number';input.min=0;input.max=1440;}
      else if(key==='resourceUrl')input.type='url';
      input.value=String(task[key]??'');wrapper.append(input);form.append(wrapper);return input;
    };
    const title=field('Task','title');title.maxLength=180;
    field('Done when','criteria','textarea');field('Description','description','textarea');
    const pair=node('div','inline-edit-pair');
    const due=node('label','inline-field');due.append(node('span','inline-field-title','Deadline'));const date=node('input','inline-input');date.type='date';date.name='dueDate';date.value=task.dueDate;due.append(date);pair.append(due);
    const urg=node('label','inline-field');urg.append(node('span','inline-field-title','Urgency'));const urgency=node('select','inline-input');urgency.name='urgency';for(let i=1;i<=5;i++){const op=node('option','',`U${i}`);op.value=String(i);urgency.append(op);}urgency.value=String(task.urgency);urg.append(urgency);pair.append(urg);form.append(pair);
    const branch=node('label','inline-field');branch.append(node('span','inline-field-title','Attached to branch'));
    const select=node('select','inline-input');select.name='projectId';
    for(const b of this.branches){const option=node('option','',branchPath(b.id,this.branches));option.value=b.id;select.append(option);}
    select.value=task.projectId;branch.append(select);form.append(branch);
    const pair2=node('div','inline-edit-pair');
    const effort=node('label','inline-field');effort.append(node('span','inline-field-title','Minutes'));const mins=node('input','inline-input');mins.type='number';mins.min='0';mins.max='1440';mins.name='effortMinutes';mins.value=String(task.effortMinutes||'');effort.append(mins);pair2.append(effort);
    const statusWrap=node('label','inline-field');statusWrap.append(node('span','inline-field-title','Status'));const status=node('select','inline-input');status.name='status';for(const s of STATUS){const opt=node('option','',STATUS_LABEL[s]);opt.value=s;status.append(opt);}status.value=task.status;statusWrap.append(status);pair2.append(statusWrap);form.append(pair2);
    field('Supporting link','resourceUrl');
    const actions=node('div','editor-actions');const save=node('button','node-mini-primary','Save changes');save.type='submit';const cancel=node('button','node-mini-secondary','Cancel');cancel.type='button';actions.append(save,cancel);form.append(actions);
    const dismiss=()=>{form.remove();view.hidden=false;row.focus({preventScroll:true});};
    cancel.addEventListener('click',e=>{e.stopPropagation();dismiss();});
    form.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dismiss();}});
    form.addEventListener('click',e=>e.stopPropagation());form.addEventListener('pointerdown',e=>e.stopPropagation());
    form.addEventListener('submit',e=>{e.preventDefault();e.stopPropagation();const data=new FormData(form);const patch=Object.fromEntries(data.entries());
      patch.urgency=Number(patch.urgency)||1;patch.effortMinutes=Number(patch.effortMinutes)||0;
      if(!String(patch.title).trim()){title.focus();return;}
      this.onTaskUpdate?.(task.id,patch);
    });
    content.append(form);title.focus({preventScroll:true});
  }
  selectTask(id){this.selectedTaskId=id;this.applySelectedStyles();}
  highlightTasks(ids=null){this.matchIds=ids===null?null:new Set(ids);this.nodesEl.classList.toggle('search-active',this.matchIds!==null);
    for(const r of this.nodesEl.querySelectorAll('.task-row'))r.classList.toggle('search-match',this.matchIds?.has(r.dataset.taskId)??false);}
  applySelectedStyles(){
    this.world.classList.toggle('branch-is-focused',Boolean(this.focusedNode));
    for(const [id,el] of this.domNodes){el.classList.toggle('is-focused',this.focusedNode===id);}
    for(const [id,el] of this.domStacks){el.classList.toggle('is-focused-branch',this.focusedNode===id);}
    for(const r of this.nodesEl.querySelectorAll('.task-row'))r.classList.toggle('is-selected',r.dataset.taskId===this.selectedTaskId);
    for(const e of this.edgeEntries)e.path.classList.toggle('is-selected',e.to===this.focusedNode);
  }
  dispose(){this.disposed=true;this.observer.disconnect();cancelAnimationFrame(this.cameraAnimation);cancelAnimationFrame(this.springAnimation);this.cameraAnimation=0;this.springAnimation=0;this.nodesEl.replaceChildren();this.edgesEl.replaceChildren();this.domNodes.clear();this.domStacks.clear();}

}
