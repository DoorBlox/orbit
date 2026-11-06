# M2.5 Motion Polish — discovery and proposal

6 November 2026 (Asia/Jakarta). Historical discovery/proposal; the owner subsequently
authorized autonomous implementation. See [completed P0/P1 results](M2_5-IMPLEMENTATION.md).
The findings below record the pre-change baseline. No deployment has occurred.
Repository: `DoorBlox/orbit`, HEAD `f2719f3b83c3ce906bee826576c134de15b35f6d`.
The existing M2 acceptance/test/documentation work remains in the workspace and
is preserved. Application source is unchanged. Read AGENTS.md, CODEX_HANDOFF.md
and M2-TO-M2_5-HANDOFF.md before this audit. The current user request authorizes
M2.5 discovery/proposal only; the older historical M0-only instructions do not
replace that scope. M2 remains conditionally accepted for protected private use.

## Recommendation

Start with **P0-A: manual camera input must take ownership immediately**. Correct
two reproduced interruption defects without changing layout, easing, timing,
widget persistence or cloud behavior. Then address the runtime reduced-motion
gap. Preserve direct object tracking; do not add widget inertia or decorative
bounce to simulate tactility.

## What already works

| Interaction | Actual baseline behavior | Preserve |
| --- | --- | --- |
| Outer spatial camera | Cubic ease-out navigation: focus 520ms, overview 600ms; direct background pan, wheel pan and anchored zoom; touch pinch transitions back to single-finger pan. | Anchors, bounds, intended destination, navigation semantics and keyboard visibility correction. |
| Inner constellation camera | Cubic ease-out focus 470–500ms, overview 450ms; direct anchored zoom; pointer/wheel handlers already cancel navigation in several paths. | Radial hierarchy, focus selection, readable task targeting and existing wheel intent. |
| Widget drag/resize | Pointer capture; movement divided by current board scale; updates immediately; save occurs on release/cancel, not on every pointer move. Keyboard move/resize exists. | Exact user coordinates/dimensions, release semantics and responsive tracking; widgets currently stay where placed rather than spring back. |
| Graph elasticity | Nodes and connected geometry move together; node offsets spring back after release. This is different from persisted widget positioning. | The personal elastic character and the distinction between temporary node offsets and saved widgets. |
| Hover/selection/focus | Node border/shadow, task glow, action opacity and visible focus already exist; task details expand in-flow with grid/opacity transitions and support click/keyboard pinning. | No replacement cards, new selection model or hover-only critical actions. |
| Panels/journal | Milestone form and mobile places map toggle immediately; journal page content swaps immediately with commit/render. Expanded constellation reparents/resizes the same widget. Toast already transitions. | Editing/caret, focus and saved content; no page-turn animation or delayed editability required. |
| Loading/saving | Existing live status text covers checking, saving, saved, offline, conflict and errors. Private app hides until verified hydration. | Truthful immediate state changes and controls; no fake progress, delayed status or animation that retains private DOM on logout. |
| Reduced motion | New JS navigations snap immediately; spring offsets clear; CSS disables ambience/breathing and nearly eliminates transition durations. | This substantial existing support; do not describe reduced motion as absent. |

## Discovery evidence and limits

Local Chromium probes used the existing qa_m2 source server and synthetic mocked
cloud fixture at 1440×900 and 390×844, with normal motion enabled. This was a
targeted diagnostic, not repeated M2 onboarding/acceptance. Source is unchanged;
no real credentials or hosted requests were used. The phone probe is viewport
emulation, not physical touch/Safari evidence. Navigation probes emitted zero
mock cloud saves, and checked board layouts stayed unchanged.

Saved [observations](../evidence/m2_5/discovery/observations.json), baseline desktop/
phone screenshots and the diagnostic script are under `docs/evidence/m2_5/discovery/`.
Screenshots contain only synthetic fixture content and show the existing visual
identity; they do not demonstrate an implemented after-state.

