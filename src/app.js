import { branchPath,descendantsOf,createBranch,removeBranchPreservingContents } from './data.js';
import { cleanTask,taskSummary,normalizeTaskChecklist } from './model.js';
import { readTasks,saveTasks,readPreferences,savePreferences,readBranches,saveBranches,readProfile,saveProfile,readExtensions,saveExtensions,STORAGE_KEYS,getStorageStatus,getRecoveryData,markStorageIssue,isStorageWriteBlocked,clearStorageIssues } from './storage.js';
import { importCsv,exportCsv,parseCsv,importBranchesCsv,exportBranchesCsv } from './csv.js';
import { Constellation } from './constellation.js';
import { ScrapWidgets } from './widgets.js';
import { SpatialBoard } from './board.js';
import { validateBackup,persistBackup,recoverInterruptedRestore,RESTORE_RECOVERY_KEY } from './backup.js';
import { validDateKey,exportTasksIcs } from './dates.js';
import { Journal,sanitizeJournal } from './journal.js';
import { StickyNotes } from './stickies.js';
import { normalizeExtensions,renderScene } from './scene.js';
import { mountInlineCanvas } from './inline-canvas.js';
import { setBranchProject, normalizeProjects } from './projects.js';
import { ProjectsShelf } from './project-shelf.js';

