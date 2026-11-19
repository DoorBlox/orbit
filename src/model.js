import { civilTimestamp, todayKey, dateLabel, DAY_MS, ORBIT_TIMEZONE, validDateKey } from './dates.js';

export const STATUS=['captured','needs_clarity','ready','scheduled','in_progress','waiting','completed','parked'];
export const STATUS_LABEL={captured:'Captured',needs_clarity:'Needs clarity',ready:'Ready',scheduled:'Scheduled',in_progress:'In progress',waiting:'Waiting',completed:'Completed',parked:'Parked'};
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const hexRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function mix(a,b,t){const aa=hexRgb(a),bb=hexRgb(b);return '#'+aa.map((v,i)=>Math.round(v+(bb[i]-v)*t).toString(16).padStart(2,'0')).join('');}
export function daysUntil(value,now=new Date()){
  const timestamp=civilTimestamp(value);
  if(!Number.isFinite(timestamp))return null;
  return Math.round((timestamp-civilTimestamp(todayKey(now)))/DAY_MS);
}
export function taskColor(task,mode='deadline'){
  if(task.status==='completed')return '#526C8D';
  let t;
  if(mode==='urgency')t=(clamp(Number(task.urgency)||1,1,5)-1)/4;
  else {const days=daysUntil(task.dueDate);if(days===null)return '#45638C';if(days<0)return '#A42C43';t=1-clamp(days/30,0,1);}
  return t<.5?mix('#176E62','#805313',t*2):mix('#805313','#AB354F',(t-.5)*2);
}
export function dueLabel(date){const d=daysUntil(date);if(d===null)return 'No deadline';if(d<0)return `${-d}d overdue`;if(d===0)return 'Due today';if(d===1)return 'Due tomorrow';return `In ${d} days`;}
export function formatDate(date){return dateLabel(date)||'Anytime';}
export function normalizeTaskLinks(input=[]){
  if(input==null)return [];
  if(!Array.isArray(input)||input.length>12)throw Error('A task supports at most 12 links.');
  return input.map(link=>{
    if(!link||typeof link!=='object'||typeof link.url!=='string'||
       typeof link.label!=='string')throw Error('Invalid supporting link.');
    const url=validateHttpUrl(link.url);
    if(!url||url.length>1000)throw Error('Use only valid HTTP(S) links.');
    return {label:link.label.trim().slice(0,120)||new URL(url).hostname,url};
  });
}
export function parseTaskLinks(lines){
  if(typeof lines!=='string'||lines.length>12000)throw Error('Supporting links are too long.');
  const values=lines.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
  if(values.length>12)throw Error('A task supports at most 12 links.');
  return normalizeTaskLinks(values.map(line=>{
    const split=line.indexOf('|');
    return split<0?{label:'',url:line}:{label:line.slice(0,split).trim(),url:line.slice(split+1).trim()};
  }));
}
export function normalizeTaskChecklist(raw=[]){
  if(raw==null)return [];
  if(!Array.isArray(raw)||raw.length>30)throw Error('A task supports at most 30 checklist items.');
  return raw.map(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item)||
       typeof item.text!=='string'||!item.text.trim()||item.text.length>220||
       typeof item.done!=='boolean')throw Error('Invalid checklist item.');
    return {text:item.text.trim(),done:item.done};
  });
}
export function parseTaskChecklist(lines){
  if(typeof lines!=='string'||lines.length>7500)throw Error('Checklist is too long.');
  const items=lines.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(line=>{
    const match=/^(?:[-*]\s*)?\[([ xX])\]\s*(.+)$/.exec(line);
    if(match)return {text:match[2],done:match[1].toLowerCase()==='x'};
    return {text:line.replace(/^[-*]\s+/,'').trim(),done:false};
  });
  return normalizeTaskChecklist(items);
}
export function taskChecklistLines(list=[]){
  return normalizeTaskChecklist(list).map(item=>`- [${item.done?'x':' '}] ${item.text}`).join('\n');
}
// #212: A routine remains ONE existing task row. Date-keyed occurrence
// completion lives only in the already private workspace extensions JSON.
// Do not put frequency or per-day status into the hosted task SQL row.
const routineObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const routineId = id => typeof id === 'string' &&
  /^[A-Za-z0-9_-]{1,100}$/.test(id) && !['__proto__','constructor','prototype'].includes(id);