- **Reproduced, P0-A:** during a board focus flight, a background wheel input
  immediately changed pan by −120px, but the pending animation returned to the
  original no-input destination (residual manual delta 0px), on both viewports.
  `src/board.js:196` handles wheel panning without canceling `this.raf`.
- **Reproduced, P0-A:** clicking inner zoom-in during node-focus navigation changed
  scale immediately, but the continuing camera RAF finished at the original
  focus target. `src/constellation.js:79` does not cancel the animation; toolbar
  and keyboard callers use this path. Wheel/pointer handlers already cancel it.
- **Reproduced, P0-B:** switching prefers-reduced-motion to reduce during board
  navigation stopped ambient CSS animation but camera position continued moving
  during a subsequent 90ms observation (about 647px desktop/245px phone in this
  particular run). JS checks preference only when starting the animation, not
  during its frames. The graph camera/spring has the same start-only check in source.
- **Source-confirmed, P1-A:** graph spring integrates one fixed step per RAF with
  k=.088/friction=.77, ignoring elapsed time. The source equation with a 100-unit
  offset takes 46 frames to its threshold: about 767ms at 60Hz versus 383ms at
  120Hz. This is a recurrence simulation, not measurement of two physical devices.
- **Source-confirmed, P1-B:** inner graph pinch ends by clearing the gesture when
  one finger remains (`constellation.js:136`); the remaining finger cannot pan
  until a new gesture. Outer board explicitly rebases it to one-finger pan
  (`board.js:194`). Physical-device severity is not measured.

No claim is made that dragging is presently slow, ambient motion causes measured
jank, missing panel animation is a defect, or all discovered paths require a redesign.

## Prioritized proposal

| Priority | Current issue / proposed behavior and benefit | Files/components | Timing/easing/interaction rule | Acceptance and focused test |
| --- | --- | --- | --- | --- |
| **P0-A essential** | Old camera flight overwrites wheel pan or graph zoom. Let the newest explicit camera input cancel the old flight before applying its delta. Restores user control. | `src/board.js` onWheel; `src/constellation.js` zoomBy; focused tests. Existing `src/app.js` callers need no intended change. | Cancel in the same input handler; no extra easing or input delay. Preserve current 520/600/470–500ms timings and anchors in this first slice. Even a clamped zoom command takes ownership. Excluded native inner scrolling stays excluded. | Interrupt focus/overview at several points using wheel, toolbar and keyboard; after two frames and after the old deadline, latest input persists. Layout/dimensions and mock save count unchanged. Normal/reduced-motion, desktop/390px. |
| **P0-B essential** | A preference change does not stop in-flight JS motion. Finish the latest requested camera target immediately and clear elastic offsets when reduce becomes active. | Board animate/dispose; constellation animateCamera/startSpring/dispose; focused tests. | Preference change handled by next frame at latest. No spring, fade or waiting period. Cancel obsolete callbacks; direct pointer tracking remains direct. If using matchMedia listeners, remove on dispose. | Toggle preference mid-board/graph/spring motion; no continued interpolated movement after handling; same final target/layout; no duplicate callbacks after remount or logout. Initial reduced-motion behavior unchanged. |
| **P1-A valuable** | Fixed per-frame elasticity feels different across refresh rates. Make spring integration elapsed-time based, preserving the current 60Hz character. | Constellation startSpring; deterministic timing tests. | Begin by calibrating a bounded fixed-step accumulator at 1/60s using existing coefficients; cap catch-up after background pauses, terminate at current threshold. Do not replace it with arbitrary widget bounce. | Simulated 60/120Hz timelines converge with comparable wall-clock settling (target within 10%); no explosive catch-up after a long pause; reduced-motion immediate; shared nodes/edges remain aligned. |
| **P1-B valuable** | Inner pinch loses one-finger continuation. Rebase the remaining pointer to pan, mirroring outer board behavior. | Constellation pointerUp/pointerMove; touch browser tests. | Immediate handoff at current camera and remaining pointer coordinates; no inertia or jump; cancellation/lost-capture clears safely. | Two fingers → one finger → move continues panning without a new touchdown, then releases cleanly. Test at nested board scales and on touch emulation; physical-device caveat remains explicit. |
| **P2-A optional** | Focus flights of roughly half a second contrast with instant zoom. After interruption is fixed, review a modest duration harmonization for faster intentional navigation. This is a tuning hypothesis, not a proven defect. | Board/constellation camera timing constants and evidence. | Trial ordinary focus 320–380ms, overview 420–480ms, existing cubic ease-out; new targets restart from the current camera. Wheel/pinch/drag stay immediate. Reduced-motion 0ms. | Side-by-side synthetic recordings, same endpoints and readable orientation; choose values by review, not assumption. Do not change the first slice merely to bundle tuning. |
| **P2-B optional** | Immediate panel/page changes can optionally gain restrained continuity, but no usability failure is established. Retain existing hover/reveal by default; test pointer-intent only if repeated unwanted expansion is observed. | CSS; optional presentational hooks in board/widgets/journal, individually reviewed. | Mobile places-map content opacity 100–140ms; optional journal noneditable chrome opacity 80–120ms. No size/position tween across the world, 3D page flips, delayed caret/focus, or exit retention. Preserve 250ms in-flow task reveal initially; hover delay is not preapproved. | Essential content is immediately usable; focus/ARIA state agrees; rapidly open/close or change pages without stale content. Reduced motion instant. Private hide/logout never waits for a transition. |

