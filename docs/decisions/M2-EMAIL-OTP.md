> Superseded for current acceptance: [temporary password close-out](M2-PASSWORD-CLOSEOUT.md). The observed Dashboard requires custom SMTP to edit this template. Built-in SMTP does not unlock the required Token customization. Email OTP delivery remains untested; do not create another user.

# M2 minimal Email OTP patch

Default sign-in is now Email OTP for existing users only. Google `signInWithGoogle()` and its PKCE implementation remain available in the controller and unit tests, with no visible Google button. No new dependency, migration, Auth user, owner assignment, public-read change, production resource change or signup enablement is part of this patch.

## Supabase setup — administrator only

Open project **orbit-development**, ref **ixfgavgtwuzdgucjriec**. Do not apply these instructions to another project.

1. Open **Authentication → Sign In / Providers → Email** ([providers](https://supabase.com/dashboard/project/ixfgavgtwuzdgucjriec/auth/providers)). Enable the Email provider if disabled, keep email confirmation enabled, and save. In Email settings set OTP expiration to **600 seconds**; use a **six-digit** email OTP length if the dashboard exposes a length setting. Do not enable anonymous sign-in or public signup. Under the user-signup controls, keep **Allow new users to sign up** disabled for this private development project. Dashboard labels can vary; the required state is Email enabled with administrator-provisioned users, not open enrollment.
2. Open **Authentication → Email → Templates → Magic Link** ([templates](https://supabase.com/dashboard/project/ixfgavgtwuzdgucjriec/auth/templates)). Set subject to **Your ORBIT login code**, replace the body with the following, and click **Save changes**:

   ```html
   <h2>Your ORBIT login code</h2>
   <p>Enter this six-digit code in ORBIT:</p>
   <p><strong>{{ .Token }}</strong></p>
   <p>If you did not request this code, ignore this email.</p>
   ```

   Use **Magic Link**, not Invite User or Confirm Signup. Email OTP shares the Magic Link endpoint; `{{ .Token }}` sends the code. `{{ .ConfirmationURL }}` alone sends a link and does not satisfy this UI.
3. Open **Authentication → Email → SMTP Settings** ([SMTP](https://supabase.com/dashboard/project/ixfgavgtwuzdgucjriec/auth/smtp)). For default development SMTP, use an email address already belonging to the project's Supabase organization team. Default SMTP refuses delivery to other addresses and has a low project-wide email limit. Creating an Auth user alone does not authorize its mailbox for default SMTP. For another address, configure your own SMTP service and verified sender here; enter SMTP credentials only in Supabase. Do not grant organization access just to make a mailbox eligible, and do not create paid resources implicitly. Keep server rate limits enabled.
4. Open **Authentication → Users → Add user → Create new user** ([users](https://supabase.com/dashboard/project/ixfgavgtwuzdgucjriec/auth/users)). Enter the intended owner's exact email. If the dialog requires a password, generate a unique random password privately in a password manager; the ORBIT UI does not use it. Select **Auto Confirm User / Auto Confirm Email** when offered and create the user. This is an explicit administrator action for a mailbox you control, not application signup or automatic ownership. Inspect the new user: it must have an **email identity** and a non-null **Email Confirmed At** value. Copy its **User UID**.

   If your dashboard offers only **Send invitation**, send it to that mailbox, complete its invitation/confirmation first, then verify Email Confirmed At is non-null. Merely seeing an invited row or an invitation-sent timestamp is insufficient evidence of enrollment. The invite token belongs to the invitation flow; do not enter it as this UI's `type:'email'` login code. After confirmation request a fresh OTP. If the invitation cannot be completed, an administrator must create/confirm the email identity through Supabase's Dashboard or server-only Auth Admin API (`createUser`, `email_confirm:true`); do not enable public signup or edit `auth.users` directly as a workaround. Never use a service-role key in the browser or this repository.
5. In **SQL Editor → New query**, verify the copied UID before configuring ownership. Replace `OWNER_UUID` below with that exact existing Auth UID; do not use an email, provider identity ID or a new UUID:

   ```sql
   select u.id, u.email_confirmed_at,
     exists(select 1 from auth.identities i
            where i.user_id=u.id and i.provider='email') as has_email_identity
   from auth.users u where u.id='OWNER_UUID'::uuid;
   ```

   Proceed only for the intended administrator-provisioned identity with a confirmed email. Ownership must be an explicit independent administrator decision. Run this transaction as the project administrator, inspect the result, and commit only if the expected UID is present and `public_read_enabled` is false:

   ```sql
   begin;
   do $provision$
   declare chosen_user uuid := 'OWNER_UUID'::uuid;
   begin
     if not exists(select 1 from auth.users u
                   where u.id=chosen_user and u.email_confirmed_at is not null
                     and exists(select 1 from auth.identities i
                                where i.user_id=u.id and i.provider='email')) then
       raise exception 'Confirmed email identity required';
     end if;
     update private.orbit_configuration set owner_id=chosen_user
       where singleton and owner_id is null and public_read_enabled=false;
     if not found then
       raise exception 'Owner already configured or public reads enabled; review before proceeding';
     end if;
   end;
   $provision$;
   select owner_id, public_read_enabled from private.orbit_configuration;
   commit;
   ```

   Review the chosen UID before running this single batch. A failed prerequisite rolls the transaction back. Do not overwrite an existing owner blindly. The email-identity/confirmation checks are provisioning checks only; runtime authorization remains the configured UUID, independent of linked providers. RLS and `orbit_owner_access()` remain unchanged.
6. Review **Authentication → URL Configuration**. Keep the protected preview as the exact Site URL/approved redirect origin. Typed OTP does not navigate through a magic-link callback, but invitation links still need a valid approved destination. Keep Vercel all-deployments protection enabled.

## Hosted acceptance

The protected preview must contain this commit first; the older Google-only preview cannot test this patch. No production deployment or public release is authorized. Open the protected preview with Vercel authentication, enter the provisioned email, click **Send login code**, retrieve the six-digit email, and click **Verify and sign in**. Initial delivery does not grant access. Without the configured owner UID the app must report unauthorized and show no private data. After the administrator configures the correct UUID, sign out and sign in again, then verify task/journal/layout persistence, a second session's synchronization and logout cleanup. An existing second nonowner identity must remain denied; do not change the owner allowlist to test it. Keep public reads disabled.

Also test an invalid/expired code, resend after at least 60 seconds, and an ineligible mailbox. Successful delivery feedback intentionally says “If this address is eligible”; it does not prove a user exists or that SMTP delivered mail. Built-in SMTP rate limits can require a longer wait than the UI cooldown. Never paste OTPs, session tokens, SMTP credentials or passwords into chat, issues or logs.

## Implementation and security

The controller calls exactly `signInWithOtp({email,options:{shouldCreateUser:false}})` and `verifyOtp({email,token,type:'email'})`. Existing `getUser()` verification and true-only owner RPC precede hydration. Challenge email stays in controller memory; OTPs are not stored or logged and the input clears on submission. Public callbacks expose only generic statuses/cooldown timestamps. Pending SDK operations block duplicates, late verification events are suppressed, and cancellation/logout/disposal invalidate challenges. A late verification's internally stored SDK session is signed out before new sign-ins are accepted. Same-owner refresh and existing app hydration/cleanup remain unchanged.

The shell uses native labeled inputs, numeric input mode, one-time-code autocomplete, a 60-second resend countdown, disabled controls during requests, and live generic feedback. Google remains callable only through the existing controller method; re-enabling a visible entry requires provider configuration and a small reviewed UI change, not a feature-flag framework.

## Verification record

Unit tests cover request arguments, no signup, cooldown/resend, invalid/expired codes, mail/provider/network/rate failures, duplicate requests/verifications, owner RPC enforcement, stale logout/disposal results and Google compatibility. Browser tests use a mocked SDK and synthetic addresses/codes; they establish UI/lifecycle wiring, not hosted email delivery. The existing real GoTrue/PostgREST integration uses synthetic password sessions, proving Auth/JWT/RLS/session regressions but not the email transport. Actual hosted Email provider/template/SMTP configuration and inbox delivery require the administrator actions above and are not claimed as PASS.

References: [Supabase passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [default/custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Auth Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser). No hosted users, templates, allowlist or provider settings were changed by this patch.

Executed checks for this patch (2 November 2026): `npm ci` PASS; `npm run check` PASS (131 Node tests, original V6/M1 provenance, reviewed M2 inventory, build, structure); `python tests/qa_m1.py` PASS all five viewport/core/security/recovery/date cases; `python tests/qa_m2.py` PASS 23/23; `python tests/db/run_local.py` PASS 147 assertions and three concurrent-session checks; `python tests/integration/run_http.py` PASS existing real local GoTrue/PostgREST/SDK/browser tests. Logs are `/workspace/orbit-otp-{install,check,auth,m1,m2,db,http}.log`. No new agents were used. Targeted ECC security-review and verification-loop principles plus Supabase/cloud-runtime guidance were applied. Hosted mailbox/template acceptance is NOT RUN.
