/**
 * Client lifecycle gate, not an authorization boundary: server owner RLS remains final.
 * No app records, local journal storage, provider tokens or metadata-based allowlist here.
 */
export class AuthController {
  constructor({ client, redirectUrl, currentOrigin = globalThis.location?.origin,
    ownerRpc = 'orbit_owner_access', onState = () => {}, onOwner = () => {},
    clearPrivate = () => {}, cancelPendingWrites = () => {}, onOtpState = () => {} } = {}) {
    if (!client?.auth?.getUser || !client.auth.onAuthStateChange || !client.rpc) {
      throw new Error('An authentication client is required.');
    }
    const redirect = new URL(redirectUrl);
    const origin = new URL(currentOrigin).origin;
    const local = redirect.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(redirect.hostname);
    if ((redirect.protocol !== 'https:' && !local) || redirect.origin !== origin ||
      redirect.username || redirect.password || redirect.search || redirect.hash) {
      throw new Error('Use the exact configured application redirect on this origin.');
    }
    this.client = client;
    this.redirectUrl = redirect.href;
    this.ownerRpc = ownerRpc;
    Object.assign(this, { onState, onOwner, clearPrivate, cancelPendingWrites });
    this.state = Object.freeze({ status: 'idle', user: null, code: null });
    this.generation = 0;
    this.ownerEpoch = 0;
    this.disposed = false;
    this.subscription = null;
    this.started = false;
    this.signingOut = false;
    this.onOtpState=onOtpState;
    this.otpEpoch=0;this.otpPending=null;this.otpEmail='';this.resendAt=0;this.verifyAt=0;
    this.otpStatus='idle';this.otpCode=null;
  }

  getState() { return this.state; }

  publish(status, user = null, code = null) {
    this.state = Object.freeze({ status, user: user ? Object.freeze({ id: user.id }) : null, code });
    this.onState(this.state);
    return this.state;
  }

  clear() {
    this.ownerEpoch++;
    // Both callbacks run even if one cleanup fails. No private payload is logged.
    let ok = true;
    try { this.clearPrivate(); } catch { ok = false; }
    try { this.cancelPendingWrites(); } catch { ok = false; }
    return ok;
  }

  revoke(status, code = null) {
    this.generation++;
    const cleared = this.clear();
    return this.publish(cleared ? status : 'error', null, cleared ? code : 'PRIVATE_CLEANUP_FAILED');
  }

  async start() {
    if (this.disposed) return this.state;
    if (this.started) return this.initialization || this.state;
    if (!this.started) {
      this.started = true;
      const listener = this.client.auth.onAuthStateChange((event, session) => this.handleEvent(event, session));
      this.subscription = listener?.data?.subscription;
    }
    this.initialization = this.refresh(false);
    try { return await this.initialization; } finally { this.initialization = null; }
  }

  handleEvent(event, session) {
    if (this.disposed || event === 'INITIAL_SESSION') return;
    if (this.signingOut && event !== 'SIGNED_OUT') return;
    // SDK sign-ins emit SIGNED_IN before their promises resolve. Only the current
    // operation may initiate verification; late events after logout are ignored.
    if (['verify','password','signup'].includes(this.otpPending?.kind) && event !== 'SIGNED_OUT') return;
    if (event === 'SIGNED_OUT' || !session?.user?.id) {
      this.cancelEmailOtp();
      const expired = !this.signingOut && this.state.status === 'owner';
      this.revoke(expired ? 'expired' : 'signed-out');
      return;
    }
    const sameOwner = this.state.status === 'owner' && session.user.id === this.state.user.id;
    const generation = ++this.generation;
    if (!sameOwner) {
      if (!this.clear()) { this.publish('error', null, 'PRIVATE_CLEANUP_FAILED'); return; }
      this.publish('restoring');
    }
    // Supabase invokes auth listeners inside its auth lock. Leave the callback before
    // calling getUser/RPC; awaiting those operations here can deadlock token refresh.
    setTimeout(() => {
      if (!this.disposed && generation === this.generation) void this.verify(generation, sameOwner);
    }, 0);
  }

  refresh(preserveOwner = this.state.status === 'owner') {
    if (this.disposed) return Promise.resolve(this.state);
    const generation = ++this.generation;
    if (!preserveOwner) {
      if (!this.clear()) return Promise.resolve(this.publish('error', null, 'PRIVATE_CLEANUP_FAILED'));
      this.publish('restoring');
    }
    return this.verify(generation, preserveOwner);
  }

