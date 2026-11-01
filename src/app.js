import { branchPath,branchIndex,descendantsOf,createBranch } from './data.js';
import { cleanTask,taskSummary } from './model.js';
import { readTasks,saveTasks,readPreferences,savePreferences,readBranches,saveBranches } from './storage.js';
import { importCsv,exportCsv } from './csv.js';
import { Constellation } from './constellation.js';
import { ScrapWidgets } from './widgets.js';
import { SpatialBoard } from './board.js';
import { Journal } from './journal.js';

const $=id=>document.getElementById(id);
const state={branches:readBranches(),tasks:readTasks(),preferences:readPreferences(),selectedBranchId:'inbox',
  selectedTaskId:'',captureMode:'capture',captureDraft:'',searchDraft:''};
const capture=$('capture-form'),input=$('capture-name'),target=$('capture-target');
const milestoneKey='orbit-v4-milestones';
let milestones=[];
try{const stored=JSON.parse(localStorage.getItem(milestoneKey)||'[]');if(Array.isArray(stored))milestones=stored.slice(0,500).filter(x=>x&&typeof x.title==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date));}catch{}
let toastTimer=0,clearDemoPrimed=false,clearDemoTimer=0,undoLast=null,hasSynced=false,hasWarnedStorage=false;

const scene=new Constellation({viewport:$('map-viewport'),world:$('map-world'),edgesEl:$('connections'),
  nodesEl:$('node-layer'),decorEl:$('world-decor'),
  onBranchSelected(id){if(id!=='root')setBranch(id);},
  onBranchAdd(parentId,label){
    try{
      const next=createBranch(label,parentId,state.branches);
      state.branches.push(next);sync();setBranch(next.id);scene.focusNode(next.id);
      message(`Added “${next.label}”. You can keep branching from here.`);
    }catch(err){message(err.message);}
  },
  onBranchRename(id,label){
    const b=state.branches.find(b=>b.id===id);if(!b)return;
    const before=b.label;b.label=label.slice(0,72);sync();message(`Renamed “${before}” to “${b.label}”.`);
  },
  onBranchMove(id,parentId){
    const b=state.branches.find(b=>b.id===id);if(!b)return;
    if(id===parentId||descendantsOf(id,state.branches).has(parentId)){message('A branch cannot move into itself.');return;}
    if(parentId!=='root'&&!state.branches.some(x=>x.id===parentId)){message('Choose a valid parent.');return;}
    b.parentId=parentId;sync();scene.focusNode(id);message('Branch moved; its tasks and children stayed attached.');
  },
  onTaskSelected(id){
    state.selectedTaskId=id;const task=state.tasks.find(t=>t.id===id);if(task)setBranch(task.projectId);
  },
  onTaskUpdate(id,patch){
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
  onTaskDelete(id){
    const index=state.tasks.findIndex(t=>t.id===id);if(index<0)return;
    const deleted=state.tasks.splice(index,1)[0];
    if(scene.expandedTaskId===id)scene.expandedTaskId='';sync();
    message('Task removed.',6500,rememberDelete(()=>{state.tasks.splice(Math.min(index,state.tasks.length),0,deleted);sync();scene.focusTask(deleted);}));
  },
});

const widgets=new ScrapWidgets({
  onFocus(task){
    if(task.status==='completed'){board.focus('completed');return;}
    board.focus('constellation');
    setBranch(task.projectId);scene.expandedTaskId=task.id;scene.selectedTaskId=task.id;
    scene.setData(state.branches,state.tasks.filter(t=>t.status!=='completed'),state.preferences.colorMode);
    scene.focusTask(task);
  },
  onComplete(id){const t=state.tasks.find(x=>x.id===id);if(!t)return;
    t.status='completed';t.completedAt=new Date().toISOString();
    if(scene.expandedTaskId===id)scene.expandedTaskId='';sync();message('Moved to Already done.');
  },
  onRestore(id){const t=state.tasks.find(x=>x.id===id);if(!t)return;
    t.status='ready';t.completedAt='';sync();message('Back on the constellation.');
  },
  onOpenJournal(entryId){if(journal.openEntry(entryId))board.focus('journal');},
  onChangeMilestones(next){milestones=next.slice(0,500);try{localStorage.setItem(milestoneKey,JSON.stringify(milestones));}catch{message('Milestone saved only for this session.');}widgets.setData(state.branches,state.tasks,state.preferences.colorMode,milestones);}
});

const board=new SpatialBoard();
board.onWidgetResize=id=>{if(id==='constellation')requestAnimationFrame(()=>scene.onResize());};
const journal=new Journal({notify:(s,...args)=>message(s,...args),onEntriesChange:entries=>widgets.setJournalEntries(entries)});
widgets.setJournalEntries(journal.entries);

// Previously saved task IDs are never discarded. An orphaned assignment is
// placed into Unsorted, but its content and all other fields remain intact.
if(!state.branches.some(b=>b.id==='inbox'))state.branches.push(createBranch('Unsorted','root',state.branches));
const known=new Set(state.branches.map(b=>b.id));for(const t of state.tasks)if(!known.has(t.projectId))t.projectId='inbox';

function message(text,duration=2700,action=null){
  const toast=$('toast');clearTimeout(toastTimer);toast.replaceChildren(document.createTextNode(text));
  toast.classList.toggle('has-action',Boolean(action));
  if(action){const b=document.createElement('button');b.type='button';b.className='toast-action';b.textContent=action.label;
    b.addEventListener('click',()=>{action.run();toast.classList.remove('show');});toast.append(b);}
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
function sync(){
  const savedTasks=saveTasks(state.tasks),savedBranches=saveBranches(state.branches);
  if((!savedTasks||!savedBranches)&&hasSynced&&!hasWarnedStorage){hasWarnedStorage=true;message('This browser cannot save. Export a backup to keep your changes.',5200);}
  hasSynced=true;
  scene.setData(state.branches,state.tasks.filter(t=>t.status!=='completed'),state.preferences.colorMode);
  widgets.setData(state.branches,state.tasks,state.preferences.colorMode,milestones);
  if(state.captureMode==='find')updateSearch();
  const s=taskSummary(state.tasks);
  $('task-summary').textContent=`${s.active} active · ${s.completed} finished${s.dueSoon?` · ${s.dueSoon} approaching`:''}${s.overdue?` · ${s.overdue} overdue`:''}`;
  $('mode-label').textContent=state.preferences.colorMode;
  $('color-mode').setAttribute('aria-label',`Task colors and sorting show ${state.preferences.colorMode}. Switch mode.`);
  updateCaptureTarget();
}
function quickCapture(e){
  e.preventDefault();
  if(state.captureMode==='find'){
    const t=matches()[0];if(!t){message('No matching task yet.');return;}
    input.blur();if(t.status==='completed'){board.focus('completed');message('Found in Already done.');return;}
    setBranch(t.projectId);scene.expandedTaskId=t.id;scene.selectedTaskId=t.id;sync();scene.focusTask(t);
    message(`Found “${t.title}”.`);return;
  }
  const title=input.value.trim();if(!title){input.focus();return;}
  const task=cleanTask({title,projectId:state.selectedBranchId,urgency:2,status:'captured'});
  state.tasks.push(task);input.value='';state.captureDraft='';sync();scene.focusTask(task);
  message(`Added to ${currentBranch()?.label||'Unsorted'}.`);
}
function backupJson(){
  const backup={format:'orbit-backup',version:6,exportedAt:new Date().toISOString(),branches:state.branches,tasks:state.tasks,preferences:state.preferences,milestones,spatialLayout:board.getLayout(),journalEntries:journal.getEntries()};
  download(JSON.stringify(backup,null,2),`orbit-complete-backup-${new Date().toISOString().slice(0,10)}.json`,'application/json');
  message('Complete backup: tasks, branches, journal pages, milestones and widget positions.');
}
function download(contents,filename,type){const blob=new Blob([contents],{type});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1800);}
function restoreBackup(contents){
  const value=JSON.parse(contents);
  if(value.format!=='orbit-backup'||!Array.isArray(value.branches)||!Array.isArray(value.tasks))throw Error('Not an ORBIT backup.');
  if(value.tasks.length>10000||value.branches.length>4000)throw Error('Backup is too large for this prototype.');
  const ids=new Set(value.branches.map(b=>b.id));if(ids.size!==value.branches.length)throw Error('Backup contains duplicate branch IDs.');if(!ids.has('inbox'))throw Error('Missing Unsorted branch.');
  const branches=value.branches.map(b=>({id:String(b.id),parentId:String(b.parentId||'root'),label:String(b.label||'Untitled'),...(b.color?{color:String(b.color)}:{})}));
  // Verify every parent chain terminates at root before touching existing content.
  const byId=branchIndex(branches);
  for(const b of branches){const seen=new Set();let node=b;
    while(node&&node.parentId!=='root'){
      if(seen.has(node.id)||!byId.has(node.parentId))throw Error('Backup contains an invalid branch hierarchy.');
      seen.add(node.id);node=byId.get(node.parentId);
    }
  }
  const tasks=value.tasks.map(t=>cleanTask(t));
  if(tasks.some(t=>!byId.has(t.projectId)))throw Error('Backup has tasks with missing branches.');
  state.branches=branches;state.tasks=tasks;
  state.preferences={colorMode:value.preferences?.colorMode==='urgency'?'urgency':'deadline'};
  milestones=Array.isArray(value.milestones)?value.milestones.slice(0,500).filter(x=>x&&typeof x.title==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)):[];
  try{localStorage.setItem(milestoneKey,JSON.stringify(milestones));}catch{}
  if(value.spatialLayout&&typeof value.spatialLayout==='object')board.setLayout(value.spatialLayout);
  if(Array.isArray(value.journalEntries))journal.replaceEntries(value.journalEntries);
  state.selectedBranchId='inbox';savePreferences(state.preferences);sync();scene.fitAll();
  message('Backup restored, including journal and widget positions (when available).');
}
function initTools(){
  capture.addEventListener('submit',quickCapture);
  $('capture-mode').addEventListener('click',()=>switchCaptureMode(state.captureMode==='capture'?'find':'capture'));
  input.addEventListener('input',()=>{if(state.captureMode==='find'){state.searchDraft=input.value;updateSearch();}else state.captureDraft=input.value;});
  input.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.captureMode==='find'){e.preventDefault();switchCaptureMode('capture');}});
  $('color-mode').addEventListener('click',()=>{state.preferences.colorMode=state.preferences.colorMode==='deadline'?'urgency':'deadline';savePreferences(state.preferences);sync();message(`Sorted and colored by ${state.preferences.colorMode}.`);});
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
  $('clear-demo').addEventListener('click',()=>{
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
    const file=e.target.files?.[0];if(!file)return;
    try{
      if(file.size>6_000_000)throw Error('File is too large (limit: 6 MB).');
      const contents=await file.text();
      if(file.name.toLowerCase().endsWith('.json')){
        const data=contents;
        message('Restore complete backup? This replaces current branches and tasks. Export a backup first.',10000,
          {label:'Restore',run:()=>{try{restoreBackup(data);}catch(err){message(err.message,5500);}}});
      }else{
        const r=importCsv(contents);const valid=new Set(state.branches.map(b=>b.id));let moved=0;
        for(const t of r.tasks)if(!valid.has(t.projectId)){t.projectId='inbox';moved++;}
        const known=new Set(state.tasks.map(t=>`${t.title.toLowerCase()}|${t.projectId}|${t.dueDate}`));
        const unique=r.tasks.filter(t=>{const k=`${t.title.toLowerCase()}|${t.projectId}|${t.dueDate}`;if(known.has(k))return false;known.add(k);return true;});
        state.tasks.push(...unique);sync();message(`Imported ${unique.length} tasks${r.omitted?`; skipped ${r.omitted} invalid`:''}${moved?`; ${moved} unknown branches → Unsorted`:''}.`,6000);
      }
    }catch(err){message(`Import failed: ${err.message}`,5500);}finally{e.target.value='';}
  });
}
function initKeyboard(){
  document.addEventListener('keydown',e=>{
    const isField=e.target instanceof HTMLElement&&(e.target.matches('input,textarea,select')||e.target.isContentEditable);
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='f'){e.preventDefault();switchCaptureMode('find');input.focus();return;}
    if((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key.toLowerCase()==='s'){e.preventDefault();backupJson();return;}
    if(isField)return;
    if(e.metaKey||e.ctrlKey||e.altKey)return;
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
  });
}
function showClock(){
  $('clock').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
}
initTools();initKeyboard();sync();showClock();setInterval(showClock,30000);
window.orbitDebug={get state(){return {tasks:state.tasks.length,branches:state.branches.length,selectedBranchId:state.selectedBranchId,camera:scene.getCamera(),boardScale:board.scale,boardPan:{...board.pan},mode:state.preferences.colorMode,milestones:milestones.length,journalPages:journal.entries.length,widgetSizes:structuredClone(board.sizes)};},fit:()=>scene.fitAll(),focusWidget:id=>board.focus(id),board,scene,journal};
// SpatialBoard establishes the initial camera position.
