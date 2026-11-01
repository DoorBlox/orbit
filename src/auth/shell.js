const textByState = {
  idle: 'Preparing your space…', restoring: 'Checking your private session…',
  'signing-in': 'Opening Google sign-in…',
  'signed-out': 'Sign in to open your private ORBIT space.',
  unauthorized: 'This account cannot open the private space.',
  expired: 'Your session ended. Sign in again to continue.',
  error: 'Your private space could not be opened. Check your connection and try again.',
  owner: 'Your private owner space.', disposed: 'Your private space is closed.',
};
const syncText = {
  saved: 'Saved to your cloud', pending: 'Changes waiting to save', saving: 'Saving to your cloud…',
  offline: 'Offline — this draft is still in this session',
  error: 'Not saved — keep a backup and retry', conflict: 'Another session changed your space — export this draft before reloading',
};

/** Small native shell around the unchanged spatial app; no user HTML is interpolated. */
export function createAuthShell({ publicRelease, onSignIn, onSignOut, onExport, onRetry, onReload } = {}) {
  document.getElementById('cloud-shell')?.remove();
  const root=document.createElement('section');root.id='cloud-shell';root.className='cloud-shell';
  root.setAttribute('aria-label','Cloud access and saving');
  const gate=document.createElement('div');gate.className='cloud-gate glass-widget';
  const title=document.createElement('h1');title.textContent='Your ORBIT space';
  const description=document.createElement('p');description.className='cloud-gate-message';description.setAttribute('role','status');
  const release=document.createElement('p');release.className='cloud-release-note';
  release.textContent=publicRelease?'Visitors can read only content explicitly published by the owner.':'Public viewing is not enabled. Your private space requires owner sign-in.';
  const toolbar=document.createElement('div');toolbar.className='cloud-toolbar glass-widget';toolbar.hidden=true;
  const mode=document.createElement('span');mode.className='cloud-mode';
  const status=document.createElement('span');status.className='cloud-sync-state';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const controls=document.createElement('div');controls.className='cloud-controls';
  function button(label,handler,parent=controls) {
    const element=document.createElement('button');element.type='button';element.className='glass-button';element.textContent=label;
    element.addEventListener('click',()=>{void handler?.();});parent.append(element);return element;
  }
  const signIn=button('Sign in with Google',onSignIn,gate);
  const gateSignOut=button('Sign out',onSignOut,gate);gateSignOut.hidden=true;
  const retryGate=button('Try again',onRetry,gate);retryGate.hidden=true;
  gate.prepend(title,description,release);
  const exportDraft=button('Export backup',onExport);
  const retry=button('Retry save',onRetry);
  const reload=button('Reload cloud version',onReload);
  const signOut=button('Sign out',onSignOut);
  const visitorSignIn=button('Owner sign-in',onSignIn);
  const ownerTools=document.createElement('div');ownerTools.id='cloud-owner-tools';ownerTools.hidden=true;
  toolbar.append(mode,status,controls);root.append(gate,toolbar,ownerTools);document.body.append(root);
  let state={status:'idle'};
  function setState(next) {
    state=next;description.textContent=textByState[next.status]||textByState.error;
    signIn.disabled=['restoring','signing-in'].includes(next.status);
    signIn.hidden=next.status==='owner';
    gateSignOut.hidden=next.status!=='unauthorized';
    retryGate.hidden=next.status!=='error';
    if(next.status!=='owner'){gate.hidden=false;toolbar.hidden=true;ownerTools.hidden=true;}
  }
  function showApp(owner) {
    gate.hidden=true;toolbar.hidden=false;mode.textContent=owner?'Private owner space':'Published space · read only';
    for(const control of [exportDraft,retry,reload])control.hidden=!owner;
    signOut.hidden=!owner&&state.status!=='unauthorized';
    visitorSignIn.hidden=owner;ownerTools.hidden=!owner;
    status.textContent=owner?'Cloud snapshot loaded':'Only explicitly published content is shown';
    retry.disabled=true;reload.hidden=true;
  }
  function setSyncStatus(next) {
    status.textContent=syncText[next.state]||syncText.error;
    retry.disabled=!['error','offline','pending'].includes(next.state);
    reload.hidden=next.state!=='conflict';
    if(next.errorCode==='AUTH_REQUIRED')status.textContent='Session verification required — this draft is not saved';
  }
  function showError(message='Cloud setup is unavailable. Your private space remains closed.') {
    setState({status:'error'});description.textContent=message;
  }
  setState(state);
  return {setState,showApp,setSyncStatus,showError,ownerTools,dispose:()=>root.remove()};
}
