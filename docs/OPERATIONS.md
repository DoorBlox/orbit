# ORBIT production operations and recovery

## 9 Nov 2026 — 2.2 Google-first creative beta (SOURCE ONLY)

PR #24 (collapsible branches, browser-local view state) is merged at `bc910fbc`. New branch `feat/2.2-google-oauth-notes-20261109` adds **Continue with Google** UI, labeled task URLs, floating sticky notes with text/color/drag/resize, journal AND sticky drawings through the same native `.excalidraw` import/export bridge, plus private image attachments. The editor is an interoperable native pen editor, **not full embedded Excalidraw React**. Both source migrations (`20261109015000_orbit_private_extensions`, `20261109020000_orbit_private_media`) remain **UNAPPLIED** to hosted Supabase; no hosted Google Auth provider, Production domain, or protection changed. Current Production is still `fc5af5a` at `dpl_9rgHVEreGqspHtNY27WnPyMduFik`, Vercel Authentication on all deployments. Source feature branch not yet CI-reviewed/deployed. See [owner setup + rollout](OAUTH_2_2_ROLLOUT.md). Owner must configure Google OAuth credentials directly in Google/Supabase (never chat), verify offline backup and A/B tenant/media isolation before hosted migration or Production switch. JSON backups include image paths, NOT image file bytes. Batch code/doc changes before a single protected PR run; no repetitive Actions.

## 9 Nov 2026 update — latest application source and protected Preview

PR #21 and PR #23 are merged to `main`; their exact-head four-check CI runs passed. The protected Vercel Preview `dpl_Bri19261zEWUzRGoEkx6EfAwDkwr` is READY from source `11421a861b5023d5305c1802b8993bca221dacdd`. This is still not the Production site. Production remains `dpl_9rgHVEreGqspHtNY27WnPyMduFik` from `fc5af5a`, and Vercel Authentication remains enabled for all deployments.

The current 2.1 branch work removes the LOCAL PROTOTYPE header caption without changing the WIB clock and adds collapsible branch navigation. Its view state is stored locally per account/browser and included in manual backups; it is not a server-synced preference. Do not claim cross-device persistence until a future approved schema/API change.

## 8 Nov 2026 update — separate live application and new tenant schema

The **live application** remains Vercel's owner-only 1.0.0 build `fc5af5a` on `dpl_9rgHVEreGqspHtNY27WnPyMduFik`. SSO protection is still enabled for **all** deployments, and both custom domains still route to that build. Do not infer that `main` or the new tenant SQL is deployed client code.

The **hosted database schema** was intentionally advanced to ORBIT 2.0: migration `20261108161935 orbit_tenant_private_workspaces` succeeded. Immediate read-only pre/post checks showed 28 tasks, 23 branches, 1 journal, 1 profile, 6 widget layouts, 1 preferences, 1 workspace revision and zero published items unchanged; original owner retained. The seven private tables now have `orbit_tenant_authenticated` restrictive policies, replacing `orbit_single_owner`; `orbit_workspace_access` exists. This does **not** certify hosted A/B/C bearer isolation, email delivery, public signup readiness or disaster recovery.

