# 02 — Evidence-based feature audit (V6)

**Status key:** `FULLY FUNCTIONAL` means exercised in the offline prototype only, not production-grade. `FRONTEND-ONLY FUNCTIONAL` means it works in browser but has no cloud/state integration. `SIMULATED/MOCK` means illustrative/test data or a presentation without live external sources. `INCOMPLETE` means partially supported with a known gap. `MISSING` means no implementation. Source references below are actual files and entry points, not inferred API endpoints.

| Capability / trigger | Current status | Source evidence | Production gap |
|---|---|---|---|
| Single spatial coordinate world, pan, zoom, fit | FULLY FUNCTIONAL | `index.html#spatial-viewport`; `src/board.js` | user layout sync, production-origin E2E |
| Six spatial windows, independent positions | FRONTEND-ONLY FUNCTIONAL | `src/board.js` `positions`, `moveViaKeyboard` | DB `widget_layouts`; collision/snap optional |
| Title/grip pointer dragging | FULLY FUNCTIONAL | `src/board.js` `dragStart`; V6 browser QA | Mobile real device not verified |
| Resize via corner and keyboard | FULLY FUNCTIONAL | `src/board.js` `resizeStart`/`resizeViaKeyboard`; V6 QA | cloud sync, widget persistence conflicts |
| Mobile spatial navigator | FRONTEND-ONLY FUNCTIONAL | `src/board.js` `buildNavigator` | screen reader/physical phone verification |
| Ambient drifting pastel background | FULLY FUNCTIONAL | `index.html.ambient-stage`, `src/styles.css` | battery/GPU benchmarking |
| Unconstrained nested branches | FRONTEND-ONLY FUNCTIONAL | `src/data.js`, `src/constellation.js` | DB hierarchy, cycle constraints |
| Root/name bubble and responsive focus | FRONTEND-ONLY FUNCTIONAL | `src/constellation.js`; CSS `.node-root` | name currently hardcoded (`src/data.js`) |
| Automatic radial layout + task horizon | FRONTEND-ONLY FUNCTIONAL | `src/layout.js` | large-data stress/virtualization |
| Springy graph node pull | FULLY FUNCTIONAL | `src/constellation.js` `startSpring` | animation performance in low-end phones |
| Branch create/rename/move | FRONTEND-ONLY FUNCTIONAL | `src/app.js` handlers | RLS, transactional consistency, undo support |
| Quick task creation (title only) | FRONTEND-ONLY FUNCTIONAL | `src/app.js` `quickCapture` | Auth, persistence, mutation error states |
| Search/find existing tasks | FRONTEND-ONLY FUNCTIONAL | `src/app.js` `matches` | search across larger dataset, debounce/index |
| Task details: status, criteria, description, URL, effort, urgency, due | FRONTEND-ONLY FUNCTIONAL | `src/constellation.js` task editor + `src/model.js` | server validation and authorization |
| Deadline/urgency colors and order | FULLY FUNCTIONAL | `src/model.js` `taskColor`,`sortedProjectTasks` | timezone and accessibility tests |
| Terminal tasks as glowing text (not cards) | FULLY FUNCTIONAL | `src/styles.css` `.task-stack,.task-row,.task-text` | typography at tiny overview scale |
| Hover/tap task expands description inline | FULLY FUNCTIONAL | `src/constellation.js`/CSS `.task-reveal` | touch+screenreader audits |
| Mark complete / reopen from widgets | FRONTEND-ONLY FUNCTIONAL | `src/app.js` `onComplete`/`onRestore`, `src/widgets.js` | DB state, timestamps and conflicts |
| Active and completed widgets | FULLY FUNCTIONAL | `src/widgets.js` `renderLists` | DB paging and realtime optional |
| Deadline timeline, horizontal zoom/today | FRONTEND-ONLY FUNCTIONAL | `src/widgets.js` `renderTimeline`,`adjustZoom` | robust >1000-task density tests |
| Create milestone | FRONTEND-ONLY FUNCTIONAL | `src/widgets.js` `initTimeline` | DB `milestones` |
| Remove milestone (two-click arming) | INCOMPLETE | `src/widgets.js` `armed` click timer | fragile UX, no undo; design review required |
| Dated journal pages / editable date / navigation | FRONTEND-ONLY FUNCTIONAL | `src/journal.js` `newPage`, `go`, date handling | auth, sync, conflict, encryption expectations |
| Journal WYSIWYG bold/italic/heading/list | INCOMPLETE | `src/journal.js` `document.execCommand` | deprecated editor API; replace safely |
| Sanitized journal HTML | FRONTEND-ONLY FUNCTIONAL | `src/journal.js` `sanitizeJournal` | XSS fuzz tests + content security policy |
| Journal autosave/Markdown export | FRONTEND-ONLY FUNCTIONAL | `src/journal.js` `commit`,`exportPage` | persistence reliability across devices |
| Journal markers on timeline, open entry | FRONTEND-ONLY FUNCTIONAL | `src/widgets.js` `.timeline-journal` | query by date, deep linking on cloud |
| Delete journal page with Undo | FRONTEND-ONLY FUNCTIONAL | `src/journal.js` `deletePage` | soft delete/recovery or transactional cloud undo |
| CSV task import/export | FRONTEND-ONLY FUNCTIONAL | `src/csv.js`, `src/app.js` | robust header/URL validation, size/error handling |
| JSON full backup/restore (V5-compatible) | FRONTEND-ONLY FUNCTIONAL | `src/app.js` `backupJson`,`restoreBackup` | atomic rollback, versioned migration, privacy |
| Task/resource external URL | FRONTEND-ONLY FUNCTIONAL | `src/model.js` `validateHttpUrl` | cloud file attachments **not** present |
| WIB clock | FRONTEND-ONLY FUNCTIONAL | `src/app.js` `showClock` | user timezone settings |
| Sample tasks/branches and demo removal | SIMULATED/MOCK | `src/data.js`, `src/storage.js` | seed isolation vs real owner data |
| Auth/login/logout/session | MISSING | no Supabase dependency or login UI | Milestone 2 |
| Remote DB persistence, conflict resolution | MISSING | all state localStorage | Milestone 2–3 |
| File uploads / Supabase Storage | MISSING | only `resourceUrl` links exist | future separate feature |
| Reminders, Pomodoro, Classroom/Calendar sync | MISSING | no API or timer implementation | future enhancements only |
| Cloud production monitoring, backups | MISSING | not deployed | Milestone 5–6 |

## Dead buttons and assertions

All **named primary** buttons appear wired in source: map zoom/fit/fullscreen, capture/find, color mode, CSV import/export, JSON backup, demo cleanup, timeline controls/milestone form, journal new/previous/next/delete/export, task actions, window control/navigator. This is **source review, not exhaustive click coverage**; tests do not individually exercise every generated node action across all device modes. Record any failures found in a production-origin action census before release.

## Baseline verification limits

- `npm test`: existing `tests/test_csv.mjs` passes; tests pure date, task, radial hierarchy, collision bound, CSV.
- `python tests/qa_v6.py`: passed desktop, tablet, 390px phone, 320px phone and landscape simulated Chromium; uses HTML string + mocked localStorage.
- `npm run lint`: all JS parsed by Node; this is **not** ESLint or static type checking.
- No actual cloud, encrypted storage, physical-device, performance budget, screen-reader, or remote-origin test has passed.
