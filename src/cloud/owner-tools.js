import { STORAGE_KEYS } from '../storage.js';
import { validateBackup } from '../backup.js';
import { sanitizeJournal } from '../journal.js';
import { createPortableArchive,inspectPortableArchive,rehydratePortableArchive,
  collectMediaReferenceUsage,PORTABLE_MAX_TEXT_BYTES,PORTABLE_MAX_IMAGES }
  from './portable-backup.js';
import {validMediaOwner} from './media.js';

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

/** Strictly owner-scoped, immutable gallery projection. No Storage mutation. */
export function classifyPrivateGalleryItems(items,usage,ownerId){
  if(!Array.isArray(items)||items.length>100||!(usage instanceof Map)||
     typeof ownerId!=='string'||!ownerId)
    throw Error('Invalid private gallery inventory.');
  const seen=new Set();
  return items.map(item=>{
    if(!item||!validMediaOwner(item.path,ownerId)||seen.has(item.path)||
       !['image/png','image/jpeg','image/webp'].includes(item.mime)||
       (item.size!==null&&(!Number.isSafeInteger(item.size)||item.size<0))||
       (item.createdAt!==null&&typeof item.createdAt!=='string'))
      throw Error('Invalid or foreign private image metadata.');
    const references=usage.get(item.path)??[];
    if(!Array.isArray(references))throw Error('Invalid private reference inventory.');
    seen.add(item.path);
    return Object.freeze({...item,referenceCount:references.length,detached:!usage.has(item.path)});
  });
}

/** Explicit opt-in only: an attached asset is already included by default. */
export function validateDetachedBackupSelection(paths,usage,ownerId){
  if(!Array.isArray(paths)||paths.length>PORTABLE_MAX_IMAGES||!(usage instanceof Map))
    throw Error('Invalid private backup selection.');
  const selected=new Set();
  for(const path of paths){
    if(!validMediaOwner(path,ownerId)||usage.has(path)||selected.has(path))
      throw Error('Selected private image is no longer detached or belongs to another account.');
    selected.add(path);
  }
  return [...selected].sort();
}

