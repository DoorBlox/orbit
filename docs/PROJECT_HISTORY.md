# ORBIT implementation history and evidence ledger

## 9 Nov 2026 — 2.2.1 private media CSP and sticky duplication (SOURCE ONLY)

- Branch `fix/2.2-private-images-sticky-duplicate-20261109` is a **not-yet-merged/released** patch based on Production-closeout `main` `da5f9d3`. Current LIVE Production remains `de2523d` on `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4`; canonical `orbit.starscene.com` is the public Google sign-in shell, with all raw deployments and Previews Vercel-auth protected. **No new hosted SQL, secrets, Auth configuration or Production alias edits.**
- Fix for [image issue #26](https://github.com/DoorBlox/orbit/issues/26): `vercel.json` CSP adds only the exact Supabase origin to `img-src`, matching existing allowed `connect-src`. Keep the Storage bucket PRIVATE and user-scoped. `scripts/production-guard.mjs` and regression tests require the exact source, reject wildcards and other hosts. Production image rendering remains unverified until a fresh approved deployment and user browser check.
- Small feature: **Duplicate sticky note** copies note text/color/validated drawing and private image **reference** to an independent card offset by 48 world units; edits are independent, 80-note cap and read-only checks remain. Never duplicate or delete actual Storage objects just to copy a note. Note action bar wraps on narrow cards.
- TDD branch tests: `tests/stickies.test.mjs` for copy, isolation, cap, bounds; existing synthetic Playwright `tests/qa_m1.py` verifies editing copy and reload; production CSP release fixture and strict-target regression cases updated. Current M2 source hashes updated **only** for `src/stickies.js` and `src/styles.css`. Do **not** revise immutable V6/M1 manifest.
- Cost discipline: one batched pull request after source/tests/docs; rely on protected exact-head four checks, no manual Actions dispatch. If they pass, merge then stage a new protected Preview; **do not automatically replace the live custom Production alias without an explicit release decision**. Keep issue #26 open until actual image rendering verified.


## 9 Nov 2026 — ORBIT 2.2 beta LIVE on Production (latest source of truth)

- **Serving Production:** canonical `https://orbit.starscene.com/` now maps to Vercel READY Production deployment `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4`, exact reviewed source `de2523dcea497c7ee41547ca94c14f48c72688f1` (merged [PR #25](https://github.com/DoorBlox/orbit/pull/25), all four exact-head checks passed). Server-side production build completed with Supabase cloud config; unauthenticated GET returns HTTP 200 and no private journal text. The name `2.2 beta` describes the app feature release; package.json's legacy version value has not yet been revised.
- **Protection and domains:** Vercel Authentication changed from `deploymentType=all` to `prod_deployment_urls_and_all_previews`; **custom Production domain is public only for the Supabase Auth sign-in shell**, Preview and raw deployment URLs remain Vercel-protected. Secondary `orbit.allintime.space` remains a redirect to `orbit.starscene.com`. Vercel automatic custom-domain assignment was disabled during staging; custom canonical alias was reassigned explicitly, not automatically.
- **Rollback checkpoint:** prior READY owner-only 1.0.0 deployment `dpl_9rgHVEreGqspHtNY27WnPyMduFik`, source `fc5af5a8cd2c99d1e104615e72c3cd2b460f60d6`. If an Auth or privacy failure is detected, first restore Vercel SSO `deploymentType=all`, then reassign canonical `orbit.starscene.com` to that old deployment; verify secondary redirect and owner content. Do not overwrite/restore database without a separate instruction.
- **Supabase:** owner-approved hosted migrations `orbit_private_extensions` and `orbit_private_media` were applied; Google Auth verified on two distinct controlled accounts; first account retains 23 branches, 29 tasks and one journal. Second account started empty. Authenticated-role hosted DB tests validated private extensions and per-user Storage SELECT/INSERT isolation; temporary test fixtures were rolled back. One live second-account beta workspace now has test notes/images (three Storage objects observed).
- **Known beta defect:** [#26](https://github.com/DoorBlox/orbit/issues/26) — attached note and journal image references persist but images **do not render**. Production's exact CSP has `img-src 'self' data:`, blocking signed image URLs from `https://ixfgavgtwuzdgucjriec.supabase.co`. Keep the Storage bucket private; fix via a narrowly reviewed CSP allowlist patch and matching production-guard/tests. The owner explicitly accepted launch with this known bug. Drawings in both journals and notes persist and display; scene editor is a lightweight pen and `.excalidraw` file interchange, **not** full embedded Excalidraw.
- **Operational follow-up:** source of truth for release is this current checkpoint; older sections below are historical even where they say "not deployed". Track remaining beta gates and issue #26; verify live user sign-in and media display after its patch. Respect budget: batch future changes, avoid repeated Actions/workflow dispatch.


## 9 Nov 2026 — 2.2 Google-first creative beta (SOURCE ONLY)

PR #24 (collapsible branches, browser-local view state) is merged at `bc910fbc`. New branch `feat/2.2-google-oauth-notes-20261109` adds **Continue with Google** UI, labeled task URLs, floating sticky notes with text/color/drag/resize, journal AND sticky drawings through the same native `.excalidraw` import/export bridge, plus private image attachments. The editor is an interoperable native pen editor, **not full embedded Excalidraw React**. Both source migrations (`20261109015000_orbit_private_extensions`, `20261109020000_orbit_private_media`) remain **UNAPPLIED** to hosted Supabase; no hosted Google Auth provider, Production domain, or protection changed. Current Production is still `fc5af5a` at `dpl_9rgHVEreGqspHtNY27WnPyMduFik`, Vercel Authentication on all deployments. Source feature branch not yet CI-reviewed/deployed. See [owner setup + rollout](OAUTH_2_2_ROLLOUT.md). Owner must configure Google OAuth credentials directly in Google/Supabase (never chat), verify offline backup and A/B tenant/media isolation before hosted migration or Production switch. JSON backups include image paths, NOT image file bytes. Batch code/doc changes before a single protected PR run; no repetitive Actions.

## 9 Nov 2026 extension after the original M6 release

- [PR #21](https://github.com/DoorBlox/orbit/pull/21) — preserves personalized Space names through full JSON backup/restore and local reload; four exact-head checks passed.
- [PR #23](https://github.com/DoorBlox/orbit/pull/23) — universal import for task CSV, branch CSV, journal JSON and full backups; selective exports; branch CSV hierarchy validation; four exact-head checks passed.
- Protected Vercel Preview `dpl_Bri19261zEWUzRGoEkx6EfAwDkwr` built source `11421a8` and reached READY; Production aliases were not changed.
- Current branch work removes the LOCAL PROTOTYPE caption without changing the WIB clock and adds branch collapse/expand. This view preference is per-account/browser and exported in manual backups, not cloud-synced.

## 8 Nov 2026 extension after the original M6 release

- [PR #12](https://github.com/DoorBlox/orbit/pull/12) — 1.1 foundation source: generic user center, safe branch removal with undo, dated journals and fullscreen fitting.
- [PR #13](https://github.com/DoorBlox/orbit/pull/13) — dependency-ordered 2.x blueprint covering accounts, controls, Excalidraw, private assets, sticky notes, notifications, MCP and integrations.
- [PR #14](https://github.com/DoorBlox/orbit/pull/14), stacked [#15](https://github.com/DoorBlox/orbit/pull/15) — 2.0 tenant-isolated database and Supabase Auth signup source; the merged implementation passed all four CI checks.
- Hosted Supabase migration `20261108161935 orbit_tenant_private_workspaces` applied successfully; exact original owner's data row counts unchanged in immediate before/after read-only checks.
- GitHub [Protect main](https://github.com/DoorBlox/orbit/rules/26803051) branch ruleset became active; [issue #17](https://github.com/DoorBlox/orbit/issues/17) closed.
- [PR #18](https://github.com/DoorBlox/orbit/pull/18) — cloud controls moved to the movable Space widget, removing the signed-in bottom dock. Exact-head CI passed.
- **Not a 2.0 Production release:** the owner-confirmed live Vercel application is still source `fc5af5a`, with Vercel Authentication on all deployments. Public multi-user login and hosted browser isolation have not yet been accepted.


> **Consolidated 8 November 2026.** This ledger explains *how* ORBIT progressed from V6 to a working owner-only Production release. Earlier per-milestone docs remain in `docs/decisions/` as dated evidence; they may correctly say "not released" **at their historical checkpoint**. For what is live now, use [OPERATIONS.md](OPERATIONS.md).

## Product and design invariants

ORBIT is a single-owner **spatial scrapbook**, not a tabbed/dashboard productivity app. Preserve one pan/zoom coordinate plane and six glass-like, independently draggable/resizable windows: **Constellation**, **Continuum/timeline**, **Things to do**, **Already done**, **Your space** and **Journal**. Keep the arbitrary-depth radial task branches, task urgency/deadline cues, milestones, dated paper-like diary with timeline markers, background ambience, touch and reduced-motion behavior, and spatial navigator. Original V6 source evidence is retained in `docs/reference/V6_SOURCE_MANIFEST.json`; M1/M2 reviewed manifests are separately maintained. Do not rebaseline immutable original manifests.

The default user experience is native HTML, CSS and JavaScript modules with a small esbuild boundary only for the pinned Supabase SDK. No React/Next.js rewrite was undertaken.

## Milestone map — preserve original names

| Stage | Main outcome and qualification |
| --- | --- |
| **M0** | Original V6 source, contracts and integrity baselined; visual identity retained |
| **M1** | Frontend recovery, actual-origin browser QA, accessibility/civil-date/backup hardening; [implementation record](decisions/M1-IMPLEMENTATION.md) |
| **M2** | Supabase password owner Auth, UUID allowlist + restrictive RLS, owner snapshots, revision conflict handling, signed-out cleanup and backups; conditional private acceptance and [close-out](decisions/M2-HOSTED-CLOSEOUT.md) |
| **M2.5** | Motion polish: interruption, elapsed-time elasticity, reduced-motion, pinch-to-pan; [results](decisions/M2_5-IMPLEMENTATION.md) |
| **M3** | Cloud integration and release-security work expanded across earlier milestones. Source-level Production guards, least-privilege privileges, SQL migration and hosted verification; [security audit](decisions/M3-SECURITY-AUDIT.md) |
| **M4** | Security/recovery/performance testing, local and real hosted HTTP isolation with explicit scope. No blanket independent penetration-test certificate |
| **M5** | Public MIT repository by owner decision, GitHub CI, protected Vercel Preview, controlled release configuration |
| **M6** | Production-environment build staged without domains, 1.0.0 canonical alias switched on owner approval, owner sign-in confirmed, secondary domain redirected and owner-confirmed |

These are outcomes, not a claim that every originally planned optional feature or physical-device test is fully complete. Historical issue/branch labels like "M3 release readiness" are **not** a renumbering of M0–M6.

## Key integration/change history

| Date | Evidence | What happened |
| --- | --- | --- |
| 1–6 Nov 2026 | [M1](decisions/M1-IMPLEMENTATION.md), [M2](decisions/M2-HOSTED-CLOSEOUT.md) | V6 preservation, private Auth and cloud persistence, backup/recovery and browser acceptance |
| 6–7 Nov | [PR #1](https://github.com/DoorBlox/orbit/pull/1) | M2.5 motion changes integrated; no redesign of six-window world |
| 7 Nov | [PR #3](https://github.com/DoorBlox/orbit/pull/3), [main CI](https://github.com/DoorBlox/orbit/actions/runs/42321550113) | 1.0.0 release guards, recovery UX, reviewed SQL least privilege and security preparation merged |
| 7 Nov | [M6 issue #2](https://github.com/DoorBlox/orbit/issues/2) | Owner-confirmed offline JSON export, Supabase exact Production redirect, protected owner Preview sign-in; actual hosted nonowner HTTP HEAD seven zero-row and POST seven 403/42501; gateway logs + zero-row SQL independently corroborated |
| 7 Nov | [PR #5](https://github.com/DoorBlox/orbit/pull/5), [CI](https://github.com/DoorBlox/orbit/actions/runs/42324183053) | Guarded Production-target artifact dry-run with synthetic publishable key and retained hash-only report |
| 7 Nov | [PR #6](https://github.com/DoorBlox/orbit/pull/6) | Repository deliberately public; MIT License (copyright 2026 DoorBlox) and public-source/privacy explanation |
| 7 Nov | [PR #7](https://github.com/DoorBlox/orbit/pull/7), [local RLS CI](https://github.com/DoorBlox/orbit/actions/runs/42326076564) | Free disposable Supabase: **205 pgTAP**, local bearer HTTP **7 read**, **14 PATCH**, **14 DELETE** checks; synthetic fixtures unchanged, zero hosted requests |
| 7 Nov | [PR #8](https://github.com/DoorBlox/orbit/pull/8) | No-cost guarded Production staging and rollback plan, initially NO-GO until live release verified |
| 7 Nov | [PR #9](https://github.com/DoorBlox/orbit/pull/9), [staging CI](https://github.com/DoorBlox/orbit/actions/runs/42334141388) | Manual `VERCEL_TOKEN` staging with fixed tested source, real Production config, `--prebuilt --prod --skip-domain`; READY deployment `dpl_9rgHVEreGqspHtNY27WnPyMduFik` |
| 7 Nov | [PR #10](https://github.com/DoorBlox/orbit/pull/10), [anonymous HTTP CI](https://github.com/DoorBlox/orbit/actions/runs/42334961954) | Pre-switch staged and canonical origin each returned HTTP 302 to Vercel Authentication from an unauthenticated runner |
| 7 Nov | [issue #2 final release record](https://github.com/DoorBlox/orbit/issues/2) | Explicit owner approval: `orbit.starscene.com` reassigned to staged deployment, Vercel Authentication maintained; owner confirmed actual canonical sign-in/workspace |
| 7 Nov | [issue #2 domain update](https://github.com/DoorBlox/orbit/issues/2) | Owner approved consolidating domains: `orbit.allintime.space` redirects to `orbit.starscene.com`; owner independently confirmed browser redirect |

## Deployment identity — distinguish source from repository head

1. **Serving app code**: `fc5af5a8cd2c99d1e104615e72c3cd2b460f60d6`. This is the reviewed and owner-tested source used to build Production, not a bug or stale release.
2. **Serving Vercel deployment**: `dpl_9rgHVEreGqspHtNY27WnPyMduFik`, READY, `target=production`.
3. **Repository head before this documentation PR**: `42448c41d2e87f408d5f424c3ff7a60b5311b583`. Subsequent PRs added CI/documentation; they **did not redeploy app code**. After this docs PR, the head will advance again; always re-read it.
4. **Domain routing**: canonical Production alias and secondary redirect point to the same target deployment. Vercel Authentication applies to all deployments; Supabase private owner tables remain RLS-guarded.
5. **Original legacy site**: `dpl_89ozqhgtoJL6FRVSanpZ8gKNknZW`, no custom-domain aliases after consolidation; history retained, not an automatic known-good restore.

## Security/test evidence — correct interpretation

- Hosted Auth owner login and private workspace: **owner-observed** in Preview at tested source and after canonical Production alias switch.
- Hosted nonowner direct API: seven count-zero HEAD requests and seven INSERT rejections `403 / 42501`. Read-only Supabase gateway aggregation and postflight corroborated HTTP responses and unchanged nonowner counts.
- Actual nonowner PATCH/DELETE: **14 + 14 authenticated HTTP cases in isolated local Docker Supabase**, not the hosted environment; local fixtures and snapshots unchanged. The 205 pgTAP assertions provide additional SQL-level policy evidence.
- Vercel hosted anonymous access: before primary alias promotion, staged and old canonical host HTTP GET both returned **302 redirects to Vercel Authentication**. The Vercel all-deploy protection setting remained enabled after both alias changes. **Not an independent post-switch HTTP header/CSP proof.**
- Source/build checks: pinned SDK and esbuild, exact Production site/API allowlist, immutable source manifests, static distribution file/hash verification, fake-key offline CI and real-key configured stage.
- Backup: offline JSON saved **by owner attestation**; private contents and restore were never sent to CI or Git.
- Out-of-scope: independent full penetration test, hosted nonowner PATCH/DELETE fixture test, authenticated Production CSP/header capture, Google OAuth/OTP delivery, full physical-device coverage and backup-restore drill.

## Follow-up priorities

1. Protect public repo `main` with a free ruleset requiring relevant CI checks, disable force push and branch deletion (owner-admin controls). Check exact workflow job names before adding rules.
2. Capture real post-auth canonical security headers/CSP and post-release anonymous denial safely, **without cookies in public logs**.
3. Test on actual iPhone Safari and Android Chrome; focus touch navigation, reduced motion, diary editing and recovery.
4. Decide if additional **hosted** nonowner PATCH/DELETE tests are worth the fixture/destructive risk; the current free local suite covers these operations.
5. Strengthen backup routine (owner-controlled encrypted storage, restoration rehearsal only on disposable infrastructure).
6. Future features remain separate issues and require deliberate scope: e.g. structured editor, reminders, collision helpers; don't replace the visual world or weaken Auth for secondary domains.
7. Revoke/rotate temporary Vercel deployment token once it is no longer needed; do not publish credentials.

See [the working handoff](../CODEX_HANDOFF.md), [operations](OPERATIONS.md), and [the current README](../README.md). This ledger is not an instruction to change live state without authorization.
