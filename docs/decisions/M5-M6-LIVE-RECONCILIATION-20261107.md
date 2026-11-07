# ORBIT M0–M6 continuation — live release-gate reconciliation

**Observed:** 7 November 2026 (Asia/Jakarta). **Scope:** read-only live audit, documentation, and the approved Git integration of M2.5. No owner workspace content, Auth user, RLS policy, DNS, public access, or Production deployment was changed.

## Canonical milestone mapping

The original roadmap remains **M0 → M1 → M2 → M2.5 → M3 → M4 → M5 → M6**. M2.5 is an inserted Motion Polish milestone; issue/branch names are workstreams, not a renumbering of the original roadmap. Original M3 feature integration was substantially delivered during expanded M2; original M4/M5 are being closed out during the workstream named “M3: 1.0.0 release readiness” (Issue #2). **Do not mark original M6 complete until a protected Production launch and recovery evidence exist.**

| Original stage | Disposition at this checkpoint | Qualification |
| --- | --- | --- |
| M0 source baseline | Complete | Original V6 manifest retained |
| M1 frontend stabilization | Complete | Physical hardware coverage excluded |
| M2 Auth/database foundation | Conditionally accepted | Real owner-protected cloud workflow; known test limitations |
| M2.5 motion P0/P1 | Integrated into main | PR #1 merged with reviewed head after CI PASS; P2 deferred |
| M3 full feature/backend integration | Functional behavior delivered during expanded M2 | Cloud workflow accepted, not a blanket end-to-end security certification |
| M4 security/quality/performance | Substantial verified evidence; not unconditionally closed | Real hosted HTTP nonowner writes and physical-device evidence missing |
| M5 GitHub/Vercel readiness | Preview/CI and Production configuration verified; release sequencing in progress | Protected Production browser validation still pending |
| M6 protected Production launch | **NO-GO / not published** | Auth redirects, private owner backup, hosted HTTP authorization, real artifact and postlaunch smoke remain |

## Live Git and deployment integration

- Repository `DoorBlox/orbit`, private; PR #1 `codex/m25-motion-polish` was merged into `main` after the exact `9b54974eaef630bba90450d85be5779bea3e8b03` M2.5 GitHub Actions run `42199466081` succeeded. Merge commit: `0b800e9e955ac4e6a962ff60d6942598f95a0f1c`.
- PR #3 `codex/m3-release-readiness` was retargeted from the M2.5 branch to `main` after that merge. Before the new evidence commit, its reviewed head was `301e72a27b1daab7903819cd84a8ae88fb68dba2`; GitHub PR and push quality runs `42230218935` and `42230210411` passed for that head. **Any newer head requires its own CI result; do not reuse prior-SHA PASS as current-SHA PASS.**
- Vercel project `prj_FZH5dyyZvUXfVmTz04HBCMbIrQk5` has a READY protected Preview deployment `dpl_Fd8whrELFJoo4wdpRX5xnXKE1vzY` for the preceding M3 SHA, **not Production**. Original repository `vercel.json` keeps `git.deploymentEnabled=false`. No Production deployment for the **orbit** project was verified. An older Production record for the separate `orbit-personal-dev` project is **not** an ORBIT 1.0.0 rollback candidate.

## Independently verified shared target and database security

- Supabase project `ixfgavgtwuzdgucjriec` was reported ACTIVE_HEALTHY. The exact Production-scoped Vercel URL `https://ixfgavgtwuzdgucjriec.supabase.co` and site `https://orbit.starscene.com/` matched the owner-reviewed source target. Vercel's configured publishable key matched the Supabase project's active `sb_publishable_` key; its **value was not recorded**. Both `orbit.starscene.com` and `orbit.allintime.space` were verified project domains; the intended Production origin remains `orbit.starscene.com`. Vercel Authentication was enabled for **all** deployment types.
- Migration history includes `20261106142540 orbit_private_table_least_privilege`.
- Fresh direct, read-only SQL checked seven private workspace tables: `profiles`, `branches`, `tasks`, `journal_entries`, `milestones`, `widget_layouts`, `preferences`. All seven have RLS enabled; `authenticated` retains SELECT/INSERT/UPDATE/DELETE and has **no** effective TRUNCATE, TRIGGER or table/column REFERENCES privilege. Configuration retains exactly one configured owner row, and `public_read_enabled=false`. All seven nonowner row counts were zero.
- `public.orbit_owner_access()`, `public.load_owner_snapshot()`, and `public.save_owner_snapshot(jsonb,bigint)` remain security invoker, executable to `authenticated` but **not** `anon`.
- Earlier live database-role simulation passed 7 INSERT, 7 UPDATE, 7 DELETE denials, with independent zero-row cleanup postflight. **It did not issue requests carrying a real nonowner HTTP bearer token.** Never claim these are 21/21 transport-level tests.

## Remaining gates in risk order

1. **Auth control-plane:** Confirm Supabase Auth Site URL is exactly `https://orbit.starscene.com/`, with this exact path explicitly allowlisted as a redirect. Preserve approved Preview URLs, signup/provider restrictions and existing user identities. The connected Supabase tools do not expose these Auth settings, so this check remains **UNVERIFIED**. Password sign-in alone is not adequate evidence.
2. **Real transport authorization:** With the *existing* temporary nonowner session, execute the separately reviewed 7×POST/PATCH/DELETE HTTP plan using ONLY approved synthetic fixtures, administrator baseline and exact-key cleanup. No owner content or snapshot writes; no test account deletion. The previous database-role simulation is valuable but not equivalent.
3. **Owner-controlled backup:** In a verified owner browser session, export the current complete V6-compatible JSON. It is unencrypted; store it offline in owner-controlled encrypted storage and privately record hash/time/revision. Preserve unsaved drafts. Do **not** put the export in GitHub, ChatGPT, logs, CI, or the test artifacts. No real-cloud restore test.
4. **Protected production artifact:** At the final reviewed commit and live Production environment, build and run `npm run verify:release`; inspect delivered HTTPS/CSP/security headers and verify protected anonymous denial and authenticated owner login/read/limited safe workflow. Do not promote a Preview built with different env config. Identify/record an acceptable rollback deployment before claiming recoverability; none has been established for this Production project.
5. **Coverage acceptance:** Physical Safari, Android, and 120Hz hardware; OTP/Google/provider-outage variants remain explicitly unverified and require risk acceptance or separate targeted QA.

## Additional nonblocking security advisory

Supabase Security Advisor warned that leaked-password protection is disabled. Review availability and user-facing tradeoffs; do not silently change Auth provider settings. The informational `private.orbit_configuration` RLS-with-no-policy finding concerns an intentionally private admin-only table and must not be “fixed” by granting public access.

## Decision

**ORBIT 1.0.0 Production stays NO-GO.** M2.5 is safely integrated, M3 release checks remain reviewable, and core cloud privilege/configuration checks are now independently verified. No merge of PR #3, Production deployment, Auth alteration, live fixture write, owner content export, or destructive rollback is claimed by this document. Reassess against the exact new PR head after any further commit.

Primary records: `docs/14-CODEX-IMPLEMENTATION-ROADMAP.md`, `docs/decisions/M3-LAUNCH-RUNBOOK.md`, `docs/decisions/M3-HOSTED-WRITE-VALIDATION.md`, `supabase/verification/m3_private_grants_read_only.sql`, GitHub PR #1/#3 and issue #2/#4.