/** Opt-in import/publication controls; user content is always assigned as text. */
export function createOwnerTools({repository,app,sync,container,media,ownerId,canPublish=true}) {
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
  // Explicit portable recovery with referenced image bytes; no automatic cloud mutation.
  const portableGroup=element('div');portableGroup.className='cloud-tool-group';
  const ready=()=>!disposed&&media?.download&&media?.upload&&typeof ownerId==='string';
  let portableBusy=false,portableDraft=null,selectedGalleryExport=null;
  async function exportPortable(libraryPaths=[]){
    if(!ready()||portableBusy)return;
    portableBusy=true;portableExport.disabled=true;
    if(selectedGalleryExport)selectedGalleryExport.disabled=true;
    try{
      await app.flushEditor();
      const snapshot=app.getSnapshot();
      const usage=collectMediaReferenceUsage(snapshot,{ownerId});
      const extras=validateDetachedBackupSelection(libraryPaths,usage,ownerId);
      say(extras.length?'Verifying referenced images and '+extras.length+' selected detached private image(s)…':
        'Preparing full private backup; verifying each referenced image…');
      const archive=await createPortableArchive(snapshot,{
        ownerId,download:path=>media.download(path),sanitizeHtml:sanitizeJournal,
        libraryPaths:extras
      });
      if(disposed)return;
      const blob=new Blob([JSON.stringify(archive)],{type:'application/json'});
      const url=URL.createObjectURL(blob),anchor=document.createElement('a');
      anchor.href=url;anchor.download='orbit-private-backup-'+new Date().toISOString().slice(0,10)+'.orbit';
      document.body.append(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1800);
      say('Private backup download started: '+archive.assets.length+' checked image(s), including '+
        extras.length+' explicitly selected detached file(s). Keep this unencrypted .orbit file private.');
    }catch(error){
      if(!disposed)say('Full backup was NOT exported: '+error.message+
        ' No file was intentionally changed; review any missing image and retry.');
    }finally{
      portableBusy=false;
      if(!disposed){
        portableExport.disabled=!ready();
        if(selectedGalleryExport)selectedGalleryExport.disabled=!ready()||!gallerySelection.size;
      }
    }
  }
  const portableExport=button('Download full backup (with images)',
    ()=>void exportPortable(),portableGroup);
  portableExport.disabled=!ready();
  const portableInput=element('input',null,portableGroup);
  portableInput.type='file';portableInput.accept='.orbit,application/json';portableInput.hidden=true;
  const reviewPortable=button('Review full backup for restore',()=>{if(ready()&&!portableBusy)portableInput.click();},portableGroup);
  reviewPortable.disabled=!ready();
  const confirmPortable=button('Restore reviewed backup (private)',async()=>{
    if(!ready()||portableBusy||!portableDraft)return;
    try{await app.flushEditor();}catch(error){say('Restore blocked: '+error.message);return;}
    if(sync.getState().hasPending||sync.getState().state==='conflict'){
      say('Your current changes are not saved. Export/save them before replacing this workspace.');return;
    }
    const draft=portableDraft;
    if(!window.confirm('Replace this private cloud space with the reviewed portable backup? This will upload '+
      draft.files.length+' image(s) to NEW private paths, then replace your current tasks, journals, and notes. Export your current space first. Only proceed with a trusted backup file.'))return;
    portableBusy=true;confirmPortable.disabled=true;
    try{
      say('Uploading validated images to your private space. Current cloud data is not replaced yet…');
      const remapped=await rehydratePortableArchive(draft,{ownerId,upload:blob=>media.upload(blob)});
      if(disposed)return;
      if(sync.getState().hasPending||sync.getState().state==='conflict'){
        say('Workspace changed during upload. Restore not started; some uploaded files may remain unused.');return;
      }
      app.applySnapshot(remapped);
      sync.queue(app.getSnapshot());
      const result=await sync.flush();
      if(!disposed){
        if(result.ok){portableDraft=null;confirmPortable.hidden=true;say('Private portable backup restored and confirmed saved to the cloud.');}
        else say('Cloud restore NOT confirmed. This session retains an unsaved draft; the previous cloud snapshot is protected by revision checks. Do not sign out until resolved. Uploaded files may remain unused.');
      }
    }catch(error){if(!disposed)say('Portable restore stopped: '+error.message+' Current cloud content was not intentionally replaced; uploaded private images may remain unused.');}
    finally{portableBusy=false;if(!disposed)confirmPortable.disabled=false;}
  },portableGroup);
  confirmPortable.hidden=true;
  portableInput.addEventListener('change',async()=>{
    const file=portableInput.files?.[0];
    if(!file||!ready()||portableBusy)return;
    portableBusy=true;reviewPortable.disabled=true;portableDraft=null;confirmPortable.hidden=true;
    try{
      if(file.size>PORTABLE_MAX_TEXT_BYTES)throw Error('Portable file exceeds the safe 96 MB limit.');
      const text=await file.text();
      if(disposed)return;
      const inspection=await inspectPortableArchive(text,{sanitizeHtml:sanitizeJournal});
      if(disposed)return;
      portableDraft=inspection;confirmPortable.hidden=false;
      say('Validated complete backup: '+inspection.snapshot.tasks.length+' tasks, '+
        (inspection.snapshot.journalEntries?.length??0)+' journal pages, '+
        (inspection.snapshot.extensions?.notes?.length??0)+' notes, '+inspection.files.length+
        ' private image(s). Nothing has been uploaded or replaced. Review, then confirm separately.');
    }catch(error){if(!disposed)say('Portable backup rejected: '+error.message+' No data was changed.');}
    finally{portableBusy=false;portableInput.value='';if(!disposed)reviewPortable.disabled=!ready();}
  },{signal:events.signal});

  const confirmImport=button('Import reviewed data as private',async()=>{
    if(!importDraft||disposed)return;
    try{await app.flushEditor();}catch(error){say('Import blocked: '+error.message);return;}
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
    event.preventDefault();
    try{await app.flushEditor();}catch(error){say('Publishing blocked: '+error.message);return;}
    refreshSources();
    if(!source.value){say('Choose a source first.');return;}
    if(sync.getState().hasPending){say('Save the current draft before publishing.');return;}
    if(!window.confirm(`Publish exactly these fields when public viewing is enabled?\n\n${preview.textContent}\n\nThe private body, resources, criteria, and widget preferences stay private.`))return;
    publish.disabled=true;
    try{await repository.publishContent({kind:kind.value,sourceId:source.value,expectedTitle:source.selectedOptions[0].textContent,excerpt:excerpt.value,publicationDate:date.value||null});say('Reviewed publication saved. Public viewing remains controlled by the release environment.');}
    catch{say('Publication was not confirmed. Check the selected source and retry.');}
    finally{if(!disposed)publish.disabled=false;}
  },{signal:events.signal});
  root.append(status);container.replaceChildren(root);
  return {dispose(){disposed=true;importDraft=null;portableDraft=null;events.abort();root.remove();}};
}
