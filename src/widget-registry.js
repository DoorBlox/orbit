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
  {id:'journal',position:{x:930,y:1780},limits:{minW:420,minH:720,maxW:1500,maxH:2400},icon:'✎'},
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