## Tactility and performance rules

- Preserve 1:1 widget tracking and the current release coordinates. No smoothing
  lag, inertia, magnetic snap, grid alignment, scale-on-drag or post-release drift.
  Existing grip/resizer active feedback stays. A whole-widget lift/shadow would be
  a separate optional visual proposal, not a presumed missing feature.
- Widget moves currently update left/top and navigator cursor on pointer events;
  resize necessarily updates dimensions. Do not rewrite them to transforms blindly.
  If profiling shows redundant per-frame work, coalesce rendering to at most one
  RAF while flushing the exact final coordinate before the existing save boundary.
  Treat that optimization as conditional on evidence, not a mandatory dependency.
- Preserve atmospheric animation. Do not add continuous effects or a motion
  library. Existing blur, will-change and SVG updates warrant profiling before
  expanding animated area; there is no measured frame-rate claim in this audit.
- Animate only the affected view; save-state semantics, debouncing, errors,
  conflicts, exportability and immediate privacy cleanup must not change.

## Smallest useful slice and approval boundary

**Proposed slice 1 = P0-A only:** two camera interruption fixes, narrowly scoped
unit/browser regressions and required reviewed source-inventory/documentation
updates. No CSS, duration tuning, spring changes, gesture redesign, library,
Auth/cloud/schema changes or deployment. Baseline screenshots already exist;
record after-state interaction evidence only after this slice is approved.

For implementation verification, reproduce these specific interruption probes
first, test normal/reduced motion and inner/outer input boundaries, then run the
repository's required checks after source changes. Add one mocked cloud assertion
that navigation emits no snapshot save; check immediate cleanup during logout.
Do not repeat hosted M2 acceptance or require live credentials. Broader 320px,
tablet, landscape, 100/500/2000-task profiling belongs to the later affected
motion slices, not an excuse to reopen M2.

Retain the existing six-window world, layout/data model, UUID owner gate, RLS,
session handling, revision conflicts, public-read-disabled state, legacy storage,
sanitization and backup compatibility. No Production/DNS/Supabase/Auth/protection
change, original-repository modification, M3 work or nonowner-account deletion.

**Stop here for owner review.** P0/P1/P2 are proposed priorities, not an
authorization to implement them. Discovery and proposal are complete.
