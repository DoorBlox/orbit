# M2 acceptance and proposed M2.5 Motion Polish handoff

6 November 2026 (Asia/Jakarta).

## Authority and status

**M2 is conditionally accepted by the owner for protected, password-based private
use.** The owner explicitly accepted the documented unverified checks in this
conversation. This supersedes the earlier OPEN / GO-recommended assessment.
It is not unrestricted production readiness or approval to change infrastructure.

**M2.5 update: discovery/proposal authorized by the owner; implementation remains
unapproved.** See [motion audit and proposal](M2_5-MOTION-AUDIT-PROPOSAL.md).
No new test run, environment onboarding, deployment or hosted write was performed
to prepare this handoff. M3 remains out of scope.

## Verified baseline and evidence

- Repository: `DoorBlox/orbit`; verified remote main and local HEAD:
  `f2719f3b83c3ce906bee826576c134de15b35f6d`. Local task branch: `work`.
- Existing protected preview:
  `https://orbit-cuknyrum7-doorbloxs-projects.vercel.app`.
- Development Supabase: `orbit-development` / `ixfgavgtwuzdgucjriec`.
  Owner assignment is complete; public reads remain false. Never repeat assignment.
- The acceptance/test/documentation additions in this workspace are not part of
  the baseline commit. No commit, push, merge, new deployment or promotion is
  claimed. The latest application source remains the reviewed M2 baseline.
- [Consolidated close-out](M2-HOSTED-CLOSEOUT.md),
  [source audit](M2-HOSTED-AUDIT.md), and
  [preserved evidence manifest](../evidence/m2/acceptance-20261106/manifest.json).

Preserved results: 138 unit tests; original local five-viewport/touch browser QA;
24 mocked cloud browser cases; five added mobile/offline/CRUD/undo/integrity cases;
147 actual local SQL assertions; three concurrency scenarios; real local
GoTrue/PostgREST/SDK/browser integration. All passed. The archive contains existing
JSON results and unit/SQL/HTTP logs, with SHA256 hashes; nothing was rerun.

Hosted evidence is owner reported: eight browser observations passed, live RLS
metadata inspected, and direct authenticated nonowner read isolation passed all
10 checks at `2026-11-06T08:26:03.218Z`. Owner RPC returned false, snapshot RPC was
403/42501, and all eight queried tables returned zero accessible rows. No hosted
mutations were executed by that probe. Do not recategorize local/mocked evidence
as hosted verification or read isolation as write authorization.

## Accepted limitations and outstanding risks

| Gap/risk | Evidence boundary and disposition |
| --- | --- |
| Physical-device coverage | 320px/390px, tablet and landscape automation passed. Physical Safari/Android and exact-hosted-origin mobile behavior remain unverified. Keep this limitation visible in M2.5; do not claim hardware QA from emulation. |
| Hosted write/CRUD authorization | Live nonowner reads and policy metadata passed. Hosted INSERT/UPDATE/DELETE denial, forged-owner mutations and constraint rollback remain untested. Actual local SQL/Auth/API coverage passed but is not proof of deployed parity. Any hosted mutation testing needs a separately authorized safe fixture. |
| Recovery/provider behavior | Hosted sync/conflict recovery/logout passed and local offline/export/retry/discard passed. Real hosted outages, token expiry/provider interruptions and every multi-entity hosted variant were not separately injected. |
| Session/draft lifetime | Auth is in sessionStorage; unsaved drafts are in memory. Export before discarding/closing. Polling/focus refresh and revision conflicts do not provide automatic merge or guaranteed offline durability. |
| Other providers | OTP delivery and Google OAuth are not accepted as verified by password sign-in success. No provider configuration changes are in scope. |
| Motion regressions | Camera/elastic dragging, task reveal, fixed chrome and animations can interact with touch, focus, layout and cleanup. M2.5 must measure these paths and preserve final state. |

The owner accepted these limits for protected private use. None is silently marked
PASS or silently promoted into a required repeated test. Escalate a reproducible
failure or a requested expansion of use, not hypothetical concerns alone.

## Non-negotiable design constraints

Preserve the existing pastel animated atmosphere, glass-like surfaces and **one
continuous spatial scrapbook world** with six independently draggable/resizable
windows: timeline, constellation, active, completed, space and journal. No
replacement dashboard, tabs, sidebar, framework migration or visual redesign.