/** Mount the same spatial scrapbook over either local or authenticated owner state. */
export function mountOrbit({initialSnapshot=null,readOnly=false,persistLocally=true,onSnapshotChange=()=>{},viewStateKey='local',media=null}={}){
let disposed=false,hydrating=true,cloudStatus={state:'saved',hasPending:false};
const events=new AbortController();
const $=id=>document.getElementById(id);
// Recover interrupted imports before any view reads its independent keys.
let restoreRecovery;
try{restoreRecovery=persistLocally?recoverInterruptedRestore():{ok:true};}catch{restoreRecovery={ok:false};}
if(!restoreRecovery.ok)for(const key of Object.values(STORAGE_KEYS))markStorageIssue(key,'Interrupted restore needs recovery.');
const initialBranches=initialSnapshot?structuredClone(initialSnapshot.branches):readBranches();
const viewScope=typeof viewStateKey==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(viewStateKey)?viewStateKey:'local';
const collapsedStorageKey='orbit.v7.collapsed-branches.'+viewScope;
function normalizeCollapsedBranches(ids,branches=state.branches){
  if(!Array.isArray(ids))return [];
  const known=new Set(branches.map(b=>b.id)),parents=new Set(branches.map(b=>b.parentId).filter(id=>id!=='root'));
  return [...new Set(ids.filter(id=>typeof id==='string'&&known.has(id)&&parents.has(id)))];
}
function readCollapsedBranches(){
  try{const value=JSON.parse(localStorage.getItem(collapsedStorageKey)||'[]');
    return Array.isArray(value)&&value.length<=4000&&value.every(id=>typeof id==='string'&&id.length<=100)?value:[];
  }catch{return [];}
}
function saveCollapsedBranches(){if(readOnly)return true;try{localStorage.setItem(collapsedStorageKey,JSON.stringify(state.collapsedBranchIds));return true;}catch{return false;}}
const initialExtensions=normalizeExtensions(initialSnapshot?.extensions??(persistLocally?readExtensions():{}));
const state={extensions:initialExtensions,branches:initialBranches,tasks:initialSnapshot?structuredClone(initialSnapshot.tasks):readTasks(),preferences:initialSnapshot?structuredClone(initialSnapshot.preferences):readPreferences(),profile:structuredClone(initialSnapshot?.profile||(persistLocally?readProfile():{displayName:'My space'})),selectedBranchId:'inbox',
  collapsedBranchIds:[],selectedTaskId:'',captureMode:'capture',captureDraft:'',searchDraft:''};
state.collapsedBranchIds=normalizeCollapsedBranches(initialSnapshot?.collapsedBranchIds??(readOnly?[]:readCollapsedBranches()),state.branches);
function applyTaskLinks(){
  for(const task of state.tasks){
    if(Object.hasOwn(state.extensions.taskLinks,task.id))task.links=structuredClone(state.extensions.taskLinks[task.id]);
    task.checklist=normalizeTaskChecklist(state.extensions.taskChecklists?.[task.id]??[]);
  }
}
function collectExtensions(){
  state.extensions.taskLinks=Object.fromEntries(state.tasks.filter(t=>t.links?.length).map(t=>[t.id,t.links]));
  state.extensions.taskChecklists=Object.fromEntries(state.tasks.filter(t=>t.checklist?.length)
    .map(t=>[t.id,normalizeTaskChecklist(t.checklist)]));
  return normalizeExtensions(state.extensions);
}
applyTaskLinks();
function applyAppearance(){
  const appearance=state.extensions.appearance;
  document.documentElement.dataset.theme=appearance.theme;
  document.documentElement.dataset.motion=appearance.motion;
  document.documentElement.dataset.ambient=appearance.ambient?'on':'off';
  for(const input of document.querySelectorAll('input[name="space-theme"]'))input.checked=input.value===appearance.theme;
  const motion=$('appearance-reduce-motion');if(motion)motion.checked=appearance.motion==='off';
  const ambient=$('appearance-ambient');if(ambient)ambient.checked=appearance.ambient;
}
applyAppearance();
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

const scene=new Constellation({viewport:$('map-viewport'),world:$('map-world'),edgesEl:$('connections'),readOnly,
  nodesEl:$('node-layer'),decorEl:$('world-decor'),
  onBranchSelected(id){if(id!=='root')setBranch(id);},
  onBranchToggle(id){if(readOnly||disposed)return false;toggleBranch(id);},
  onBranchProjectToggle(id){return toggleProject(id,{focusScene:true});},
  onBranchAdd(parentId,label){if(readOnly||disposed)return false;
    try{
      expandBranchPath(parentId,true);
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
    b.parentId=parentId;expandBranchPath(parentId,true);sync();scene.focusNode(id);message('Branch moved; its tasks and children stayed attached.');
  },
  onBranchDelete(id){if(readOnly||disposed)return false;
    const branch=state.branches.find(b=>b.id===id);if(!branch)return false;
    let result;
    try{result=removeBranchPreservingContents(id,state.branches,state.tasks);}
    catch(error){message(error.message);return false;}
    const warning=`Remove "${branch.label}"? Its ${result.movedTasks} direct task(s) will move to ${result.destination==='inbox'?'Unsorted':'the parent branch'}; ${result.reparentedChildren} child branch(es) will remain. You can undo.`;
    if(!window.confirm(warning))return false;
    const previousBranches=structuredClone(state.branches),previousTasks=structuredClone(state.tasks),
      previousCollapsed=[...state.collapsedBranchIds],previousProjects=structuredClone(state.extensions.projects);
    state.extensions.projects=setBranchProject(state.extensions.projects,id,state.branches,false);
    state.branches=result.branches;state.tasks=result.tasks;
    if(state.selectedBranchId===id)state.selectedBranchId=result.destination;
    sync();scene.focusNode(branch.parentId==='root'?'root':branch.parentId);
    message('Branch removed; tasks and child branches kept.',8500,rememberDelete(()=>{
      state.branches=previousBranches;state.tasks=previousTasks;state.collapsedBranchIds=previousCollapsed;state.selectedBranchId=id;
      state.extensions.projects=previousProjects;
      sync();scene.focusNode(id);
    }));
    return true;
  },
  onTaskError(error){message(error,6500);},
  onTaskSelected(id){
    state.selectedTaskId=id;const task=state.tasks.find(t=>t.id===id);if(task){expandBranchPath(task.projectId);setBranch(task.projectId);}
  },
  onTaskUpdate(id,patch){if(readOnly||disposed)return false;
    const index=state.tasks.findIndex(t=>t.id===id);if(index<0)return false;
    const prev=state.tasks[index];
    try{
      const next=cleanTask({...prev,...patch},prev.projectId);
      next.checklist=normalizeTaskChecklist(patch.checklist??prev.checklist??[]);
      if(!state.branches.some(b=>b.id===next.projectId))throw Error('Choose an existing branch.');
      state.tasks[index]=next;scene.expandedTaskId=id;sync();
      if(patch.status==='completed')message('Finished. That counts.');
      else if(patch.projectId&&patch.projectId!==prev.projectId){setBranch(next.projectId);scene.focusTask(next);message('Task moved to its new branch.');}
      else message('Saved.');
      return true;
    }catch(err){message(`Could not update: ${err.message}`);return false;}
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
    expandBranchPath(task.projectId);setBranch(task.projectId);scene.expandedTaskId=task.id;scene.selectedTaskId=task.id;
    scene.setData(state.branches,state.tasks.filter(t=>t.status!=='completed'),state.preferences.colorMode,state.profile.displayName,state.collapsedBranchIds,Object.keys(state.extensions.projects));
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

const board=new SpatialBoard({notify:(...args)=>message(...args),
  initialLayout:initialSnapshot?(initialSnapshot.spatialLayout||{}):undefined,
  optionalWidgetLayout:state.extensions.spatialWidgets,
  onOptionalLayoutChange:layout=>{
    if(disposed||readOnly)return;
    state.extensions.spatialWidgets=layout;extensionsChanged();
  },
  readOnly,persistLocally,onLayoutChange:()=>emitChange()});
board.onWidgetResize=id=>{if(id==='constellation')requestAnimationFrame(()=>scene.onResize());};
const projectsShelf=new ProjectsShelf({
  readOnly,
  onCreate:id=>toggleProject(id,{enabled:true}),
  onOpen:id=>{
    board.focus('constellation');
    expandBranchPath(id,true);
    setBranch(id);
    scene.focusNode(id);
  },
  onUpdate:(id,patch)=>updateProjectDetails(id,patch)
});
board.registerWidget({
  id:'projects',position:{x:1940,y:115},
  limits:{minW:350,minH:340,maxW:5000,maxH:5000},icon:'◆'
},projectsShelf.element);
const openProjects=document.createElement('button');
openProjects.type='button';openProjects.className='glass-button';
openProjects.id='open-projects';openProjects.textContent='◆ My projects';
openProjects.addEventListener('click',()=>board.focus('projects'),{signal:events.signal});
document.querySelector('.space-primary-actions')?.append(openProjects);
// BP-08: a camera bookmark, not a different layout or another dashboard.
// The picker lives in Space; the Return control is viewport-fixed and reachable
// even when Space and every other widget are dimmed/inert.
const focusPicker=document.createElement('select');
focusPicker.id='bp08-focus-picker';focusPicker.className='space-export-picker bp08-focus-picker';
focusPicker.setAttribute('aria-label','Focus on a window without moving your layout');
const pickPrompt=document.createElement('option');pickPrompt.value='';pickPrompt.textContent='Focus on a window…';
focusPicker.append(pickPrompt);
for(const [id] of board.widgets){
  const choice=document.createElement('option');choice.value=id;
  choice.textContent=id==='constellation'?'The constellation':id==='journal'?'The journal':
    id==='timeline'?'The continuum':id==='active'?'Things to do':
    id==='completed'?'Already done':id==='space'?'My space':'Projects';
  focusPicker.append(choice);
}
document.querySelector('.space-manage-actions')?.append(focusPicker);
const focusExit=document.createElement('button');
focusExit.type='button';focusExit.id='bp08-focus-exit';focusExit.className='glass-button bp08-focus-exit';
focusExit.textContent='Return to your world';focusExit.hidden=true;
$('app').append(focusExit);
function leaveWidgetFocus(){
  if(!board.exitWidgetFocus())return false;
  focusExit.hidden=true;focusPicker.value='';
  return true;
}
focusExit.addEventListener('click',leaveWidgetFocus,{signal:events.signal});
focusPicker.addEventListener('change',()=>{
  if(!focusPicker.value)return;
  if(hasPendingEditor()){message('Preview and save your canvas before changing focus.',6000);focusPicker.value='';return;}
  if(!board.enterWidgetFocus(focusPicker.value)){message('That window is unavailable.',3500);focusPicker.value='';return;}
  focusExit.hidden=false;focusExit.focus({preventScroll:true});
},{signal:events.signal});
const stickies=new StickyNotes({world:$('spatial-world'),notes:state.extensions.notes,readOnly,
  getScale:()=>board.scale,media,notify:(...args)=>message(...args),
  onChange:notes=>{const prior=state.extensions.notes;state.extensions.notes=notes;
     const ok=extensionsChanged();if(ok===false){state.extensions.notes=prior;return false;}
     board.setStickyNotes(notes);return true;}});
board.setStickyNotes(stickies.getNotes());
let activeJournalCanvas=null;
const journal=new Journal({initialEntries:initialSnapshot?(initialSnapshot.journalEntries||[]):undefined,readOnly,persistLocally,notify:(s,...args)=>message(s,...args),onEntriesChange:entries=>{widgets.setJournalEntries(entries);emitChange();}});
widgets.setJournalEntries(journal.entries);
journal.beforePageChange=()=>{
  if(activeJournalCanvas){message('Preview this canvas to save before changing journal pages.',5000);return false;}
  return true;
};
journal.onPageChange=()=>{refreshJournalDrawing();refreshJournalImage();};
journal.onEditChange=()=>refreshJournalMode();
const journalMore=document.createElement('details');journalMore.className='journal-more';
const moreSummary=document.createElement('summary');moreSummary.textContent='More';
moreSummary.setAttribute('aria-label','More journal page actions');
const moreActions=document.createElement('div');moreActions.className='journal-more-actions';
for(const id of ['journal-export','journal-delete','journal-image','journal-image-remove','journal-image-retry'])
  moreActions.append($(id));
journalMore.append(moreSummary,moreActions);
$('journal-edit-toggle').before(journalMore);
$('journal-draw').hidden=true;
refreshJournalDrawing();refreshJournalImage();
function journalMode(){
  const id=journal.entries[journal.index]?.id;
  return id&&state.extensions.journalModes?.[id]==='canvas'?'canvas':'write';
}
function refreshJournalMode(){
  const mode=journalMode(),editing=journal.editing&&!readOnly;
  const widget=$('journal-widget');
  widget.dataset.journalMode=mode;widget.dataset.journalView=editing?'edit':'preview';
  widget.dataset.paperStyle=state.extensions.journalPaperStyles?.[journal.entries[journal.index]?.id]||'lined';
  for(const button of widget.querySelectorAll('[data-journal-mode]'))
    button.setAttribute('aria-pressed',String(button.dataset.journalMode===mode));
  for(const button of widget.querySelectorAll('[data-paper-style]'))
    button.setAttribute('aria-pressed',String(button.dataset.paperStyle===widget.dataset.paperStyle));
  widget.querySelector('.journal-mode-tabs').hidden=!editing;
  $('journal-paper-choices').hidden=!editing;
  widget.querySelector('.journal-formatbar').hidden=!(editing&&mode==='write');
  journalMore.hidden=!editing;
  $('journal-new').hidden=!editing;
  $('journal-date-label').hidden=editing;
  widget.querySelector('.journal-date-edit-label').hidden=!editing;
  $('journal-entry-date').hidden=!editing;
  $('journal-editor').hidden=mode==='canvas';
  $('journal-canvas-view').hidden=mode!=='canvas';
  $('journal-drawing-preview').hidden=editing;
  $('journal-inline-canvas-host').hidden=!(editing&&mode==='canvas');
  $('journal-canvas-edit').hidden=true;
  const toggle=$('journal-edit-toggle');
  toggle.textContent=editing?'Preview':'Edit';
  toggle.setAttribute('aria-label',editing?'Preview journal page':'Edit journal page');
  toggle.setAttribute('aria-pressed',String(editing));
  toggle.disabled=readOnly;
  const legacyImage=$('journal-image-preview');
  if(legacyImage?.getAttribute('src'))legacyImage.hidden=mode==='canvas';
  const page=journal.entries[journal.index];
  if(editing&&mode==='canvas'&&page&&!activeJournalCanvas){
    const pageId=page.id;
    activeJournalCanvas=mountInlineCanvas({
      host:$('journal-inline-canvas-host'),scene:state.extensions.journalScenes[pageId],media,
      notify:(...args)=>message(...args),
      onSave:scene=>{
        if(!journal.entries.some(e=>e.id===pageId))return false;
        const oldScene=state.extensions.journalScenes[pageId];
         state.extensions.journalScenes[pageId]=scene;
         const ok=extensionsChanged();
         if(ok===false){if(oldScene===undefined)delete state.extensions.journalScenes[pageId];else state.extensions.journalScenes[pageId]=oldScene;}
        if(ok!==false)renderScene(scene,$('journal-drawing-preview'),{media});
        return ok;
      },
      onDirty:dirty=>{widget.dataset.canvasDirty=String(dirty);
        if(dirty){const label=$('global-save-status');label.textContent='Canvas edits waiting to save';label.dataset.state='pending';}}
    });
    activeJournalCanvas.ready.catch(()=>{});
  }
}
function refreshJournalDrawing(){
  const holder=$('journal-drawing-preview');if(!holder)return;
  const page=journal.entries[journal.index];
  const drawing=page?state.extensions.journalScenes[page.id]:null;
  renderScene(drawing,holder,{media});
  if(!drawing||!drawing.elements?.some(el=>!el.isDeleted)){
    const empty=document.createElement('p');empty.className='journal-canvas-empty';
    empty.textContent='A free space for your ideas, mindmaps, shapes and drawings.';
    holder.append(empty);
  }
  $('journal-canvas-edit').textContent=drawing?.elements?.some(el=>!el.isDeleted)?'Edit canvas':'Open canvas';
  refreshJournalMode();
}
function refreshJournalImage(){
  const element=$('journal-image-preview');if(!element)return;
  const entry=journal.entries[journal.index],path=entry?state.extensions.journalImages[entry.id]:null;
  element.hidden=true;element.removeAttribute('src');
  const remove=$('journal-image-remove'),retry=$('journal-image-retry');
  remove.hidden=!path||readOnly;retry.hidden=true;
  if(!path||!media)return;
  const load=media.previewUrl?media.previewUrl.bind(media):media.signedUrl.bind(media);
  load(path).then(url=>{
    if(!disposed&&journal.entries[journal.index]?.id===entry.id&&state.extensions.journalImages[entry.id]===path){
      element.src=url;element.hidden=journalMode()==='canvas';
    }
  }).catch(()=>{
    if(!disposed&&journal.entries[journal.index]?.id===entry.id){
      retry.hidden=false;message('The private journal image could not be loaded. Retry after reconnecting.',6500);
    }
  });
}
function extensionsChanged(){
   if(disposed||readOnly)return false;
  try{state.extensions=collectExtensions();}
  catch(error){message('Drawing or sticky note exceeded its limits: '+error.message,6500);return false;}
  if(persistLocally){
    const ok=saveExtensions(state.extensions);
    if(ok)pendingWrites.delete(STORAGE_KEYS.extensions);else pendingWrites.add(STORAGE_KEYS.extensions);
    if(!ok)message('Notes or drawings are not saved on this device. Export a backup.',6500);
    return ok;
  }else{emitChange();return true;}
}

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
  const results=matches();
  if(results.length){
    const next=new Set(state.collapsedBranchIds);
    for(const task of results){let branch=state.branches.find(b=>b.id===task.projectId),guard=0;
      while(branch&&branch.parentId!=='root'&&guard++<=state.branches.length){next.delete(branch.parentId);branch=state.branches.find(b=>b.id===branch.parentId);}
    }
    if(next.size!==state.collapsedBranchIds.length)setCollapsedBranches([...next]);
  }
  scene.highlightTasks(results.map(t=>t.id));
  target.textContent=input.value.trim()?`${results.length} found`:'type to find';
  target.title=results.length?'Enter to focus the first match':'Find any task';
}
function setCollapsedBranches(ids,{focusId=null,persist=true}={}){
  state.collapsedBranchIds=normalizeCollapsedBranches(ids);
  if(persist&&!saveCollapsedBranches())message('Branch view could not be saved on this device; it remains available for this session.',6500);
  scene.setData(state.branches,state.tasks.filter(t=>t.status!=='completed'),state.preferences.colorMode,state.profile.displayName,state.collapsedBranchIds,Object.keys(state.extensions.projects));
  if(focusId&&scene.nodeMap.has(focusId))scene.focusNode(focusId,{instant:true});
}
function toggleBranch(id){
  const next=new Set(state.collapsedBranchIds);if(next.has(id))next.delete(id);else next.add(id);
  setCollapsedBranches([...next],{focusId:id});
}
function expandBranchPath(id,includeSelf=false){
  const next=new Set(state.collapsedBranchIds);if(includeSelf)next.delete(id);
  let branch=state.branches.find(b=>b.id===id),guard=0;
  while(branch&&branch.parentId!=='root'&&guard++<=state.branches.length){next.delete(branch.parentId);branch=state.branches.find(b=>b.id===branch.parentId);}
  if(next.size!==state.collapsedBranchIds.length)setCollapsedBranches([...next]);
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
function toggleProject(id,{enabled=null,focusScene=false}={}){
  if(readOnly||disposed)return false;
  const current=Object.hasOwn(state.extensions.projects,id);
  const next=typeof enabled==='boolean'?enabled:!current;
  try{state.extensions.projects=setBranchProject(state.extensions.projects,id,state.branches,next);}
  catch(error){message(error.message,6500);return false;}
  sync();
  if(focusScene){scene.focusNode(id,{instant:true});scene.domNodes.get(id)?.focus({preventScroll:true});}
  message(next?'Branch is now a private project. Nothing is published.':
    'Project status removed; branch and tasks kept.');
  return true;
}
function updateProjectDetails(id,patch){
  if(readOnly||disposed||!Object.hasOwn(state.extensions.projects,id))return false;
  try{
    state.extensions.projects=normalizeProjects({...state.extensions.projects,
      [id]:{...state.extensions.projects[id],...patch}});
  }catch(error){message(error.message,6500);return false;}
  sync();return true;
}
function sync({persist=true}={}){
  if(disposed)return false;
  const normalizedCollapsed=normalizeCollapsedBranches(state.collapsedBranchIds);
  if(normalizedCollapsed.length!==state.collapsedBranchIds.length||normalizedCollapsed.some((id,i)=>id!==state.collapsedBranchIds[i])){
    state.collapsedBranchIds=normalizedCollapsed;saveCollapsedBranches();
  }
  if(persist&&!readOnly){
    state.extensions=collectExtensions();
    if(persistLocally){
      const tasksOk=saveTasks(state.tasks),branchesOk=saveBranches(state.branches),profileOk=saveProfile(state.profile),extensionsOk=saveExtensions(state.extensions);
      lastSaveOk=tasksOk&&branchesOk&&profileOk&&extensionsOk;
      for(const [key,ok] of [[STORAGE_KEYS.tasks,tasksOk],[STORAGE_KEYS.branches,branchesOk],[STORAGE_KEYS.profile,profileOk],[STORAGE_KEYS.extensions,extensionsOk]]){if(ok)pendingWrites.delete(key);else pendingWrites.add(key);}
    }
  }
  scene.setData(state.branches,state.tasks.filter(t=>t.status!=='completed'),state.preferences.colorMode,state.profile.displayName,state.collapsedBranchIds,Object.keys(state.extensions.projects));
  widgets.setData(state.branches,state.tasks,state.preferences.colorMode,milestones);
  projectsShelf.setData(state.branches,state.tasks,state.extensions.projects);
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
async function backupJson(){
   try{await flushEditor();}catch(error){message('Backup not exported: '+error.message,6500);return false;}
   journal.commit();
  const backup={format:'orbit-backup',version:6,exportedAt:new Date().toISOString(),branches:state.branches,tasks:state.tasks,preferences:state.preferences,profile:state.profile,collapsedBranchIds:state.collapsedBranchIds,milestones,spatialLayout:board.getLayout(),journalEntries:journal.getEntries(),extensions:collectExtensions()};
  if(persistLocally&&getStorageStatus().recoveryRequired){backup.recoveryData=getRecoveryData();try{backup.restoreRecovery=localStorage.getItem(RESTORE_RECOVERY_KEY);}catch{}}
  download(JSON.stringify(backup,null,2),`orbit-complete-backup-${new Date().toISOString().slice(0,10)}.json`,'application/json');
  message('Backup exported: notes, drawings, tasks and journals. Uploaded image files are not embedded in JSON; retain your Supabase Storage copies.',6500);
}
function download(contents,filename,type){const blob=new Blob([contents],{type});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1800);}
function restoreBackup(contents){
   if(readOnly||disposed)return;
   if(hasPendingEditor())throw Error('Preview and save your canvas before replacing the workspace.');
  const snapshot=validateBackup(contents,{sanitizeHtml:sanitizeJournal});
  journal.commit();
  if(!persistLocally){applySnapshot(snapshot);emitChange();message('Import is pending cloud save. Existing local backup remains unchanged.');return;}
  const result=persistBackup(snapshot);
  if(!result.ok){
    if(!result.rollbackComplete)for(const key of Object.values(STORAGE_KEYS))markStorageIssue(key,'Interrupted restore needs recovery.',result.recoveryData?.[key]);
    throw Error(result.error);
  }
  clearStorageIssues(result.writtenKeys);for(const key of result.writtenKeys)pendingWrites.delete(key);lastSaveOk=true;
  state.branches=snapshot.branches;state.tasks=snapshot.tasks;state.preferences=snapshot.preferences;
  if(snapshot.extensions)state.extensions=normalizeExtensions(snapshot.extensions);
  applyTaskLinks();stickies.setNotes(state.extensions.notes);
  if(snapshot.profile)state.profile=structuredClone(snapshot.profile);
  if(snapshot.collapsedBranchIds!==undefined)state.collapsedBranchIds=normalizeCollapsedBranches(snapshot.collapsedBranchIds,state.branches);
  saveCollapsedBranches();
  milestones=snapshot.milestones;
  if(snapshot.spatialLayout)board.setLayout(snapshot.spatialLayout,{persist:false});
  board.setOptionalWidgetLayout(state.extensions.spatialWidgets,{persist:false});
  if(snapshot.journalEntries)journal.replaceEntries(snapshot.journalEntries,{persist:false});
  refreshJournalDrawing();refreshJournalImage();
  state.selectedBranchId='inbox';sync({persist:false});scene.fitAll();
  message('Backup restored, including journal and widget positions (when available).');
}
function initTools(){
  // A per-account center name can be edited without changing other users' profiles.
  const rename=$('rename-space'),nameForm=$('space-name-form'),nameField=$('space-name-input');
  const closeName=()=>{nameForm.hidden=true;rename.setAttribute('aria-expanded','false');};
  rename.addEventListener('click',()=>{
    if(readOnly||disposed)return;
    nameField.value=state.profile.displayName;
    nameForm.hidden=false;rename.setAttribute('aria-expanded','true');nameField.focus();
  });
  nameForm.addEventListener('submit',e=>{
    e.preventDefault();if(readOnly||disposed)return;
    const value=nameField.value.trim().slice(0,100);
    if(!value){nameField.setCustomValidity('Name your space.');nameField.reportValidity();return;}
    nameField.setCustomValidity('');
    closeName();
    if(value!==state.profile.displayName){
      state.profile.displayName=value;sync();message('Your space has a new name.');
    }
    rename.focus();
  });
  nameField.addEventListener('input',()=>nameField.setCustomValidity(''));
  $('cancel-space-name').addEventListener('click',()=>{closeName();rename.focus();});
  capture.addEventListener('submit',quickCapture);
  $('capture-mode').addEventListener('click',()=>switchCaptureMode(state.captureMode==='capture'?'find':'capture'));
  input.addEventListener('input',()=>{if(state.captureMode==='find'){state.searchDraft=input.value;updateSearch();}else state.captureDraft=input.value;});
  input.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.captureMode==='find'){e.preventDefault();switchCaptureMode('capture');}});
  $('color-mode').addEventListener('click',()=>{state.preferences.colorMode=state.preferences.colorMode==='deadline'?'urgency':'deadline';const preferencesOk=readOnly||!persistLocally?true:savePreferences(state.preferences);sync();lastSaveOk=lastSaveOk&&preferencesOk;if(preferencesOk)pendingWrites.delete(STORAGE_KEYS.preferences);else pendingWrites.add(STORAGE_KEYS.preferences);message(`Sorted and colored by ${state.preferences.colorMode}.`);});
  $('map-fullscreen').addEventListener('click',()=>{document.body.classList.toggle('map-immersive');
    const open=document.body.classList.contains('map-immersive');
    const el=$('constellation-widget');
    if(open){$('app').append(el);for(const key of ['width','height','left','top'])el.style.removeProperty(key);}else{$('spatial-world').append(el);board.position('constellation');board.applySize('constellation');}
    $('map-fullscreen').setAttribute('aria-label',open?'Exit expanded constellation':'Expand constellation');
    $('map-fullscreen').title=open?'Exit expanded constellation':'Expand constellation';
    requestAnimationFrame(()=>requestAnimationFrame(()=>scene.onResize()));
  });
  $('zoom-in').addEventListener('click',()=>scene.zoomBy(1.35));
  $('zoom-out').addEventListener('click',()=>scene.zoomBy(1/1.35));
  $('fit-all').addEventListener('click',()=>scene.fitAll());
  $('import-csv').addEventListener('click',()=>$('csv-file').click());
  $('backup-json').addEventListener('click',backupJson);
  $('new-sticky').addEventListener('click',()=>stickies.add());
  for(const input of document.querySelectorAll('input[name="space-theme"]')){
    input.disabled=readOnly;
    input.addEventListener('change',()=>{
      if(disposed||readOnly||!input.checked)return;
      state.extensions.appearance.theme=input.value;applyAppearance();extensionsChanged();
      message('Appearance saved to this private space.');
    });
  }
  $('appearance-ambient').disabled=readOnly;
  $('appearance-ambient').addEventListener('change',event=>{
    if(disposed||readOnly)return;
    state.extensions.appearance.ambient=event.currentTarget.checked;
    applyAppearance();extensionsChanged();
    message(event.currentTarget.checked?'Background animation enabled.':'Background animation paused.');
  });
  $('appearance-reduce-motion').disabled=readOnly;
  $('appearance-reduce-motion').addEventListener('change',event=>{
    if(disposed||readOnly)return;
    state.extensions.appearance.motion=event.currentTarget.checked?'off':'system';
    applyAppearance();extensionsChanged();message('Motion preference saved.');
  });
  $('journal-image-preview').addEventListener('error',()=>{
    $('journal-image-preview').hidden=true;$('journal-image-retry').hidden=false;
    message('The private journal image could not be displayed.',6500);
  });
  $('journal-image-retry').addEventListener('click',()=>refreshJournalImage());
  $('journal-image-remove').addEventListener('click',()=>{
    if(disposed||readOnly)return;
    journal.commit();const page=journal.entries[journal.index];if(!page)return;
    const path=state.extensions.journalImages[page.id];if(!path)return;
    delete state.extensions.journalImages[page.id];extensionsChanged();refreshJournalImage();
    message('Image detached. The private file is kept for your media library.',6500,rememberDelete(()=>{
      if(disposed||!journal.entries.some(entry=>entry.id===page.id)||state.extensions.journalImages[page.id])return;
      state.extensions.journalImages[page.id]=path;extensionsChanged();refreshJournalImage();
    }));
  });
  const imagePicker=$('journal-image-file');
  $('journal-image').addEventListener('click',()=>{if(media&&!readOnly)imagePicker.click();});
  imagePicker.addEventListener('change',async()=>{
    const file=imagePicker.files?.[0];if(!file||!media||disposed||readOnly)return;
    journal.commit();const pageId=journal.entries[journal.index]?.id;if(!pageId)return;
    try{const path=await media.upload(file);
      if(disposed)return;
      state.extensions.journalImages[pageId]=path;extensionsChanged();
      refreshJournalImage();message('Private journal image attached.');
    }catch(error){message(error.message,6500);}finally{imagePicker.value='';}
  });
  let journalBusy=false;
  async function leaveJournalCanvas(){
    if(!activeJournalCanvas)return;
    const handle=activeJournalCanvas;
    await handle.save();
    if(disposed)return;
    handle.dispose();
    if(activeJournalCanvas===handle)activeJournalCanvas=null;
  }
  $('journal-edit-toggle').addEventListener('click',async()=>{
    if(readOnly||disposed||journalBusy)return;
    journalBusy=true;
    const toggle=$('journal-edit-toggle');toggle.disabled=true;
    try{
      if(journal.editing){await leaveJournalCanvas();if(disposed)return;journal.commit();journal.setEditing(false);}
      else journal.setEditing(true);
      refreshJournalMode();
      if(journal.editing&&journalMode()==='write')$('journal-editor').focus({preventScroll:true});
    }catch(error){message('Keep editing: '+error.message,6500);}
    finally{journalBusy=false;toggle.disabled=readOnly;}
  });
  for(const button of document.querySelectorAll('.journal-mode-tab')){
    button.addEventListener('click',async()=>{
      if(disposed||!journal.editing||journalBusy||journalMode()===button.dataset.journalMode)return;
      journalBusy=true;button.disabled=true;
      try{
        await leaveJournalCanvas();if(disposed)return;
        journal.commit();const page=journal.entries[journal.index];if(!page)return;
        state.extensions.journalModes??={};
        const oldMode=state.extensions.journalModes[page.id];
         if(button.dataset.journalMode==='canvas')state.extensions.journalModes[page.id]='canvas';
         else delete state.extensions.journalModes[page.id];
         if(extensionsChanged()===false){if(oldMode===undefined)delete state.extensions.journalModes[page.id];else state.extensions.journalModes[page.id]=oldMode;
           throw Error('Cannot save the page mode yet.');}
        refreshJournalDrawing();
      }catch(error){message('Page mode was not saved: '+error.message,6500);}
      finally{button.disabled=false;journalBusy=false;}
    });
  }
  for(const button of document.querySelectorAll('#journal-paper-choices [data-paper-style]')){
    button.addEventListener('click',()=>{
      if(readOnly||!journal.editing||disposed)return;
      const page=journal.entries[journal.index];if(!page)return;
      state.extensions.journalPaperStyles??={};
      const oldStyle=state.extensions.journalPaperStyles[page.id];
       if(button.dataset.paperStyle==='lined')delete state.extensions.journalPaperStyles[page.id];
       else state.extensions.journalPaperStyles[page.id]=button.dataset.paperStyle;
       if(extensionsChanged()!==false)refreshJournalMode();
       else if(oldStyle===undefined)delete state.extensions.journalPaperStyles[page.id];
       else state.extensions.journalPaperStyles[page.id]=oldStyle;
    });
  }
  $('journal-draw').addEventListener('click',()=>{if(!journal.editing)return;
    document.querySelector('.journal-mode-tab[data-journal-mode="canvas"]')?.click();});
  $('journal-canvas-edit').disabled=true;
  $('expand-all-branches').addEventListener('click',()=>{setCollapsedBranches([]);scene.fitAll();message('All branches expanded.');});
  $('collapse-all-branches').addEventListener('click',()=>{
    const parents=state.branches.filter(branch=>state.branches.some(child=>child.parentId===branch.id)).map(branch=>branch.id);
    setCollapsedBranches(parents);scene.fitAll();message('All branch groups collapsed.');
  });
  $('clear-demo').addEventListener('click',()=>{if(readOnly||disposed)return;
    const count=state.tasks.filter(t=>t.id.startsWith('demo-')).length;
    if(!count){message('There are no sample tasks left.');return;}
    if(!clearDemoPrimed){clearDemoPrimed=true;message(`Click SAMPLE CONTENT again to remove ${count} sample tasks.`,4300);clearTimeout(clearDemoTimer);clearDemoTimer=setTimeout(()=>clearDemoPrimed=false,4700);return;}
    const removed=state.tasks.filter(t=>t.id.startsWith('demo-'));state.tasks=state.tasks.filter(t=>!t.id.startsWith('demo-'));
    clearDemoPrimed=false;sync();message(`Removed ${count} sample tasks.`,6500,rememberDelete(()=>{state.tasks.unshift(...removed);sync();}));
    $('clear-demo').textContent='Remove samples';
  });
  $('export-csv').addEventListener('click',()=>{
    journal.commit();const date=new Date().toISOString().slice(0,10);
    switch($('export-kind').value){
      case 'calendar':{
        const {content,count}=exportTasksIcs(state.tasks);
        if(!count){message('No active tasks with a due date to export.');break;}
        download(content,'orbit-deadlines-'+date+'.ics','text/calendar;charset=utf-8');
        message('Exported '+count+' active deadlines as an all-day calendar. Import the file into your calendar app when ready.',6500);break;
      }
      case 'branches':
        download(exportBranchesCsv(state.branches),`orbit-branches-${date}.csv`,'text/csv;charset=utf-8');
        message(`Exported ${state.branches.length} branches as CSV.`);break;
      case 'journals':{
        const entries=journal.getEntries();
        download(JSON.stringify({format:'orbit-selection',version:1,kind:'journalEntries',entries},null,2),
          `orbit-journals-${date}.json`,'application/json');
        message(`Exported ${entries.length} journal pages as JSON.`);break;
      }
      case 'space':backupJson();break;
      default:download(exportCsv(state.tasks),`orbit-tasks-${date}.csv`,'text/csv;charset=utf-8');
        message(`Exported ${state.tasks.length} tasks as CSV.`);
    }
  });
  $('csv-file').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file||readOnly||disposed)return;
    try{
      if(file.size>6_000_000)throw Error('File is too large (limit: 6 MB).');
      const contents=await file.text();
      if(disposed||readOnly)return;
      if(file.name.toLowerCase().endsWith('.json')){
        const parsed=JSON.parse(contents);
        if(parsed?.format==='orbit-selection'){
          if(parsed.version!==1||parsed.kind!=='journalEntries'||!Array.isArray(parsed.entries))
            throw Error('Unsupported selected export.');
          const validatePages=()=>{
            const verified=validateBackup({format:'orbit-backup',version:6,
              branches:state.branches,tasks:state.tasks,preferences:state.preferences,
              profile:state.profile,milestones,journalEntries:parsed.entries,
              spatialLayout:board.getLayout()},{sanitizeHtml:sanitizeJournal});
            const originals=journal.getEntries(),ids=new Set(originals.map(entry=>entry.id));
            const additional=verified.journalEntries.filter(entry=>!ids.has(entry.id));
            if(originals.length+additional.length>600)throw Error('Journal would exceed the 600-page limit.');
            return {originals,additional,omitted:verified.journalEntries.length-additional.length};
          };
          const preview=validatePages();
          if(!preview.additional.length)message('All selected journal pages are already present.');
          else message(`Import ${preview.additional.length} journal pages? Existing pages will be kept.`,10000,
            {label:'Import',run:()=>{
              if(readOnly||disposed)return;
              try{
                const {originals,additional,omitted}=validatePages();
                journal.replaceEntries([...originals,...additional]);
                message(`Imported ${additional.length} journal pages${omitted?`; skipped ${omitted} duplicates`:''}.`,6000);
              }catch(err){message(`Import failed: ${err.message}`,5500);}
            }});
        }else{
          // A full backup remains an explicit replacement, never an automatic merge.
          validateBackup(parsed,{sanitizeHtml:sanitizeJournal});
          message('Restore complete backup? This replaces current branches and tasks. Export a backup first.',10000,
            {label:'Restore',run:()=>{try{restoreBackup(contents);}catch(err){message(err.message,5500);}}});
        }
      }else if(parseCsv(contents)[0]?.map(v=>v.trim().toLowerCase()).includes('parent_id')){
        const preview=importBranchesCsv(contents,state.branches);
        if(!preview.branches.length)message('All branches in this CSV already exist.');
        else message(`Import ${preview.branches.length} branches? Existing branches and tasks will remain.`,10000,
          {label:'Import',run:()=>{
            if(readOnly||disposed)return;
            try{
              const {branches,omitted}=importBranchesCsv(contents,state.branches);
              if(!branches.length){message('These branches are already present.');return;}
              state.branches.push(...branches);sync();
              message(`Imported ${branches.length} branches${omitted?`; skipped ${omitted} duplicates`:''}.`,6500,
                rememberDelete(()=>{const ids=new Set(branches.map(b=>b.id));
                  if(state.tasks.some(t=>ids.has(t.projectId))||state.branches.some(b=>!ids.has(b.id)&&ids.has(b.parentId))){
                    message('Cannot undo after branches gain tasks or child branches. Move them first.');return;
                  }
                  state.branches=state.branches.filter(b=>!ids.has(b.id));sync();
                }));
            }catch(err){message(`Import failed: ${err.message}`,5500);}
          }});
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
      case 'Escape':if(leaveWidgetFocus())break;if(document.body.classList.contains('map-immersive')){$('map-fullscreen').click();break;}scene.expandedTaskId='';scene.selectedTaskId='';for(const r of scene.nodesEl.querySelectorAll('.task-row')){r.classList.remove('is-expanded');r.setAttribute('aria-expanded','false');}break;
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
if(persistLocally){const status=$('global-save-status');status.textContent='Stored on this device';status.dataset.state='saved';}
else setCloudStatus(cloudStatus);
hydrating=false;
$('app').dataset.readOnly=String(readOnly);
if(readOnly){for(const id of ['capture-name','capture-mode','capture-submit','import-csv','clear-demo','csv-file','rename-space','expand-all-branches','collapse-all-branches','new-sticky','journal-draw','journal-image'])$(id).disabled=true;}
$('journal-image').disabled=readOnly||!media;
window.orbitDebug={get state(){return {tasks:state.tasks.length,notes:stickies.notes.length,branches:state.branches.length,collapsedBranches:state.collapsedBranchIds.length,selectedBranchId:state.selectedBranchId,camera:scene.getCamera(),boardScale:board.scale,boardPan:{...board.pan},mode:state.preferences.colorMode,milestones:milestones.length,journalPages:journal.entries.length,widgetSizes:structuredClone(board.sizes)};},fit:()=>scene.fitAll(),focusWidget:id=>board.focus(id),board,scene,journal};
// SpatialBoard establishes the initial camera position.

function getSnapshot(){return {
  format:'orbit-backup',version:6,branches:structuredClone(state.branches),tasks:structuredClone(state.tasks),
  preferences:structuredClone(state.preferences),profile:structuredClone(state.profile),milestones:structuredClone(milestones),
  journalEntries:structuredClone(journal.entries),spatialLayout:board.getLayout(),extensions:collectExtensions(),
};}
function emitChange(){if(disposed||hydrating||persistLocally||readOnly)return;onSnapshotChange(getSnapshot());}
function applySnapshot(snapshot){
   if(disposed)return;
   if(hasPendingEditor())throw Error('Unsaved canvas changes must be saved before replacing the workspace.');
   hydrating=true;
  state.branches=structuredClone(snapshot.branches);state.tasks=structuredClone(snapshot.tasks);
  state.extensions=normalizeExtensions(snapshot.extensions??state.extensions);
  applyAppearance();applyTaskLinks();stickies.setNotes(state.extensions.notes);board.setStickyNotes(stickies.getNotes());
  state.preferences=structuredClone(snapshot.preferences);state.profile=structuredClone(snapshot.profile||state.profile);
  if(snapshot.collapsedBranchIds!==undefined)state.collapsedBranchIds=normalizeCollapsedBranches(snapshot.collapsedBranchIds,state.branches);
  saveCollapsedBranches();
  milestones=structuredClone(snapshot.milestones||[]);
  board.setLayout(snapshot.spatialLayout||{},{persist:false});
  board.setOptionalWidgetLayout(state.extensions.spatialWidgets,{persist:false});
  journal.replaceEntries(snapshot.journalEntries||[],{persist:false});refreshJournalDrawing();refreshJournalImage();
  if(!state.branches.some(b=>b.id==='inbox'))state.branches.push({id:'inbox',parentId:'root',label:'Unsorted'});
  if(!state.branches.some(b=>b.id==='just-because'))state.branches.push({id:'just-because',parentId:'root',label:'Just Because'});
  sync({persist:false});hydrating=false;
}
function setCloudStatus(status){
  cloudStatus=status;journal.setCloudStatus(status);
  const label=$('global-save-status');if(!label)return;
  const states={saved:'Saved to your cloud',saving:'Saving…',pending:'Changes waiting to save',
    offline:'Offline — changes not saved',conflict:'Save conflict — export a backup',
    error:'Not saved — retry or export a backup'};
  label.textContent=readOnly?'Published preview':states[status.state]||'Save status unavailable';
  label.dataset.state=status.state;
}
function hasPendingEditor(){return Boolean(activeJournalCanvas?.isDirty()||stickies.activeCanvas?.isDirty()||stickies.pendingCanvas);}
 async function flushEditor(){
   if(activeJournalCanvas)await activeJournalCanvas.save();
   if(stickies.activeCanvas)await stickies.activeCanvas.save();
   return journal.commit();
 }
 function dispose(){if(disposed)return;leaveWidgetFocus();disposed=true;activeJournalCanvas?.dispose();activeJournalCanvas=null;events.abort();clearInterval(clockTimer);clearTimeout(toastTimer);clearTimeout(clearDemoTimer);projectsShelf.dispose();board.dispose();journal.dispose();stickies.dispose();scene.dispose();media?.dispose?.();document.documentElement.dataset.theme='parchment';document.documentElement.dataset.motion='system';document.documentElement.dataset.ambient='off';window.orbitDebug=null;}
return {getSnapshot,applySnapshot,setCloudStatus,dispose,
  flushEditor,hasPendingEditor,journalCommit:()=>journal.commit(),exportBackup:backupJson};
}
