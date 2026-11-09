# ORBIT — release and execution roadmap

**Current source of truth:** [2.4 verified state](CURRENT_STATE.md) and [post-2.4 execution blueprint](../plans/ORBIT_POST_2_4_EXECUTION.md). User approved documentation and BP-00–BP-06 reliability foundation; actual implementation and owner acceptance must be recorded separately. **Full upstream Excalidraw #31 is prioritized** with early EX-00 synthetic feasibility, then gated EX-01/EX-02; it is not yet shipped.

### Active: 2.4.x reliability

- [ ] BP-00 canonical docs/handoff PR (count complete only after merge, checks and state verification); app/package/backup versions kept distinct.
- [ ] BP-01 authenticated Production image verification (#26).
- [ ] BP-02 portable image-inclusive backup and supervised restore.
- [ ] BP-03 measured low-request, visibility-aware sync that keeps CAS safety.
- [ ] BP-04 migration version and SQL parity without remote writes.
- [ ] BP-05 archived/safe 2.4+ release pipeline, not pinned 1.0 workflow.
- [ ] BP-06 synthetic browser visual/accessibility/performance baseline; owner screenshots optional.
- [ ] EX-00 early official Excalidraw library/API/scene compatibility prototype with fake data.

### Next: visual quality and full Excalidraw

BP-07/08/09/10/11/16: token and responsive refinements, cheaper editor/sync/draw work and CI with baseline evidence. **EX-01:** integrate official lazy Excalidraw for journal and stickies with safe shapes/text/drawings after backup design and visual baseline. **EX-02/BP-12/BP-13:** private image assets/library and full media-aware editor closeout; do not delete files or invent a free hosting tier. BP-14 ICS/reminders and BP-15 OAuth/MCP are later scoped options.

---

> Everything below is retained as the dated historical roadmap, not a second live checklist. Checkboxes in archived sections reflect a point in time and are not current unfinished work.


## Live release — 2.4 (9 November 2026)

- [x] Ten saved themes, contrast-corrected clock/panels/paper, optional animated backgrounds and reduced-motion controls.
- [x] Scroll-safe, disclosure-driven Space settings; sticky-note markers and pointer/keyboard mini-map navigation.
- [x] Journal formatting, sticky Markdown preview and owner-scoped task checklists in existing private extensions (no DB migration).
- [x] Four exact-head checks, merged PR #33 and production READY deployment `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4` at `orbit.starscene.com`.
- [ ] Live signed-in image rendering and owner recovery check (#26); continue to monitor.
- [ ] True embedded Excalidraw (#31), private media library and deletion (#29), OAuth-scoped ChatGPT connector (#32), reminders/calendar and other blueprint items. These are *not* part of the live release.


## Historical: 2.4 coherent spatial experience (source was under review)

- [ ] Ten saved tactile themes and independent animated-background control; clock and controls follow theme contrast, not only canvas color.
- [ ] Minimap includes sticky notes and draggable/keyboard focus, with bounds and correct camera math.
- [ ] Space panel remains usable when resized small; rare tools grouped, accessible and scrollable.
- [ ] Journal formatting and sticky Markdown preview; per-task checklists saved privately with supporting links.
- [ ] All four required PR checks plus real-account Preview test before approved Production release. The owner authorized expedited Production on 9 Nov 2026; gating still applies.
- [ ] Actual Excalidraw React island ([#31](https://github.com/DoorBlox/orbit/issues/31)), reusable media library and safe delete ([#29](https://github.com/DoorBlox/orbit/issues/29)), scoped ChatGPT MCP connector ([#32](https://github.com/DoorBlox/orbit/issues/32)), reminders, calendar, and remaining blueprint features still not shipped.


## Historical: 2.3 private source branch planning (9 Nov 2026)

- [ ] Verify authenticated blob media previews and error/retry states; detached image references remain undoable with original files preserved (#26, #29).
- [ ] Check Parchment / Night Garden / Frost workspace appearance and reduced-motion preference on 320px phones, 174% and 200% zoom, keyboard and large text; keep the pan-and-zoom world and six widget positions intact.
- [ ] Finish navigator cursor bounds and separate caption QA.
- [ ] Review exact-head CI, protected Preview and accessibility before an explicitly approved release.
- [ ] Later: real upstream Excalidraw editor island (journal and sticky), private reusable media library with safe deletion, task checklists, reminders and optional connected integrations. These are NOT in the current code slice.


**Updated 9 November 2026.** The original V1–V6 creative evolution and M0–M6 delivery sequence are documented in [PROJECT_HISTORY.md](PROJECT_HISTORY.md). This is a **possible follow-up backlog**, not an authorization to deploy or a promise of features.

## Shipped

- [x] One continuous glass/pastel spatial world with six independently movable/resizable windows.
- [x] Radial task branches, active/completed views, timeline/milestones, paper-like dated journal, backups and mobile-oriented navigation.
- [x] Owner-only private cloud persistence with Supabase Auth/RLS and revision-aware recovery.
- [x] Motion/accessibility fixes and browser CI; public MIT source and free disposable database security tests.
- [x] Owner-approved protected Production 1.0.0 on `orbit.starscene.com`; secondary hostname redirects to it.

## Historical: 2.2.1 source-only patch plan

- [ ] Close signed private-image display defect [#26](https://github.com/DoorBlox/orbit/issues/26) after exact Supabase-origin CSP change, approved deployment and real browser confirmation. Private Storage RLS stays unchanged.
- [ ] Ship independent draggable sticky **Copy** action and browser backup/persistence regression; preserve the private image reference, no duplicate file writes.
- [ ] Ensure four required PR checks pass on exact head; keep the existing live 2.2 Production alias until reviewed promotion.

## Near-term quality and operations

- [x] Main branch protection is active with PR-only merges, no force push and four required status checks.
- [ ] Perform a privacy-safe post-authenticated **Production response** header/CSP check; preserve Vercel Authentication.
- [ ] Record physical Safari/Android/touch, large-font/screen-reader and high-refresh-rate regression results.
- [ ] Improve owner backup discipline: encrypted offsite copy and a supervised restore rehearsal against disposable data.
- [ ] Consider narrow hosted PATCH/DELETE authorization validation only with approved synthetic fixtures, baseline and rollback.
- [ ] Revoke/rotate short-lived Vercel staging token when not needed.

## Historical: future options proposed before 2.4 closeout

- [ ] Structured rich-text editor replacing legacy formatting commands without losing diary compatibility.
- [ ] Optional snapping/collision aids and additional layout presets without abandoning freeform movement.
- [ ] Deeper timeline views (hour to years), reminders, calendar/Classroom integration or study sessions.
- [ ] Stronger accessible navigation, privacy controls and performance at extreme task density.
- [ ] Google-first 2.2 beta is in source development; complete OAuth owner setup, hosted multi-user isolation, private media validation and separately approved staged Production release. See [rollout](OAUTH_2_2_ROLLOUT.md).

For current operations, deployment and rollback use [OPERATIONS.md](OPERATIONS.md). The user prefers no paid services and the original six-window aesthetic should be treated as a binding product requirement.
