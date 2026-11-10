# PJ-02B — functional private Projects spatial window

**Status:** source PR under review (not Production, not public portfolio publishing). This follows PJ-02A branch actions [PR #53](https://github.com/DoorBlox/orbit/pull/53) and SP-01B optional first-party widget mounting.

## Experience

- A real, first-party seventh `projects` widget is mounted through `SpatialBoard.registerWidget`. It starts near the existing six widgets at `(1940,155)`, can be moved/resized with keyboard or pointer, and is reachable from Space **◆ My projects** or Places map. Hide/Reopen persists in private `extensions.spatialWidgets`. The six original positions/sizes and legacy V6 root layout stay unchanged.
- Empty state offers an explicit branch selector and **Add private project**; the existing right-click/Shift+F10 branch action is unchanged. Project card title and path follow branch ID, with **Open branch** focusing the original constellation after expanding ancestor branches.
- Cards show project description, status (`active/paused/completed`), direct unique task count, including-descendant count, and a progress indicator based on task `status==='completed'`. A completed project status does not automatically mark its tasks completed. Zero tasks displays 'No tasks to measure yet', not 100%.
- Owner can edit status and description (up to 4,000 plain-text characters) using the existing `extensions.projects` validator and CAS-backed owner snapshot path; no new SQL. Links already present in private metadata render as validated external HTTP(S) anchors.
- Tasks are counted by stable unique task ID. Parent and nested project cards may show overlapping work by design, but the **top-level portfolio count** counts each task only once across all marked projects. No task, branch, journal, checklist or media data is duplicated or moved.

## Privacy and scope boundaries

- A private project is never a public post. No Publish action, anonymous endpoint, public Storage object, unreviewed HTML, third-party provider, cost-bearing service or permission change is introduced.
- Rendered strings use DOM text content. Existing private snapshot normalization and V6 backup extension validation remain in force; unknown optional widget IDs still stay inert data. The new source module is in the `scripts/build.mjs` distribution allowlist and tracked by the M2 reviewed SHA-256 manifest.
- In read-only views, creation and editing are unavailable. Current open-account privacy and RLS are the existing boundary. This work has no hosted SQL, Auth, RLS or Storage migration.

## Tests and release gate

- Unit tests exercise nested counts, unique ID deduplication, task status vs project status, no-task progress, orphan project rejection and input immutability.
- Real-origin Chromium QA exercises actual seventh window, private creation/status/description, branch focus, hide/reopen and reload, original six root layout unchanged, and phone viewport. Existing synthetic widget test is adapted to inject a separate **eighth scratch** window.
- Four exact-head PR checks required; then protected staging and real-account owner acceptance before any Production promotion. Since authenticated Production media QA remains open, do not claim it has been verified by synthetic test evidence.

## Next

PJ-03 adds deeper project briefs, milestones, next actions and blockers. PUB-00 plans a separate versioned curated private-to-public copy only after explicit publication review. BR-02 removes misleading collapsed empty terminals, and TOUCH-01 investigates touch mini-map dragging. See [prioritized backlog](../plans/ORBIT_PROJECT_EXPERIENCE_BACKLOG_2026_11_10.md).
