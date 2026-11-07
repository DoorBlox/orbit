> **Verified live update — 7 November 2026 (Asia/Jakarta).** This paragraph supersedes the historical preflight status below, without rewriting the original record. M2.5 PR #1 was merged into `main` at `0b800e9e955ac4e6a962ff60d6942598f95a0f1c`. M3 PR #3 is now based on `main`. Independently checked Production-scoped Vercel API/site URLs and matching project publishable key, verified `orbit.starscene.com` domain and deployment protection, and confirmed Supabase migration history includes `20261106142540 orbit_private_table_least_privilege`. Fresh read-only SQL confirmed RLS and ordinary authenticated CRUD on all seven private tables, no effective TRUNCATE/TRIGGER/table-or-column REFERENCES, disabled public reads, three invoker RPC permissions, and **zero nonowner rows**. The 7×INSERT/UPDATE/DELETE denials were live **database-role simulations**, NOT real bearer-token HTTP write checks. Exact final-head CI must be rerun after any new documentation commit. **Production remains NO-GO** until Supabase Auth Site URL/explicit redirect allowlist, real nonowner HTTP-session isolation, owner-controlled private export/backup, a real production-configured artifact and protected hosted smoke are verified. No Production deployment or live owner data mutation was undertaken. Details: [7 November reconciliation](M5-M6-LIVE-RECONCILIATION-20261107.md).

# ORBIT 1.0.0 — release candidate GO/NO-GO

6 November 2026 (Asia/Jakarta). Branch `codex/m3-release-readiness`, stacked on
M2.5 `9b54974eaef630bba90450d85be5779bea3e8b03`. Version **1.0.0** is prepared;
no release tag, merge or Production deployment has been performed.

## Authoritative scope and accepted baseline

The owner supplied issue #2's authoritative scope in this conversation, resolving
this checkpoint's earlier issue-access blocker (historical checkpoint: `235e8d8`).
Safe M3 development is authorized. Protected-private Production publication is
also authorized **conditionally**, after all applicable release gates pass.
Production intentionally shares the owner-approved project (see the newer target decision);
Auth/RLS/DNS/protection changes and live mutations remain separate boundaries.