Preserve arbitrary-depth radial branches, elastic dragging, free-standing glowing
task text, inline details, deadline/urgency sorting, completed-task exclusion from
the constellation, unclipped milestone labels, dated paper-like WYSIWYG journal,
timeline journal markers, permanent Just Because branch and backup compatibility.
Keep touch navigation, keyboard focus and all existing task/journal actions.

Material visual changes need diagnosed evidence, desktop/mobile before-and-after
examples and explicit owner approval under AGENTS.md. Motion Polish does not waive
that rule. Do not overwrite original V6/M1 provenance or silently regenerate a
source manifest to bless unreviewed changes; use the reviewed integrity workflow.

## Security and persistence invariants

- Vercel protection and application Auth remain separate layers. Private content
  mounts only after verified getUser, true-only server owner RPC and hydration.
- UUID owner allowlist and restrictive per-owner RLS remain authoritative. No
  metadata/email-based ownership, signup shortcut or browser privileged key.
- Keep public reads and publicRelease false; preserve the explicit publication
  projection. No public sharing/release is implied by M2 acceptance.
- Do not change Auth, Supabase configuration/schema/RLS, DNS, Production,
  deployment protection or the original `hlarknnt/orbit-personal` repository.
- Preserve revision-checked serialized saves, PT409 conflict handling, retained
  drafts and explicit reload. Animation must not add writes or change save timing.
- Keep legacy local data unmodified and never auto-import it. Preserve journal
  sanitization, export/restore validation and stable identities.
- Logout/revocation clears private DOM and cancels client activity immediately;
  no exit animation may retain private content or delay cleanup. No credentials
  or real journal content in screenshots, traces, logs or reports.
- Preserve the hosted temporary nonowner account. Deletion requires owner approval.

## Proposed M2.5 work plan — for review only

1. **Inventory and measure.** Map current CSS transitions/ambient effects and
   camera/elastic interpolation in `src/styles.css`, `src/board.js` and
   `src/constellation.js`. Identify a concrete inconsistency or usability issue
   before proposing a change. Capture synthetic desktop/mobile and reduced-motion
   evidence; reuse valid M2 results instead of repeating onboarding or hosted QA.
2. **Review a bounded motion proposal.** Specify affected interaction, duration,
   easing, interruption behavior and reduced-motion alternative. Prioritize
   camera/focus continuity, drag settling and task reveal/control feedback. Tune
   ambient motion only when measured evidence justifies it. Propose no new
   dependencies, layout model, extra effects or data/Auth changes.
3. **Implement only after scope approval.** Use small reviewable slices, beginning
   with one agreed interaction. Preserve current final positions, hit targets,
   text legibility and stored state. Cancel animation callbacks on interruption,
   teardown and logout. Do not implement this step as part of the handoff.
4. **Validate the affected slice and present evidence.** Extend existing local
   Playwright tests with synthetic data. Compare before/after on the same runtime;
   run applicable provenance/build and regression checks after implementation.
   Keep physical-device results and mocked/local/hosted results separate. No
   deployment is part of this plan.

## Proposed M2.5 acceptance criteria

| Area | Required outcome |
| --- | --- |
| Scope/design | Only the approved motion interactions change; six-window spatial design, visual identity, content and navigation remain intact. Provide desktop/mobile before-and-after evidence. |
| Reduced motion | With prefers-reduced-motion, no ambient/elastic/camera motion that conflicts with that preference; actions reach the same final state and focus without animation dependency. |
| Interruption/input | Rapid navigation, repeated actions and interrupted drags/resizes settle to the newest intended state without jumping, blocked taps, stale callbacks or focus loss. |
| Mobile/accessibility | At 320px/390px, tablet and landscape, touch and keyboard controls remain usable, critical content/actions stay visible, and focus follows the intended viewport. Label emulation vs hardware evidence. |
| Persistence/security | No extra cloud writes or legacy-storage access from animation frames. Snapshots/IDs/layout survive relevant round trips; no delayed private cleanup or changes to authorization/conflict semantics. |
| Performance/lifecycle | Measure frame/long-task behavior on the same desktop/mobile profiles with representative 100/500/2000-task fixtures. Show no material regression and no accumulating animation loops/listeners after repeated mounts or logout; do not promise device-wide frame rates from local emulation. |
| Regression/provenance | Required existing checks and affected browser cases pass; reviewed source inventory matches approved changes; V6/M1 history remains intact. Report failures and unrun coverage honestly. |
| Delivery boundary | Reviewable diff, evidence and rollback notes only. No M3 work, infrastructure change, deployment or production promotion. |

M2.5 implementation awaits owner review of this proposed scope and criteria.
