/** SP-01A: one allowlisted definition of ORBIT's current spatial widget types.
 * Six is a preserved starting layout, NOT a permanent maximum. Additional
 * descriptors can be registered by first-party UI modules without changing
 * the legacy defaults or introducing untrusted executable plugins.
 */
const CORE = [
  {id:'timeline',position:{x:445,y:105},limits:{minW:520,minH:520,maxW:3200,maxH:1200},icon:'─'},
  {id:'constellation',position:{x:410,y:670},limits:{minW:650,minH:550,maxW:3000,maxH:2000},icon:'✳'},
  {id:'active',position:{x:1895,y:760},limits:{minW:300,minH:280,maxW:1400,maxH:2000},icon:'◉'},
  {id:'completed',position:{x:1980,y:1370},limits:{minW:300,minH:235,maxW:1400,maxH:2000},icon:'✓'},
  {id:'space',position:{x:280,y:1725},limits:{minW:300,minH:210,maxW:1050,maxH:950},icon:'·'},
  {id:'journal',position:{x:930,y:1780},limits:{minW:420,minH:720,maxW:4000,maxH:4000},icon:'✎'},
];
const safeId = value => typeof value==='string' && /^[a-z][a-z0-9-]{1,39}$/.test(value) &&
  !['constructor','prototype','__proto__'].includes(value);
const finite=value=>typeof value==='number'&&Number.isFinite(value);
function validated(source){
  if(!source||typeof source!=='object'||Array.isArray(source)||!safeId(source.id))
    throw Error('Invalid spatial widget ID.');
  const {position,limits}=source;
  if(!position||!finite(position.x)||!finite(position.y)||
     position.x < -5000||position.x>7500||position.y < -5000||position.y>7500)
    throw Error('Invalid spatial widget starting coordinates.');
  if(!limits||!['minW','minH','maxW','maxH'].every(k=>finite(limits[k]))||
     limits.minW<200||limits.minH<150||limits.maxW<limits.minW||
     limits.maxH<limits.minH||limits.maxW>5000||limits.maxH>5000)
    throw Error('Invalid spatial widget size bounds.');
  if(typeof source.icon!=='string'||!source.icon||source.icon.length>4)
    throw Error('Invalid spatial widget icon.');
  return Object.freeze({id:source.id,
    position:Object.freeze({x:position.x,y:position.y}),
    limits:Object.freeze({minW:limits.minW,minH:limits.minH,
      maxW:limits.maxW,maxH:limits.maxH}),
    icon:source.icon});
}

/** Read-only registry with defensive descriptor copies.
 * The caller, not user-supplied saved JSON, controls additional widget types.
 */
export function createWidgetRegistry(additional=[]){
  if(!Array.isArray(additional))throw Error('Widget additions must be a descriptor list.');
  const entries=new Map();
  for(const source of [...CORE,...additional]){
    const entry=validated(source);
    if(entries.has(entry.id))throw Error('Duplicate spatial widget ID: '+entry.id);
    entries.set(entry.id,entry);
  }
  const ids=Object.freeze([...entries.keys()]);
  return Object.freeze({
    ids,
    has:id=>entries.has(id),
    get:id=>entries.get(id)||null,
    defaults:()=>Object.fromEntries(ids.map(id=>[id,{...entries.get(id).position}])),
  });
}
export const DEFAULT_WIDGET_REGISTRY=createWidgetRegistry();
export const CORE_WIDGET_IDS=DEFAULT_WIDGET_REGISTRY.ids;

/** Owner-private layout for optional FIRST-PARTY windows. The V6 root layout
 * continues to contain only the six legacy widgets. Account data cannot load
 * executable widget descriptors, DOM nodes or HTML.
 */
export function normalizeExtraWidgetLayout(raw={}){
  if(raw===undefined||raw===null)raw={};
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid optional widget layout.');
  const entries=Object.entries(raw);
  if(entries.length>32)throw Error('Too many optional widget layouts.');
  const result={};
  for(const [id,p] of entries){
    if(!safeId(id)||CORE.some(core=>core.id===id)||!p||typeof p!=='object'||Array.isArray(p)||
       !finite(p.x)||!finite(p.y)||p.x< -5000||p.x>7500||p.y< -5000||p.y>7500||
       Object.keys(p).some(k=>!['x','y','width','height','hidden'].includes(k))||
       ((p.width===undefined)!==(p.height===undefined))||
       (p.width!==undefined&&(!finite(p.width)||!finite(p.height)||
         p.width<200||p.height<150||p.width>5000||p.height>5000))||
       (p.hidden!==undefined&&typeof p.hidden!=='boolean'))
      throw Error('Invalid optional widget layout.');
    result[id]={x:p.x,y:p.y,
      ...(p.width===undefined?{}:{width:p.width,height:p.height}),
      hidden:p.hidden===true};
  }
  return result;
}

/** Only caller-controlled first-party descriptors can be activated as windows. */
export function extendWidgetRegistry(registry,descriptor){
  if(!registry||!Array.isArray(registry.ids)||typeof registry.get!=='function')
    throw Error('Invalid widget registry.');
  const coreIds=new Set(CORE.map(item=>item.id));
  const extras=registry.ids.filter(id=>!coreIds.has(id)).map(id=>registry.get(id));
  return createWidgetRegistry([...extras,descriptor]);
}
