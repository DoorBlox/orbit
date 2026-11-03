# Authentication lifecycle gate

`AuthController` receives an already configured Supabase client. The bootstrap owns
DOM mounting and the cloud repository; this module never reads the local V6 diary,
hydrates demo records, stores provider tokens, or decides ownership using an email
or a public client-side owner UUID.

The visible default for no-domain M2 acceptance is **Email + Password** via `signInWithPassword(email,password)`; see [password close-out](../../docs/decisions/M2-PASSWORD-CLOSEOUT.md). Retained Email OTP for existing users only is optional, using `requestEmailOtp(email)` and `verifyEmailOtp(token)`. See [administrator setup and acceptance](../../docs/decisions/M2-EMAIL-OTP.md). Google OAuth remains available through `signInWithGoogle()` without a visible button. The supplied client retains PKCE, `detectSessionInUrl: true`
and the project's exact configured redirect. The controller requests only
`openid email profile` scopes and rejects a redirect on a different current origin,
credentials in URLs, query/fragment redirects, and non-HTTPS production URLs.
HTTP is accepted for loopback development only. Configuration remains a deployment
gate; unit fixtures do not demonstrate a completed live Google sign-in.

```js
const controller = new AuthController({
  client,
  redirectUrl: configuration.siteUrl,
  currentOrigin: location.origin,
  onState(state) { renderGateStatus(state); },
  clearPrivate() { hideAndDisposePrivateApp(); },
  cancelPendingWrites() { disposeRepository(); },
  async onOwner({ user, isCurrent }) {
    const snapshot = await loadCloudSnapshot(user.id);
    if (!isCurrent()) return;
    mountPrivateApp(snapshot);
  },
});
await controller.start();
```

`getUser()` contacts Auth to validate the user; an SDK session object alone cannot
open the gate. Then `orbit_owner_access()` must return the boolean `true`. That RPC
must use `auth.uid()` and a server-maintained allowlist; its SQL authorization and
all private-table RLS remain the actual data-security boundary.

`start()` subscribes once and restores the user, `refresh()` explicitly rechecks
authorization, `signInWithGoogle()` starts the OAuth redirect, `signOut()` clears
private state immediately before SDK local-session logout, and `dispose()` cancels
the lifecycle/subscription. No method clears unrelated local backup/recovery data.
The bootstrap must provide draft export/confirmation before a user chooses logout;
an expired/revoked session must still close the private view immediately.

States are `idle`, `restoring`, `signing-in`, `signed-out`, `owner`, `unauthorized`,
`expired`, `error` and `disposed`. State callbacks expose only `{status, user: {id}
| null, code}`. Codes are generic; raw Auth errors, JWTs and private payloads never
enter state/error messages. A failed network logout reports `SIGN_OUT_FAILED`
while keeping the private view closed. The SDK's logout does not guarantee that an
already-issued bearer JWT is revoked before its server expiry.

Same-owner token refresh revalidates Auth/RPC without remounting or discarding
drafts. Account changes clear immediately. Generation and owner-lifetime guards
prevent pending verification/hydration from mounting after logout, expiry, account
switch or disposal. The root must check `isCurrent()` after its own asynchronous
snapshot work. Auth listeners schedule SDK work outside the callback to avoid
re-entering the SDK's authentication lock.

Verification: `node --test --experimental-test-coverage tests/auth.test.mjs` uses
injected SDK fakes to exercise restoration, owner denial, OAuth arguments, expiry,
refresh, logout, cleanup, generic errors and lifecycle races. It is not a live
Google, Supabase RLS or browser persistence test.

OTP callbacks expose generic status/cooldown fields only, never an email, token or raw SDK error. The owner UUID remains administratively configured; successful OTP verification alone grants no owner authority.
