import { branchPath,descendantsOf,createBranch } from './data.js';
import { cleanTask,taskSummary } from './model.js';
import { readTasks,saveTasks,readPreferences,savePreferences,readBranches,saveBranches,STORAGE_KEYS,getStorageStatus,getRecoveryData,markStorageIssue,isStorageWriteBlocked,clearStorageIssues } from './storage.js';
import { importCsv,exportCsv } from './csv.js';
import { Constellation } from './constellation.js';
import { ScrapWidgets } from './widgets.js';
import { SpatialBoard } from './board.js';
import { validateBackup,persistBackup,recoverInterruptedRestore,RESTORE_RECOVERY_KEY } from './backup.js';
import { validDateKey } from './dates.js';
import { Journal,sanitizeJournal } from './journal.js';

/** Mount the same spatial scrapbook over either local or authenticated owner state. */
export function mountOrbit({initialSnapshot=null,readOnly=false,persistLocally=true,onSnapshotChange=()=>{}}={}){
let disposed=false,hydrating=true,cloudStatus={state:'saved',hasPending:false};
const events=new AbortController();
const $=id=>document.getElementById(id);
// Recover interrupted imports before any view reads its independent keys.
let restoreRecovery;
try{restoreRecovery=persistLocally?recoverInterruptedRestore():{ok:true};}catch{restoreRecovery={ok:false};}
if(!restoreRecovery.ok)for(const key of Object.values(STORAGE_KEYS))markStorageIssue(key,'Interrupted restore needs recovery.');
const state={branches:initialSnapshot?structuredClone(initialSnapshot.branches):readBranches(),tasks:initialSnapshot?structuredClone(initialSnapshot.tasks):readTasks(),preferences:initialSnapshot?structuredClone(initialSnapshot.preferences):readPreferences(),profile:structuredClone(initialSnapshot?.profile||{displayName:'HISYAM'}),selectedBranchId:'inbox',
  selectedTaskId:'',captureMode:'capture',captureDraft:'',searchDraft:''};
const capture=$('capture-form'),input=$('capture-name'),target=$('capture-target');
const milestoneKey='orbit-v4-milestones';
let milestones=structuredClone(initialSnapshot?.milestones||[]);
if(!initialSnapshot)try{
  const raw=localStorage.getItem(milestoneKey),stored=JSON.parse(raw||'[]');
  if(!Array.isArray(stored)||stored.length>500)throw Error();
  milestones=stored.filter(x=>x&&typeof x.id==='string'&&typeof x.title==='string'&&validDateKey(x.date));
  if(milestones.length!==stored.length)markStorageIssue(milestoneKey,'Milestones need recovery.',raw);
}catch{markStorageIssue(milestoneKey,'Milestones cannot be read.');}
let toastTimer=0,clearDemoPrimed=false,clearDemoTimer=0,undoLast=null,lastSaveOk=true;
const pendingWrites=new Set();

const scene=new Constellation({viewport:$('map-viewport'),world:$('map-world'),edgesEl:$('connections'),
  nodesEl:$('node-layer'),decorEl:$('world-decor'),
  onBranchSelected(id){if(id!=='root')setBranch(id);},
  onBranchAdd(parentId,label){if(readOnly||disposed)return false;
    try{
      const next=createBranch(label,parentId,state.branches);
      state.branches.push(next);sync();setBranch(next.id);scene.focusNode(next.id);
      message(`Added “${next.label}”. You can keep branching from here.`);
    }catch(err){message(err.message);}
  },
  onBranchRename(id,label){if(readOnly||disposed)return false;
    const b=state.branches.find(b=>b.id===id);if(!b)return;
    const before=b.label;b.label=label.slice(0,72);sync();message(`Renamed “${before}” to “${b.label}”.`);
  },
  onBranchMove(id,parentId){if(readOnly||disposed)return false;
    const b=state.branches.find(b=>b.id===id);if(!b)return;
    if(id===parentId||descendantsOf(id,state.branches).has(parentId)){message('A branch cannot move into itself.');return;}
    if(parentId!=='root'&&!state.branches.some(x=>x.id===parentId)){message('Choose a valid parent.');return;}
    b.parentId=parentId;sync();scene.focusNode(id);message('Branch moved; its tasks and children stayed attached.');
  },
  onTaskSelected(id){
    state.selectedTaskId=id;const task=state.tasks.find(t=>t.id===id);if(task)setBranch(task.projectId);
  },
  onTaskUpdate(id,patch){if(readOnly||disposed)return false;
    const index=state.tasks.findIndex(t=>t.id===id);if(index<0)return;
    const prev=state.tasks[index];
    try{
      const next=cleanTask({...prev,...patch},prev.projectId);
      if(!state.branches.some(b=>b.id===next.projectId))throw Error('Choose an existing branch.');
      state.tasks[index]=next;scene.expandedTaskId=id;sync();
      if(patch.status==='completed')message('Finished. That counts.');
      else if(patch.projectId&&patch.projectId!==prev.projectId){setBranch(next.projectId);scene.focusTask(next);message('Task moved to its new branch.');}
      else message('Saved.');
    }catch(err){message(`Could not update: ${err.message}`);}
  },
  onTaskDelete(id){if(readOnly||disposed)return false;
    const index=state.tasks.findIndex(t=>t.id===id);if(index<0)return;
    const deleted=state.tasks.splice(index,1)[0];
    if(scene.expandedTaskId===id)scene.expandedTaskId='';sync();
    message('Task removed.',6500,rememberDelete(()=>{state.tasks.splice(Math.min(index,state.tasks.length),0,deleted);sync();scene.focusTask(deleted);}));
  },
});

const widgets=new ScrapWidgets({
  notify:(...args)=>message(...args),
  onFocus(task){
    if(task.status==='completed'){board.focus('completed');return;}
    board.focus('constellation');
    setBranch(task.projectId);scene.expandedTaskId=task.id;scene.selectedTaskId=task.id;
    scene.setData(state.branches,state.tasks.filter(t=>t.status!=='completed'),state.preferences.colorMode);
    scene.focusTask(task);
  },
  onComplete(id){if(readOnly||disposed)return false;const t=state.tasks.find(x=>x.id===id);if(!t)return;
    t.status='completed';t.completedAt=new Date().toISOString();
    if(scene.expandedTaskId===id)scene.expandedTaskId='';sync();message('Moved to Already done.');
  },
  onRestore(id){if(readOnly||disposed)return false;const t=state.tasks.find(x=>x.id===id);if(!t)return;
    t.status='ready';t.completedAt='';sync();message('Back on the constellation.');
  },
  onOpenJournal(entryId){if(journal.openEntry(entryId))board.focus('journal');},
  onChangeMilestones(next){if(readOnly||disposed)return false;
    milestones=next.slice(0,500);let ok=false;
    if(!persistLocally){widgets.setData(state.branches,state.tasks,state.preferences.colorMode,milestones);emitChange();return false;}
    try{if(!isStorageWriteBlocked(milestoneKey)){localStorage.setItem(milestoneKey,JSON.stringify(milestones));ok=true;}}catch{}
    if(ok)pendingWrites.delete(milestoneKey);else pendingWrites.add(milestoneKey);
    if(!ok)message('Milestone not saved. Export a backup to keep this session.',6500);
    widgets.setData(state.branches,state.tasks,state.preferences.colorMode,milestones);return ok;
  }
});

const board=new SpatialBoard({notify:(...args)=>message(...args),initialLayout:initialSnapshot?(initialSnapshot.spatialLayout||{}):undefined,readOnly,persistLocally,onLayoutChange:()=>emitChange()});
board.onWidgetResize=id=>{if(id==='constellation')requestAnimationFrame(()=>scene.onResize());};
const journal=new Journal({initialEntries:initialSnapshot?(initialSnapshot.journalEntries||[]):undefined,readOnly,persistLocally,notify:(s,...args)=>message(s,...args),onEntriesChange:entries=>{widgets.setJournalEntries(entries);emitChange();}});
widgets.setJournalEntries(journal.entries);

// Previously saved task IDs are never discarded. An orphaned assignment is
// placed into Unsorted, but its content and all other fields remain intact.
if(!state.branches.some(b=>b.id==='inbox'))state.branches.push({id:'inbox',parentId:'root',label:'Unsorted'});
if(!state.branches.some(b=>b.id==='just-because'))state.branches.push({id:'just-because',parentId:'root',label:'Just Because'});
const known=new Set(state.branches.map(b=>b.id));for(const t of state.tasks)if(!known.has(t.projectId)){if(persistLocally)markStorageIssue(STORAGE_KEYS.tasks,'Some task assignments need recovery.');t.projectId='inbox';}

function message(text,duration=2700,action=null){
  if(disposed)return;
  if(!persistLocally&&cloudStatus.hasPending){text=text.replace(/^Saved\./,'Saving…');text+=' Changes are waiting to sync.';}
  if(persistLocally&&(!lastSaveOk||pendingWrites.size||getStorageStatus().recoveryRequired)){text=text.replace(/^Saved\./,'Changes kept for this session.');text+=' Changes not saved on this device. Export a backup.';duration=Math.max(duration,6500);}
  const focusAction=action&&document.activeElement?.matches(':focus-visible');
  const toast=$('toast');clearTimeout(toastTimer);toast.replaceChildren(document.createTextNode(text));
  toast.classList.toggle('has-action',Boolean(action));
  if(action){const b=document.createElement('button');b.type='button';b.className='toast-action';b.textContent=action.label;
    b.addEventListener('click',()=>{toast.classList.remove('show');action.run();});toast.append(b);
    if(focusAction)queueMicrotask(()=>b.focus({preventScroll:true}));}
  toast.classList.add('show');toastTimer=setTimeout(()=>toast.classList.remove('show'),duration);
}
function rememberDelete(restore){undoLast=restore;return {label:'Undo',run:()=>{const fn=undoLast;undoLast=null;fn?.();message('Restored.');}};}
function currentBranch(){return state.branches.find(b=>b.id===state.selectedBranchId);}
function setBranch(id){if(!state.branches.some(b=>b.id===id))return;state.selectedBranchId=id;updateCaptureTarget();}
function updateCaptureTarget(){
  if(state.captureMode==='find'){updateSearch();return;}
  const b=currentBranch();target.textContent=`to ${b?.label||'Unsorted'}`;
  target.title=b?`New tasks attach directly to ${branchPath(b.id,state.branches)}`:'New tasks attach to Unsorted';
}
function matches(){
  const query=input.value.trim().toLocaleLowerCase();if(!query)return [];
  return state.tasks.filter(t=>`${t.title} ${t.criteria} ${t.description} ${branchPath(t.projectId,state.branches)}`.toLocaleLowerCase().includes(query));
}
function updateSearch(){
  if(state.captureMode!=='find')return;
  const results=matches();scene.highlightTasks(results.map(t=>t.id));
  target.textContent=input.value.trim()?`${results.length} found`:'type to find';
  target.title=results.length?'Enter to focus the first match':'Find any task';
}
function switchCaptureMode(mode){
  if(mode===state.captureMode)return;
  if(state.captureMode==='capture')state.captureDraft=input.value;else state.searchDraft=input.value;
  state.captureMode=mode;capture.dataset.mode=mode;
  input.value=mode==='find'?state.searchDraft:state.captureDraft;
  input.placeholder=mode==='find'?'Find anything on the map…':'Capture a thought or next action…';
  $('capture-mode').setAttribute('aria-label',mode==='find'?'Switch to capture':'Switch to find');
  $('capture-mode').title=mode==='find'?'Capture a task':'Find tasks';
  $('capture-mode').querySelector('use').setAttribute('href',mode==='find'?'#i-search':'#i-spark');
  $('capture-submit').querySelector('use').setAttribute('href',mode==='find'?'#i-search':'#i-plus');
  $('capture-submit').setAttribute('aria-label',mode==='find'?'Find task':'Add task');
  scene.highlightTasks(null);updateCaptureTarget();input.focus();
}
function sync({persist=true}={}){
  if(disposed)return false;
  if(persist&&persistLocally&&!readOnly){
    const tasksOk=saveTasks(state.tasks),branchesOk=saveBranches(state.branches);lastSaveOk=tasksOk&&branchesOk;
    for(const [key,ok] of [[STORAGE_KEYS.tasks,tasksOk],[STORAGE_KEYS.branches,branchesOk]]){if(ok)pendingWrites.delete(key);else pendingWrites.add(key);}
  }
  scene.setData(state.branches,state.tasks.filter(t=>t.status!=='completed'),state.preferences.colorMode);
  widgets.setData(state.branches,state.tasks,state.preferences.colorMode,milestones);
  if(state.captureMode==='find')updateSearch();
  const s=taskSummary(state.tasks);
  $('task-summary').textContent=`${s.active} active · ${s.completed} finished${s.dueSoon?` · ${s.dueSoon} approaching`:''}${s.overdue?` · ${s.overdue} overdue`:''}`;
  $('mode-label').textContent=state.preferences.colorMode;
  $('color-mode').setAttribute('aria-label',`Task colors and sorting show ${state.preferences.colorMode}. Switch mode.`);
  updateCaptureTarget();
  if(persist&&!persistLocally)emitChange();
  if(readOnly)for(const button of document.querySelectorAll('.node-actions button,.task-actions button,.rail-check,.reopen-button'))button.disabled=true;
  return lastSaveOk;
}
function quickCapture(e){
  e.preventDefault();if(readOnly||disposed)return;
  if(state.captureMode==='find'){
    const t=matches()[0];if(!t){message('No matching task yet.');return;}
    input.blur();if(t.status==='completed'){board.focus('completed');message('Found in Already done.');return;}
    setBranch(t.projectId);scene.expandedTaskId=t.id;scene.selectedTaskId=t.id;sync({persist:false});scene.focusTask(t);
    message(`Found “${t.title}”.`);return;
  }
  const title=input.value.trim();if(!title){input.focus();return;}
  const task=cleanTask({title,projectId:state.selectedBranchId,urgency:2,status:'captured'});
  state.tasks.push(task);input.value='';state.captureDraft='';sync();scene.focusTask(task);
  message(`Added to ${currentBranch()?.label||'Unsorted'}.`);
}
function backupJson(){
  journal.commit();
  const backup={format:'orbit-backup',version:6,exportedAt:new Date().toISOString(),branches:state.branches,tasks:state.tasks,preferences:state.preferences,profile:state.profile,milestones,spatialLayout:board.getLayout(),journalEntries:journal.getEntries()};
  if(persistLocally&&getStorageStatus().recoveryRequired){backup.recoveryData=getRecoveryData();try{backup.restoreRecovery=localStorage.getItem(RESTORE_RECOVERY_KEY);}catch{}}
  download(JSON.stringify(backup,null,2),`orbit-complete-backup-${new Date().toISOString().slice(0,10)}.json`,'application/json');
  message('Complete backup: tasks, branches, journal pages, milestones and widget positions.');
}
function download(contents,filename,type){const blob=new Blob([contents],{type});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1800);}
function restoreBackup(contents){
  if(readOnly||disposed)return;
  const snapshot=validateBackup(contents,{sanitizeHtml:sanitizeJournal});
  journal.commit();
  if(!persistLocally){applySnapshot(snapshot);emitChange();message('Import is pending cloud save. Existing local backup remains unchanged.');return;}
  const result=persistBackup(snapshot);
  if(!result.ok){
    if(!result.rollbackComplete)for(const key of Object.values(STORAGE_KEYS))markStorageIssue(key,'Interrupted restore needs recovery.',result.recoveryData?.[key]);
    throw Error(result.error);
  }
  clearStorageIssues(result.writtenKeys);for(const key of result.writtenKeys)pendingWrites.delete(key);lastSaveOk=true;
  state.branches=snapshot.branches;state.tasks=snapshot.tasks;state.preferences=snapshot.preferences;milestones=snapshot.milestones;
  if(snapshot.spatialLayout)board.setLayout(snapshot.spatialLayout,{persist:false});
  if(snapshot.journalEntries)journal.replaceEntries(snapshot.journalEntries,{persist:false});
  state.selectedBranchId='inbox';sync({persist:false});scene.fitAll();
  message('Backup restored, including journal and widget positions (when available).');
}
function initTools(){
  capture.addEventListener('submit',quickCapture);
  $('capture-mode').addEventListener('click',()=>switchCaptureMode(state.captureMode==='capture'?'find':'capture'));
  input.addEventListener('input',()=>{if(state.captureMode==='find'){state.searchDraft=input.value;updateSearch();}else state.captureDraft=input.value;});
  input.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.captureMode==='find'){e.preventDefault();switchCaptureMode('capture');}});
  $('color-mode').addEventListener('click',()=>{state.preferences.colorMode=state.preferences.colorMode==='deadline'?'urgency':'deadline';const preferencesOk=readOnly||!persistLocally?true:savePreferences(state.preferences);sync();lastSaveOk=lastSaveOk&&preferencesOk;if(preferencesOk)pendingWrites.delete(STORAGE_KEYS.preferences);else pendingWrites.add(STORAGE_KEYS.preferences);message(`Sorted and colored by ${state.preferences.colorMode}.`);});
  $('map-fullscreen').addEventListener('click',()=>{document.body.classList.toggle('map-immersive');
    const open=document.body.classList.contains('map-immersive');
    const el=$('constellation-widget');
    if(open){$('app').append(el);}else{$('spatial-world').append(el);board.position('constellation');}
    $('map-fullscreen').setAttribute('aria-label',open?'Exit expanded constellation':'Expand constellation');
    $('map-fullscreen').title=open?'Exit expanded constellation':'Expand constellation';
    requestAnimationFrame(()=>requestAnimationFrame(()=>scene.onResize()));
  });
  $('zoom-in').addEventListener('click',()=>scene.zoomBy(1.35));
  $('zoom-out').addEventListener('click',()=>scene.zoomBy(1/1.35));
  $('fit-all').addEventListener('click',()=>scene.fitAll());
  $('import-csv').addEventListener('click',()=>$('csv-file').click());
  $('backup-json').addEventListener('click',backupJson);
  $('clear-demo').addEventListener('click',()=>{if(readOnly||disposed)return;
    const count=state.tasks.filter(t=>t.id.startsWith('demo-')).length;
    if(!count){message('There are no sample tasks left.');return;}
    if(!clearDemoPrimed){clearDemoPrimed=true;message(`Click SAMPLE CONTENT again to remove ${count} sample tasks.`,4300);clearTimeout(clearDemoTimer);clearDemoTimer=setTimeout(()=>clearDemoPrimed=false,4700);return;}
    const removed=state.tasks.filter(t=>t.id.startsWith('demo-'));state.tasks=state.tasks.filter(t=>!t.id.startsWith('demo-'));
    clearDemoPrimed=false;sync();message(`Removed ${count} sample tasks.`,6500,rememberDelete(()=>{state.tasks.unshift(...removed);sync();}));
    $('clear-demo').textContent='Remove samples';
  });
  $('export-csv').addEventListener('click',()=>{
    download(exportCsv(state.tasks),`orbit-tasks-${new Date().toISOString().slice(0,10)}.csv`,'text/csv;charset=utf-8');
    message(`Exported ${state.tasks.length} tasks as CSV.`);
  });
  $('csv-file').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file||readOnly||disposed)return;
    try{
      if(file.size>6_000_000)throw Error('File is too large (limit: 6 MB).');
      const contents=await file.text();
      if(disposed||readOnly)return;
      if(file.name.toLowerCase().endsWith('.json')){
        const data=contents;
        message('Restore complete backup? This replaces current branches and tasks. Export a backup first.',10000,
          {label:'Restore',run:()=>{try{restoreBackup(data);}catch(err){message(err.message,5500);}}});
      }else{
        const r=importCsv(contents);const valid=new Set(state.branches.map(b=>b.id));let moved=0;
        for(const t of r.tasks)if(!valid.has(t.projectId)){t.projectId='inbox';moved++;}
        if(!state.branches.some(b=>b.id==='just-because'))state.branches.push({id:'just-because',parentId:'root',label:'Just Because'});
const known=new Set(state.tasks.map(t=>`${t.title.toLowerCase()}|${t.projectId}|${t.dueDate}`));
        const unique=r.tasks.filter(t=>{const k=`${t.title.toLowerCase()}|${t.projectId}|${t.dueDate}`;if(known.has(k))return false;known.add(k);return true;});
        state.tasks.push(...unique);sync();message(`Imported ${unique.length} tasks${r.omitted?`; skipped ${r.omitted} invalid`:''}${moved?`; ${moved} unknown branches → Unsorted`:''}.`,6000);
      }
    }catch(err){message(`Import failed: ${err.message}`,5500);}finally{e.target.value='';}
  });
}
function initKeyboard(){
  document.addEventListener('keydown',e=>{
    if(disposed||e.defaultPrevented)return;
    const isField=e.target instanceof HTMLElement&&(e.target.matches('input,textarea,select')||e.target.isContentEditable);
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='f'){e.preventDefault();switchCaptureMode('find');input.focus();return;}
    if((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key.toLowerCase()==='s'){e.preventDefault();backupJson();return;}
    if(isField)return;
    if(e.metaKey||e.ctrlKey||e.altKey)return;
    if(e.key.startsWith('Arrow')&&e.target instanceof Element&&e.target.closest('button,a,[role=button],#timeline-scroll,.journal-widget'))return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
      cancelAnimationFrame(scene.cameraAnimation);scene.cameraAnimation=0;
    }
    switch(e.key){
      case '/':e.preventDefault();switchCaptureMode('capture');input.focus();break;
      case 'f':e.preventDefault();switchCaptureMode('find');input.focus();break;
      case '0':e.preventDefault();scene.fitAll();break;
      case '+':case '=':e.preventDefault();scene.zoomBy(1.26);break;
      case '-':e.preventDefault();scene.zoomBy(1/1.26);break;
      case 'Escape':if(document.body.classList.contains('map-immersive')){$('map-fullscreen').click();break;}scene.expandedTaskId='';scene.selectedTaskId='';for(const r of scene.nodesEl.querySelectorAll('.task-row')){r.classList.remove('is-expanded');r.setAttribute('aria-expanded','false');}break;
      case 'ArrowLeft':scene.atOverview=false;scene.camera.x+=48;scene.applyCamera();break;
      case 'ArrowRight':scene.atOverview=false;scene.camera.x-=48;scene.applyCamera();break;
      case 'ArrowUp':scene.atOverview=false;scene.camera.y+=48;scene.applyCamera();break;
      case 'ArrowDown':scene.atOverview=false;scene.camera.y-=48;scene.applyCamera();break;
    }
  },{signal:events.signal});
}
function showClock(){
  $('clock').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
}
initTools();initKeyboard();sync({persist:false});
if(persistLocally&&getStorageStatus().recoveryRequired)message('Saved data needs recovery. Use Backup to export the original data before restoring a valid backup.',15000);
showClock();const clockTimer=setInterval(showClock,30000);
hydrating=false;
$('app').dataset.readOnly=String(readOnly);
if(readOnly){for(const id of ['capture-name','capture-mode','capture-submit','import-csv','clear-demo','csv-file'])$(id).disabled=true;}
window.orbitDebug={get state(){return {tasks:state.tasks.length,branches:state.branches.length,selectedBranchId:state.selectedBranchId,camera:scene.getCamera(),boardScale:board.scale,boardPan:{...board.pan},mode:state.preferences.colorMode,milestones:milestones.length,journalPages:journal.entries.length,widgetSizes:structuredClone(board.sizes)};},fit:()=>scene.fitAll(),focusWidget:id=>board.focus(id),board,scene,journal};
// SpatialBoard establishes the initial camera position.

