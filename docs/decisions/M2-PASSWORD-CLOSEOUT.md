# M2 no-domain password acceptance

3 November 2026 (Asia/Jakarta). Temporary Email + Password sign-in is the default visible entry for protected M2 acceptance. Email OTP remains in an optional disclosure, with an explicit email-delivery prerequisite. Google OAuth remains implemented without a visible button. This is a minimal M2 patch, not M2.5 or M3.

## Verified identity and administrator boundary

A read-only inspection of the existing development project `ixfgavgtwuzdgucjriec` found one confirmed email Auth identity with a password already set. The owner verified that exact UID against the intended mailbox in Authentication → Users and explicitly confirmed it in this chat. No password, password hash, email address or tokens were retrieved. Owner configuration was NULL and public reads false. The patch does not create a hosted user, change a password, assign an owner, enable signup, migrate a schema, or change public reads. User confirmation is separate from the server email-confirmed flag and separate from granting UUID ownership.

Use the confirmed UID from Authentication → Users for the administrator steps below. It is deliberately not embedded in frontend code or selected automatically by user count, email, provider or registration order.

## Exact manual Supabase actions

1. Open **orbit-development → Authentication → Users**, select the existing confirmed user, and recheck its email and **User UID**. Do not click Add user. A password already exists; use the one you set when creating this user if you still know it.
2. If a new password is needed, generate a unique strong password (at least 16 random characters) privately in a password manager. If the existing-user panel exposes a direct **Edit user / Password** action, set it there. Do not confuse **Send password recovery / Reset password email** with a direct edit: those actions need working email delivery and are not the acceptance path. If only email recovery is available, use the server-only Admin API procedure below. No browser admin key or app password-reset flow is added.
3. Under **Authentication → Sign In / Providers → Email**, keep Email enabled and public signup disabled. Password sign-in does not need an editable Magic Link template or SMTP. Do not enable custom SMTP with empty settings just to unlock template editing.
4. Open **SQL Editor → New query** as the project administrator. Only after the verified identity confirmation above, replace every `OWNER_UUID` placeholder with that exact confirmed UID and review this explicit assignment transaction:

   ```sql
   begin;
   do $owner_assignment$
   declare chosen_user uuid := 'OWNER_UUID'::uuid;
   begin
     if not exists(select 1 from auth.users u
                   where u.id=chosen_user and u.email_confirmed_at is not null
                     and exists(select 1 from auth.identities i
                                where i.user_id=u.id and i.provider='email')) then
       raise exception 'Verified confirmed email identity required';
     end if;
     update private.orbit_configuration set owner_id=chosen_user
       where singleton and owner_id is null and public_read_enabled=false;
     if not found then
       raise exception 'Owner already configured or public reads enabled: stop and review';
     end if;
   end;
   $owner_assignment$;
   select owner_id, public_read_enabled from private.orbit_configuration;
   commit;
   ```

   Expect the intended UID and `public_read_enabled=false`. The transaction refuses an existing owner or an enabled public-read gate. This is an administrator assignment to a verified UUID, not a schema migration or an automatic first-user rule. The agent has not executed it.
5. Open the latest protected preview linked in PR #2, pass Vercel authentication, enter the existing email and password, and click **Sign in with password**. Before UUID assignment the same valid password must show unauthorized with no private view. After assignment, sign in again to hydrate the owner space. Verify reload, journal/task/layout persistence, two-session synchronization and logout. Leave public reads disabled and protection enabled.

## Server-only password update if Dashboard lacks a direct edit

Use the already pinned Supabase SDK from a trusted administrator machine or isolated server process. Supply the project-specific secret/service-role key and new password through your private secret manager as ephemeral environment variables; never paste them into chat, repository files, terminal command arguments, browser code, Vercel frontend variables or logs. Do not use the public publishable key for Admin API calls. Do not commit an `.env` file. Clear the temporary environment/session after use.

