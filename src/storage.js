import { DEFAULT_BRANCHES, getSampleTasks } from './data.js';
import { cleanTask } from './model.js';

export const STORAGE_KEYS = Object.freeze({
  tasks: 'orbit.phase1.tasks.v1', branches: 'orbit.phase1.branches.v1',
  preferences: 'orbit.phase1.preferences.v1', milestones: 'orbit-v4-milestones',
  journal: 'orbit.v5.journal', layout: 'orbit.v5.spatial-layout', sizes: 'orbit.v6.spatial-sizes',
  profile: 'orbit.v7.profile',
});
let activeStorage;
let issues = new Map();
let recoveryData = {};
function currentStorage() {
  const next = globalThis.localStorage;
  if (next !== activeStorage) { activeStorage = next; issues = new Map(); recoveryData = {}; }
  return next;
}
function block(key, reason, raw) {
  issues.set(key, reason);
  if (raw !== undefined) recoveryData[key] = raw;
}
function read(key) {
  try {
    const raw = currentStorage().getItem(key);
    if (raw === null) return { missing: true };
    try { return { value: JSON.parse(raw), raw }; }
    catch { block(key, 'Saved data cannot be read. Export recovery data before restoring a backup.', raw); }
  } catch { block(key, 'Browser storage is unavailable. Export a backup to keep this session.'); }
  return { failed: true };
}
function write(key, value) {
  try {
    const target = currentStorage();
    if (issues.has(key)) return false;
    target.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}
/** Metadata only: never include private saved values in diagnostics or logs. */
export function getStorageStatus() {
  try { currentStorage(); } catch { /* Read functions record unavailable storage. */ }
  return { recoveryRequired: issues.size > 0, blockedKeys: [...issues.keys()],
    issues: [...issues].map(([key, reason]) => ({ key, reason })) };
}
/** Only call for an explicit local recovery export, never telemetry. */
export function getRecoveryData() { return { ...recoveryData }; }
export function markStorageIssue(key, reason, raw) {
  try { const target = currentStorage(); if (raw === undefined) raw = target.getItem(key); } catch { /* Preserve metadata even when storage access is denied. */ }
  block(key, reason, raw);
}
export function isStorageWriteBlocked(key) { try { currentStorage(); } catch { return true; } return issues.has(key); }
export function clearStorageIssues(keys = [...issues.keys()]) {
  currentStorage();
  for (const key of keys) { issues.delete(key); delete recoveryData[key]; }
}
export function clearStorageRecovery() { clearStorageIssues(); }

export function readTasks() {
  const loaded = read(STORAGE_KEYS.tasks);
  if (loaded.missing) return getSampleTasks();
  if (loaded.failed) return [];
  if (!Array.isArray(loaded.value)) {
    block(STORAGE_KEYS.tasks, 'Saved tasks are not a task list.', loaded.raw); return [];
  }
  const tasks = [], ids = new Set();
  for (const raw of loaded.value) {
    try {
      if (!raw || typeof raw !== 'object' || typeof raw.title !== 'string') throw Error();
      const task = cleanTask(raw);
      if (ids.has(task.id)) throw Error();
      ids.add(task.id); tasks.push(task);
    } catch { block(STORAGE_KEYS.tasks, 'Some tasks need recovery. Original saved data is protected.', loaded.raw); }
  }
  return tasks;
}
export function readBranches() {
  const loaded = read(STORAGE_KEYS.branches);
  if (loaded.missing) return DEFAULT_BRANCHES.map(branch => ({ ...branch }));
  if (loaded.failed) return [];
  if (!Array.isArray(loaded.value)) {
    block(STORAGE_KEYS.branches, 'Saved branches are not a branch list.', loaded.raw); return [];
  }
  const candidates = [], ids = new Set();
  for (const branch of loaded.value) {
    if (!branch || typeof branch.id !== 'string' || !branch.id || branch.id === 'root' ||
        branch.id.length > 90 || ids.has(branch.id) || typeof branch.label !== 'string' || !branch.label.trim()) {
      block(STORAGE_KEYS.branches, 'Some branches need recovery. Original saved data is protected.', loaded.raw); continue;
    }
    ids.add(branch.id);
    candidates.push({ id: branch.id, parentId: String(branch.parentId || 'root'), label: branch.label.slice(0,72),
      ...(typeof branch.color === 'string' ? { color: branch.color.slice(0,24) } : {}) });
  }
  const valid = new Set(['root']), branches = [];
  let pending = candidates;
  while (pending.length) {
    const rest = [];
    for (const branch of pending) {
      if (valid.has(branch.parentId)) { valid.add(branch.id); branches.push(branch); }
      else rest.push(branch);
    }
    if (rest.length === pending.length) {
      block(STORAGE_KEYS.branches, 'Branch hierarchy needs recovery. Original saved data is protected.', loaded.raw); break;
    }
    pending = rest;
  }
  return branches;
}
export function readPreferences() {
  const loaded = read(STORAGE_KEYS.preferences);
  if (loaded.missing || loaded.failed) return { colorMode: 'deadline' };
  const value = loaded.value;
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      (value.colorMode !== undefined && !['deadline','urgency'].includes(value.colorMode))) {
    block(STORAGE_KEYS.preferences, 'Saved preferences need recovery.', loaded.raw);
    return { colorMode: 'deadline' };
  }
  return { colorMode: value.colorMode || 'deadline' };
}
export function readProfile() {
  const loaded=read(STORAGE_KEYS.profile);
  if(loaded.missing||loaded.failed)return {displayName:'My space'};
  const value=loaded.value;
  if(!value||typeof value!=='object'||Array.isArray(value)||
    typeof value.displayName!=='string'||!value.displayName.trim()||value.displayName.trim().length>100){
    block(STORAGE_KEYS.profile,'Saved Space name needs recovery.',loaded.raw);
    return {displayName:'My space'};
  }
  return {displayName:value.displayName.trim()};
}
export function saveProfile(profile) {
  if(!profile||typeof profile.displayName!=='string'||!profile.displayName.trim()||
      profile.displayName.trim().length>100)return false;
  return write(STORAGE_KEYS.profile,{displayName:profile.displayName.trim()});
}
export function saveTasks(tasks) { return write(STORAGE_KEYS.tasks, tasks); }
export function saveBranches(branches) { return write(STORAGE_KEYS.branches, branches); }
export function savePreferences(preferences) { return write(STORAGE_KEYS.preferences, preferences); }
