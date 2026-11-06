# 10 — Exhaustive feature and control mapping to production behavior

**Each row:** UI selector/trigger → actual V6 behavior → intended data/API/Auth → validation and states → tests. All cloud behavior below is **planned, not currently wired**. All owner-private writes/reads require Supabase authenticated user + owner RLS; actions marked UI-only do not require API calls.

| UI / trigger | V6 action / source | Production data/operation | Validation + loading/error/success | Test requirement |
|---|---|---|---|---|
| `#board-zoom-in`, `#board-zoom-out` | global camera zoom `board.js` | **UI-only**, optional local camera persistence | clamp scale, avoid focus trap | pointer/keyboard/touch/200% |
| `#board-home` | global fit-all | **UI-only** | stable layout, no clipping | desktop/mobile |
| blank `#spatial-viewport` drag/pinch | pan/zoom world | **UI-only** | respect touch, reduced motion | pointer/pinch |
| `.widget-heading`, `.widget-grip` drag | reposition one widget | `widget_layouts.upsert` debounced | finite coords, pending/saved/retry; no save before drag finish | touch+mouse+keyboard |
| `.widget-resizer` | width/height by pointer/keys | `widget_layouts.upsert` debounced | per-widget bounds, saved/error | all six windows |
| `#space-nav-toggle`, `.space-point-*` | navigate to chosen widget | **UI-only** | mobile collapses, accessible labels | small phone |
| `#zoom-in`, `#zoom-out`, `#fit-all` | independent graph camera | **UI-only** | graph/board scales separate | zoom parity |
| `#map-fullscreen` | move graph widget to fullscreen overlay | **UI-only** | restore DOM, Escape, keyboard | regression |
| graph node click / Enter | focus branch and select target | **UI-only** (unless optional focus saved later) | valid branch | focus+selection |
| graph node Insert/add | create nested branch | `branches.insert` | title, parent FK, optimistic rollback | add nested |
| graph node F2/rename | rename branch | `branches.update` | 1–72 chars, owner check | keyboard+UI |
| branch move action | move subtree | `branches.update(parent_id)` | DB trigger blocks cycles, cross-owner FK; rollback | ancestor/descendant cases |
| graph node elastic drag | pull spring and return | **UI-only**; not reparenting | reduced motion; cancel animation | drag/release |
| `.task-row` hover/tap | reveal criteria, fields/actions | **UI-only** after data loaded | accessible disclosure, no overlap | touch/focus |
| task **Edit** action | edit title, due, status, urgency, criteria, description, link, effort and project | `tasks.update` | `cleanTask`, URL, constraints, saving/error, no lost edit | invalid/valid/cross-project |
| task **Complete** action | sets completed status/timestamp | `tasks.update` | task exits map, enters completed/history only after write | consistency |
| task **Remove** action | remove with toast Undo | `tasks.delete` | avoid accidental irreversible deletion; server acknowledgment/recovery | rollback+undo |
| `#capture-form`, `#capture-name`, `#capture-submit` | create title-only task under current branch | `tasks.insert` | title required, target branch exists, save state | blank/valid |
| `#capture-mode` | toggle find/capture | **UI-only** | preserve drafts; focus input | toggle+escape |
| capture find, Ctrl/Cmd+F | search titles/criteria/etc | initially **UI-only** in loaded tasks; server search later only if needed | no results clear state | search cases |
| `#color-mode` | toggle deadline/urgency order + colors | `preferences.upsert` | enum; UI update without blocking | sort/color |
| `#active-task-list` | sorted active rail | `tasks.select` filtered user | loading/empty/error; no duplicate records | status cases |
| `.rail-check` | mark complete | `tasks.update` | owned task only; latency UX | complete cross-view |
| `#completed-task-list`, `Reopen` | sorted history + restoration | `tasks.select`/`tasks.update` | empty/error, completed_at handling | reopen sync |
| `#timeline-zoom-in`, `#timeline-zoom-out` | horizontal time scale | **UI-only** | bounded scale, no clipping | zoom/resize |
| `#timeline-today` | center timeline at current day | **UI-only** | timezone, day-boundary checks | today |
| `.timeline-task` | focus task in constellation | **UI-only** navigation with loaded task | missing task graceful fallback | click focus |
| `#timeline-add`, `#milestone-form` | create milestone | `milestones.insert` | title 1–110, valid date, pending/save/error | create with date |
| `#milestone-cancel` | close form | **UI-only** | do not create | cancel |
| `.timeline-milestone` two-click | local delete | `milestones.delete` (future safer undo) | replace brittle arm with accessible reversible flow | touch+keyboard+undo |
| `.timeline-journal` | find page by date, open journal | `journal_entries.select` if not loaded; otherwise **UI-only** navigation | one grouped pin per date, valid entry ID | link/marker |
| `#journal-new` | add page | `journal_entries.insert` | max page count policy, offline draft | blank/new |
| `#journal-entry-date` | update civil date | `journal_entries.update(entry_date)` | YYYY-MM-DD valid, timeline repaint | date edge cases |
| `#journal-entry-title`, `#journal-editor` | WYSIWYG autosave | `journal_entries.upsert` | sanitize on every boundary; pending/saved/failed, conflict | XSS, long copy, network |
| `[data-format]` | bold/italic/heading/list | **UI-only** toolbar; later replace `execCommand` | selection/focus preserved | formatting, paste |
| `#journal-prev`, `#journal-next` | select page | **UI-only** after loading pages | commit pending edits before switch | navigation |
| `#journal-delete` | local delete with Undo | `journal_entries.delete` plus recovery strategy | explicit confirm/soft-delete or restore | undo + cross-device |
| `#journal-export` | export Markdown of page | **UI-only** from current sanitized page | no HTML/script leakage | .md round trip |
| `#backup-json` | V6 JSON snapshot | owner-scoped queries + client export | completeness, limits, privacy; no partial fetch | backup equality |
| `#import-csv`, `#csv-file` CSV | parse, dedup, import tasks | reviewed `tasks.insert/upsert` batch | CSV injection, limits, duplicate/collisions, partial error handling | malformed/import |
| `#csv-file` JSON | restore full backup with confirm | transactionally import/merge (explicit user decision) | backup version, branch cycles, XSS, rollback | malicious/old/valid backup |
| `#export-csv` | export task CSV | **UI-only** owner data already loaded | spreadsheet formula injection, encoding | import roundtrip |
| `#clear-demo` | remove `demo-*` with Undo | **UI-only** in demo; must never delete real cloud data on production | explicit demo mode gating | auth fresh |
| `.toast-action` | undo last removal/restore confirmation | eventual recovery operation depending entity | consistent/undoable write semantics | undo |
| `#clock` | WIB time display | **UI-only**; future prefs.timezone | no network, correct locale | DST/timezone |

## Missing/auth future UI contracts

`AuthGate` is not present: add accessible email/OTP login, sign-out, loading/error session gate. No route or tab conversion; login is a minimal full-screen shell that does **not** reveal private widgets before authentication. Add a nonmodal connectivity/saving indicator where current `LOCAL PROTOTYPE` label sits. This is required before claiming private hosted use.

## Minimum behavior coverage for Codex

For every row with a DB action, implement at least: success, server rejection, stale session, offline, optimistic rollback (if used), and a visible nontechnical status. For UI-only rows preserve V6 E2E visual/keyboard/touch checks. Never stub a button to show “Saved” without actually persisting.