  async verify(generation, preserveOwner) {
    const current = () => !this.disposed && generation === this.generation;
    try {
      const response = await this.client.auth.getUser();
      if (!current()) return this.state;
      const verified = response?.data?.user;
      if (response?.error || !verified?.id || typeof verified.id !== 'string') {
        const missing = !response?.error || response.error.name === 'AuthSessionMissingError' ||
          ['session_not_found', 'bad_jwt', 'refresh_token_not_found'].includes(response.error.code) || response.error.status === 401;
        return this.revoke(preserveOwner ? 'expired' : missing ? 'signed-out' : 'error', missing ? null : 'AUTH_UNAVAILABLE');
      }
      // The RPC uses auth.uid() and a server-managed allowlist. No public UUID/email
      // or user-editable user_metadata is ever accepted as owner authority.
      const authorization = await this.client.rpc(this.ownerRpc);
      if (!current()) return this.state;
      if (authorization?.error) return this.revoke('error', 'OWNER_CHECK_UNAVAILABLE');
      if (authorization?.data !== true) return this.revoke('unauthorized');
      const alreadyMounted = preserveOwner && this.state.user?.id === verified.id;
      if (preserveOwner && !alreadyMounted && !this.clear()) return this.publish('error', null, 'PRIVATE_CLEANUP_FAILED');
      this.publish('owner', verified);
      if (!alreadyMounted) {
        const epoch = this.ownerEpoch;
        await this.onOwner({ user: Object.freeze({ id: verified.id }),
          isCurrent: () => !this.disposed && epoch === this.ownerEpoch &&
            this.state.status === 'owner' && this.state.user.id === verified.id });
      }
      return this.state;
    } catch {
      if (current()) return this.revoke('error', 'AUTH_UNAVAILABLE');
      return this.state;
    }
  }

  getOtpState() {
    return {status:this.otpStatus,code:this.otpCode,hasChallenge:!!this.otpEmail,
      busy:!!this.otpPending,resendAt:this.resendAt,verifyAt:this.verifyAt};
  }

  otpState(status,code=null) {
    this.otpStatus=status;this.otpCode=code;this.onOtpState(this.getOtpState());
  }

  cancelEmailOtp() {
    ++this.otpEpoch;this.otpEmail='';this.otpState('idle');
  }

