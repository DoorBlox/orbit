import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthController } from '../src/auth/controller.js';

const user = { id: 'owner-fixture', email: 'owner@example.invalid' };
const pause = () => new Promise(resolve => setTimeout(resolve, 5));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve=done; }); return { promise, resolve }; };

function setup(overrides = {}) {
  const events = [], calls = [];
  let listener;
  const client = {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      onAuthStateChange(callback) { listener=callback; return { data: { subscription: { unsubscribe() { calls.push('unsubscribe'); } } } }; },
      signInWithOAuth: async options => { calls.push(options); return { data: { url: 'https://provider.example.invalid/' }, error: null }; },
      signOut: async options => { calls.push(options); return { error: null }; },
      ...overrides.auth,
    },
    rpc: overrides.rpc || (async name => { calls.push(name); return { data: true, error: null }; }),
  };
  const controller = new AuthController({ client, redirectUrl:'https://orbit.example.invalid/', currentOrigin:'https://orbit.example.invalid',
    onState: state => events.push(['state', state]),
    onOwner: async context => { events.push(['owner', context]); if(overrides.owner)await overrides.owner(context); },
    clearPrivate: () => events.push(['clear']), cancelPendingWrites: () => events.push(['cancel']),
  });
  return { controller, client, events, calls, emit: (event,session) => listener(event,session) };
}

test('restores only after verified server user and boolean owner RPC; no session object authorization', async () => {
  const f=setup();
  await f.controller.start();
  assert.equal(f.controller.getState().status,'owner');
  assert.ok(f.calls.includes('orbit_owner_access'));
  assert.equal(f.events.filter(([event])=>event==='owner').length,1);
  assert.ok(f.events.findIndex(([event])=>event==='clear')<f.events.findIndex(([event])=>event==='owner'));
  assert.equal(f.events.find(([event])=>event==='owner')[1].user.id,user.id);
});

test('signed out does not call private authorization or mount callback',async () => {
  const f=setup({ auth: { getUser:async()=>({data:{user:null},error:null}) } });
  await f.controller.start();
  assert.equal(f.controller.getState().status,'signed-out');
  assert.equal(f.calls.length,0);
  assert.equal(f.events.filter(([event])=>event==='owner').length,0);
});

test('signed-in nonowner is denied regardless of email or user metadata', async () => {
  const f=setup({ rpc:async()=>({data:false,error:null}) });
  await f.controller.start();
  assert.equal(f.controller.getState().status,'unauthorized');
  assert.equal(f.events.filter(([event])=>event==='owner').length,0);
});

test('truthy malformed RPC data cannot authorize',async () => {
  const f=setup({ rpc:async()=>({data:'true',error:null}) });
  await f.controller.start();
  assert.equal(f.controller.getState().status,'unauthorized');
});

test('server auth errors fail closed and do not expose provider error details',async () => {
  const f=setup({ auth:{getUser:async()=>({data:{user},error:new Error('secret fixture token')})} });
  await f.controller.start();
  assert.notEqual(f.controller.getState().status,'owner');
  assert.ok(!JSON.stringify(f.events).includes('secret fixture token'));
});

test('owner RPC outage fails closed',async () => {
  const f=setup({rpc:async()=>{throw Error('private response')}});
  await f.controller.start();
  assert.equal(f.controller.getState().status,'error');
  assert.ok(!JSON.stringify(f.events).includes('private response'));
});

test('Google OAuth uses fixed same-origin redirect and minimal scopes',async () => {
  const f=setup();
  await f.controller.signInWithGoogle();
  assert.deepEqual(f.calls[0],{provider:'google',options:{redirectTo:'https://orbit.example.invalid/',scopes:'openid email profile'}});
  assert.equal(f.controller.getState().status,'signing-in');
});

test('rejects external or insecure configured redirect origins',()=> {
  for(const redirectUrl of ['https://evil.example.invalid/','javascript:alert(1)','http://orbit.example.invalid/','https://orbit.example.invalid/#token']) {
    assert.throws(()=>new AuthController({client:setup().client,currentOrigin:'https://orbit.example.invalid',redirectUrl}));
  }
});

test('OAuth failure is visible and preserves the private gate',async () => {
  const f=setup({auth:{signInWithOAuth:async()=>({error:Error('secret token')})}});
  assert.equal(await f.controller.signInWithGoogle(),false);
  assert.equal(f.controller.getState().status,'error');
  assert.ok(!JSON.stringify(f.events).includes('secret token'));
});

