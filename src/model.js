import { civilTimestamp, todayKey, dateLabel, DAY_MS } from './dates.js';

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