const routineZoneCache = new Map();
function routineZone(value = ORBIT_TIMEZONE){
  if(typeof value !== 'string' || !/^[A-Za-z0-9_+\/-]{1,80}$/.test(value))
    throw Error('Invalid routine timezone.');
  if(!routineZoneCache.has(value)){
    let zone;
    try{zone=new Intl.DateTimeFormat('en-US',{timeZone:value}).resolvedOptions().timeZone;}
    catch{throw Error('Invalid routine timezone.');}
    if(!zone)throw Error('Invalid routine timezone.');
    // Only a small bounded formatter cache; no new network service or locale
    // inferred from the device, which may differ between synced clients.
    if(routineZoneCache.size>=32)routineZoneCache.clear();
    routineZoneCache.set(value,zone);
  }
  return routineZoneCache.get(value);
}
function routineRule(raw){
  if(!routineObject(raw)||Object.keys(raw).some(k=>
    !['frequency','startDate','timeZone','completedDates'].includes(k))||
    raw.frequency!=='daily'||!validDateKey(raw.startDate))
    throw Error('Invalid daily routine rule or start date.');
  const timeZone=routineZone(raw.timeZone??ORBIT_TIMEZONE);
  const dates=raw.completedDates??[];
  if(!Array.isArray(dates)||dates.length>2000||dates.some(d=>
    !validDateKey(d)||d<raw.startDate))throw Error('Invalid daily completion history.');
  return {frequency:'daily',startDate:raw.startDate,timeZone,
    completedDates:[...new Set(dates)].sort()};
}
/** Fail-closed canonical owner-private map; no task rows or dates are generated. */
export function normalizeTaskRoutines(raw={}){
  if(!routineObject(raw)||Object.keys(raw).length>10000)
    throw Error('Invalid workspace task routines.');
  const result={};
  for(const [id,rule] of Object.entries(raw)){
    if(!routineId(id))throw Error('Invalid routine task ID.');
    result[id]=routineRule(rule);
  }
  return result;
}
/** Calendar dates are projected in the routine's pinned IANA zone, NOT UTC
 * offsets or fixed-millisecond increments (which fail across DST shifts). */
export function routineDayKey(now=new Date(),timeZone=ORBIT_TIMEZONE){
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))
    throw Error('Invalid routine clock.');
  const zone=routineZone(timeZone);
  let formatter=new Intl.DateTimeFormat('en-GB',{
    timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'
  });
  const parts=Object.fromEntries(formatter.formatToParts(now).map(p=>[p.type,p.value]));
  const key=`${parts.year.padStart(4,'0')}-${parts.month}-${parts.day}`;
  if(!validDateKey(key))throw Error('Invalid routine calendar day.');
  return key;
}
/** W3 renders one deterministic virtual occurrence; status on the underlying
 * task is NOT used as the occurrence's completion flag. */
export function getDailyOccurrence(task,routines,{now=new Date()}={}){
  const id=task?.id;
  if(!routineId(id))throw Error('Invalid routine task.');
  if(!routineObject(routines))throw Error('Invalid workspace task routines.');
  if(!Object.hasOwn(routines,id))return null;
  const rule=routineRule(routines[id]);
  const dayKey=routineDayKey(now,rule.timeZone);
  const active=dayKey>=rule.startDate;
  return {taskId:id,occurrenceKey:`${id}@${dayKey}`,dayKey,
    frequency:'daily',timeZone:rule.timeZone,active,
    completed:active&&rule.completedDates.includes(dayKey)};
}
/** Idempotently enable daily recurrence; never reinterpret already recorded
 * history under another timezone/start date without a deliberate migration. */
