# W4 — expedited, evidence-gated ORBIT Production delivery (#225)

**Release policy: prepare immediately; do not promote without exact candidate, owner-scoped security approval and independent acceptance.** This is W4's operational source document, not the W5 master roadmap or an authorization to mutate hosted systems. Current source is moving as W1–W6 work in parallel; re-query `main` before taking every release action.

## Independent state at 19 November 2026

- GitHub main at initial #225 intake: `3349dae1b790dfc4c19b6f22404bafd535ac0dba`. Later source advanced independently; this intake SHA is **NOT** a release candidate.
- Vercel project `orbit`, project ID `prj_FZH5dyyZvUXfVmTz04HBCMbIrQk5`, team `team_xHRnXQbjaIEx2rNZ94p5QBao`. Current read-only checked project reports SSO protection covering all Preview and raw Production deployment URLs.
- Prior Production (read-only verified): deployment `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4` source `4e57aca785259192b92010c5d0e1634a4c1efe14`, READY. Custom domain `orbit.starscene.com` is verified on this project. Recheck its **actual alias assignment** immediately before staging and record exact prior deployment ID, not merely the domain.
- Most recent listed READY protected Preview during initial inspection: `dpl_4p6JPvQVfwHCwkzriR7XGqRc5Nvm` source `e39a94068592778e0c0ff83cfb3ce3c29348485a`. This Preview is **NOT current main**, **NOT Production** and must not be promoted as the same tested Production build.
- CI #169 W6 real-origin cross-widget Chromium runner was first executed successfully in W4 PR [#228](https://github.com/DoorBlox/orbit/pull/228), exact reviewed head `1d834fa1d2851f4d279e04d34c168dac1df583c9`, four/4 checks green, source-merged as `d2ff68fe388c08558a92b9dbecca9a930a002f85`. This proves **local dummy-only** cross-widget behavior, not hosted owner A/B RLS.
- #211 local-only desktop/mobile screenshot/trace fixture is separately being checked in [W4 PR #234](https://github.com/DoorBlox/orbit/pull/234). W6 must independently classify visual results.
- **HOLD gates:** #171 / intentionally RED PR #175 crash/reload of unacknowledged private drafts; actual signed-in image/restore A/B isolation (#26/#29); W3 functional regression PRs and W6 browser evidence. Command HQ must decide a safe, explicit recovery contract and wave scope before any Production promotion. Do not silently downgrade failing or unrun acceptance.

## Fastest existing protected staging path — REUSE, do not reinvent

The repository ALREADY contains two manual guarded workflows:

1. `.github/workflows/bp05-release-preflight.yml` — NO DEPLOY, full reviewed current-main SHA checkout, clean worktree, unit/source validation and synthetic-key Production-format release artifact. Run only after selecting a frozen, reviewed **post-merge** current-main 40-character SHA. It does not attest owner or two-account acceptance. Verify the preflight completed SUCCESS for the **same** exact SHA within 24 hours.
2. `.github/workflows/bp05-stage-reviewed.yml` — stage only; first proves exact current main and recent preflight, then requires GitHub environment `orbit-release-staging` with required independent reviewer, prevent-self-review, main-only protection and one-time matching `ORBIT_STAGE_APPROVED_SHA`. It checks project/team ID, pinned stable Vercel CLI, protected raw Production URLs **before** credentials/deployment; builds via `vercel pull --environment=production` → `vercel build --prod` → `vercel deploy --prebuilt --prod --skip-domain`. The same build is validated with `scripts/verify-release.mjs` checksum inventory. It **never** assigns a public alias, promotes, rolls back, changes Auth/RLS/Storage or silently installs a new stage environment policy.

GitHub environment settings, reviewers, secrets and exact reviewed SHA are separately owner/admin controlled. Never print `VERCEL_TOKEN`, bypass secrets, auth cookies or real user data; an unconfigured environment must fail closed. **Do not dispatch staging** solely because this runbook exists.

## Per-wave GO / NO-GO gates (keep issue #225 OPEN until verified on domain)

| Gate | Independent evidence required |
| --- | --- |
| Candidate source | One explicit wave of source-merged, non-RED fixes with a current, unchanged `main` SHA; compare source diff against last shipped Production and reject unexpected W1/W2/hosted/Auth/OAuth changes |
| CI | Four required GitHub jobs PASS at reviewed PR HEADs; the cross-widget Chromium step must actually execute; rerun the repo's exact-main no-deploy preflight after selecting candidate |
| Privacy/recovery | W1/W2/W3/HQ disposition of #171, no private-draft overwrite, signed-in owner A/B isolation, private image bytes/reload and portable backup/restore verified with permission; no unscoped localStorage or RLS bypass |
| UI and a11y | W6 independent desktop/mobile screenshots and traces with dummy-only fixture; functional #214/#216/#217/#218 and #210 accepted for the chosen wave; no red test merged |
| Stage authorization | Independently approved, protected `orbit-release-staging` environment on the exact SHA; raw Production URL SSO verified; preexisting Production target and rollback ID recorded |
| Same-build smoke | Staged production-build deployment reports READY, `meta.githubCommitSha` equals candidate, URL and checksum/Release identity match. Test the **staged production build** directly, not a rebuilt Preview. Anonymous request is challenged, CSP/headers restrict private data. Authorized stage reviewer/W6 exercises dummy task, Journal, Sticky, navigation and reload; record issue-specific PASS/FAIL and exact deployment ID, without leaking credentials |
| Promotion | **Separate explicit GO from Command HQ/owner** after every above gate passes. Promote the **exact stage deployment ID** (`vercel promote <staged-id>`) with no rebuild and check domain `orbit.starscene.com` now resolves to that same deployment/Git SHA. Do not promote just because READY |
| Monitoring | Immediately rerun anonymous privacy smoke, basic spatial controls with dummy/reviewer data, RLS regression indicators and Vercel error logs; watch 5xx/auth errors, missing private media or pending-draft regression. Publish status with candidate SHA, deployment ID and rollback ID. Keep source-merged vs released issue states distinct |

## Rollback and stop rules

- **Before promotion:** any failed CI, unexpected diff, unresolved #171 contract, missing owner/device/security evidence, unprotected stage or wrong SHA = NO-GO. Raw staged deployment stays unaliased; do not weaken Auth or RLS to make it pass.
- **After promotion:** if public/private data isolation, core navigation, save/reload or authorization regresses, halt further waves and execute an **independently approved** Vercel rollback to the recorded last-known-good READY deployment (not a rebuild). Vercel rollback can suspend automatic alias assignment; confirm alias and project settings afterward. Do not rollback/delete Supabase user records or overwrite backups. Run smoke and monitor again.
- No unapproved paid services, new public routes, token propagation, hosted migrations, user-data deletion or OAuth enablement are part of #225.

## Handoff to Command HQ / W6 / W5

**W4:** workflow wiring, exact-source stage protection, smoke/rollback/monitoring runbook and read-only deployment verification. **W6:** independent tests and screenshots, statuses in `docs/acceptance/REGISTER.md`, never claim unrun cases PASS. **W3:** functional/product defects. **W1/W2:** CAS/private-draft, images, RLS/Storage. **W5:** canonical release notes, version identity, issue delivery state. **Command HQ:** wave selection, scope/approval decisions and final independently recorded GO/NO-GO.

This is a preparation artifact, not a staged or Production release. Specific releases require fresh, contemporaneous evidence and explicit bounded authorization.
