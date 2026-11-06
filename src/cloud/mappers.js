import { cleanTask, validateHttpUrl } from '../model.js';
const nullable=s=>s ? String(s) : null;
function ownerId(value){if(typeof value!=='string'||!value.trim())throw Error('ownerId is required');return value;}
export function toBranchRow(branch,owner){return {
  owner_id:ownerId(owner),id:String(branch.id),parent_id:branch.parentId==='root'?null:nullable(branch.parentId),
  label:String(branch.label||''),color:nullable(branch.color)
};}
export function fromBranchRow(r){return {
  id:r.id,parentId:r.parent_id||'root',label:r.label,...(r.color?{color:r.color}:{})
};}
export function toTaskRow(raw,owner){const t=cleanTask(raw);return {
  owner_id:ownerId(owner),id:t.id,project_id:t.projectId,title:t.title,due_date:t.dueDate||null,
  urgency:t.urgency,effort_minutes:t.effortMinutes,status:t.status,criteria:t.criteria,
  description:t.description,resource_url:validateHttpUrl(t.resourceUrl)||null,
  created_at:t.createdAt,completed_at:t.completedAt||null
};}
export function fromTaskRow(r){return cleanTask({
  id:r.id,projectId:r.project_id,title:r.title,dueDate:r.due_date||'',urgency:r.urgency,
  effortMinutes:r.effort_minutes,status:r.status,criteria:r.criteria||'',description:r.description||'',
  resourceUrl:r.resource_url||'',createdAt:r.created_at,completedAt:r.completed_at||''
});}
export function toMilestoneRow(m,owner){return {owner_id:ownerId(owner),id:String(m.id),title:String(m.title),marker_date:m.date};}
export function fromMilestoneRow(r){return {id:r.id,title:r.title,date:r.marker_date};}
// Do not trust arbitrary HTML. The active V6 editor sanitizes locally, but cloud rendering
// MUST sanitize again and have independent XSS tests before enabling sync.
export function toJournalRow(j,owner){return {
  owner_id:ownerId(owner),id:String(j.id),entry_date:j.date,title:String(j.title||''),
  body_html:String(j.html||''),created_at:j.createdAt,updated_at:j.updatedAt
};}
export function fromJournalRow(r){return {
  id:r.id,date:r.entry_date,title:r.title||'',html:r.body_html||'',
  createdAt:r.created_at,updatedAt:r.updated_at
};}
export function toLayoutRows(layout,owner){return Object.entries(layout).map(([widgetKey,p])=>({
  owner_id:ownerId(owner),widget_key:widgetKey,x:p.x,y:p.y,
  width:p.width??null,height:p.height??null
}));}
export function fromLayoutRows(rows){return Object.fromEntries(rows.map(r=>[r.widget_key,{
  x:Number(r.x),y:Number(r.y),...(r.width!=null&&r.height!=null?{width:Number(r.width),height:Number(r.height)}:{})
}]));}
export function toPreferencesRow(p,owner){return {owner_id:ownerId(owner),color_mode:p.colorMode==='urgency'?'urgency':'deadline'};}
export function fromPreferencesRow(r){return {colorMode:r.color_mode==='urgency'?'urgency':'deadline'};}
