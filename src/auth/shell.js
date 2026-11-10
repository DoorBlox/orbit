const textByState = {
  idle: 'Preparing your space…', restoring: 'Checking your private session…',
  'signing-in': 'Opening Google sign-in…',
  'password-signing-in': 'Signing in and checking your access…',
  'signing-up': 'Creating your account securely…',
  'signup-pending': 'Check your email for a verification link, then return to ORBIT to sign in.',
  'signed-out': 'Sign in to open your private ORBIT space.',
  unauthorized: 'This account cannot open the private space.',
  expired: 'Your session ended. Sign in again to continue.',
  error: 'Your private space could not be opened. Check your connection and try again.',
  owner: 'Your private ORBIT space.', disposed: 'Your private space is closed.',
};
const syncText = {
  saved: 'Saved to your cloud', pending: 'Changes waiting to save', saving: 'Saving to your cloud…',
  offline: 'Offline — this draft is still in this session',
  error: 'Not saved — keep a backup and retry', conflict: 'Another session changed your space — export this draft before reloading',
};

/** Small native shell around the unchanged spatial app; no user HTML is interpolated. */
export function createAuthShell({ publicRelease, onGoogleSignIn, onPasswordSignIn, onSignUp, onRequestOtp, onVerifyOtp, onCancelOtp, onSignOut, onExport, onRetry, onReload } = {}) {
  document.getElementById('cloud-shell')?.remove();
  const root=document.createElement('section');root.id='cloud-shell';root.className='cloud-shell';
  root.setAttribute('aria-label','Cloud access and saving');
  const gate=document.createElement('div');gate.className='cloud-gate glass-widget';
  const title=document.createElement('h1');title.textContent='Your ORBIT space';
  const description=document.createElement('p');description.className='cloud-gate-message';description.setAttribute('role','status');
  const release=document.createElement('p');release.className='cloud-release-note';
  release.textContent=publicRelease?'Only content intentionally published can be viewed without signing in.':'Each Google account opens its own private ORBIT space. Nothing is shared between accounts.';
  const toolbar=document.createElement('div');toolbar.className='cloud-toolbar glass-widget';toolbar.hidden=true;
  toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','Workspace status and controls');
  const mode=document.createElement('span');mode.className='cloud-mode';
  const status=document.createElement('span');status.className='cloud-sync-state';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const controls=document.createElement('div');controls.className='cloud-controls';
  const quickActions=document.createElement('div');quickActions.className='cloud-quick-actions';
  const accountDetails=document.createElement('details');accountDetails.className='cloud-account-details';
  const accountSummary=document.createElement('summary');
  accountSummary.textContent='Account, import & backups';
  accountDetails.append(accountSummary,controls);
  function button(label,handler,parent=controls) {
    const element=document.createElement('button');element.type='button';element.className='glass-button';element.textContent=label;
    element.addEventListener('click',()=>{void handler?.();});parent.append(element);return element;
  }
  const googleSignIn=button('Continue with Google',onGoogleSignIn,gate);
  googleSignIn.id='google-sign-in';googleSignIn.classList.add('cloud-google-sign-in');
  const passwordLabel=document.createElement('p');passwordLabel.className='cloud-password-label';
  passwordLabel.textContent='Or sign in with your existing email and password';
  gate.append(passwordLabel);
  const passwordLogin=document.createElement('form');passwordLogin.className='cloud-email-login';gate.append(passwordLogin);
  function passwordField(label,id){const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.id=id;wrap.append(input);passwordLogin.append(wrap);return input;}
  const passwordEmail=passwordField('Email address','password-email');passwordEmail.type='email';passwordEmail.autocomplete='username';passwordEmail.maxLength=254;passwordEmail.required=true;
  const password=passwordField('Password','login-password');password.type='password';password.autocomplete='current-password';password.maxLength=4096;password.required=true;
  const passwordSubmit=button('Sign in with password',null,passwordLogin);passwordSubmit.type='submit';
  passwordLogin.addEventListener('submit',async event=>{event.preventDefault();const secret=password.value;password.value='';await onPasswordSignIn?.(passwordEmail.value,secret);});
  const otpDetails=document.createElement('details');const otpSummary=document.createElement('summary');otpSummary.textContent='Email code (requires configured email delivery)';otpDetails.append(otpSummary);gate.append(otpDetails);
  const login=document.createElement('form');login.className='cloud-email-login';otpDetails.append(login);
  function field(label,id){const wrapper=document.createElement('label');wrapper.textContent=label;const input=document.createElement('input');input.id=id;wrapper.append(input);login.append(wrapper);return input;}
  const email=field('Email address for email code','login-email');email.type='email';email.autocomplete='email';email.maxLength=254;email.required=true;
  const send=button('Send login code',()=>{if(email.reportValidity())void onRequestOtp?.(email.value);},login);
  const token=field('Six-digit login code','login-code');token.type='text';token.inputMode='numeric';token.autocomplete='one-time-code';token.maxLength=6;token.pattern='[0-9]{6}';token.setAttribute('aria-describedby','login-feedback');
  const verify=button('Verify and sign in',null,login);verify.type='submit';
  const resend=button('Resend code',()=>{void onRequestOtp?.(email.value);},login);
  const changeEmail=button('Use another email',()=>{onCancelOtp?.();email.focus();},login);
  const feedback=document.createElement('p');feedback.id='login-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');login.append(feedback);
  login.addEventListener('submit',async event=>{event.preventDefault();if(!otp.hasChallenge){if(email.reportValidity())void onRequestOtp?.(email.value);return;}if(!token.reportValidity())return;const code=token.value;token.value='';await onVerifyOtp?.(code);});
  let otp={status:'idle',busy:false,hasChallenge:false,resendAt:0,verifyAt:0};
  function setOtpState(next){
    const wasChallenge=otp.hasChallenge,wasBusy=otp.busy;otp=next;
    const messages={sending:'Requesting a login code…',sent:'If this address is eligible, a login code has been sent. Check your inbox.',verifying:'Verifying your code…',verified:'Sign-in verified. Private workspace access will be checked.'};
    const failures={INVALID_EMAIL:'Enter a valid email address.',INVALID_CODE:'The code is invalid or expired. Try again or request a new code.',RATE_LIMITED:'Too many attempts. Wait before trying again.',UNAVAILABLE:'Sign-in could not be completed. Check your connection or email setup and try again.'};
    feedback.textContent=next.status==='error'?(failures[next.code]||failures.UNAVAILABLE):(messages[next.status]||'');
    login.setAttribute('aria-busy',String(next.busy));email.readOnly=next.hasChallenge||next.busy;
    token.disabled=!next.hasChallenge||next.busy;token.required=next.hasChallenge;
    send.hidden=next.hasChallenge;resend.hidden=!next.hasChallenge;changeEmail.hidden=!next.hasChallenge;
    changeEmail.disabled=next.busy;
    if(!next.hasChallenge)token.value='';
    updateCooldown();
    if(next.hasChallenge&&!next.busy&&(!wasChallenge||wasBusy))token.focus();
  }
  function updateCooldown(){
    const seconds=Math.max(0,Math.ceil((otp.resendAt-Date.now())/1000));
    const locked=['idle','restoring','signing-in','password-signing-in','signing-up','owner','disposed'].includes(state.status);
    googleSignIn.disabled=locked||otp.busy;
    passwordSubmit.disabled=passwordEmail.disabled=password.disabled=locked||otp.busy;
    passwordLogin.setAttribute('aria-busy',String(state.status==='password-signing-in'));
    send.disabled=resend.disabled=otp.busy||locked||seconds>0;
    resend.textContent=seconds?`Resend code (${seconds}s)`:'Resend code';
    send.textContent=seconds&&!otp.hasChallenge?`Send login code (${seconds}s)`:'Send login code';
    verify.disabled=otp.busy||locked||!otp.hasChallenge||Date.now()<otp.verifyAt;
  }
  const cooldownTimer=setInterval(updateCooldown,1000);
  const gateSignOut=button('Sign out',onSignOut,gate);gateSignOut.hidden=true;
  const retryGate=button('Try again',onRetry,gate);retryGate.hidden=true;
  gate.prepend(title,description,release);
  const exportDraft=button('Export backup',onExport,quickActions);
  const retry=button('Retry save',onRetry,quickActions);
  const reload=button('Reload cloud version',onReload);
  const signOut=button('Sign out',onSignOut);
  const visitorSignIn=button('Sign in',()=>{gate.hidden=false;passwordEmail.focus();});
  const ownerTools=document.createElement('div');ownerTools.id='cloud-owner-tools';ownerTools.hidden=true;
  controls.append(ownerTools);toolbar.append(mode,status,quickActions,accountDetails);root.append(gate,toolbar);document.body.append(root);
  // The access gate stays outside the private app. Account controls live in
  // the movable Space widget while signed in; the bottom cloud dock is gone.
  function detachSpaceControls(){
    if(toolbar.parentElement!==root)root.append(toolbar);
    document.body.classList.remove('cloud-space-mounted');
    measure();
  }
  function attachSpaceControls(space){
    if(!space)return false;
    if(toolbar.parentElement!==space)space.append(toolbar);
    document.body.classList.add('cloud-space-mounted');
    measure();
    return true;
  }
  const measure=()=>{
    const embedded=toolbar.closest('#space-widget')!==null;
    const height=toolbar.hidden||embedded?0:Math.ceil(toolbar.getBoundingClientRect().height+24);
    document.documentElement.style.setProperty('--cloud-dock-height',`${height}px`);
    document.body.classList.toggle('cloud-connected',height>0);
  };
  const resizeObserver=new ResizeObserver(measure);resizeObserver.observe(toolbar);
  let state={status:'idle'};
  function setState(next) {
    state=next;description.textContent=textByState[next.status]||textByState.error;
    if(next.code==='PASSWORD_SIGN_IN_FAILED')description.textContent='Sign-in failed. Check your credentials or connection and try again.';
    if(next.code==='SIGN_UP_FAILED')description.textContent='Email account creation is not enabled in this Google-first beta. Choose Continue with Google.';
    if(next.code==='PASSWORD_RATE_LIMITED')description.textContent='Too many sign-in attempts. Wait before trying again.';
    // A failed SDK sign-out can leave a session stored even though the private
    // view was cleared. Do not present that state as confirmed signed out.
    if(next.code==='SIGN_OUT_FAILED')
      description.textContent='Sign-out could not be confirmed. Your session may still be active on this device. Retry sign-out before leaving it.';
    login.hidden=next.status==='owner';
    if(['owner','signed-out','expired','disposed'].includes(next.status)){email.value='';token.value='';password.value='';if(next.code!=='PASSWORD_SIGN_IN_FAILED'&&next.code!=='PASSWORD_RATE_LIMITED')passwordEmail.value='';}
    updateCooldown();
    gateSignOut.hidden=next.status!=='unauthorized'&&next.code!=='SIGN_OUT_FAILED';
    gateSignOut.textContent=next.code==='SIGN_OUT_FAILED'?'Retry sign-out':'Sign out';
    retryGate.hidden=next.status!=='error';
    if(next.status!=='owner'){gate.hidden=false;toolbar.hidden=true;ownerTools.hidden=true;detachSpaceControls();measure();}
  }
  function showApp(owner) {
    gate.hidden=true;toolbar.hidden=false;mode.textContent=owner?'Private workspace':'Published space · read only';
    for(const control of [exportDraft,retry,reload])control.hidden=!owner;
    signOut.hidden=!owner&&state.status!=='unauthorized';
    visitorSignIn.hidden=owner;ownerTools.hidden=!owner;
    status.textContent=owner?'Cloud snapshot loaded':'Only explicitly published content is shown';
    retry.disabled=true;retry.hidden=true;reload.hidden=true;
    accountDetails.open=false;measure();
  }
  function setSyncStatus(next) {
    status.textContent=syncText[next.state]||syncText.error;
    retry.disabled=!['error','offline','pending'].includes(next.state);
    retry.hidden=retry.disabled;
    reload.hidden=next.state!=='conflict';
    if(next.state==='conflict')accountDetails.open=true;
    if(next.errorCode==='AUTH_REQUIRED')status.textContent='Session verification required — this draft is not saved';
  }
  function showError(message='Cloud setup is unavailable. Your private space remains closed.') {
    setState({status:'error'});login.hidden=true;passwordLogin.hidden=true;googleSignIn.hidden=true;description.textContent=message;
  }
  setState(state);
  setOtpState(otp);
  return {setState,setOtpState,showApp,setSyncStatus,showError,ownerTools,attachSpaceControls,detachSpaceControls,
    dispose:()=>{detachSpaceControls();clearInterval(cooldownTimer);resizeObserver.disconnect();root.remove();document.body.classList.remove('cloud-connected','cloud-space-mounted');document.documentElement.style.removeProperty('--cloud-dock-height');}};
}