export function setDailyRoutine(routines,taskId,{startDate,timeZone=ORBIT_TIMEZONE}={}){
  if(!routineId(taskId))throw Error('Invalid routine task ID.');
  const current=normalizeTaskRoutines(routines);
  const rule=routineRule({frequency:'daily',startDate,timeZone,completedDates:[]});
  const old=current[taskId];
  if(old?.completedDates.length&&(old.startDate!==rule.startDate||old.timeZone!==rule.timeZone))
    throw Error('Cannot change timezone or start date with existing routine history.');
  return {...current,[taskId]:{...rule,completedDates:old?.completedDates??[]}};
}
/** Same task + same civil day has at most one completion; toggles are pure.
 * CAS conflicts remain the existing sync controller's explicit review path. */
export function setDailyCompletion(routines,taskId,dayKey,completed){
  if(!routineId(taskId)||typeof completed!=='boolean'||!validDateKey(dayKey))
    throw Error('Invalid daily completion request.');
  const current=normalizeTaskRoutines(routines);
  const rule=current[taskId];
  if(!rule)throw Error('Daily routine does not exist.');
  if(dayKey<rule.startDate)throw Error('Completion cannot precede routine start date.');
  const days=new Set(rule.completedDates);
  if(completed)days.add(dayKey);else days.delete(dayKey);
  if(days.size>2000)throw Error('Daily completion history is full; export or archive before adding more.');
  return {...current,[taskId]:{...rule,completedDates:[...days].sort()}};
}

export function cleanTask(raw,fallbackBranch='inbox'){
  const title=String(raw.title||'').trim().slice(0,180);if(!title)throw Error('A task needs a name.');
  let dueDate=String(raw.dueDate||'').trim();if(dueDate&&daysUntil(dueDate)===null)dueDate='';
  return {
    id:String(raw.id||`task-${Date.now()}-${Math.random().toString(36).slice(2,9)}`),
    title,projectId:String(raw.projectId||raw.branchId||fallbackBranch),dueDate,
    urgency:clamp(Number(raw.urgency)||1,1,5),effortMinutes:clamp(Number(raw.effortMinutes)||0,0,1440),
    status:STATUS.includes(raw.status)?raw.status:'captured',
    criteria:String(raw.criteria||'').slice(0,1200),description:String(raw.description||'').slice(0,3000),
    resourceUrl:String(raw.resourceUrl||'').slice(0,600),links:normalizeTaskLinks(raw.links),
    createdAt:raw.createdAt||new Date().toISOString(),completedAt:raw.completedAt||'',
  };
}
export function validateHttpUrl(value){if(!value)return '';try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function sortedProjectTasks(tasks,branchId,mode='deadline'){
  const matching=tasks.filter(t=>t.projectId===branchId);
  return matching.sort((a,b)=>{
    const aa=a.status==='completed'?1:0,bb=b.status==='completed'?1:0;
    if(aa!==bb)return aa-bb;
    const ua=Number(a.urgency)||1,ub=Number(b.urgency)||1;
    const da=daysUntil(a.dueDate),db=daysUntil(b.dueDate);
    const diffDue=(da??Number.POSITIVE_INFINITY)-(db??Number.POSITIVE_INFINITY);
    if(mode==='urgency')return ub-ua || diffDue || a.title.localeCompare(b.title);
    return diffDue || ub-ua || a.title.localeCompare(b.title);
  });
}
export function taskSummary(tasks){return {
  total:tasks.length,active:tasks.filter(t=>t.status!=='completed'&&t.status!=='parked').length,
  dueSoon:tasks.filter(t=>t.status!=='completed' && (daysUntil(t.dueDate)??999)>=0 && (daysUntil(t.dueDate)??999)<=3).length,
  overdue:tasks.filter(t=>t.status!=='completed' && daysUntil(t.dueDate)!==null && daysUntil(t.dueDate)<0).length,
  completed:tasks.filter(t=>t.status==='completed').length,
};}
