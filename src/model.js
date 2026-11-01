export const STATUS=['captured','needs_clarity','ready','scheduled','in_progress','waiting','completed','parked'];
export const STATUS_LABEL={captured:'Captured',needs_clarity:'Needs clarity',ready:'Ready',scheduled:'Scheduled',in_progress:'In progress',waiting:'Waiting',completed:'Completed',parked:'Parked'};
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const hexRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function mix(a,b,t){const aa=hexRgb(a),bb=hexRgb(b);return '#'+aa.map((v,i)=>Math.round(v+(bb[i]-v)*t).toString(16).padStart(2,'0')).join('');}
export function daysUntil(value){
  if(!value||!/^(\d{4})-(\d{2})-(\d{2})$/.test(value))return null;
  const [yy,mm,dd]=value.split('-').map(Number);
  const dt=new Date(yy,mm-1,dd,12);
  if(dt.getFullYear()!==yy||dt.getMonth()!==mm-1||dt.getDate()!==dd)return null;
  const now=new Date();
  return Math.round((Date.UTC(yy,mm-1,dd)-Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()))/86400000);
}
export function taskColor(task,mode='deadline'){
  if(task.status==='completed')return '#526C8D';
  let t;
  if(mode==='urgency')t=(clamp(Number(task.urgency)||1,1,5)-1)/4;
  else {const days=daysUntil(task.dueDate);if(days===null)return '#45638C';if(days<0)return '#A42C43';t=1-clamp(days/30,0,1);}
  return t<.5?mix('#176E62','#805313',t*2):mix('#805313','#AB354F',(t-.5)*2);
}
export function dueLabel(date){const d=daysUntil(date);if(d===null)return 'No deadline';if(d<0)return `${-d}d overdue`;if(d===0)return 'Due today';if(d===1)return 'Due tomorrow';return `In ${d} days`;}
export function formatDate(date){if(!date)return 'Anytime';const d=new Date(date+'T12:00:00');return Number.isNaN(d.getTime())?'Anytime':new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(d);}
export function cleanTask(raw,fallbackBranch='inbox'){
  const title=String(raw.title||'').trim().slice(0,180);if(!title)throw Error('A task needs a name.');
  let dueDate=String(raw.dueDate||'').trim();if(dueDate&&daysUntil(dueDate)===null)dueDate='';
  return {
    id:String(raw.id||`task-${Date.now()}-${Math.random().toString(36).slice(2,9)}`),
    title,projectId:String(raw.projectId||raw.branchId||fallbackBranch),dueDate,
    urgency:clamp(Number(raw.urgency)||1,1,5),effortMinutes:clamp(Number(raw.effortMinutes)||0,0,1440),
    status:STATUS.includes(raw.status)?raw.status:'captured',
    criteria:String(raw.criteria||'').slice(0,1200),description:String(raw.description||'').slice(0,3000),
    resourceUrl:String(raw.resourceUrl||'').slice(0,600),
    createdAt:raw.createdAt||new Date().toISOString(),completedAt:raw.completedAt||'',
  };
}
export function validateHttpUrl(value){if(!value)return '';try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
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
