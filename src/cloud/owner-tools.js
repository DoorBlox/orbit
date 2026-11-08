import { STORAGE_KEYS } from '../storage.js';
import { validateBackup } from '../backup.js';
import { sanitizeJournal } from '../journal.js';

/** Legacy storage is read only after the owner requests an import review. */
export function readLocalImport(storage=globalThis.localStorage) {
  const read=key=>{const raw=storage.getItem(key);return raw===null?undefined:JSON.parse(raw);};
  const branches=read(STORAGE_KEYS.branches),tasks=read(STORAGE_KEYS.tasks);
  if(!branches||!tasks)throw Error('No complete local snapshot was found. Import an exported ORBIT JSON backup instead.');
  const positions=read(STORAGE_KEYS.layout)||{},sizes=read(STORAGE_KEYS.sizes)||{};
  if(Array.isArray(positions)||Array.isArray(sizes)||typeof positions!=='object'||typeof sizes!=='object')throw Error('Local layout needs recovery before import.');
  const spatialLayout=Object.create(null);
  for(const id of new Set([...Object.keys(positions),...Object.keys(sizes)])){
    if(!positions[id])throw Error('Local widget dimensions have no position. Recover a JSON backup first.');
    spatialLayout[id]={...positions[id],...(sizes[id]?{width:sizes[id].w,height:sizes[id].h}:{})};
  }
  return validateBackup({format:'orbit-backup',version:6,branches,tasks,
    journalEntries:read(STORAGE_KEYS.journal)||[],milestones:read(STORAGE_KEYS.milestones)||[],
    preferences:read(STORAGE_KEYS.preferences)||{},spatialLayout},{sanitizeHtml:sanitizeJournal});
}

/** Opt-in import/publication controls; user content is always assigned as text. */
export function createOwnerTools({repository,app,sync,container,canPublish=true}) {
  const events=new AbortController();let disposed=false,importDraft=null;
  const root=document.createElement('details');root.className='cloud-owner-panel glass-widget';
  const summary=document.createElement('summary');summary.textContent=canPublish?'Import & publishing':'Import & backups';root.append(summary);
  const status=document.createElement('p');status.setAttribute('role','status');status.className='cloud-tool-status';
  function element(tag,text,parent=root){const el=document.createElement(tag);if(text)el.textContent=text;parent.append(el);return el;}
  function button(text,run,parent=root){const el=element('button',text,parent);el.type='button';el.className='glass-button';el.addEventListener('click',run,{signal:events.signal});return el;}
  function say(text){if(!disposed)status.textContent=text;}
  element('p',canPublish?'All new content is private. Publishing copies only the title, chosen plain-text excerpt, and date. Public viewing remains disabled in development previews.':'All new content is private. Importing replaces only your own workspace after confirmation and backup review.');
  const importGroup=element('div');importGroup.className='cloud-tool-group';
  button('Review local import',()=>{
    try{importDraft=readLocalImport();say(`Local import ready: ${importDraft.tasks.length} tasks, ${importDraft.branches.length} branches, ${importDraft.journalEntries.length} journal pages, ${importDraft.milestones.length} milestones. Nothing has been uploaded.`);confirmImport.hidden=false;}
    catch{importDraft=null;confirmImport.hidden=true;say('Local data could not be safely validated. Export recovery data or use a valid ORBIT JSON backup. Nothing was uploaded.');}
  },importGroup);
  const confirmImport=button('Import reviewed data as private',async()=>{
    if(!importDraft||disposed)return;
    app.flushEditor();
    if(sync.getState().hasPending){say('Save or export the current draft before importing.');return;}
    if(!window.confirm(`Upload ${importDraft.journalEntries.length} personal journal pages and the reviewed local data to your private cloud space? This replaces the current cloud snapshot. Export its backup first. Local data will remain on this device.`))return;
    const snapshot=importDraft;importDraft=null;confirmImport.hidden=true;
    app.applySnapshot(snapshot);sync.queue(app.getSnapshot());
    const result=await sync.flush();say(result.ok?'Private import saved to the cloud. Local originals were preserved.':'Import is not saved. Your draft remains in this session; export a backup and retry.');
  },importGroup);confirmImport.hidden=true;
  const form=element('form');form.className='cloud-publication-form';form.hidden=!canPublish;
  function field(label,tag){const wrap=element('label',label,form);return element(tag,null,wrap);}
  const kind=field('Content type','select');
  for(const value of ['task','journal','milestone','branch']){const option=element('option',value,kind);option.value=value;}
  const source=field('Private source title','select');
  const excerpt=field('Public excerpt (optional, plain text)','textarea');excerpt.maxLength=1000;excerpt.rows=2;
  const date=field('Public date (optional)','input');date.type='date';
  const preview=element('p','Choose a source to review its public title.',form);preview.className='cloud-publication-preview';
  function sources(){const snapshot=app.getSnapshot();return kind.value==='branch'?snapshot.branches:kind.value==='task'?snapshot.tasks:kind.value==='journal'?snapshot.journalEntries:snapshot.milestones;}
  function renderPreview(){preview.textContent=`Title: ${source.selectedOptions[0]?.textContent||'(none)'}\nExcerpt: ${excerpt.value||'(none)'}\nDate: ${date.value||'(none)'}`;}
  function refreshSources(){const selected=source.value;source.replaceChildren();for(const item of sources()){const option=element('option',item.title||item.label||'Untitled',source);option.value=item.id;}if([...source.options].some(o=>o.value===selected))source.value=selected;renderPreview();}
  kind.addEventListener('change',refreshSources,{signal:events.signal});
  for(const input of [source,excerpt,date])input.addEventListener('input',renderPreview,{signal:events.signal});
  root.addEventListener('toggle',()=>{if(root.open&&canPublish)refreshSources();},{signal:events.signal});
  const publish=button('Publish reviewed fields',()=>form.requestSubmit(),form);
  const unpublish=button('Make source private',async()=>{
    if(!source.value||!window.confirm('Remove this source from public viewing?'))return;
    unpublish.disabled=true;
    try{await repository.unpublishContent({kind:kind.value,sourceId:source.value});say('Publication removed. The private source is preserved.');}
    catch{say('Could not remove publication. Retry before assuming it is private.');}
    finally{if(!disposed)unpublish.disabled=false;}
  },form);
  form.addEventListener('submit',async event=>{
    event.preventDefault();app.flushEditor();refreshSources();
    if(!source.value){say('Choose a source first.');return;}
    if(sync.getState().hasPending){say('Save the current draft before publishing.');return;}
    if(!window.confirm(`Publish exactly these fields when public viewing is enabled?\n\n${preview.textContent}\n\nThe private body, resources, criteria, and widget preferences stay private.`))return;
    publish.disabled=true;
    try{await repository.publishContent({kind:kind.value,sourceId:source.value,expectedTitle:source.selectedOptions[0].textContent,excerpt:excerpt.value,publicationDate:date.value||null});say('Reviewed publication saved. Public viewing remains controlled by the release environment.');}
    catch{say('Publication was not confirmed. Check the selected source and retry.');}
    finally{if(!disposed)publish.disabled=false;}
  },{signal:events.signal});
  root.append(status);container.replaceChildren(root);
  return {dispose(){disposed=true;importDraft=null;events.abort();root.remove();}};
}
