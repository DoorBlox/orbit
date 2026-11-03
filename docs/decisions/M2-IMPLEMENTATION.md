# M2 implementation and remaining acceptance gates

Execution record: 2 November 2026 (Asia/Jakarta). PR #2, `codex/m2-protected-cloud`; M1 base `846ad7d`, recovery checkpoint `b57c444`. M2.5 is Motion Polish; M3 is the official ORBIT 1.0.0 release. M2 remains incomplete until hosted Google/owner and deployed browser acceptance pass.

## No-domain password acceptance follow-up

Temporary password login now permits M2 acceptance without sending email. The existing confirmed identity was read-only verified and explicitly confirmed by the owner; no hosted user/password/owner configuration was changed by this patch. [Exact setup and current blockers](M2-PASSWORD-CLOSEOUT.md). OTP and Google are retained; OTP delivery is untested.

## Historical Email OTP follow-up

The visible default is now existing-user Email OTP; Google implementation remains available but hidden. No schema, RLS, owner UUID, public-read or production resource changes. [Exact Supabase setup and acceptance](M2-EMAIL-OTP.md) supersedes the Google-only manual steps below for current acceptance.

## Implemented and verified

Vanilla V6 spatial interactions remain. Added Google PKCE entry, verified-user session lifecycle, server UUID allowlist, private owner snapshot repository, serialized revision-checked saves, polling across sessions, conflict/export/retry/offline feedback, logout cleanup and an unload warning for unsaved drafts. Cloud mode never reads legacy local data automatically. Local imports require explicit review and upload/replacement confirmation. Supported task/branch/milestone/journal publication copies only reviewed title, excerpt and date into a separate six-column representation; all new sources remain private. Development builds prohibit public release.

Fixed journal typing/logout/refresh races, stale acknowledgement feedback, reentrant sync draft loss, disposed import callbacks, deferred branch cycles, publication/delete races and stale title consent. Real PostgREST 14 testing revealed retries of business `40001` exceptions; an additive third migration uses `PT409` and the client maps HTTP conflicts correctly. Applied migration files remain immutable.

The cloud controls initially overlapped mobile navigation/capture. A measured dock now reserves space and a cloud-only camera pan keeps 320px capture reachable without changing graph scale or saved widget positions. Original V6 and M1 manifests/Git blobs remain immutable; intentional M2 sources have their own reviewed inventory. Only the pinned Supabase SDK boundary uses esbuild; application modules remain native ESM.

## Actual verification

- `npm ci`: PASS, locked 11 packages.
- `npm run check`: PASS, syntax, 116 Node tests, V6/M1 provenance, M2 inventory, build and 42-path structure checks. Syntax checking is not ESLint/type checking.
- `npm run build`: PASS, including local and configured preview artifact tests. Privileged keys, incomplete config and public-release configuration rejected.
- `python tests/qa_m2.py`: PASS 21/21, actual localhost origin at 1440/900/390/320 widths, keyboard and pointer reachability, gates, consent, cleanup and journal races. This suite mocks the SDK transport.
- `python tests/qa_m1.py`: PASS five viewports, core flows, recovery/security, preferences/date and density cases. Updated only async bootstrap readiness waits.
- `python tests/db/run_local.py`: PASS all three migrations, 147 pgTAP assertions and three real concurrent-session cases. PostgreSQL 15.14 with an Auth claim adapter; not a full Supabase stack.
- `python tests/integration/run_http.py`: PASS real GoTrue 2.197.0/PostgREST 14.18, two Auth-created identities and JWTs, seven populated private-table denials, forged owner rejection, every snapshot entity, deterministic HTTP409, two-session conflicts, public projection/unpublish, actual browser restore/save/reload/journal synchronization/logout. Disposable services/database/role/network cleaned up. This does not test external Google OIDC.
- HTTP delivery and offline Chromium smoke: PASS. Security source review found no remaining concrete P1 in reviewed contracts; hosted advisors reported only INFO for deliberately policy-free/admin-only private configuration.
- Final diff whitespace review: PASS. No secrets or real personal data uploaded.

Full local logs: `/workspace/orbit-m2-check-final.log`, `/workspace/orbit-m2-unit-final.log`, `/workspace/orbit-m2-db-tests-pt409.log`, `/workspace/orbit-m2-http-final.log`. Browser logs `/tmp/orbit-m2-browser-final-green.log`, `/tmp/orbit-m2-m1-final-green.log` and synthetic artifacts under ignored `qa/`. Reproduction instructions are in `tests/db/README.md` and `tests/integration/README.md`.