test('logout clears DOM and cancels writes before the network settles',async () => {
  const request=deferred(),f=setup({auth:{signOut:()=>request.promise}});
  await f.controller.start();
  f.events.length=0;
  const operation=f.controller.signOut();
  assert.deepEqual(f.events.slice(0,2).map(([event])=>event),['clear','cancel']);
  assert.equal(f.controller.getState().status,'signed-out');
  request.resolve({error:null});
  assert.equal(await operation,true);
});

test('failed network logout still clears private view and reports failure',async () => {
  const f=setup({auth:{signOut:async()=>{throw Error('private token')}}});
  await f.controller.start();
  assert.equal(await f.controller.signOut(),false);
  assert.equal(f.controller.getState().status,'signed-out');
  assert.equal(f.controller.getState().code,'SIGN_OUT_FAILED');
});

test('sign-out event invalidates pending verification before it can mount',async () => {
  const request=deferred(),f=setup({rpc:()=>request.promise});
  const start=f.controller.start();
  await pause();
  f.emit('SIGNED_OUT',null);
  request.resolve({data:true,error:null});
  await start;
  assert.equal(f.events.filter(([event])=>event==='owner').length,0);
  assert.equal(f.controller.getState().status,'signed-out');
});

test('same-owner token refresh does not discard drafts or remount',async () => {
  const f=setup();
  await f.controller.start();
  f.events.length=0;
  f.emit('TOKEN_REFRESHED',{user});
  await pause();
  assert.equal(f.controller.getState().status,'owner');
  assert.equal(f.events.filter(([event])=>['clear','cancel','owner'].includes(event)).length,0);
});

test('refresh revocation clears private view and pending owner callback context',async () => {
  const f=setup();
  await f.controller.start();
  const context=f.events.find(([event])=>event==='owner')[1];
  f.client.rpc=async()=>({data:false,error:null});
  f.emit('TOKEN_REFRESHED',{user});
  await pause();
  assert.equal(f.controller.getState().status,'unauthorized');
  assert.equal(context.isCurrent(),false);
});

test('an expired session immediately clears existing owner DOM',async () => {
  const f=setup(); await f.controller.start(); f.events.length=0;
  f.emit('SIGNED_OUT',null);
  assert.equal(f.controller.getState().status,'expired');
  assert.deepEqual(f.events.slice(0,2).map(([event])=>event),['clear','cancel']);
});

test('account switch does not keep previous owner UI during verification',async () => {
  const request=deferred(),f=setup(); await f.controller.start(); f.events.length=0;
  f.client.auth.getUser=()=>request.promise;
  f.emit('SIGNED_IN',{user:{id:'other-fixture'}});
  assert.equal(f.events[0][0],'clear');
  request.resolve({data:{user:{id:'other-fixture'}},error:null});
  f.client.rpc=async()=>({data:false,error:null});
  await pause();
  assert.equal(f.controller.getState().status,'unauthorized');
});

test('dispose unsubscribes and stale owner hydration cannot become current',async () => {
  const f=setup(); await f.controller.start();
  const context=f.events.find(([event])=>event==='owner')[1];
  f.controller.dispose();
  assert.ok(f.calls.includes('unsubscribe'));
  assert.equal(context.isCurrent(),false);
  assert.equal(f.controller.getState().status,'disposed');
  assert.equal(await f.controller.signInWithGoogle(),false);
});

test('owner hydration failure clears mounted state and remains recoverable',async () => {
  const f=setup({owner:async()=>{throw Error('journal content fixture')}});
  await f.controller.start();
  assert.equal(f.controller.getState().status,'error');
  assert.ok(!JSON.stringify(f.controller.getState()).includes('journal content fixture'));
});

test('start is idempotent and does not remount an existing owner',async () => {
  const f=setup(); await f.controller.start();
  f.events.length=0;
  await f.controller.start();
  assert.equal(f.events.filter(([event])=>['clear','cancel','owner'].includes(event)).length,0);
});

test('a late sign-in event during logout cannot remount private data',async () => {
  const request=deferred(),f=setup({auth:{signOut:()=>request.promise}});
  await f.controller.start(); f.events.length=0;
  const logout=f.controller.signOut();
  f.emit('SIGNED_IN',{user});
  await pause();
  assert.equal(f.controller.getState().status,'signed-out');
  assert.equal(f.events.filter(([event])=>event==='owner').length,0);
  request.resolve({error:null}); await logout;
});

