# ORBIT W6 — Acceptance & Integration QA

**Role:** Independent sixth worker proving ORBIT features work together. Never conflate synthetic browser/CI success, protected Preview, signed-in owner acceptance, physical device testing or Production. Owner is willing to help test **when needed**, but does not want passive indefinite blockers.

## Startup

Read AGENTS.md, docs/ORBIT_PARALLEL_COMMAND_PROTOCOL.md, docs/handoffs/ORBIT_COMMAND_HQ.md, docs/PROGRESS.md, docs/DESIGN_EVIDENCE_PLAN.md, docs/BP16_RUNTIME_ACCESSIBILITY.md, plans/ORBIT_POST_2_4_EXECUTION.md and W1–W4 handoff tails. Query live main/open PRs/CI and actual Preview/Production metadata before claiming deployment.

## Work ownership

- Build reproducible independent synthetic cross-feature acceptance tests in newly scoped tests/qa_acceptance_*.py or tests/qa_orbit_acceptance_*.mjs and qa/acceptance/ fixtures. Do not edit W1 sync, W2 media, W3 UI, W4 release/security scripts or their existing tests without a file-level coordination agreement. Report defects to owners with exact reproductions, not stealth patches.
- Prioritize saved/cloud ACK, offline draft recovery, private Sticky/Journal/Excalidraw image bytes after reload, portable .orbit restore and detached selection, A/B account separation, mobile spatial view and focus/ten themes, Projects flows and protected Preview behaviors.
- Report distinct PASS/FAIL/NOT RUN/OWNER ACCEPTANCE PENDING evidence, exact commit and test commands. Offer synthetic screenshots/short clips only when they actually improve owner visibility.
- **Ask owner for real-user testing only when necessary:** finish synthetic work first, then provide protected URL and source SHA, 3–6 safe actions with dummy data, expected observations, one bounded privacy-safe evidence request and reason the owner/device is necessary. Never ask for passwords/tokens/signed links/private journals or screen recordings with personal data. Owner acceptance pending blocks unverified production claims, **not** other safe engineering.
- Maintain docs/acceptance/ readme/register and W6 handoff; W5 incorporates acceptance summary into docs/PROGRESS.md. W4 owns release gate, Command HQ owns cross-worker arbitration. Stay independent; suggest higher-quality integrations and implement meaningful tests.

No Production/domain, hosted Auth/SQL/RLS/Storage, private data deletion, public private content or paid provider changes without separate consent. Require all four exact-head CI jobs on code PRs. Check predecessor activity and preserve active branches. Checkpoint GitHub at 8–10 min; finish long turns at 12–15 min with complete W6 continuation, never wait indefinitely for CI.

**First executable task:** inspect current synthetic acceptance gaps, implement one high-impact, cross-feature test in owned paths, and record what cannot yet be verified without controlled signed-in/device testing.


## 12 November 2026 — W6 acceptance implementation checkpoint

W6 branch `test/orbit-w6-cross-feature-offline-portable-acceptance-20261112` based on main `a3b5203ef755e10a3976cb8e722c89ab7d5a0d00`, first test commit `ebaf1604d6ebd0d09a335d7cbd685c41ddee6153`, register commit `3cba3a9821f15cb7f68baafe235dc62d459bf231`. Added `tests/qa_orbit_acceptance_integrated.test.mjs` with a two-part synthetic, independent acceptance flow: offline draft + CAS ACK + remote reload; Projects, Journal, Sticky and Excalidraw shared image references; explicit detached media; portable archive and private B-owner restore; byte parity and source-path denial; gallery classification; local persistence; and multi-device CAS conflict plus non-destructive recovery export. Added `docs/acceptance/REGISTER.md`, whose states remain **NOT RUN** until actual execution. No source/CI-workflow edits outside W6 lane. Local container lacked GitHub network resolution, so test execution must be verified via exact-head PR Actions; never call code inspection a PASS. Other active PRs observed: W1 #160, W2 #154, W3 #161, W4 #162. Last independently documented Production source `4e57aca`, not fresh Vercel-verified.

**Next actions:** verify W6 PR creation and exact head; inspect four mandatory checks `static-quality`, `local-postgres-rls`, `production-artifact-dry-run`, `unauthenticated-protection` and fix any test defect without masking a product failure. Amend register with actual evidence, review diff, source merge only on four green exact-head statuses and no overlap. Then add independent real-origin Chromium cross-widget mobile/reload flow; coordinate signed-in/two-account owner media QA with W2 and protected Preview mapping with W4. W5 alone updates canonical progress. No hosted/Production/private-data gates waived.


## 12 November 2026 — W6 second acceptance slice (browser harness, unverified)

**Completed prior slice:** [W6 PR #165](https://github.com/DoorBlox/orbit/pull/165) merged source-only as `6c2f1c3465a959faaf96b6db9260e168b3063bd6`. All four exact-head required CI checks PASS at test head `becb5151acc36d3b64f0b5989f8ab1ae2ae51aa5`, including `npm test` two integration tests. This is synthetic source verification, not hosted signed-in or Production.

**Current work branch:** `test/orbit-w6-real-origin-cross-widget-20261112` from the above merged main, first browser test commit `0f4ba79561d6ab73030ec7f866dfbb95922244c2`. New independent `tests/qa_acceptance_cross_widget.py` drives actual Chromium local app: Journal/Sticky/Projects edits in one workspace, saves + reloads, same saved widget positions, phone-size seeded touch-capable context with optional focus/rotation, and fresh isolated context. `docs/acceptance/REGISTER.md` updated with prior PASS and **new browser NOT RUN**. The test uses `qa_m1` harness but does not touch W3-owned files. `ORBIT_BROWSER_BUNDLED=1 python tests/qa_acceptance_cross_widget.py` after `npm run build`, `python -m pip install -r tests/requirements-browser.txt`, `python -m playwright install chromium`. W4 owns wiring new browser runner and artifact collection to `static-quality`; W6 must request file-level coordination rather than edit `.github/workflows/quality.yml` unilaterally. No local checkout because container cannot resolve github.com; so the Python runner remains NOT RUN until W4 CI integration or accessible checkout. If the runner fails, log true expected vs actual, coordinate W3 product defects, do not weaken assertions simply for green.

**Continuation:** open draft PR for new browser test and comment on W4 issue/coordination, then continue safe independent acceptance (Preview metadata and bounded owner checklist only when exact Preview SHA and protection confirmed). Do not merge unexecuted browser script as if verified. Keep W5 canonical docs ownership and hosted/Production gates.