## Cloud state and limitations

Supabase development project `ixfgavgtwuzdgucjriec` was created under explicit $0-only approval. All three migrations are applied. A hosted function-definition query confirms PT409 is installed; owner remains unconfigured and public reads remain off. RLS is enabled on all 11 public/private tables. Hosted anonymous public query returned zero rows; authenticated stranger saw zero private tasks. These SQL-role probes are not hosted Auth/Data API acceptance. There are zero hosted Auth users; owner UUID remains NULL and public reads false. Only an enabled modern publishable key was configured for Vercel preview.

Vercel project `prj_FZH5dyyZvUXfVmTz04HBCMbIrQk5`, team `team_xHRnXQbjaIEx2rNZ94p5QBao`: Node22, root `.`, npm ci/build, dist; all-deployments SSO protection enabled before any deployment. Automatic Git deployments remain disabled. Vercel's Git connection cannot see the private hlarknnt repository, so reviewed allowlisted source files were uploaded through the connector.

Final protected staging deployment `dpl_BAYdPQiSfsXTHUirCPNwbknBsJ6f` is READY at https://orbit-personal-aolx1wei9-doorbloxs-projects.vercel.app (source commit `4499a0a`). Build-generated configuration matches this exact origin and keeps publicRelease:false. Authenticated connector checks returned200 for index, bootstrap, configured runtime module and bundled SDK. Executor network policy blocks *.vercel.app and the Supabase host; its proxy403 is not evidence of Vercel incognito denial. Actual deployed browser/mobile/OAuth and anonymous protection-challenge checks remain blocked.

The first connector call omitted `target` and unexpectedly defaulted to production (`dpl_89ozqhgtoJL6FRVSanpZ8gKNknZW`). All-deployments SSO protection remained enabled, production had no cloud config or personal data, and no public release was made. Cancellation was refused after READY. A subsequent explicit staging deployment corrected the target; deletion of the unintended protected production deployment requires the Vercel dashboard because this connector lacks a deletion operation.

## Required owner actions

1. Configure Google provider credentials directly in [Supabase Auth](https://supabase.com/dashboard/project/ixfgavgtwuzdgucjriec/auth/providers), never in chat/repository. Google callback: `https://ixfgavgtwuzdgucjriec.supabase.co/auth/v1/callback`.
2. Add `https://orbit-personal-aolx1wei9-doorbloxs-projects.vercel.app` and its `/` callback to Supabase Auth Site URL/redirect settings and Google authorized origins. Sign in once, then confirm the resulting Supabase Auth UUID for administrative owner allowlisting. No email matching or first-login ownership is permitted. Public reads remain disabled.
3. Permit the exact preview/Supabase hosts in this cloud environment's supported network configuration, or perform hosted mobile/sign-in/persistence and incognito-challenge checks yourself. Do not disable protection for tests.
4. Remove unintended protected production deployment `dpl_89ozqhgtoJL6FRVSanpZ8gKNknZW` in Vercel. Optionally grant the Vercel GitHub App access to hlarknnt/orbit-personal for future protected previews.
5. Review PR #2; do not merge until the remaining hosted acceptance gates pass. Approve public release only at M3.

## Reused specialists and skills

Reused existing accessibility/Auth, data-integrity/repository/sync, timeline/SQL, security, regression and build specialists; no duplicate agents. Final recovery resumed only SQL, HTTP integration and browser specialists for specific failing checks. Evidence is attributed above rather than replacing local tests with cloud claims.

Applied installed ECC search-first, blueprint, agentic-engineering, frontend/backend patterns, coding standards, Postgres patterns, database migrations, security review, TDD, E2E, deployment patterns and verification loop during their relevant stages, plus Supabase/Vercel/cloud-runtime guidance. Design review preserved V6 and limited changes to diagnosed control occlusion; no framework redesign. Graphify's earlier main index informed existing architecture; new cloud modules were reviewed in source and executable tests, not assumed indexed.

Rollback: revert the PR code to M1/local mode without deleting local backups or hosted data; keep protection/public-read gate closed. Migrations are additive; do not destructively reset a hosted database.