test('cleanup failure still cancels writes and cannot authorize mounting',async () => {
  const f=setup();
  f.controller.clearPrivate=()=>{throw Error('cleanup fixture')};
  await f.controller.start();
  assert.equal(f.controller.getState().status,'error');
  assert.equal(f.controller.getState().code,'PRIVATE_CLEANUP_FAILED');
  assert.ok(f.events.some(([event])=>event==='cancel'));
  assert.equal(f.events.filter(([event])=>event==='owner').length,0);
});

test('requires a real injected auth client and permits local HTTP callback development',()=> {
  assert.throws(()=>new AuthController({client:{},redirectUrl:'https://orbit.example.invalid/',currentOrigin:'https://orbit.example.invalid'}));
  assert.doesNotThrow(()=>new AuthController({client:setup().client,redirectUrl:'http://127.0.0.1:4173/',currentOrigin:'http://127.0.0.1:4173'}));
});

test('SDK RPC error result is fail-closed like an exception',async () => {
  const f=setup({rpc:async()=>({data:true,error:Error('secret response')})});
  await f.controller.start();
  assert.equal(f.controller.getState().status,'error');
  assert.equal(f.controller.getState().code,'OWNER_CHECK_UNAVAILABLE');
});

test('missing SDK session error is a normal signed-out state',async () => {
  const f=setup({auth:{getUser:async()=>({data:{user:null},error:{name:'AuthSessionMissingError'}})}});
  await f.controller.start();
  assert.equal(f.controller.getState().status,'signed-out');
});

test('OAuth exception stays generic; disposal stops all new auth work',async () => {
  const f=setup({auth:{signInWithOAuth:async()=>{throw Error('secret OAuth response')}}});
  assert.equal(await f.controller.signInWithGoogle(),false);
  assert.equal(f.controller.getState().code,'SIGN_IN_FAILED');
  f.controller.dispose(); f.controller.dispose();
  assert.equal((await f.controller.start()).status,'disposed');
  assert.equal((await f.controller.refresh()).status,'disposed');
  assert.equal(await f.controller.signOut(),false);
});

test('initial-session hints do not bypass the server verification currently in flight',async () => {
  const request=deferred(),f=setup({auth:{getUser:()=>request.promise}});
  const start=f.controller.start();
  f.emit('INITIAL_SESSION',{user});
  assert.equal(f.controller.getState().status,'restoring');
  assert.equal(f.events.filter(([event])=>event==='owner').length,0);
  request.resolve({data:{user:null},error:null}); await start;
  assert.equal(f.controller.getState().status,'signed-out');
});

test('session verification finishing after disposal cannot publish an owner',async () => {
  const request=deferred(),f=setup({auth:{getUser:()=>request.promise}});
  const start=f.controller.start(); f.controller.dispose();
  request.resolve({data:{user},error:null}); await start;
  assert.equal(f.controller.getState().status,'disposed');
  assert.equal(f.events.filter(([event])=>event==='owner').length,0);
});

test('silent owner revalidation does not invalidate the active hydration lifetime',async () => {
  const f=setup(); await f.controller.start();
  const context=f.events.find(([event])=>event==='owner')[1];
  await f.controller.refresh();
  assert.equal(context.isCurrent(),true);
});

test('auth callback does not await SDK calls under the listener lock',async () => {
  const f=setup(); await f.controller.start();
  let inListener=true;
  f.client.auth.getUser=async()=>{assert.equal(inListener,false);return {data:{user},error:null}};
  assert.equal(f.emit('TOKEN_REFRESHED',{user}),undefined);
  inListener=false;
  await pause();
  assert.equal(f.controller.getState().status,'owner');
});

test('email OTP requests existing users only and never authorizes on delivery',async()=>{
  const f=setup({auth:{signInWithOtp:async options=>{f.calls.push(options);return {error:null};}}});
  assert.equal(await f.controller.requestEmailOtp(' owner@example.invalid '),true);
  assert.deepEqual(f.calls[0],{email:'owner@example.invalid',options:{shouldCreateUser:false}});
  assert.equal(f.events.some(([event])=>event==='owner'),false);
  assert.equal(f.controller.getOtpState().hasChallenge,true);
  assert.equal(await f.controller.requestEmailOtp('owner@example.invalid'),false);
  assert.equal(JSON.stringify(f.controller.getOtpState()).includes('owner@example.invalid'),false);
});

