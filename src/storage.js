import { DEFAULT_BRANCHES,getSampleTasks } from './data.js';
import { cleanTask } from './model.js';
const TASK_KEY='orbit.phase1.tasks.v1';
const PREF_KEY='orbit.phase1.preferences.v1';
const BRANCH_KEY='orbit.phase1.branches.v1';
export function readBranches(){
  try{
    const raw=localStorage.getItem(BRANCH_KEY);
    if(raw===null)return DEFAULT_BRANCHES.map(b=>({...b}));
    const parsed=JSON.parse(raw);
    if(!Array.isArray(parsed))throw Error('not an array');
    const branches=parsed.filter(b=>b&&typeof b.id==='string'&&b.id!=='root'&&typeof b.label==='string')
      .map(b=>({id:b.id.slice(0,90),parentId:String(b.parentId||'root'),label:b.label.slice(0,72),...(b.color?{color:String(b.color).slice(0,24)}:{})}));
    const validIds=new Set(['root']);
    // Ignore orphaned/cyclic branches rather than rendering an infinite loop.
    let todo=branches.slice(),done=[],count=0;
    while(todo.length&&count++<=branches.length){
      const rest=[];for(const b of todo){if(validIds.has(b.parentId)&&!validIds.has(b.id)){validIds.add(b.id);done.push(b);}else rest.push(b);}if(rest.length===todo.length)break;todo=rest;
    }
    return done.length?done:DEFAULT_BRANCHES.map(b=>({...b}));
  }catch(e){console.warn('ORBIT: branch restore failed',e);return DEFAULT_BRANCHES.map(b=>({...b}));}
}
export function saveBranches(branches){try{localStorage.setItem(BRANCH_KEY,JSON.stringify(branches));return true;}catch{return false;}}
export function readTasks(){try{const raw=localStorage.getItem(TASK_KEY);if(raw===null)return getSampleTasks();const parsed=JSON.parse(raw);if(Array.isArray(parsed))return parsed.map(t=>cleanTask(t));}catch(e){console.warn('ORBIT: task restore failed',e);}return getSampleTasks();}
export function saveTasks(tasks){try{localStorage.setItem(TASK_KEY,JSON.stringify(tasks));return true;}catch{return false;}}
export function readPreferences(){try{return {...{colorMode:'deadline'},...JSON.parse(localStorage.getItem(PREF_KEY)||'{}')};}catch{return {colorMode:'deadline'};}}
export function savePreferences(prefs){try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs));return true;}catch{return false;}}