M2 conditional acceptance, hosted browser acceptance and 10/10 direct nonowner read
isolation are retained. Owner-confirmed M2.5 CI run
[42199466081](https://github.com/DoorBlox/orbit/actions/runs/42199466081) passed at
`9b54974`; the protected Preview is READY at
https://orbit-emtd92fo1-doorbloxs-projects.vercel.app.
That is the prior baseline's CI/Preview evidence, not M3 Production verification.

The owner independently confirmed both M3 GitHub Actions runs at `552720b` PASS,
including all browser suites; PR #3 is updated and mergeable. That completed CI
investigation is closed. The new grant-correction commit still needs its ordinary
final-SHA check result, without reopening the earlier infrastructure troubleshooting.

## Completed independent M3 work

| Scope | Result |
| --- | --- |
| Security review | Auth/lifecycle, RLS/GRANTs/RPCs, key exposure, sanitizer, backups, recovery, conflict and rollback reviewed; actual findings in M3-SECURITY-AUDIT.md. Owner-reported live excess grants now have a locally verified, unapplied least-privilege migration (M3-LEAST-PRIVILEGE.md). |
| Necessary fix | Production previously allowed missing cloud inputs to build local mode. Now fails closed before replacing artifacts; reviewed target, development exclusions and exact private CSP are required. |
| Version/artifact | Package/lock metadata 1.0.0; build:release and verify:release implemented. Synthetic release verification passes; local-only/extra-file/symlink/native/SDK drift rejected. Owner-reviewed shared project/site recorded with a narrow exception; live configuration unverified. |
| Hosted write preparation | Offline generator and tests for seven disposable nonowner fixture tables; no requests executed. Owner rows and workspace/publication mutation RPCs excluded. See M3-HOSTED-WRITE-VALIDATION.md. |
| Required local checks | PASS: 167 tests, zero failures/skips, syntax, build, structure and unchanged native-source provenance. |
| Local browsers | PASS: five-viewport M1 QA, 24 cloud cases, 25 motion/touch cases, five recovery/undo/integrity/legacy cases, HTTP asset/private-path smoke. All synthetic/local, not live Production or physical-device certification. |
| Audit/evidence | Dependency advisories: 0. Limited credential signatures: no matches in 36 files. M2/M2.5 evidence hashes preserved. Initial results: docs/evidence/m3/candidate/verification.json; shared-target follow-up: docs/evidence/m3/shared-target-verification.json. |
| Release operations | Release notes, gated checklist, backup/export, recovery and rollback procedures ready. No arbitrary new library, UI feature or Auth/model behavior change. |
| CI/PR preparation | All existing checks retained; release guard tests join normal unit tests, secret scan and close-out suite added; explicit M3 branch push trigger. Reviewable commits/PR description prepared. GitHub API remains Forbidden. |

A deliberate attempt to build Production without its required cloud fields was
correctly refused and left existing dist hashes unchanged. This **expected NO-GO**
is a safety check, not a failing application regression. No real Production cloud
artifact has been generated or claimed verified. The reviewed pair now also passes
an offline build/artifact-verification test with a synthetic key only.

## Genuine remaining gates

1. **Live Production configuration and security verification.** Target selection
   is resolved: the owner explicitly approved shared project `ixfgavgtwuzdgucjriec`
   and `https://orbit.starscene.com/`. The exact source exception preserves all
   other guard checks. URL/key were reported Preview-scoped only; actual Production
   bindings, domain/protection, Auth site/redirects and effective privileges still
   need live verification. See [exact requirements](M3-SHARED-PRODUCTION-TARGET.md).
   No Production environment or Auth changes are authorized by source preparation.
2. **Hosted write-isolation evidence.** The prepared development plan requires an
   existing confirmed nonowner UUID, administrator-confirmed absence of its data,
   and narrow authorization for seeding/testing/cleaning exactly seven synthetic
   rows. It has not run. The same project is now intentionally shared; Production origin/session validation remains required;
   neither local SQL tests nor development read tests certify its deployed writes.
3. **Live least-privilege correction.** The owner's read-only audit confirms excess
   TRUNCATE/TRIGGER/REFERENCES grants. Authorize/apply only the reviewed migration,
   then verify effective privileges/CRUD/RLS/RPCs with the read-only postflight.
   No live grants or workspace data have been changed here.
4. **Final candidate checks and release records.** Retain ordinary CI PASS for the
   new correction commit (both previous `552720b` runs already passed per owner),
   verify the actual configured artifact, and privately record backup/rollback state.
   Do not reopen resolved CI troubleshooting or substitute local tests for hosted proof.


Physical Safari/Android and physical 120Hz testing remain explicitly unverified,
not silently passed or confused with Chromium viewport/touch emulation. OTP/Google
and real provider-outage variants remain outside the verified password workflow.
The owner must retain/accept appropriate scope limits when making the final gate
assessment; this report does not manufacture a device or broader provider result.

## Decision

**NO-GO for Production publication.** Independent code, local validation and release
procedures are ready; the locally fixed build fallback is resolved, but the confirmed live excess
grants still require their separately authorized correction. The live target/configuration, write validation and
final remote CI gates above are not satisfied. Conditional publication authority is retained; the latest instruction forbids
live Production changes/deployment until actual configuration/security verification.

The target decision is complete; next obtain read-only actual Vercel/Auth
configuration evidence through an authorized live channel. Do not ask to select a
new project or infer bindings from Preview. Fixture mutations still need their
separate narrow authorization. No owner assignment, migration or test-user deletion.
Multi-user Issue #4 remains outside M3.

See [release notes](../releases/1.0.0.md),
[launch/backup/rollback runbook](M3-LAUNCH-RUNBOOK.md),
[security audit](M3-SECURITY-AUDIT.md), and [prepared PR](M3-PR.md).
