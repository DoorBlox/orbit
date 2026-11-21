import { runtimeConfig } from './runtime-config.js';
import { AuthController } from './auth/controller.js';
import { createAuthShell } from './auth/shell.js';

/** Only the explicit publication projection enters a visitor's read-only V6 model. */
export function publicSnapshot(rows) {
  const branches=[{id:'inbox',parentId:'root',label:'Published thoughts'},
    {id:'just-because',parentId:'root',label:'Just Because',color:'#8B86CF'}];
  const snapshot={branches,tasks:[],journalEntries:[],milestones:[],spatialLayout:{},preferences:{colorMode:'deadline'}};
  const escapeText=value=>{const element=document.createElement('span');element.textContent=value;return element.innerHTML;};
  for(const row of rows){
    const id=`public-${row.id}`;
    if(row.kind==='branch')branches.push({id,parentId:'root',label:row.title});
    if(row.kind==='task')snapshot.tasks.push({id,projectId:'inbox',title:row.title,description:row.excerpt,
      dueDate:row.published_date||'',urgency:1,effortMinutes:0,status:'ready',criteria:'',resourceUrl:'',
      createdAt:row.updated_at,completedAt:''});
    if(row.kind==='milestone'&&row.published_date)snapshot.milestones.push({id,title:row.title,date:row.published_date});
    if(row.kind==='journal')snapshot.journalEntries.push({id,title:row.title,date:row.published_date||row.updated_at.slice(0,10),
      html:`<p>${escapeText(row.excerpt).replaceAll('\n','<br>')}</p>`,createdAt:row.updated_at,updatedAt:row.updated_at});
  }
  return snapshot;
}