GitHub branch protection [Protect main](https://github.com/DoorBlox/orbit/rules/26803051) is Active, requiring PRs and the four existing CI checks. Source 2.0 Auth was merged with [PR #14](https://github.com/DoorBlox/orbit/pull/14) and [PR #15](https://github.com/DoorBlox/orbit/pull/15); the fixed bottom dock/Space control move merged via [PR #18](https://github.com/DoorBlox/orbit/pull/18). Do not remove Vercel Authentication or promote new source until the exact-origin hosted acceptance and backup gates are cleared.


> **Current operational record — 8 November 2026 (Asia/Jakarta).** This is the operational source of truth for ORBIT 1.0.0. Historic pre-launch runbooks are preserved under [decisions](decisions/README.md) but their old "Production NO-GO" statements describe a past checkpoint. Recheck provider state before acting.

## Live service inventory

| Component | Recorded state |
| --- | --- |
| Canonical app | [https://orbit.starscene.com/](https://orbit.starscene.com/) — active Production alias, owner reports successful sign-in and fully working private workspace |
| Secondary custom domain | [https://orbit.allintime.space/](https://orbit.allintime.space/) — Vercel redirect to canonical; owner confirmed browser redirect |
| Vercel project | `orbit`, project `prj_FZH5dyyZvUXfVmTz04HBCMbIrQk5`, team `team_xHRnXQbjaIEx2rNZ94p5QBao` |
| Serving release | READY Production deployment `dpl_9rgHVEreGqspHtNY27WnPyMduFik`, artifact source `fc5af5a8cd2c99d1e104615e72c3cd2b460f60d6` |
| Source repository | [DoorBlox/orbit](https://github.com/DoorBlox/orbit), public, MIT; `main` is **newer than serving artifact** because documentation and workflow commits were subsequently merged |
| Supabase | `ixfgavgtwuzdgucjriec` (`https://ixfgavgtwuzdgucjriec.supabase.co`), ACTIVE_HEALTHY at 8 Nov check |
| Deployment protection | Vercel Authentication `enabled=true`, `deploymentType=all` as read from project; **do not turn off** |
| Application auth | Exact canonical-origin Supabase Auth gate and server-side owner UUID/RLS; password sign-in is the confirmed supported path |
| Public content | Public-read switch disabled; published-content table empty at last controlled SQL postflight |
| Offline recovery | Owner reports a saved complete JSON export; file contents, checksums, encryption at rest and restore were **not** independently verified |
| Older rollback candidate | Prior deployment `dpl_89ozqhgtoJL6FRVSanpZ8gKNknZW` (`orbit-personal-dev`); previously served both domains. **Not certified functionally identical or currently known-good.** |

**Control-plane distinction:** Vercel project metadata has sometimes returned `live=false` even while a verified Production alias served a READY deployment. Trust current alias/deployment records **plus actual HTTP/owner smoke evidence**, not `live` alone.

## Domains, routing and sign-in

`orbit.starscene.com` directly serves the 1.0.0 artifact. `orbit.allintime.space` redirects to that **canonical hostname** instead of serving an independent sign-in origin. This is intentional: `src/auth/controller.js` rejects a `redirectUrl` whose origin differs from the current page origin. The exact production URL `https://orbit.starscene.com/` was owner-confirmed as added to Supabase Auth's redirect allowlist. Do not widen OAuth allowlists or weaken strict-origin checks for convenience.

At last control-plane verification, both custom domains were verified on the same Vercel project. The primary alias had `redirect=null`, and the secondary alias had `redirect=orbit.starscene.com`; both resolved to `dpl_9rgHVEreGqspHtNY27WnPyMduFik`. The owner also directly confirmed that visiting the secondary domain reached the canonical hostname.

Do not confuse **public source code** with public scrapbook contents: the deployed app is gated by Vercel Authentication, the client must pass Supabase Auth and the owner RPC, and private tables have owner-only RLS. Open-sourcing the repository does not open the data.

## Safe everyday operation

- Use the canonical URL for normal use. Sign in using the owner account; do not post private journal text, screenshots of personal data, backup JSON, OTPs, cookies, or tokens in GitHub issues or chats.
- Use **Export backup** after meaningful changes, before risky testing or major releases, and store the JSON securely in owner-controlled encrypted storage. The export file itself is **not encrypted** by ORBIT. Unsaved journal drafts are not automatically protected by a backup.
- A full JSON restore/import is **destructive replacement** of the current cloud snapshot and requires an explicit owner review and consent. Never test restore against Production casually.
- Supabase and Vercel share free-tier usage limits; no paid Supabase branch is required for ordinary verification. Locally disposable Docker/Supabase stacks and public-repository CI are the preferred route.
- Review login anomalies, CI errors and Vercel access protection periodically. No always-on monitoring or automatic backup job is claimed to exist.

## Verification before a future change

1. Read [CODEX_HANDOFF.md](../CODEX_HANDOFF.md), [AGENTS.md](../AGENTS.md), the actual relevant code, and this document. Confirm the specific repository branch and Git SHA.
2. Confirm the current deployment ID, `target=production`, READY, SHA, aliases, and Vercel Authentication. Check both domain mappings separately.
3. Recheck the approved production site/API origin and public publishable-key **identity without printing its contents**. Never include Supabase service-role or secret keys in browser output.
4. Run syntax/unit/source-integrity/structure checks on Node 22 with `npm ci --ignore-scripts && npm run check`. Run focused Python Playwright regressions for impacted frontend behavior.
5. For RLS/Auth changes, test against a disposable **local** Supabase environment: `supabase start`, `supabase test db`, and `tests/integration/local_http_rls.mjs` using the exact CI setup in [.github/workflows/local-supabase-rls.yml](../.github/workflows/local-supabase-rls.yml). Do **not** repoint that local-only test at the hosted service.
6. Prefer a protected Preview for changes. Compare against the original V6 provenance manifests; never rewrite them simply to make CI pass.
7. Production code changes require an **explicit new release decision**. A passing Preview or `main` CI is not permission to reassign aliases.

### CI evidence that supports 1.0.0

- [Hosted owner / nonowner release tracker](https://github.com/DoorBlox/orbit/issues/2): owner-attested canonical sign-in, redirected secondary domain, hosted nonowner READ/INSERT results and control-plane postflights.
- [Local SQL + bearer HTTP RLS run](https://github.com/DoorBlox/orbit/actions/runs/42326076564): 205 pgTAP assertions, seven local nonowner visibility checks and 14 PATCH + 14 DELETE denied with unchanged synthetic fixtures; **not hosted HTTP PATCH/DELETE**.
- [Production artifact dry run](https://github.com/DoorBlox/orbit/actions/runs/42333016219): source-scoped guarded build, synthetic publishable key.
- [Production staging workflow](https://github.com/DoorBlox/orbit/actions/runs/42334141388): reviewed source SHA `fc5af5a`, Production-scoped build/artifact verifier, `--prebuilt --prod --skip-domain`; completed SUCCESS before alias assignment.
- [Unauthenticated host-check run](https://github.com/DoorBlox/orbit/actions/runs/42334961954): both hosts returned 302 to Vercel Authentication **before** canonical alias promotion. Not a post-auth CSP audit.
- [Post-merge quality run](https://github.com/DoorBlox/orbit/actions/runs/42336158353): SUCCESS at `42448c4`. Newly authored documentation must be checked at its *own* commit before calling it verified.

## Future production releases — careful two-stage process

1. Work on a PR and obtain exact-head CI PASS. Verify and document the next intended **application source SHA** (which may differ from `main` due to documentation-only merges).
2. Take a fresh private offline backup; verify Vercel protection, Supabase private reads, Auth origin, and existing aliases. Capture current serving deployment IDs.
3. Review the manual workflow [.github/workflows/m6-stage-only-production.yml](../.github/workflows/m6-stage-only-production.yml). **It currently pins the old reviewed source SHA `fc5af5a`**. For a new code release, update that pin via a reviewed PR—never assume workflow dispatch deploys latest `main`.
4. Stage the exact source using a controlled Vercel Production build followed by `vercel deploy --prebuilt --prod --skip-domain`. This must not assign either custom domain yet.
5. Check READY status, deployment identity, configuration, Vercel Authentication and anonymous protection. ORBIT's strict canonical-origin validation means sign-in on the staged `*.vercel.app` URL is **not** a valid substitute for canonical owner sign-in.
6. With explicit owner authorization, assign **only the intended custom-domain aliases** to that exact deployment. For any alternative hostname, use a redirect to `orbit.starscene.com`, not a second independently authenticated origin.
7. Immediately verify both domain mappings, protection, canonical sign-in and private workspace. Inspect available errors/headers; document what was actually observed. Roll back the affected aliases if something critical fails.

**Do not run project-wide rollback indiscriminately** when aliases have distinct routing semantics. Alias-specific rollback is more precise. The original `orbit-personal-dev` deployment is a historical target, not an independently certified recovery environment. Rolling back code/aliases never restores deleted Supabase data; only an owner-approved backup/restore can do that.

The GitHub repository has an owner-provided `VERCEL_TOKEN` Actions secret for manually staged deployment. **Never read or echo it.** Revoke/rotate a short-lived Vercel token and remove its GitHub secret when no longer needed; recreate it only for authorized releases.

## Open checks and explicit limitations

These items **do not negate the owner-confirmed working Production release**, but they must not be mislabeled as passed:

- Hosted real-nonowner bearer **PATCH/DELETE** fixture tests were not executed; only the isolated local Auth+HTTP coverage and hosted READ/INSERT checks are corroborated.
- Post-Vercel-Authentication **application response headers/CSP** have not been independently inspected on the canonical Production origin (the anonymous redirect response has no app CSP).
- Physical iPhone Safari, Android Chrome, assistive-technology and 120 Hz hardware acceptance not fully documented.
- Google OAuth, Email OTP delivery and provider-outage recovery are not certified; **password owner sign-in** is the tested path.
- Owner backup existence is attested, but independent encrypted storage, hash, restore fidelity and RPO/RTO are not certified.
- Supabase leaked-password protection has a Pro-tier warning; do not require the owner to purchase it. Maintain a strong unique password, restricted sign-ups and defense in depth.
- `main` was reported **not branch-protected**; adding a public-repository branch ruleset with required CI checks, restricted force pushes and deleted-branch protection is a useful free hardening step.

## Emergency routing recovery (no data change)

If canonical Production becomes unusable, verify the failure before acting and obtain the owner's approval to switch back. Reassign `orbit.starscene.com` to a verified suitable previous READY deployment (historical candidate: `dpl_89ozqhgtoJL6FRVSanpZ8gKNknZW`), then verify. Keep `orbit.allintime.space` redirecting to the canonical hostname unless the owner specifically approves changing that redirect. Check Vercel Authentication after rollback. If the old deployment is not demonstrably viable, stop rather than blindly sending traffic to it.

Source-of-truth records: [1.0.0 release note](releases/1.0.0.md), [milestone history](PROJECT_HISTORY.md), [M6 issue #2](https://github.com/DoorBlox/orbit/issues/2), and [the historical prelaunch runbook](decisions/M6-PRODUCTION-STAGING-NO-COST-20261107.md).