function getSnapshot(){return {
  format:'orbit-backup',version:6,branches:structuredClone(state.branches),tasks:structuredClone(state.tasks),
  preferences:structuredClone(state.preferences),profile:structuredClone(state.profile),milestones:structuredClone(milestones),
  journalEntries:structuredClone(journal.entries),spatialLayout:board.getLayout(),
};}
function emitChange(){if(disposed||hydrating||persistLocally||readOnly)return;onSnapshotChange(getSnapshot());}
function applySnapshot(snapshot){
  if(disposed)return;hydrating=true;
  state.branches=structuredClone(snapshot.branches);state.tasks=structuredClone(snapshot.tasks);
  state.preferences=structuredClone(snapshot.preferences);state.profile=structuredClone(snapshot.profile||state.profile);
  milestones=structuredClone(snapshot.milestones||[]);
  board.setLayout(snapshot.spatialLayout||{},{persist:false});
  journal.replaceEntries(snapshot.journalEntries||[],{persist:false});
  if(!state.branches.some(b=>b.id==='inbox'))state.branches.push({id:'inbox',parentId:'root',label:'Unsorted'});
  if(!state.branches.some(b=>b.id==='just-because'))state.branches.push({id:'just-because',parentId:'root',label:'Just Because'});
  sync({persist:false});hydrating=false;
}
function setCloudStatus(status){cloudStatus=status;journal.setCloudStatus(status);}
function dispose(){if(disposed)return;disposed=true;events.abort();clearInterval(clockTimer);clearTimeout(toastTimer);clearTimeout(clearDemoTimer);board.dispose();journal.dispose();scene.dispose();window.orbitDebug=null;}
return {getSnapshot,applySnapshot,setCloudStatus,dispose,flushEditor:()=>journal.commit(),exportBackup:backupJson};
}