Run this code only after supplying `ORBIT_ADMIN_KEY`, `ORBIT_OWNER_UUID` (the identity verified above) and `ORBIT_NEW_PASSWORD` securely. No secret literals belong in this snippet:

```js
import { createClient } from '@supabase/supabase-js';
const admin = createClient('https://ixfgavgtwuzdgucjriec.supabase.co',
  process.env.ORBIT_ADMIN_KEY,
  {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const uid = process.env.ORBIT_OWNER_UUID;
const password = process.env.ORBIT_NEW_PASSWORD;
if (!uid || !password || password.length < 16) throw Error('Administrator inputs required');
const lookup = await admin.auth.admin.getUserById(uid);
if (lookup.error || !lookup.data?.user?.email_confirmed_at ||
    !lookup.data.user.identities?.some(identity => identity.provider === 'email')) {
  throw Error('Confirmed existing email identity required');
}
const result = await admin.auth.admin.updateUserById(uid, {password});
if (result.error) throw Error('Password update failed; inspect privately in the administrator console');
// Do not print the request, response, user object, key or password.
```

This updates the existing Auth UUID directly without an email-reset round trip. It creates no user and grants no owner permissions. The password setter is not run by this patch. After an administrator resets a password, revoke other sessions through supported Auth session controls as appropriate; a password change alone is not proof that previously issued JWTs are invalidated immediately.

Official references: [password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [Admin updateUserById](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid).

## Implementation/security scope

Only the existing client invokes `auth.signInWithPassword({email,password})`. Success goes through `getUser()`, the true-only owner UUID RPC and the existing hydration lifetime guard. Shared pending-operation guards block competing OTP/Google/password submissions and suppress SDK events from stale password completions; logout/disposal cancels the operation and clears a late SDK session. The password input is cleared at submission and on lifecycle cleanup. Passwords are not added to controller state, storage, logs, callbacks or diagnostics; only the SDK request and transient function stack receive them. Existing SDK session handling is unchanged. No signup, password-reset email or new dependency is introduced.

Generic failures avoid distinguishing missing account, wrong password or provider-only identities. Rate limits and network failures are handled without raw provider messages. Native email/password labels, current-password autocomplete, busy/disabled controls and live status feedback preserve accessibility. The six spatial widgets and application interactions are unchanged.

## Acceptance distinction

Local mocked password UI tests and real local GoTrue/PostgREST password tests are separate evidence from hosted acceptance. Email OTP inbox delivery remains untested and blocked by the current no-domain/template/SMTP situation. The observed Supabase Dashboard requires custom SMTP before editing the Magic Link/OTP template; the previous instruction to use built-in delivery and edit that template is superseded. Do not report Email OTP delivery as passing because password authentication works.

Remaining M2 gates: the administrator UUID assignment above, a real owner password login and hosted persistence/two-session/mobile acceptance, and an actual incognito Vercel protection challenge. The managed executor's network policy blocks direct preview/Supabase browser traffic; authenticated connector module fetches are not a replacement. M2.5 remains Motion Polish, M3 the separately authorized ORBIT 1.0.0 release.

## Executed verification

`npm ci` PASS; `npm run check` PASS (138 Node tests, syntax, immutable V6/M1 provenance, reviewed M2 inventory, build, structure); `python tests/qa_m1.py` PASS existing five viewport/core/security/date regressions; `python tests/qa_m2.py` PASS 24/24 including password success/failure/rate handling, nonowner denial and retained OTP flows; `python tests/integration/run_http.py` PASS real local GoTrue password sign-in through the new UI, getUser/owner RPC, all-entity persistence, JWT/RLS isolation, two-browser-session journal sync and logout. The disposable database had stopped during environment suspension; restarting that existing local container resolved the initial harness startup failure. No hosted user was created or changed. Logs: `/workspace/orbit-password-{install,check,auth,m1,m2,http}.log`. No agents or new dependencies were used. Hosted password acceptance remains manual; hosted OTP delivery remains untested.
