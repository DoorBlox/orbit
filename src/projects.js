/** PJ-01: Private reversible branch identity. Never a publishing permission. */
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(id)&&
  !['constructor','prototype','__proto__','root'].includes(id);

export function normalizeProjects(raw={}){
  if(raw===undefined||raw===null)raw={};
  if(!object(raw))throw Error('Invalid private project metadata.');
  const entries=Object.entries(raw);
  if(entries.length>128)throw Error('Too many private projects.');
  const result={};
  for(const [id,entry] of entries){
    if(!validId(id)||!object(entry)||Object.keys(entry).some(key=>!['description','status','links'].includes(key))||
       (entry.description!==undefined&&(typeof entry.description!=='string'||entry.description.length>4000))||
       (entry.status!==undefined&&!['active','paused','completed'].includes(entry.status))||
       (entry.links!==undefined&&(!Array.isArray(entry.links)||entry.links.length>12)))
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
    result[id]={description:entry.description??'',status:entry.status??'active',links};
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
