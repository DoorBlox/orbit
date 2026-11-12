/** PJ-01: Private reversible branch identity. Never a publishing permission. */
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const validTargetDate=value=>{
  if(value==='')return true;
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const d=new Date(value);
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
};
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(id)&&
  !['constructor','prototype','__proto__','root'].includes(id);

export function normalizeProjects(raw={}){
  if(raw===undefined||raw===null)raw={};
  if(!object(raw))throw Error('Invalid private project metadata.');
  const entries=Object.entries(raw);
  if(entries.length>128)throw Error('Too many private projects.');
  const result={};
  for(const [id,entry] of entries){
    if(!validId(id)||!object(entry)||Object.keys(entry).some(key=>!['description','status','links','goal','nextAction','blockers','targetDate','milestones','health'].includes(key))||
       (entry.description!==undefined&&(typeof entry.description!=='string'||entry.description.length>4000))||
       (entry.status!==undefined&&!['active','paused','completed'].includes(entry.status))||
       (entry.links!==undefined&&(!Array.isArray(entry.links)||entry.links.length>12))||
       (entry.goal!==undefined&&(typeof entry.goal!=='string'||entry.goal.length>500))||
       (entry.nextAction!==undefined&&(typeof entry.nextAction!=='string'||entry.nextAction.length>240))||
       (entry.blockers!==undefined&&(typeof entry.blockers!=='string'||entry.blockers.length>1000))||
       (entry.targetDate!==undefined&&!validTargetDate(entry.targetDate))||
       (entry.health!==undefined&&!['','on-track','needs-attention','blocked'].includes(entry.health)))
      throw Error('Invalid private project metadata.');
    const links=(entry.links??[]).map(link=>{
      if(!object(link)||Object.keys(link).some(key=>!['label','url'].includes(key))||
         typeof link.label!=='string'||!link.label.trim()||link.label.length>120||
         typeof link.url!=='string'||link.url.length>1000)
        throw Error('Invalid private project link.');
      let url;try{url=new URL(link.url);}catch{throw Error('Invalid private project link.');}
      if(!['https:','http:'].includes(url.protocol)||url.username||url.password)
        throw Error('Invalid private project link.');
      return {label:link.label.trim(),url:url.href};
    });
    // PJ-03: project milestones are private, finite metadata rather than
    // timeline/global milestones or task records. Preserve IDs across edits.
    const rawMilestones=entry.milestones===undefined?[]:entry.milestones;
    if(!Array.isArray(rawMilestones)||rawMilestones.length>12)
      throw Error('Invalid private project milestones.');
    const milestoneIds=new Set();
    const milestones=rawMilestones.map(item=>{
      if(!object(item)||Object.keys(item).some(key=>!['id','title','targetDate','done'].includes(key))||
        !validId(item.id)||milestoneIds.has(item.id)||
        typeof item.title!=='string'||!item.title.trim()||item.title.length>140||
        typeof item.targetDate!=='string'||!validTargetDate(item.targetDate)||
        typeof item.done!=='boolean')
        throw Error('Invalid private project milestone.');
      milestoneIds.add(item.id);
      return {id:item.id,title:item.title.trim(),targetDate:item.targetDate,done:item.done};
    });
    result[id]={description:entry.description??'',status:entry.status??'active',links};
    for(const key of ['goal','nextAction','blockers','targetDate'])
      if(entry[key])result[id][key]=entry[key];
    if(entry.milestones!==undefined)result[id].milestones=milestones;
    if(entry.health)result[id].health=entry.health;
  }
  return result;
}
export function validateProjectBranches(projects,branches){
  const normalized=normalizeProjects(projects);
  if(!Array.isArray(branches))throw Error('Expected existing branches.');
  const known=new Set(branches.map(branch=>branch?.id));
  for(const id of Object.keys(normalized))
    if(!known.has(id))throw Error('A private project must reference an existing branch.');
  return normalized;
}
/** Never mutate task records, branches or the input metadata map. */
export function setBranchProject(projects,branchId,branches,enabled){
  if(typeof enabled!=='boolean'||!validId(branchId))throw Error('Invalid project selection.');
  const next=normalizeProjects(projects);
  if(enabled){
    if(!Array.isArray(branches)||!branches.some(branch=>branch?.id===branchId))
      throw Error('A project must reference an existing branch.');
    if(!Object.hasOwn(next,branchId)){
      if(Object.keys(next).length>=128)throw Error('Too many private projects.');
      next[branchId]={description:'',status:'active',links:[]};
    }
  }else delete next[branchId];
  return next;
}