export async function bootstrapOrbit(config=runtimeConfig) {
  if(config===null){const {mountOrbit}=await import('./app.js');return mountOrbit();}
  const appElement=document.getElementById('app');
  if(!appElement)throw Error('The ORBIT app container is missing.');
  const pristine=appElement.cloneNode(true);
  const lifecycle=new AbortController();
  appElement.hidden=true;appElement.inert=true;
  let app=null,sync=null,auth=null,ownerTools=null,readRequest=null,viewVersion=0;
  let draftVault=null,draftWarningShown=false;
  const warnDraft=()=>{
    if(draftWarningShown)return;
    draftWarningShown=true;
    window.alert('Secure crash recovery is unavailable in this browser. Export a private backup before leaving with unsaved changes.');
  };
  function downloadRecoveredDraft(snapshot){
    const file=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(file),link=document.createElement('a');
    link.href=url;link.download='orbit-private-crash-recovery.json';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  window.addEventListener('beforeunload',event=>{
    // beforeunload cannot await private uploads: warn while a canvas is dirty.
    app?.journalCommit?.();
    if(app?.hasPendingEditor?.()||sync?.getState().hasPending){event.preventDefault();event.returnValue='';}
  },{signal:lifecycle.signal});
  const publicRelease=config?.publicRelease===true;
  const shell=createAuthShell({publicRelease,
    onGoogleSignIn:()=>auth?.signInWithGoogle(),
    onPasswordSignIn:(email,password)=>auth?.signInWithPassword(email,password),
    onSignUp:(email,password)=>auth?.signUpWithPassword(email,password),
    onRequestOtp:email=>auth?.requestEmailOtp(email),
    onVerifyOtp:token=>auth?.verifyEmailOtp(token),
    onCancelOtp:()=>auth?.cancelEmailOtp(),
    onSignOut:async()=>{
      try{await app?.flushEditor();}
      catch(error){window.alert('Canvas not saved: '+error.message+' Keep editing and retry.');return;}
      if(sync?.getState().hasPending&&!window.confirm('Some changes are not saved to the cloud. Cancel and export a backup to keep them, or sign out and discard this session draft.'))return;
      if(draftVault){
        try{await draftVault.forget();}
        catch{window.alert('Could not erase the encrypted recovery record. Clear this site’s storage before signing out.');return;}
      }
      await auth?.signOut();
    },
    onExport:()=>app?.exportBackup(),
    onRetry:()=>sync?sync.retry():auth?.refresh(),
    onReload:async()=>{
      if(!sync||!window.confirm('Export your draft first if you want to keep it. Replace this session with the latest cloud version?'))return;
      await sync.discardPendingAndReload();
    },
  });
  function clearPrivate(){
    // Return workspace controls to the auth shell before clearing private DOM.
    shell.detachSpaceControls();
    ++viewVersion;readRequest?.abort();readRequest=null;
    sync?.dispose();sync=null;draftVault?.close();draftVault=null;
    ownerTools?.dispose();ownerTools=null;
    app?.dispose();app=null;
    appElement.hidden=true;appElement.inert=true;appElement.replaceChildren();
    delete globalThis.orbitDebug;
  }
  function restoreApp(){
    appElement.replaceChildren(...pristine.cloneNode(true).childNodes);
    // Keep the app hidden until construction/validation succeeds.
    appElement.hidden=true;appElement.inert=true;
  }
  try{
    const [{createCloudClient},{createCloudRepository},{createSyncController},{sanitizeJournal}]=await Promise.all([
      import('./cloud/client.js'),import('./cloud/repository.js'),import('./cloud/sync.js'),import('./journal.js')]);
    const client=await createCloudClient(config);
    const publicRepository=createCloudRepository(client,{sanitizeHtml:sanitizeJournal});
    async function mountVisitor(){
      clearPrivate();const version=viewVersion;
      readRequest=new AbortController();
      try{
        const rows=await publicRepository.loadPublicContent({signal:readRequest.signal});
        if(version!==viewVersion||auth?.getState().status==='owner')return;
        const {mountOrbit}=await import('./app.js');
        if(version!==viewVersion)return;
        restoreApp();app=mountOrbit({initialSnapshot:publicSnapshot(rows),readOnly:true,persistLocally:false});
        appElement.hidden=false;appElement.inert=false;
        shell.attachSpaceControls(appElement.querySelector('#space-widget'));shell.showApp(false);
      }catch(error){if(version===viewVersion&&error?.code!=='ABORTED')shell.showError('Published content could not be loaded. Try again later.');}
    }
    auth=new AuthController({client,redirectUrl:config.siteUrl,currentOrigin:location.origin,
      ownerRpc:'orbit_workspace_access',
      onOtpState:state=>shell.setOtpState(state),
      clearPrivate,cancelPendingWrites:()=>sync?.dispose(),
      onState:state=>{
        shell.setState(state);
        if(publicRelease&&['signed-out','unauthorized'].includes(state.status))void mountVisitor();
      },
      onOwner:async({user,isCurrent})=>{
        const repository=createCloudRepository(client,{sanitizeHtml:sanitizeJournal,ownerId:user.id});
        const request=new AbortController();readRequest=request;
        const loaded=await repository.loadOwnerSnapshot({signal:request.signal});
        if(!isCurrent())return;
        const [{mountOrbit},{createOwnerTools},{createPrivateMedia},
          {createOwnerDraftVault},{validateBackup}]=await Promise.all([
          import('./app.js'),import('./cloud/owner-tools.js'),import('./cloud/media.js'),
          import('./cloud/durable-draft.js'),import('./backup.js')]);
        if(!isCurrent())return;
        // Only the authenticated owner may decrypt this origin's private draft.
        // Never restore a stale cloud revision automatically: preserve it for
        // explicit offline backup and resolve the cloud conflict separately.
        let vault=null,recovery=null,recoveredSnapshot=null;
        try{
          vault=await createOwnerDraftVault(user.id);
          recovery=await vault.load();
          if(recovery)recoveredSnapshot=validateBackup(recovery.snapshot,{sanitizeHtml:sanitizeJournal});
        }catch{warnDraft();}
        if(!isCurrent()){vault?.close();return;}
        draftVault=vault;
        let restoring=false;
        if(recovery&&recoveredSnapshot){
          if(recovery.revision===loaded.revision){
            restoring=window.confirm('ORBIT found an encrypted copy of unsaved work from an interrupted session. Restore it into your private workspace and retry saving to the cloud?');
          }else if(window.confirm('ORBIT found unsaved work from an older cloud revision. It cannot be applied automatically. Download a PRIVATE JSON recovery copy now?')){
            downloadRecoveredDraft(recoveredSnapshot);
          }
        }
        restoreApp();
        sync=createSyncController({repository,initialRevision:loaded.revision,
          draftVault:vault,onDraftVaultError:warnDraft,
          onSnapshot:snapshot=>app?.applySnapshot(snapshot),
          onStatus:status=>{
            app?.setCloudStatus(status);shell.setSyncStatus(status);
            if(['AUTH_REQUIRED','FORBIDDEN'].includes(status.errorCode))void auth.refresh(false);
          }});
        const media=client.storage?.from?createPrivateMedia(client,{ownerId:user.id}):null;
        // Bind to this owner controller so an old view cannot enqueue into a new account.
        const ownerSync=sync;
        app=mountOrbit({initialSnapshot:restoring?recoveredSnapshot:loaded.snapshot,persistLocally:false,viewStateKey:user.id,media,
          onSnapshotDirty:getDetachedSnapshot=>ownerSync.queueDeferredOwned(getDetachedSnapshot)});
        if(restoring)ownerSync.queueOwned(structuredClone(recoveredSnapshot));
        // The original owner alone may publish; other users still get private import tools.
        let canPublish=false;
        try{const result=await client.rpc('orbit_owner_access');canPublish=result?.data===true;}catch{}
        if(!isCurrent())return;
        ownerTools=createOwnerTools({repository,app,sync,container:shell.ownerTools,canPublish,media,ownerId:user.id});
        if(!isCurrent()){clearPrivate();return;}
        appElement.hidden=false;appElement.inert=false;
        shell.attachSpaceControls(appElement.querySelector('#space-widget'));shell.showApp(true);
        app.setCloudStatus(sync.getState());shell.setSyncStatus(sync.getState());
      }});
    await auth.start();
    return {dispose(){lifecycle.abort();auth.dispose();shell.dispose();},auth};
  }catch{
    clearPrivate();shell.showError();
    return {dispose(){lifecycle.abort();auth?.dispose();shell.dispose();}};
  }
}

if(typeof document!=='undefined'&&document.getElementById('app')){
  globalThis.orbitReady=bootstrapOrbit();
}
