# ORBIT W6 acceptance register

**Evidence anchor:** 12 November 2026. Independent W6 synthetic integration PR, initial commit `ebaf1604d6ebd0d09a335d7cbd685c41ddee6153`, source-merged by [PR #165](https://github.com/DoorBlox/orbit/pull/165) as `6c2f1c3465a959faaf96b6db9260e168b3063bd6` after 4/4 exact-head CI checks, based on main `a3b5203ef755e10a3976cb8e722c89ab7d5a0d00`. The two W6 Node integration tests are PASS in CI at head `becb5151acc36d3b64f0b5989f8ab1ae2ae51aa5`; this register is not a release claim.

A status is **PASS** only after an actual test has returned success; source inspection alone is **NOT RUN**. **VERIFIED** requires the specific stated environment, account, device and outcome evidence. A synthetic PASS does not mean owner/device VERIFIED. No owner-private fixtures, credentials or signed URLs belong in public evidence.

| Acceptance case | Status at authorship | Executable evidence / outstanding proof |
| --- | --- | --- |
| Offline drafts across tasks, Journal, Sticky and Projects; reconnect -> CAS ACK -> reload | PASS (synthetic CI) | `static-quality` [run 43253931799](https://github.com/DoorBlox/orbit/actions/runs/43253931799), PR #165 exact head; not signed-in acceptance |
| Portable archive with shared Sticky/Journal/Excalidraw image plus opted-in detached image; B-owner restore and byte parity | PASS (synthetic CI) | Same W6 first case, synthetic in-memory private Storage; signed-in live Storage still unverified |
| Project brief and milestone identity, Journal and Sticky retained after synthetic portable restore/local write | PASS (synthetic CI) | Same W6 first case; real hosted device reload remains NOT RUN |
| Account B cannot fetch A path; A bytes unaffected; visitor gets no private tasks in mocks | PASS (synthetic CI) | Same W6 first case; actual hosted RLS/two-account and anonymous HTTP acceptance remain NOT RUN |
| Two-device offline CAS conflict retains B draft and produces recovery archive without overwriting A | PASS (synthetic CI) | Same W6 second case; real simultaneous signed-in devices remain unverified |
| Browser viewport, mobile focus/pan and a11y | PASS (existing Chromium CI); W6 real-origin extension NOT RUN | Existing `tests/qa_m1.py`, `tests/qa_bp16_accessibility.py` run in CI; physical device + assistive tech required |
| Protected Preview and signed-in image pixels after refresh | OWNER TESTING REQUIRED (not requested) | Request only after verifying a protected exact-source URL and finishing synthetic checks; issue #26 |
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


## Protected deployment availability (read-only Vercel, 12 Nov 2026)

W6 inspected connected Vercel project `orbit` rather than assuming a GitHub merge was deployed. Project-wide `ssoProtection` is enabled for all preview and raw Production URLs. Latest READY Preview is `dpl_8eBFFLzLHa1Vz1edQG5wqXmL5Eb7` from `01c153d6b2f4a13e105404e78fd2f520158db688` — older than current W6 code. Last listed Production target is `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4`, source `4e57aca`, not current main; alias itself was not independently rechecked. Thus **no exact-source protected Preview exists in the inspected deployment list** for PR #165 or #168. Owner testing is **NOT REQUESTED**, not a blocker to independent QA. See [owner/device protocol](OWNER_DEVICE_PROTOCOL.md); do not ask the owner to test newer source at an old URL.

Coordination [issue #169](https://github.com/DoorBlox/orbit/issues/169) assigns the new Playwright runner wiring to W4; [source-merged PR #168](https://github.com/DoorBlox/orbit/pull/168) remains acceptance NOT RUN until its standalone script actually executes in Chromium. Four generic green jobs on #168 without the new runner do **not** prove this new acceptance case.


## 13 November 2026 — independently reproduced controller-level crash recovery failure

**Status: FAIL — synthetic controller lifecycle, NOT a hosted/browser crash confirmation.** [Issue #171](https://github.com/DoorBlox/orbit/issues/171); [draft, unmerged RED PR #175](https://github.com/DoorBlox/orbit/pull/175), exact tested head `70523b3d9999bbbc1d5f67a7e2c880db47ce1efd`. This source branch intentionally must **not** merge while its contract is failing.

- [`static-quality` run 43331199096](https://github.com/DoorBlox/orbit/actions/runs/43331199096) job `131576050504`: **564 tests; 563 PASS, 1 FAIL**. Control subtest #518 **PASS**: offline dummy Task/Journal/Sticky/Project edits synchronize after reconnect with a live tab and survive clean owner remount. RED acceptance subtest #519 **FAIL**: after synthetic abrupt controller disposal without a cloud ACK, a fresh same-owner mount receives `W6 initial task` rather than expected `W6 UNSENT TASK` at `tests/qa_orbit_acceptance_crash_recovery_red.test.mjs:111`. The remaining Journal/Sticky/Project assertions in this RED case did not execute because Task assertion failed first.
- [`production-artifact-dry-run` run 43331199227](https://github.com/DoorBlox/orbit/actions/runs/43331199227) **FAIL on its repeated `npm test`**, the **same** synthetic assertion, not a separate build or Production failure. [`local-postgres-rls` 43331199207](https://github.com/DoorBlox/orbit/actions/runs/43331199207) and [`unauthenticated-protection` 43331199210](https://github.com/DoorBlox/orbit/actions/runs/43331199210) both PASS at this exact head.
- Interpretation: The existing client retains unacknowledged offline drafts while alive, but the test demonstrates its in-memory pending copy is discarded when the controller is torn down. Real forced-browser-close, physical device, actual saved cache durability, hosted account/RLS, and Production incidents remain **NOT RUN/UNVERIFIED**. This is stronger than source inference but narrower than live user validation. Do not conflate with normal CAS conflict safety or a browser's voluntary beforeunload warning.
- W1/W3 and Command HQ must agree a **security-safe recovery contract** before changing implementation: account-scoped storage and isolation, sign-out lifecycle, quota/corruption handling, stale CAS revision, recovery review, and explicit opt-in/retention decisions. W6 does not edit their source.

**Cross-widget Chromium remains NOT RUN:** The already merged `tests/qa_acceptance_cross_widget.py` is still absent from W4's `.github/workflows/quality.yml` execution steps; [issue #169](https://github.com/DoorBlox/orbit/issues/169) tracks it. Existing CI has passed other Chromium regressions, but this standalone multi-widget suite has no execution evidence. Owner/device testing remains withheld pending exact-source protected Preview.


## 13 November 2026 — W6 deferred multi-feature recovery acceptance (new, pending execution)

Current W6 isolated branch `test/orbit-w6-deferred-rich-draft-portable-recovery-20261113` from main `6491c6e20c5ec021eda9ca4538613f9af450841d` adds `tests/qa_orbit_acceptance_deferred_portable.test.mjs`. This tests the newly merged W1 `queueDeferredOwned` **across actual multi-feature snapshot shapes**, not only a task title. A 120-edit storm must defer expensive capture until save; a first `NETWORK` failure must preserve a complete pending Task, Journal, Sticky, Projects and Excalidraw image reference graph; a portable backup must preserve deduplicated attached image bytes and selected detached media; a newer dirty edit must supersede the failed snapshot on CAS retry without changing the already reviewed backup; a B-target rehydrate must preserve coherent earlier data with remapped private image paths and byte parity. Second test exercises a reentrant editor commit during export: it must not mix old task data with newer Journal/Sticky/Projects/scene fields. This is **PASS (synthetic CI)**: [static-quality run 43334033008](https://github.com/DoorBlox/orbit/actions/runs/43334033008) executed both new tests at exact PR #185 head `f4f6f4dd444f52da028a5b77c8847dac276b4217`, reporting 581/581 Node tests PASS. All four required exact-head workflows passed. [PR #185](https://github.com/DoorBlox/orbit/pull/185) squash-merged as `71eae629e308174cd0ea36bc4fa2d2f29bf230d9`.

W6's preexisting cross-widget Chromium runner remains **NOT RUN**, blocked on W4-owned `.github/workflows/quality.yml` integration tracked by [issue #169](https://github.com/DoorBlox/orbit/issues/169). Existing W6 RED [PR #175](https://github.com/DoorBlox/orbit/pull/175) is a **separate unmerged synthetic crash-lifetime FAIL** and is not included on main or in this green-intended branch. Source/CI/deployment/owner-device claims must remain separate.


### W6 cross-feature deferred-save verification, exact-head closeout

The two new Node acceptance cases are **PASS**, explicitly listed as tests #535 and #536 in [quality run 43334033008](https://github.com/DoorBlox/orbit/actions/runs/43334033008): `W6: deferred multi-feature storm -> failed CAS -> complete portable recovery -> newer retry` and `W6: reentrant deferred export cannot mix old Task with newer Journal/Sticky/Project`. `npm test` summary: **581 tests, 581 passed, 0 failed**. Other exact-head checks: [local PostgreSQL RLS 43334033091](https://github.com/DoorBlox/orbit/actions/runs/43334033091), [anonymous protection 43334033027](https://github.com/DoorBlox/orbit/actions/runs/43334033027), [Production artifact dry run 43334033108](https://github.com/DoorBlox/orbit/actions/runs/43334033108) — all SUCCESS. These are automated synthetic source tests, not a live owner workspace or the W6 standalone Chromium runner. W3 actual UI adoption of deferred API is still tracked in [issue #115](https://github.com/DoorBlox/orbit/issues/115).

**Still pending, unchanged:** W4 [issue #169](https://github.com/DoorBlox/orbit/issues/169) must wire standalone `tests/qa_acceptance_cross_widget.py` into `static-quality`, after which W6 will inspect real Chromium evidence. W6 proposed crash-durable drafts [draft RED PR #175](https://github.com/DoorBlox/orbit/pull/175) remain unmerged and [issue #171](https://github.com/DoorBlox/orbit/issues/171) remains open pending W1/W3/HQ safe recovery contract and owner requirements. No hosted/Production action or real owner-device testing has been performed.
