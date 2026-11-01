import { cleanTask } from './model.js';

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
  const safe=/^[=+@\t\r]/.test(original) ? `'${original}` : original;
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
  const find=(name)=>headers.indexOf(name);
  if(find('title')<0) throw Error('CSV needs a "title" column.');
  const tasks=[];let omitted=0;
  for(const r of rows.slice(1)) {
    const val=(name)=>{const i=find(name);return i<0?'':r[i]||'';};
    try{
      tasks.push(cleanTask({title:val('title'),projectId:val('project_id')||'inbox',dueDate:val('due_date'),
        urgency:val('urgency'),effortMinutes:val('effort_minutes'),status:val('status')||'captured',
        criteria:val('criteria'),description:val('description'),resourceUrl:val('resource_url')}));
    } catch { omitted++; }
  }
  return {tasks,omitted};
}
