# ORBIT W6 acceptance register

**Evidence anchor:** 12 November 2026. Independent W6 synthetic integration PR, initial commit `ebaf1604d6ebd0d09a335d7cbd685c41ddee6153`, source-merged by [PR #165](https://github.com/DoorBlox/orbit/pull/165) as `6c2f1c3465a959faaf96b6db9260e168b3063bd6` after 4/4 exact-head CI checks, based on main `a3b5203ef755e10a3976cb8e722c89ab7d5a0d00`. The two W6 Node integration tests are PASS in CI at head `becb5151acc36d3b64f0b5989f8ab1ae2ae51aa5`; this register is not a release claim.

A status is **PASS** only after an actual test has returned success; source inspection alone is **NOT RUN**. **VERIFIED** requires the specific stated environment, account, device and outcome evidence. A synthetic PASS does not mean owner/device VERIFIED. No owner-private fixtures, credentials or signed URLs belong in public evidence.

| Acceptance case | Status at authorship | Executable evidence / outstanding proof |
| --- | --- | --- |
| Offline drafts across tasks, Journal, Sticky and Projects; reconnect -> CAS ACK -> reload | PASS (synthetic CI) | `static-quality` [run 43253931799](https://github.com/DoorBlox/orbit/actions/runs/43253931799), PR #165 exact head; not signed-in acceptance |
| Portable archive with shared Sticky/Journal/Excalidraw image plus opted-in detached image; B-owner restore and byte parity | PASS (synthetic CI) | Same W6 first case, synthetic in-memory private Storage; signed-in live Storage still unverified |
| Project brief and milestone identity, journal and sticky retained after portable restore/local write | NOT RUN | Same W6 first case; reload across actual hosted devices still unverified |
| Account B cannot fetch A path; A bytes unaffected; visitor gets no private tasks | NOT RUN | Same W6 first case; real hosted RLS/two-account and anonymous HTTP acceptance separately required |
| Two-device offline CAS conflict retains B draft and produces recovery archive without overwriting A | PASS (synthetic CI) | Same W6 second case; real simultaneous signed-in devices remain unverified |
| Browser viewport, mobile focus/pan and a11y | PASS (existing Chromium CI); W6 real-origin extension NOT RUN | Existing `tests/qa_m1.py`, `tests/qa_bp16_accessibility.py` run in CI; physical device + assistive tech required |
| Protected Preview and signed-in image pixels after refresh | OWNER TESTING REQUIRED | Request only after verifying a protected exact-source URL and finishing synthetic checks; issue #26 |
| Hosted production privacy / deployment parity | NOT RUN | W4 owns release gate; no new Production release or Auth/Storage modifications authorized |

## Execution boundaries

The automated tests use only local in-memory CAS and private Storage mocks; they cannot prove Supabase policies, authenticated image pixels or real device interaction. The W6 tests are included in existing `npm test` through `tests/*.mjs`; no workflow file edits or extra CI dispatches. Four required PR checks must pass **at the exact final head**: `static-quality`, `local-postgres-rls`, `production-artifact-dry-run`, `unauthenticated-protection`. A CI failure is FAIL, never silently downgraded to PASS.

W6 owns this register; W5 alone incorporates verified summaries into `docs/PROGRESS.md` and the single canonical roadmap. No screenshots are necessary for the in-memory acceptance run. Future synthetic screenshots must be redacted and linked to an actual CI artifact; genuine owner acceptance must never include private content or credentials.

## Next ready QA slices

1. Check the exact-head CI and fix only W6-owned test defects; record the observed pass/fail results here and in `docs/handoffs/ORBIT_W6.md`.
2. Add a real-origin Chromium acceptance journey traversing Projects + Journal + Sticky + canvas with synthetic local data, save/reload, narrow viewport and focus restoration. Reuse existing browser harness rather than replacing it.
3. Inspect a freshly verified, protected exact-source Preview. If signing into that Preview is necessary, ask owner for 3–6 dummy-data checks; never expose the Preview or request a password/token.
4. Coordinate any product defect with W1–W4 using precise steps, expected/actual and failing test evidence; do not edit their owned source.


## Real-origin cross-widget extension (W6 next slice)

Test authored on branch `test/orbit-w6-real-origin-cross-widget-20261112`: `tests/qa_acceptance_cross_widget.py`. It exercises actual Chromium DOM controls for Journal text, Sticky text and a private Project brief in ONE local workspace, verifies local persistence and same-layout reload, carries the entirely synthetic local workspace to a touch-capable 390px emulated context with Focus/rotation, then checks a fresh context never receives the private markers. This is **NOT RUN** until Playwright executes it; source authoring is not test evidence. It does **not** establish hosted two-account RLS, signed-in media pixels, or physical device acceptance.

Command after building: `ORBIT_BROWSER_BUNDLED=1 python tests/qa_acceptance_cross_widget.py`. Evidence when executed: `qa/acceptance/w6-cross-widget-results.json`; sanitized failure-only screenshots and trace under `qa/acceptance/`. W4 must separately wire this runner into `.github/workflows/quality.yml` and retain artifacts; W6 does not edit W4-owned CI. Until then the standalone runner is a proposed acceptance test, not a mandatory gate and not a passing check.