/** PJ-02B: parent and nested projects share tasks, never duplicate them.
 * Completion here is task.status === 'completed', independent of project status.
 */
export function summarizeProjectPortfolio(projects,branches,tasks){
  const checked=validateProjectBranches(projects,branches);
  if(!Array.isArray(tasks))throw Error('Expected existing tasks.');
  const byId=new Map(branches.map(branch=>[branch.id,branch]));
  const children=new Map();
  for(const branch of branches){
    if(!children.has(branch.parentId))children.set(branch.parentId,[]);
    children.get(branch.parentId).push(branch.id);
  }
  const descendants=id=>{
    const result=new Set([id]),pending=[id];
    while(pending.length){
      for(const child of children.get(pending.pop())||[]){
        if(!result.has(child)){result.add(child);pending.push(child);}
      }
    }
    return result;
  };
  const matching=ids=>{
    const seen=new Map();
    for(const task of tasks){
      if(!task||typeof task.id!=='string'||!ids.has(task.projectId)||seen.has(task.id))continue;
      seen.set(task.id,task);
    }
    return seen;
  };
  const numbers=items=>({total:items.size,
    completed:[...items.values()].filter(task=>task.status==='completed').length});
  const allTaskIds=new Set(),rows=[];
  for(const [id,metadata] of Object.entries(checked)){
    const directTasks=matching(new Set([id])),includedTasks=matching(descendants(id));
    for(const taskId of includedTasks.keys())allTaskIds.add(taskId);
    const branch=byId.get(id),included=numbers(includedTasks);
    let path=[],current=branch,visited=new Set();
    while(current&&!visited.has(current.id)){
      visited.add(current.id);path.unshift(current.label);
      current=byId.get(current.parentId);
    }
    rows.push({id,label:branch.label,path:path.join(' / '),color:branch.color||'',
      description:metadata.description,status:metadata.status,links:metadata.links,
      goal:metadata.goal??'',nextAction:metadata.nextAction??'',
      blockers:metadata.blockers??'',targetDate:metadata.targetDate??'',
      milestones:metadata.milestones??[],health:metadata.health??'',
      direct:numbers(directTasks),including:included,
      progress:included.total?Math.round(included.completed/included.total*100):null});
  }
  const portfolioTasks=new Map();
  for(const task of tasks)
    if(task&&allTaskIds.has(task.id)&&!portfolioTasks.has(task.id))
      portfolioTasks.set(task.id,task);
  return {projects:rows,totals:numbers(portfolioTasks)};
}


/** PJ-03: a local, transient finder for owner-private project summaries.
 * Never persists a query, alters records, or sends content to a provider.
 */
export function filterProjectPortfolio(rows,{query='',status='all'}={}){
  if(!Array.isArray(rows)||typeof query!=='string'||
     !['all','active','paused','completed'].includes(status))
    throw Error('Invalid private project finder query.');
  const fold=value=>String(value??'').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/\s+/g,' ').trim();
  const words=fold(query.slice(0,120)).split(' ').filter(Boolean);
  return rows.filter(project=>{
    if(!project||typeof project!=='object'||(status!=='all'&&project.status!==status))
      return false;
    if(!words.length)return true;
    const terms=[
      project.label,project.path,project.description,project.goal,
      project.nextAction,project.blockers,project.health,
      ...(Array.isArray(project.links)?project.links.map(link=>link?.label??''):[]),
      ...(Array.isArray(project.milestones)?project.milestones.map(item=>item?.title??''):[])
    ];
    const haystack=fold(terms.join(' '));
    return words.every(word=>haystack.includes(word));
  });
}