test('OTP verification uses email type then getUser and the UUID owner RPC',async()=>{
  const f=setup({auth:{signInWithOtp:async()=>({error:null}),verifyOtp:async args=>{f.calls.push(args);return {error:null};}}});
  await f.controller.requestEmailOtp('owner@example.invalid');
  assert.equal(await f.controller.verifyEmailOtp('123456'),true);
  assert.deepEqual(f.calls[0],{email:'owner@example.invalid',token:'123456',type:'email'});
  assert.equal(f.controller.getState().status,'owner');
  assert.ok(f.calls.includes('orbit_owner_access'));
});

test('verified email without allowlisted UUID cannot mount private data',async()=>{
  const f=setup({rpc:async()=>({data:false,error:null}),auth:{signInWithOtp:async()=>({error:null}),verifyOtp:async()=>({error:null})}});
  await f.controller.requestEmailOtp('owner@example.invalid');await f.controller.verifyEmailOtp('123456');
  assert.equal(f.controller.getState().status,'unauthorized');
  assert.equal(f.events.some(([event])=>event==='owner'),false);
});

for(const [error,code] of [[{code:'otp_expired'},'INVALID_CODE'],[{status:429},'RATE_LIMITED'],[{status:0},'UNAVAILABLE']]){
  test(`OTP verification handles ${code} without leaking provider errors`,async()=>{
    const f=setup({auth:{signInWithOtp:async()=>({error:null}),verifyOtp:async()=>({error:{...error,message:'sensitive token'}})}});
    await f.controller.requestEmailOtp('owner@example.invalid');assert.equal(await f.controller.verifyEmailOtp('123456'),false);
    assert.equal(f.controller.getOtpState().code,code);assert.equal(JSON.stringify(f.controller.getOtpState()).includes('sensitive'),false);
    assert.equal(f.events.some(([event])=>event==='owner'),false);
  });
}

for(const error of [{code:'email_address_not_authorized'},{code:'email_provider_disabled'},new TypeError('private mail'),{status:429}]){
  test(`OTP delivery failure stays closed (${error.code||error.status||error.name})`,async()=>{
    const f=setup({auth:{signInWithOtp:async()=>({error})}});
    assert.equal(await f.controller.requestEmailOtp('owner@example.invalid'),false);
    assert.equal(f.controller.getOtpState().hasChallenge,false);
    assert.equal(f.events.some(([event])=>event==='owner'),false);
  });
}

test('OTP rejects malformed input and duplicate submissions without extra SDK calls',async()=>{
  const pending=deferred();let requests=0;
  const f=setup({auth:{signInWithOtp:()=>{requests++;return pending.promise;},verifyOtp:async()=>{throw Error('must not run');}}});
  assert.equal(await f.controller.requestEmailOtp('not an email'),false);
  const sending=f.controller.requestEmailOtp('owner@example.invalid');
  assert.equal(await f.controller.requestEmailOtp('owner@example.invalid'),false);
  pending.resolve({error:null});await sending;
  assert.equal(await f.controller.verifyEmailOtp('12x456'),false);assert.equal(requests,1);
});

test('OTP verification completing after logout cannot restore owner via SDK event or result',async()=>{
  const pending=deferred();const f=setup({auth:{signInWithOtp:async()=>({error:null}),verifyOtp:()=>pending.promise}});
  await f.controller.start();await f.controller.signOut();f.events.length=0;
  await f.controller.requestEmailOtp('owner@example.invalid');const verifying=f.controller.verifyEmailOtp('123456');
  await f.controller.signOut();f.emit('SIGNED_IN',{user});pending.resolve({error:null});await verifying;await pause();
  assert.equal(f.controller.getState().status,'signed-out');assert.equal(f.events.some(([event])=>event==='owner'),false);
});

test('OTP resend works after cooldown without enabling signup',async()=>{
  let count=0;const f=setup({auth:{signInWithOtp:async options=>{count++;assert.equal(options.options.shouldCreateUser,false);return {error:null};}}});
  await f.controller.requestEmailOtp('owner@example.invalid');f.controller.resendAt=Date.now()-1;
  assert.equal(await f.controller.requestEmailOtp('owner@example.invalid'),true);assert.equal(count,2);
});

