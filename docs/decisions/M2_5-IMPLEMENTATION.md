# M2.5 Motion Polish — implementation complete

6 November 2026 (Asia/Jakarta). Branch: `codex/m25-motion-polish`.
Baseline: `DoorBlox/orbit` main `f2719f3b83c3ce906bee826576c134de15b35f6d`.
M2 remains conditionally accepted; M3 is not started. No deployment is authorized.

## Result and commits

| Commit | Reviewable change |
| --- | --- |
| eca7fa3 | Preserve previously accepted M2 evidence/test fixtures and M2.5 discovery, separately from source implementation. |
| dc0f022 | P0-A: background wheel and graph zoom cancel obsolete camera flights, including clamped zoom commands. |
| 9c68297 | P0-B: active camera/spring motion respects reduced motion by the next frame; initialization/navigation handles are tracked and cleared on teardown. No preference listeners were added. |
| 34844b6 | P1-A: elapsed-time accumulator retains the original 60Hz spring coefficients, with at most four catch-up steps after a pause. |
| 93c821e | P1-B: remaining touch pointer rebases to pan without jumping; cancellation/lost capture clears gesture state safely. |
| 705d5fb | Keyboard arrow pan also cancels obsolete navigation; five-profile browser/lifecycle tests and CI coverage. |

Only `src/board.js`, `src/constellation.js` and the camera-keyboard handling in
`src/app.js` change application behavior. CSS, layout, bounds, anchors, navigation
durations/easing, widget save boundaries, data model, Auth/cloud/RLS, conflict
handling, dependencies and public-release settings are unchanged. P2 timing/panel
changes were considered and deferred: discovery found no concrete usability
evidence to justify them. No decorative animation was added.

## Verification

- **Test-first:** original defects failed focused unit/browser cases before each
  fix. Eighteen deterministic motion tests now cover input priority, anchors,
  clamped zoom, runtime reduced motion, teardown, 60/120Hz settling, original
  60Hz response, background pauses and pinch/cancellation at three host scales.
- **Required checks:** `npm run check` PASS, **156 tests, zero failures/skips**;
  syntax, static build, structure and source integrity pass. Changes were reviewed
  before each `npm run record:source -- --reviewed`; V6/M1 provenance remains
  immutable. The existing current-source M2 manifest intentionally records the
  reviewed M2.5 changes under the documented workflow; no integrity bypass.
- **Motion browser:** `python tests/qa_m25.py --source` and final
  `python tests/qa_m25.py` PASS, **25/25 each**. Desktop, tablet, 390px, 320px and
  landscape cover interruption (wheel/toolbar/keyboard), runtime reduced motion,
  aligned node/edge settling, actual Chromium touch-event pinch → pan and logout
  canceling all animation handles/no later rendering. Motion emits no cloud save
  and does not change widget layout or access legacy storage. CI runs this suite.
- **Existing browser regressions:** `python tests/qa_m1.py` PASS all five viewports,
  touch/keyboard widget persistence, backup/recovery/undo, dates/accessibility and
  100/500/2000-task density; `python tests/qa_m2.py` PASS **24/24**;
  `python tests/qa_m2_closeout.py` PASS **5/5**.
- **Review:** source diff, synthetic before/after desktop/mobile screenshots,
  whitespace and unchanged restricted files reviewed. No new packages, hosted
  requests, onboarding or database test setup were needed.

[Verification summary and hashes](../evidence/m2_5/implementation/verification.json)
and the adjacent JSON results preserve final evidence. Baseline screenshots remain
under `../evidence/m2_5/discovery/`; after screenshots are in `implementation/`.
The locally ignored full run logs are `/workspace/.orbit-tools/m25-*.log` and
test-first outputs are `m25-*-red.tap`/`m25-keyboard-red.log`. These contain synthetic
test information only. The browser harness waits for coalesced touch events and
uses CDP's released-point encoding; no assertions were disabled to obtain PASS.

## Delivery and limits

P0/P1 are complete and locally verified. Physical Safari/Android and physical
120Hz-device performance were not measured; deterministic clock and Chromium
touch evidence are not hardware certification. M2's accepted hosted write/CRUD
authorization gaps remain unchanged. No Production/Supabase/Auth/RLS/DNS/protection
changes or hosted account deletion occurred; the original repository was untouched.

GitHub Git access works, but the GitHub API returned Forbidden during the read-only
PR capability check. The feature branch and prepared PR description are the
reviewable delivery; no PR number, remote CI run, merge or deployment is claimed.

Rollback, if later required: revert the motion commits on a branch in reverse
order, retaining the accepted M2 evidence checkpoint and their matching manifest
reversions; run required checks before any separately authorized deployment. No
database rollback or owner reassignment is involved.
