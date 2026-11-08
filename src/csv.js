import { cleanTask, validateHttpUrl } from './model.js';

export const CSV_HEADERS=['title','project_id','due_date','urgency','effort_minutes','status','criteria','description','resource_url'];

// Simple RFC4180-ish parser: quoted commas/newlines, CRLF, quotes escaped as "".
export function parseCsv(raw) {
  const rows=[]; let row=[],field='',quoted=false;
  const data=String(raw||'').replace(/^\uFEFF/,'');
  for(let i=0;i<data.length;i++) {
    const c=data[i];
    if (c==='"') {
      if (quoted && data[i+1]==='"') { field+='"';i++; }
      else quoted=!quoted;
    } else if (c===',' && !quoted) { row.push(field);field=''; }
    else if ((c==='\n'||c==='\r') && !quoted) {
      if(c==='\r' && data[i+1]==='\n')i++;
      row.push(field);field='';
      if (row.some(x=>x.trim())) rows.push(row);
      row=[];
    } else field+=c;
  }
  if (quoted) throw Error('CSV contains an unclosed quoted value.');
  row.push(field);if(row.some(x=>x.trim()))rows.push(row);
  return rows;
}

const quote = (value) => {
  const original=String(value??'');
  // Prevent spreadsheet formula execution when opening CSV in common spreadsheet apps.
  const safe=/^[\s\u0000-\u001f]*[=+@-]|^[\t\r\n]/.test(original) ? `'${original}` : original;
  return `"${safe.replaceAll('"','""')}"`;
};

export function exportCsv(tasks) {
  const rows=[CSV_HEADERS.join(',')];
  for(const t of tasks) rows.push([
    t.title,t.projectId,t.dueDate,t.urgency,t.effortMinutes,t.status,t.criteria,t.description,t.resourceUrl,
  ].map(quote).join(','));
  return rows.join('\r\n')+'\r\n';
}

export function importCsv(raw) {
  const rows=parseCsv(raw);
  if(rows.length<2) throw Error('CSV has no tasks to import.');
  const headers=rows[0].map(x=>x.trim().toLowerCase());
  if(new Set(headers).size!==headers.length)throw Error('CSV contains duplicate column headers.');
  const find=(name)=>headers.indexOf(name);
  if(find('title')<0) throw Error('CSV needs a "title" column.');
  const tasks=[];let omitted=0;
  for(const r of rows.slice(1)) {
    if(r.length>headers.length){omitted++;continue;}
    const val=(name)=>{const i=find(name);return i<0?'':r[i]||'';};
    try{
      tasks.push(cleanTask({title:val('title'),projectId:val('project_id')||'inbox',dueDate:val('due_date'),
        urgency:val('urgency'),effortMinutes:val('effort_minutes'),status:val('status')||'captured',
        criteria:val('criteria'),description:val('description'),resourceUrl:validateHttpUrl(val('resource_url'))}));
    } catch { omitted++; }
  }
  return {tasks,omitted};
}

/** Branch CSV is deliberately separate from task CSV. A single import action
 * detects the header and validates the complete hierarchy before mutating it.
 * IDs are stable so subsequent task CSVs can refer to newly imported branches. */
export const BRANCH_CSV_HEADERS=['id','parent_id','label','color'];
export function exportBranchesCsv(branches) {
  const lines=[BRANCH_CSV_HEADERS.join(',')];
  for(const branch of branches)lines.push([
    branch.id,branch.parentId||'root',branch.label,branch.color||'',
  ].map(quote).join(','));
  return lines.join('\r\n')+'\r\n';
}
export function importBranchesCsv(raw,existingBranches=[]) {
  const rows=parseCsv(raw);
  if(rows.length<2)throw Error('Branch CSV has no rows to import.');
  if(rows.length>4001)throw Error('Branch CSV exceeds the 4,000 branch limit.');
  const headers=rows[0].map(x=>x.trim().toLowerCase());
  if(new Set(headers).size!==headers.length)throw Error('Branch CSV has duplicate column headers.');
  for(const required of ['id','parent_id','label'])if(!headers.includes(required))
    throw Error('Branch CSV needs id, parent_id and label columns.');
  const at=(row,key)=>String(row[headers.indexOf(key)]||'').trim();
  const existing=new Map(existingBranches.map(branch=>[branch.id,branch]));
  const pending=[],seen=new Set();let omitted=0;
  const validId=value=>/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(value)&&
    !['root','__proto__','prototype','constructor'].includes(value);
  for(const row of rows.slice(1)) {
    if(row.length>headers.length)throw Error('Branch CSV contains excess columns.');
    const id=at(row,'id'),parentId=at(row,'parent_id')||'root',label=at(row,'label'),
      color=headers.includes('color')?at(row,'color'):'';
    if(!validId(id)||!label||label.length>72||
      (parentId!=='root'&&!validId(parentId))||
      (color&&!/^#[A-Fa-f0-9]{6}$/.test(color)))throw Error('Branch CSV contains invalid IDs, names or colors.');
    if(seen.has(id))throw Error('Branch CSV contains duplicate IDs.');
    seen.add(id);
    const branch={id,parentId,label,...(color?{color}:{})};
    const prior=existing.get(id);
    if(prior){
      if(prior.parentId!==parentId||prior.label!==label||(prior.color||'')!==(color||''))
        throw Error('Branch ID collides with an existing, different branch.');
      omitted++;continue;
    }
    pending.push(branch);
  }
  if(existing.size+pending.length>4000)throw Error('Import would exceed the 4,000 branch limit.');
  const byId=new Map([...existingBranches,...pending].map(branch=>[branch.id,branch]));
  for(const branch of pending){
    const ancestry=new Set();let cursor=branch;
    while(cursor&&cursor.parentId!=='root'){
      if(ancestry.has(cursor.id))throw Error('Branch CSV has a parent cycle.');
      ancestry.add(cursor.id);cursor=byId.get(cursor.parentId);
      if(!cursor)throw Error('Branch CSV references an unknown parent ID.');
    }
  }
  return {branches:pending,omitted};
}
