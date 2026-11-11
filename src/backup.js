import { cleanTask } from './model.js';
import { validDateKey, dateKey } from './dates.js';
import { STORAGE_KEYS } from './storage.js';
import { normalizeExtensions } from './scene.js';
import { CORE_WIDGET_IDS } from './widget-registry.js';
import { validateProjectBranches } from './projects.js';
export const RESTORE_RECOVERY_KEY = 'orbit.v6.restore-recovery';
const keys = new Set(Object.values(STORAGE_KEYS));
const widgets = new Set(CORE_WIDGET_IDS);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const safeId = value => typeof value === 'string' && value.length > 0 && value.length <= 100 && !['__proto__','constructor','prototype','root'].includes(value);
function list(value, max, label) {
  if (!Array.isArray(value) || value.length > max) throw Error(`Invalid ${label} list.`);
  return value;
}
function unique(items, label) {
  const ids = new Set();
  for (const item of items) {
    if (!object(item) || !safeId(item.id) || ids.has(item.id)) throw Error(`Invalid or duplicate ${label} ID.`);
    ids.add(item.id);
  }
}
/** Validate and sanitize every entity before changing memory or storage. */
export function validateBackup(input, { sanitizeHtml } = {}) {
  const value = typeof input === 'string' ? JSON.parse(input) : input;
  if (!object(value) || value.format !== 'orbit-backup' || ![5,6].includes(value.version)) throw Error('Unsupported ORBIT backup version.');
  const branches = list(value.branches, 4000, 'branch'); unique(branches, 'branch');
  const byId = new Map(branches.map(b => [b.id,b]));
  if (!byId.has('inbox')) throw Error('Missing Unsorted branch.');
  for (const b of branches) {
    if (typeof b.label !== 'string' || !b.label.trim() || b.label.length > 72) throw Error('Invalid branch name.');
    const seen = new Set(); let cursor = b;
    while (cursor && cursor.parentId !== 'root') {
      if (seen.has(cursor.id) || !byId.has(cursor.parentId)) throw Error('Invalid branch hierarchy.');
      seen.add(cursor.id); cursor = byId.get(cursor.parentId);
    }
  }
  const tasks = list(value.tasks, 10000, 'task'); unique(tasks, 'task');
  for (const t of tasks) {
    if (typeof t.title !== 'string' || !t.title.trim() || !byId.has(t.projectId || t.branchId) ||
        (t.dueDate && !validDateKey(t.dueDate))) throw Error('Invalid task fields or branch.');
  }
  // Preserve an explicitly exported identity; older V5/V6 backups may omit it.
  // Validate BEFORE any state change, and never treat user-controlled profile text
  // as authorization metadata.
  if(value.profile!==undefined&&(!object(value.profile)||typeof value.profile.displayName!=='string'||
    !value.profile.displayName.trim()||value.profile.displayName.trim().length>100))throw Error('Invalid workspace name.');
  const extensions=value.extensions===undefined?undefined:normalizeExtensions(value.extensions);
  let collapsedBranchIds;
  if(value.collapsedBranchIds!==undefined){
    const ids=list(value.collapsedBranchIds,4000,'collapsed branch');const seen=new Set();
    const parents=new Set(branches.map(b=>b.parentId).filter(id=>id!=='root'));
    collapsedBranchIds=ids.map(id=>{
      if(!safeId(id)||!byId.has(id)||!parents.has(id)||seen.has(id))throw Error('Invalid collapsed branch ID.');
      seen.add(id);return id;
    });
  }
  const normalized = { format:'orbit-backup', version:value.version,
    ...(value.profile?{profile:{displayName:value.profile.displayName.trim()}}:{}),
    ...(collapsedBranchIds!==undefined?{collapsedBranchIds}:{}),
    ...(extensions!==undefined?{extensions}:{}),
    branches:branches.map(b => ({id:b.id,parentId:b.parentId,label:b.label,...(typeof b.color==='string'?{color:b.color.slice(0,24)}:{})})),
    tasks:tasks.map(t => cleanTask(t)), preferences:{colorMode:value.preferences?.colorMode === 'urgency'?'urgency':'deadline'},
    milestones:[] };
  if (value.milestones !== undefined) {
    const milestones = list(value.milestones,500,'milestone'); unique(milestones,'milestone');
    normalized.milestones = milestones.map(m => {
      if (typeof m.title !== 'string' || !m.title.trim() || m.title.length>110 || !validDateKey(m.date)) throw Error('Invalid milestone.');
      return {id:m.id,title:m.title,date:m.date};
    });
  }
  if (value.journalEntries !== undefined) {
    if (typeof sanitizeHtml !== 'function') throw Error('Journal sanitizer is required.');
    const entries = list(value.journalEntries,600,'journal'); unique(entries,'journal');
    normalized.journalEntries = entries.map(j => {
      if (typeof j.html !== 'string' || j.html.length>140000 || typeof j.title !== 'string' || j.title.length>120 ||
          typeof j.date !== 'string' || (!validDateKey(j.date) && !(/^\d{4}-\d{2}-\d{2}T/.test(j.date) && validDateKey(j.date.slice(0,10)) && Number.isFinite(Date.parse(j.date))))) throw Error('Invalid journal entry.');
      return {id:j.id,date:dateKey(j.date),title:j.title,html:sanitizeHtml(j.html),createdAt:j.createdAt||j.date,updatedAt:j.updatedAt||j.date};
    });
  }
  if(normalized.extensions?.projects)validateProjectBranches(normalized.extensions.projects,normalized.branches);
  if (value.spatialLayout !== undefined) {
    if (!object(value.spatialLayout)) throw Error('Invalid widget layout.');
    normalized.spatialLayout = {};
    for (const [id,p] of Object.entries(value.spatialLayout)) {
      if (!widgets.has(id) || !object(p) || !Number.isFinite(p.x) || !Number.isFinite(p.y) ||
          Math.abs(p.x)>10000 || Math.abs(p.y)>10000 ||
          ((p.width!==undefined || p.height!==undefined) && (!Number.isFinite(p.width)||!Number.isFinite(p.height)||p.width<200||p.height<200||p.width>4000||p.height>4000))) throw Error('Invalid widget dimensions.');
      normalized.spatialLayout[id] = {x:p.x,y:p.y,...(p.width!==undefined?{width:Math.round(p.width),height:Math.round(p.height)}:{})};
    }
  }
  return normalized;
}
function restoreOriginals(originals, storage) {
  let complete = true;
  for (const [key,raw] of Object.entries(originals)) {
    try { if(storage.getItem(key)===raw)continue; if (raw===null) storage.removeItem(key); else storage.setItem(key,raw); } catch { complete=false; }
  }
  return complete;
}
export function recoverInterruptedRestore(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(RESTORE_RECOVERY_KEY);
    if (raw === null) return {ok:true,recovered:false,rollbackComplete:true};
    const marker = JSON.parse(raw);
    if (!object(marker) || marker.version!==1 || !object(marker.originals) ||
        !Object.entries(marker.originals).every(([key,value])=>keys.has(key)&&(value===null||typeof value==='string'))) throw Error();
    const rollbackComplete = restoreOriginals(marker.originals,storage);
    if (rollbackComplete) storage.removeItem(RESTORE_RECOVERY_KEY);
    return {ok:rollbackComplete,recovered:true,rollbackComplete,recoveryData:marker.originals};
  } catch { return {ok:false,recovered:false,rollbackComplete:false}; }
}
/** Write-ahead originals permit rollback after failure or interrupted restoration. */
export function persistBackup(snapshot, storage = globalThis.localStorage) {
  const recovered = recoverInterruptedRestore(storage);
  if (!recovered.ok) return {...recovered,error:'Recover the interrupted restore before importing again.'};
  const values = {
    [STORAGE_KEYS.tasks]:snapshot.tasks, [STORAGE_KEYS.branches]:snapshot.branches,
    [STORAGE_KEYS.preferences]:snapshot.preferences, [STORAGE_KEYS.milestones]:snapshot.milestones,
  };
  // An older backup without profile must not reset the current Space name.
  if(snapshot.profile!==undefined)values[STORAGE_KEYS.profile]=snapshot.profile;
  if(snapshot.extensions!==undefined)values[STORAGE_KEYS.extensions]=snapshot.extensions;
  if (snapshot.journalEntries !== undefined) values[STORAGE_KEYS.journal] = snapshot.journalEntries;
  if (snapshot.spatialLayout !== undefined) {
    values[STORAGE_KEYS.layout] = Object.fromEntries(Object.entries(snapshot.spatialLayout).map(([id,p])=>[id,{x:p.x,y:p.y}]));
    values[STORAGE_KEYS.sizes] = Object.fromEntries(Object.entries(snapshot.spatialLayout).filter(([,p])=>p.width!==undefined).map(([id,p])=>[id,{w:p.width,h:p.height}]));
  }
  const originals = {};
  let markerWritten = false;
  try {
    const serialized = Object.entries(values).map(([key,value])=>[key,JSON.stringify(value)]);
    for (const [key] of serialized) originals[key] = storage.getItem(key);
    storage.setItem(RESTORE_RECOVERY_KEY,JSON.stringify({version:1,originals})); markerWritten = true;
    for (const [key,raw] of serialized) storage.setItem(key,raw);
    storage.removeItem(RESTORE_RECOVERY_KEY);
    return {ok:true,rollbackComplete:true,writtenKeys:serialized.map(([key])=>key)};
  } catch {
    let rollbackComplete = !markerWritten || restoreOriginals(originals,storage);
    if (markerWritten && rollbackComplete) {
      try { storage.removeItem(RESTORE_RECOVERY_KEY); } catch { rollbackComplete=false; }
    }
    return {ok:false,rollbackComplete,recoveryData:originals,error:rollbackComplete?'Restore not saved; original data retained.':'Restore interrupted; originals retained for recovery. Export recovery data.'};
  }
}
