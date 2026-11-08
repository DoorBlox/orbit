# ORBIT implementation history and evidence ledger

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