test('duplicate verification and verification after disposal never call the SDK twice',async()=>{
  const request=deferred();let calls=0;const f=setup({auth:{signInWithOtp:async()=>({error:null}),verifyOtp:()=>{calls++;return request.promise;}}});
  await f.controller.requestEmailOtp('owner@example.invalid');const pending=f.controller.verifyEmailOtp('123456');
  assert.equal(await f.controller.verifyEmailOtp('123456'),false);f.controller.dispose();request.resolve({error:null});
  assert.equal(await pending,false);assert.equal(await f.controller.requestEmailOtp('owner@example.invalid'),false);
  assert.equal(await f.controller.verifyEmailOtp('123456'),false);assert.equal(calls,1);
  assert.equal(f.events.some(([event])=>event==='owner'),false);
});

test('pending delivery after logout cannot restore the challenge',async()=>{
  const request=deferred();const f=setup({auth:{signInWithOtp:()=>request.promise}});
  const pending=f.controller.requestEmailOtp('owner@example.invalid');await f.controller.signOut();request.resolve({error:null});await pending;
  assert.equal(f.controller.getOtpState().hasChallenge,false);assert.equal(f.controller.getOtpState().status,'idle');
});

test('password login verifies getUser and the UUID RPC; credentials never enter state',async()=>{
  let args;const f=setup({auth:{signInWithPassword:async value=>{args=value;return {error:null};}}});
  assert.equal(await f.controller.signInWithPassword(' owner@example.invalid ','synthetic-password'),true);
  assert.deepEqual(args,{email:'owner@example.invalid',password:'synthetic-password'});
  assert.ok(f.calls.includes('orbit_owner_access'));assert.equal(f.controller.getState().status,'owner');
  assert.equal(JSON.stringify(f.controller.getState()).includes('synthetic-password'),false);
});
test('password success never authorizes a nonowner',async()=>{
  const f=setup({rpc:async()=>({data:false,error:null}),auth:{signInWithPassword:async()=>({error:null})}});
  assert.equal(await f.controller.signInWithPassword('other@example.invalid','synthetic-password'),false);
  assert.equal(f.controller.getState().status,'unauthorized');assert.equal(f.events.some(([e])=>e==='owner'),false);
});
for(const error of [{code:'invalid_credentials'},{status:429},new TypeError('credential payload')])test(`password failures remain generic: ${error.code||error.status||error.name}`,async()=>{
  const f=setup({auth:{signInWithPassword:async()=>{throw error;}}});
  assert.equal(await f.controller.signInWithPassword('owner@example.invalid','synthetic-password'),false);
  assert.equal(f.controller.getState().status,'signed-out');
  assert.equal(JSON.stringify(f.controller.getState()).includes('credential payload'),false);
  assert.equal(f.events.some(([e])=>e==='owner'),false);
});
test('password request blocks duplicates/OTP/Google and cannot remount after logout',async()=>{
  const pending=deferred();let calls=0;const f=setup({auth:{signInWithPassword:()=>{calls++;return pending.promise;}}});
  await f.controller.start();await f.controller.signOut();f.events.length=0;
  const login=f.controller.signInWithPassword('owner@example.invalid','synthetic-password');
  assert.equal(await f.controller.signInWithPassword('owner@example.invalid','synthetic-password'),false);
  assert.equal(await f.controller.requestEmailOtp('owner@example.invalid'),false);
  assert.equal(await f.controller.signInWithGoogle(),false);
  await f.controller.signOut();f.emit('SIGNED_IN',{user});pending.resolve({error:null});await login;await pause();
  assert.equal(calls,1);assert.equal(f.events.some(([e])=>e==='owner'),false);assert.equal(f.controller.getState().status,'signed-out');
});
test('password validation and disposal reject SDK work',async()=>{
  let calls=0;const f=setup({auth:{signInWithPassword:async()=>{calls++;return {error:null};}}});
  assert.equal(await f.controller.signInWithPassword('bad','x'),false);
  assert.equal(await f.controller.signInWithPassword('owner@example.invalid',''),false);
  f.controller.dispose();assert.equal(await f.controller.signInWithPassword('owner@example.invalid','x'),false);assert.equal(calls,0);
});
