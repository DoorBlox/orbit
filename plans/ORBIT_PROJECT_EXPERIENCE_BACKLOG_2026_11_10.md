# ORBIT — Projects, portfolio publishing and spatial UX backlog

**Owner direction:** 10 November 2026. The owner approves future Production promotion **only when a feature is actually usable and passes release gates**. This approval is not consent to hosted SQL/RLS/Auth/Storage policy changes, publication of private material, deletion or paid services. No widget-count cap.

## Product principles

- A branch remains the canonical identity and task tree; a project label is private and reversible. Project widgets are alternative views, not duplicated data.
- A future public portfolio item is a **curated explicit copy** of approved public fields/assets, never direct access to the private project, journal, task snapshot or storage path. Draft, preview, publish, revise, unpublish are separate deliberate actions.
- Keep one continuous pannable ORBIT world, current saved six-window coordinates and an extensible first-party widget system. Do not replace it with a generic fixed admin dashboard.
- No mandatory sprints, points, leaderboard, productivity streak, external subscription or new React rewrite. Workflows should suit personal research, school, engineering and creative work.

## Project-management research (source-informed design, not copied UI)

- Linear describes project milestones with names, descriptions, target dates and progress, plus project updates with health indicators and a narrative of progress, risks and next steps. [Linear Projects](https://linear.app/docs/projects), [Linear Milestones](https://linear.app/docs/project-milestones), [Linear Updates](https://linear.app/docs/initiative-and-project-updates).
- Asana's project overview unifies project briefs, goals, resources and milestones; its portfolio view shows statuses, dates, ownership and progress across projects. [Asana Project Overview](https://help.asana.com/s/article/project-overview-tab), [Portfolio](https://help.asana.com/s/article/portfolio-management).
- ORBIT adaptation: private project hub with purpose, current status, next milestone and a small progress view; supporting notes/links/decisions; optional deeper details. Show **health** separately from **task-completion percent**. Do not require every project to have due dates or assigned people.

## Delivery sequence and acceptance

### PJ-02A — branch conversion UI (SOURCE MERGED; PR #53, four checks green)

- Add **Turn into project / Remove project status** in a real branch menu. Invocation paths: right-click, Shift+F10 or keyboard ContextMenu key on the focused branch, and the existing branch's visible More actions button for touch/keyboard. Keep menu legible at any graph zoom: fixed-position viewport overlay, focus management, Escape/Tab/outside dismissal, arrow keys, responsive bounds.
- Private identity uses validated `extensions.projects` and existing branch IDs. Show a subtle project tag in constellation. No task/branch movement or publication, no additional window yet. No new table, provider or dependency.
- Test nested branch conversion; marking and unmarking with unchanged task IDs/branch tree/layout; local reload, mobile width, keyboard navigation, protected read-only behavior, backup validity. Confirm no public content mutation. The E2E fixture is synthetic.

### PJ-02B — functional private Projects window (IN PROGRESS, source PR)

- Mount a **real seventh first-party Projects widget** via SP-01B registry, not a synthetic placeholder. Include empty state with a clear 'mark a branch' path, project list with names, status and direct/descendant task counts, and tap-to-focus navigation to the source constellation branch.
- Use a deterministic descendant set so parent and nested-project totals never double-count tasks in a portfolio summary. Show both *direct* and *including sub-branches* counts; disclose whether completed tasks are included. Progress = finished unique tasks / total unique tasks; no denominator means 'no tasks', not fake 100%.
- Search/filter and status/priority ordering can follow after stable minimal shelf. Keep hide/reopen/reload, touch/keyboard and narrow layout; verify owner-private CAS persistence and V6 backup roundtrip. Create no public pages.

**Implementation note:** PJ-02B now includes basic description/status editing as a meaningful private MVP, with an eighth scratch widget in synthetic regressions. Full goals/milestones/blocks remain PJ-03. [Source contract](../docs/PJ02B_PROJECTS_WINDOW.md). No public publishing or Production promotion yet.

### PJ-03 — private project detail and management (PROPOSED)

- Editable plain-text project description and purpose, validated resource links, status `active/paused/completed`, a short **next action**, optional outcome/goal and dates, milestones with target dates, and a concise blockers/decisions log.
- Use the project branch's existing tasks as the work source; task checklists remain task-level. Add independent project notes only if necessary, with bounded normalized private extension fields. Avoid unrelated database migration and conflicting task status vocabularies.
- Optional Board/Timeline views and personal progress updates only after single-place editing works. Review milestone, risk and health labels separately from simple completion.

### PUB-00 / PUB-01 — project-to-public portfolio (PLANNED, hosted-gated)

- Define allowlisted public snapshot fields (title, slug, short summary, goal, outcome, tags, approved links, approved cover/gallery media, optional technology/role and dates). Never include private task details by default, journal body, local attachments, private URLs or internal branch IDs.
- The owner explicitly chooses content, previews exactly what anonymous viewers will see, and presses Publish. Create a versioned public projection with `draft/published/unpublished` lifecycle; updates to private metadata are **not** auto-published; a later public update is separately approved. Unpublish revokes anonymous access to the projection without deleting the private project.
- A review of SQL/RLS, public asset copying/ownership, CSP and rollback precedes any hosted migration, route or storage write. Portfolio website remains separable from the private ORBIT workspace and may co-exist with future opt-in Journal-to-blog publishing.

### BR-01 — nested collapse discoverability (TRACKED UX)

- **Verified current implementation:** `createLayout` and `normalizeCollapsedBranches` support collapsing any branch ID with children, regardless of depth; `tests/qa_m1.py` already covers nested collapse persistence and keyboard ArrowLeft/Right. It is not hard-coded to depth 1.
- Reported pain: nested collapse controls can be difficult to find and child nodes disappear while an ancestor is collapsed. Audit tap target, visual affordance, branch breadcrumb/reopen path, and compact world layout. Keep collapsed state stable through rename/reparent/search/reload; avoid hiding data permanently.

### BR-02 — remove misleading collapsed 'add something here' terminal (TRACKED UX)

- `src/layout.js` currently treats a collapsed branch as a terminal stack; `src/constellation.js:buildStack` inserts `add something here  +` for an empty stack. That is not meaningful when the branch is collapsed.
- Render no placeholder or empty tail for collapsed branches without direct tasks. Preserve a genuine empty-state affordance for *expanded leaf branches* only. Test at nested depths, with/without direct tasks and after reload; preserve focus and connection rendering.

### TOUCH-01 — smooth touch mini-map dragging (TRACKED BUG)

- Owner reports snappy/unreliable dragging of the map's focus viewport on touchscreen. Reproduce **navigator viewport-outline drag** (and distinguish from constellation-node spring motion) at 320/390/tablet widths, different world scales, one/two-finger gestures and device pixel ratios.
- Investigate pointer capture, gesture thresholds, touch-action, pointercancel/lostpointercapture, viewport-to-world coordinate conversion and rAF smoothing. No change to persistent widget position or map camera coordinates until measurable evidence; test with Chromium touch emulation then physical devices.

### AUTH-MASCOT — playful login experience (FUTURE DESIGN)

- Explore an original ORBIT mascot, expressions and tiny context-aware motion, a welcoming sign-in hero and optional seasonal variation. Keep the branded sign-in safe and recognizable, lightweight, contrast-correct, fully keyboard-accessible and reduced-motion friendly.
- Do not modify Supabase OAuth redirects/Auth/RLS or expose owner data for decoration. Mascot identity, poses and asset/license review will come before high-fidelity artwork or rollout. No mascot image is required in this work unit.

**PJ-02A source acceptance:** [PR #53](https://github.com/DoorBlox/orbit/pull/53), squash `0b2df5d6709014adef78c8348d98ecc5ca241186`, exact-head four checks green. Chromium covers nested/phone and private mark/unmark, but screenshots have not received independent visual signoff and signed-in Production still requires owner verification.

## Release decision

PJ-02A alone is a supporting action but **not a complete usable Projects experience**; hold Production until PJ-02B or later provides a meaningful project-management window and passes exact-head checks, protected Preview, privacy/CSP/regression review, signed-in owner testing and a documented rollback. The owner has conditionally approved such a gated promotion. Do not treat this note as approval to publish projects or alter hosted database permissions.
