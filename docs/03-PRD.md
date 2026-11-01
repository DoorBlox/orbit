# 03 — Product Requirements Document (PRD)

## Product statement

ORBIT is a private **spatial scrapbook** for viewing relationships among identity/roles/projects/next actions, seeing their time context, and recording life in a journal without reducing the experience to productivity metrics. Preserve the original V6 UI; ship it incrementally rather than re-architecting the experience as a multi-page SaaS dashboard.

## Problem and outcome

- **Problem:** cognitive cost of keeping many pending commitments in working memory, unclear action criteria, and lack of room for purely enjoyable projects.
- **Outcome:** one coherent model of tasks across spatial graph, sorted lists, and timeline; clear actionable steps, feasible scheduling, protected reflection.
- **Success evidence (proposed, not achieved):** quick capture within 1 interaction beyond typing title; no lost data after confirmed save, no cross-account read, smooth interaction on representative desktop/mobile, readable focused task, zero duplicate task representations.

## Users and permissions

- **Owner (signed in):** create/read/update/delete own branches, tasks, milestones, journal entries, widget layout, preferences; export/restore own data.
- **Unauthenticated:** access only public login shell once authentication is implemented; never read private content or private app records.
- **Public demo:** not a production user role. The current V6 local sample mode must not silently create or upload a demo dataset into a real account.
- **Collaborator/admin:** out of MVP scope. No privileged browser key or anonymous write path.

## Functional requirements and acceptance criteria

| ID | Requirement | Acceptance (measurable) | V6 status |
|---|---|---|---|
| FR-01 | Pan/zoom one continuous scrapbook space | Pan/zoom does not reset widget positions; keyboard & touch equivalents | local implemented |
| FR-02 | Resize/reposition six widgets | Position/size persists after refresh and JSON backup/restore | local implemented |
| FR-03 | Arbitrary-depth branches | Can add/move/rename without cycles, hierarchy reflows | local implemented |
| FR-04 | Plain text terminal tasks | No boxed task cards; task hover/tap reveals detail below title | implemented |
| FR-05 | Quick capture | Valid title creates task in current branch; blank rejected | local implemented |
| FR-06 | Task completion criteria | User can read/edit criteria and status without leaving map | local implemented |
| FR-07 | Deadline/urgency sorting | Toggling mode changes order and meaningful text coloring | implemented |
| FR-08 | History semantics | Completion removes task from active graph, preserves it elsewhere | local implemented |
| FR-09 | Calendar context | Zoom timeline, view deadlines and milestone labels unclipped | local implemented |
| FR-10 | Journal pages | Create, edit WYSIWYG, change date, navigate, delete+Undo | local implemented |
| FR-11 | Journal-date links | Nonempty dated page produces clickable timeline marker | local implemented |
| FR-12 | Local recovery | JSON includes branches, tasks, journal, milestones, preferences, layout | local implemented |
| FR-13 | Task exchange | CSV import/export retains supported fields | local implemented |
| FR-14 | Secure identity | Account owner can sign in/out; session restore and logout gating | missing |
| FR-15 | Owner-only sync | Owner's data loads on second device; other user cannot access records | missing |
| FR-16 | Conflict handling | Concurrent change behavior documented, tested, recoverable | missing |
| FR-17 | Safe migration | Reviewed local backup explicitly imported without duplicate/partial writes | missing |
| FR-18 | Secure deployment | Protected preview; production only after RLS, security, data tests | missing |
| FR-19 | Transparency | Errors distinguish offline/unsaved/save failures, include retry | missing for cloud |
| FR-20 | Personal freedom | Just Because and journal have no compulsory schedule/streak | preserved |

## Non-functional requirements (targets; NOT verified)

- **Security:** TLS on deployed origins, disabled public signups, owner-only RLS, no service-role key in frontend, secure redirect allowlist, no diary in telemetry/errors.
- **Reliability:** an acknowledged save must survive refresh and appear on authenticated second device; retry/rollback instead of silent overwrite.
- **Performance:** target stable ~60 FPS on a mainstream desktop and usable ~30 FPS on a mid-range phone with 500 tasks; test 100/500/2000 examples, throttle animations; track bundle size and layout latency. Not a guarantee.
- **Accessibility:** WCAG 2.2 AA aspirations: keyboard reachability, screen-reader alternatives for canvas-like graph, labelled controls, visible focus, reduced motion/transparency, ≥4.5:1 normal text contrast, target size guidelines and mobile text scaling.
- **Privacy:** explicit separation of demo/local/cloud; journal never uploaded before consent; export/delete and retention policy before public release.
- **Maintainability:** modules remain separated (board, graph, widgets, journal, model, data, storage); no framework migration without an ADR and design regression tests.
- **Cross-platform:** Chromium/Firefox/Safari on desktop, Safari iOS, Chrome Android, 320–1440px responsive; physical verification pending.
- **Observability:** sanitized error/health signals only; no task names or journal body in logs.

## Key user stories

- **US-01** As owner, I can capture an unstructured thought with only a title and organize later.
- **US-02** As owner, I can focus a branch to see tasks, their criteria, and resource URL without a modal.
- **US-03** As owner, I can tell which of my tasks is imminent versus important by switching deadline/urgency modes.
- **US-04** As owner, I can mark an action done and still find evidence of completion in history.
- **US-05** As owner, I can move/rescale any widget and recover my layout across sessions.
- **US-06** As owner, I can write privately on a dated journal page and navigate to it through time.
- **US-07** As owner, I can export or restore a snapshot without surprising deletion or silent data loss.
- **US-08** As owner, I can sign in from phone and laptop and see the same data while keeping it from strangers.
- **US-09** As owner, I can have a branch dedicated to play and rest without fabricated urgency.

## Product boundaries and deferred ideas

Reminders, Pomodoro, Google Classroom (possibly multiple accounts), calendar sync, smart action suggestions, drag-to-reparent, attachments/Storage, and collaborative roles were mentioned in the wider product conversation but **do not exist in V6**. They are explicitly post-core MVP, not a precondition to the first secure release. Do not implement them without a separate scoped product decision.
