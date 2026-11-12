# BP-05 — reviewed-SHA, stage-only release runbook

**12 November 2026: SOURCE-ONLY, not enabled or dispatched.** This runbook is subordinate to the single [execution roadmap](../plans/ORBIT_POST_2_4_EXECUTION.md). The source PR alone does not authorize any stage, hosted security changes, public publishing, or Production release.

## Release contract and gates

The existing `bp05-release-preflight.yml` is a **no-deployment** synthetic-key workflow. Its exact reviewed commit must be the **post-merge current `main` SHA**; four successful checks against a PR head do not automatically apply to its squash-merged SHA. `bp05-stage-reviewed.yml` is manual-only and must receive the full 40-character current-main SHA, after the existing no-deploy preflight completed successfully for the **same** SHA within 24 hours.

The new workflow does nothing automatically on push or pull requests. It verifies checkout against current origin/main, rechecks source integrity, builds an exact Production-format private artifact, validates the SHA and checksum inventory, and, if separately authorized, uses `vercel deploy --prebuilt --prod --skip-domain` only. No alias, promotion, rollback, Auth/Storage/RLS mutation, or public data projection is part of the workflow. It requires a protected raw deployment URL and an unauthenticated authentication challenge; independent reviewer acceptance remains separate.

## Explicit setup still required — no environment configured by this PR

A separately authorized repository administrator must configure GitHub **Settings → Environments → `orbit-release-staging`** with required independent human reviewer(s), prevent self-review, restrict deployments to `main`, and store `VERCEL_TOKEN` as an **environment-scoped secret**, not a repository-level token. Merely naming a GitHub Actions environment does not prove protection exists. No token should be displayed in a PR, CI log, chat, or artifact.

The same environment must provide variables `ORBIT_STAGE_APPROVED_SHA` (a deliberately approved, current full 40-character main SHA that is rotated/removed after stage), `VERCEL_PROJECT_ID=prj_FZH5dyyZvUXfVmTz04HBCMbIrQk5`, `VERCEL_ORG_ID=team_xHRnXQbjaIEx2rNZ94p5QBao`, and `ORBIT_VERCEL_CLI_VERSION` as an independently reviewed stable version such as X.Y.Z, never `latest`. The project and team IDs were independently checked via the connected Vercel project on 12 November 2026. With missing or incorrect vars the workflow must fail **before** accessing Vercel.

**Execution requires another scoped owner approval.** Do not invoke a release job because this file or GitHub environment exists.

## Separately authorized operator procedure

1. Independently recheck current main, required four CI contexts (`static-quality`, `local-postgres-rls`, `production-artifact-dry-run`, `unauthenticated-protection`) at the reviewed source PR head, protected Preview, signed-in two-account privacy/media, portable backup/restore, real-device acceptance and the known rollback deployment. Record unknowns rather than declaring them passed.
2. Dispatch the existing **BP-05 NO DEPLOY preflight** on `main` for its **exact post-merge 40-character SHA**, and verify successful completion. This step uses only a synthetic publishable key.
3. Obtain separate owner staging consent. Set the protected environment's one-time `ORBIT_STAGE_APPROVED_SHA` to that exact value and obtain independent environment reviewer approval. Dispatch **BP-05 gated exact-SHA stage only** with the same SHA.
4. Reverify protected stage `READY`, exact Git source, runtime config/CSP, raw/Preview authentication, no private data in anonymous HTML, Production alias unchanged, owner/second-account evidence and any post-build source differences. The workflow's successful synthetic checks are not enough to claim signed-in acceptance.
5. Any Production promotion must be a **different, explicitly authorized action** with separate artifact/target evidence and rollback gate. This runbook does not promote anything.

## Failure and recovery

If preflight, review, checksum, or raw protection fails: **no promotion, no alias change**. Quarantine the candidate, inspect the failing evidence, fix at a fresh reviewed SHA and rerun approval. Never force-reset main to earn green checks. As last read-only verified on 12 November, prior Production was READY deployment `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4` from `4e57aca785259192b92010c5d0e1634a4c1efe14`; recheck actual present state before referencing it as rollback. In a future separately approved Production privacy incident, first restrict Vercel Authentication to all deployment URLs, then restore the last independently confirmed READY deployment/alias. Never restore/delete private records or relax Supabase RLS to fix a domain rollback.

## Implementation and evidence

`scripts/bp05-stage-gate.mjs` rejects stale/non-main/failed preflight, unapproved SHA, wrong project/team, unpinned CLI, malformed/redacted artifact, hostile raw URL and anonymous unprotected stage. `tests/bp05_stage_gate.test.mjs` covers these failure modes; `tests/bp05_release_workflow.test.mjs` enforces unchanged four required CI contexts and a **single** manual no-alias staging workflow. No historical V6/M1 or M2 source manifest is changed (none of the hashed `src/` modules are touched).

References: [GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [Vercel CLI deployment](https://vercel.com/docs/cli/deploy), [Vercel CLI build](https://vercel.com/docs/cli/build).