  async requestEmailOtp(email) {
    if(this.disposed||this.signingOut||this.otpPending||this.state.status==='owner'||Date.now()<this.resendAt)return false;
    const address=typeof email==='string'?email.trim():'';
    if(address.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)){this.otpState('error','INVALID_EMAIL');return false;}
    const operation={epoch:++this.otpEpoch,kind:'send'};this.otpPending=operation;
    this.otpEmail='';this.resendAt=Date.now()+60000;this.otpState('sending');
    try{
      const result=await this.client.auth.signInWithOtp({email:address,options:{shouldCreateUser:false}});
      if(this.disposed||operation.epoch!==this.otpEpoch)return false;
      if(result?.error)throw result.error;
      this.otpEmail=address;this.otpState('sent');return true;
    }catch(error){
      if(!this.disposed&&operation.epoch===this.otpEpoch)this.otpState('error',error?.status===429?'RATE_LIMITED':'UNAVAILABLE');
      return false;
    }finally{
      this.otpPending=null;
      if(!this.disposed)this.onOtpState(this.getOtpState());
    }
  }

  async verifyEmailOtp(token) {
    if(this.disposed||this.signingOut||this.otpPending||!this.otpEmail||Date.now()<this.verifyAt)return false;
    if(typeof token!=='string'||!/^\d{6}$/.test(token)){this.otpState('error','INVALID_CODE');return false;}
    const operation={epoch:this.otpEpoch,kind:'verify'};this.otpPending=operation;this.otpState('verifying');
    try{
      const result=await this.client.auth.verifyOtp({email:this.otpEmail,token,type:'email'});
      if(this.disposed||operation.epoch!==this.otpEpoch){
        // A cancelled SDK verification can still have stored a session internally.
        // New sign-ins stay blocked until this cleanup completes.
        await this.client.auth.signOut({scope:'local'});return false;
      }
      if(result?.error)throw result.error;
      this.otpEmail='';this.otpState('verified');
      await this.refresh(false);return this.state.status==='owner';
    }catch(error){
      if(!this.disposed&&operation.epoch===this.otpEpoch){
        const rate=error?.status===429;
        if(rate)this.verifyAt=Date.now()+60000;
        this.otpState('error',rate?'RATE_LIMITED':error?.code==='otp_expired'||error?.code==='otp_disabled'?'INVALID_CODE':'UNAVAILABLE');
      }
      return false;
    }finally{
      this.otpPending=null;
      if(!this.disposed)this.onOtpState(this.getOtpState());
    }
  }

  /** Supabase Auth owns email verification and rate limiting; no client-side allowlist. */
  async signUpWithPassword(email,password) {
    if(this.disposed||this.signingOut||this.otpPending||this.state.status==='owner')return false;
    const address=typeof email==='string'?email.trim():'';
    if(address.length>254||!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(address)||
      typeof password!=='string'||password.length<8||password.length>4096){
      this.publish('signed-out',null,'SIGN_UP_FAILED');return false;
    }
    this.cancelEmailOtp();
    const operation={epoch:this.otpEpoch,kind:'signup'};this.otpPending=operation;
    this.publish('signing-up');
    try{
      const response=await this.client.auth.signUp({email:address,password,options:{emailRedirectTo:this.redirectUrl}});
      if(this.disposed||operation.epoch!==this.otpEpoch){
        if(response?.data?.session)await this.client.auth.signOut({scope:'local'});
        return false;
      }
      if(response?.error)throw response.error;
      if(response?.data?.session){await this.refresh(false);return this.state.status==='owner';}
      this.publish('signup-pending');return true;
    }catch{
      if(!this.disposed&&operation.epoch===this.otpEpoch)this.publish('signed-out',null,'SIGN_UP_FAILED');
      return false;
    }finally{
      this.otpPending=null;
      if(!this.disposed)this.onOtpState(this.getOtpState());
    }
  }

  async signInWithPassword(email,password) {
    if(this.disposed||this.signingOut||this.otpPending||this.state.status==='owner')return false;
    const address=typeof email==='string'?email.trim():'';
    if(address.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)||typeof password!=='string'||!password||password.length>4096){
      this.publish('signed-out',null,'PASSWORD_SIGN_IN_FAILED');return false;
    }
    this.cancelEmailOtp();
    const operation={epoch:this.otpEpoch,kind:'password'};this.otpPending=operation;
    this.revoke('password-signing-in');
    try{
      const result=await this.client.auth.signInWithPassword({email:address,password});
      if(this.disposed||operation.epoch!==this.otpEpoch){await this.client.auth.signOut({scope:'local'});return false;}
      if(result?.error)throw result.error;
      await this.refresh(false);return this.state.status==='owner';
    }catch(error){
      if(!this.disposed&&operation.epoch===this.otpEpoch)this.revoke('signed-out',error?.status===429?'PASSWORD_RATE_LIMITED':'PASSWORD_SIGN_IN_FAILED');
      return false;
    }finally{this.otpPending=null;if(!this.disposed)this.onOtpState(this.getOtpState());}
  }

  async signInWithGoogle() {
    if (this.disposed || this.signingOut || this.otpPending) return false;
    const generation = ++this.generation;
    if (!this.clear()) { this.publish('error', null, 'PRIVATE_CLEANUP_FAILED'); return false; }
    this.publish('signing-in');
    try {
      const result = await this.client.auth.signInWithOAuth({ provider: 'google',
        options: { redirectTo: this.redirectUrl, scopes: 'openid email profile' } });
      if (this.disposed || generation !== this.generation) return false;
      if (result?.error) { this.revoke('error', 'SIGN_IN_FAILED'); return false; }
      return true;
    } catch {
      if (!this.disposed && generation === this.generation) this.revoke('error', 'SIGN_IN_FAILED');
      return false;
    }
  }

  async signOut() {
    if (this.disposed) return false;
    this.cancelEmailOtp();
    this.signingOut = true;
    this.revoke('signed-out');
    try {
      // SDK manages its own credential storage; never clear unrelated local backups.
      const result = await this.client.auth.signOut({ scope: 'local' });
      if (result?.error) throw result.error;
      return true;
    } catch {
      if (!this.disposed) this.publish('signed-out', null, 'SIGN_OUT_FAILED');
      return false;
    } finally { this.signingOut = false; }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelEmailOtp();
    this.generation++;
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.clear();
    this.publish('disposed');
  }
}
