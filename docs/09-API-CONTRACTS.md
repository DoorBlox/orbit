# 09 — Frontend ↔ backend contracts (designed, not active)

## Boundary and security

The V6 app has **no routes** or HTTP API. First integration should use `@supabase/supabase-js` against Supabase Data API with publishable key + user JWT, constrained by RLS. There is no need for an API microservice or hardcoded endpoint per task. All contracts below are planned; they do not claim an implemented response.

## Shared types

```ts
type ColorMode = 'deadline' | 'urgency';
type TaskStatus = 'captured' | 'needs_clarity' | 'ready' | 'scheduled' | 'in_progress' | 'waiting' | 'completed' | 'parked';
type Branch = { id:string; parentId:string; label:string; color?:string };
type Task = { id:string; projectId:string; title:string; dueDate:string; urgency:number; effortMinutes:number; status:TaskStatus; criteria:string; description:string; resourceUrl:string; createdAt:string; completedAt:string };
type Milestone = { id:string; title:string; date:string };
type JournalEntry = { id:string; date:string; title:string; html:string; createdAt:string; updatedAt:string };
type Widget = { x:number; y:number; width?:number; height?:number };
type Snapshot = { branches:Branch[]; tasks:Task[]; milestones:Milestone[]; journalEntries:JournalEntry[]; spatialLayout:Record<string,Widget>; preferences:{colorMode:ColorMode} };
```

These mirror current sources, including **string IDs**; `src/cloud/mappers.js` is the actual implemented transform layer. SQL field aliases: `projectId→project_id`, `dueDate→due_date`, `date→entry_date/marker_date`, `html→body_html`, `parentId:'root'→parent_id:NULL`, `width/height→width/height`, `colorMode→color_mode`. Dates are civil `YYYY-MM-DD` strings; timestamps UTC ISO.

## Proposed operations

| Operation / actor | Supabase query / scope | Request | Success | Failure behavior |
|---|---|---|---|---|
| Restore session | `auth.getUser()`, `onAuthStateChange` | current session | verified user ID | Auth shell, not data UI |
| Email login | `auth.signInWithOtp` | email + approved redirect | check email / confirmed session | generic auth error, no user existence leak |
| Logout | `auth.signOut` | authenticated session | private state cleared | clear view even on network failure |
| Load initial snapshot | `.from('branches'/'tasks'/...).select()` | JWT implicit owner | grouped mapped records | retry state, do not render demo as user's data |
| Create/move/rename branch | `.from('branches').insert/update` | id,parent_id,label | exact saved row | FK/cycle errors shown, revert optimistic UI |
| Create task | `.from('tasks').insert(...).select().single()` | validated row | server row | keep unsaved draft on failure |
| Update task / reparent | `.from('tasks').update(...).eq('id',id).select().single()` | constrained fields | server row | conflict/unauthorized/no-row, undo local draft |
| Delete task | `.from('tasks').delete().eq('id',id)` | id | success + undo policy | retry, no false 'removed' |
| Complete/reopen | `tasks.update({status,completed_at})` | status enum | task moves across views | consistent rollback on error |
| Create/remove milestone | `milestones.insert/delete` | id,title,marker_date | timeline redraw | undo on delete; no double-click semantic API |
| Write journal page | `journal_entries.upsert` | id,date,title,body_html | acknowledged timestamp | unsaved indicator + retry, no silent data loss |
| Delete journal page | `journal_entries.delete` | id | page removed from timeline | recoverable tombstone/undo decision |
| Save layout | `widget_layouts.upsert` | key,x,y,width,height | acknowledged layout | pending + no silent overwrite |
| Save color mode | `preferences.upsert` | color_mode | acknowledged mode | local retry |
| Export full backup | owner-scoped selects | no server export needed | JSON V6+ schema version | no truncated or mixed-user export |
| Import reviewed backup | atomic reviewed RPC or staged transaction | validated versioned snapshot | all-or-nothing | rollback/error counts |

All `.from()` operations MUST filter/limit to the authenticated user's ownership and rely on RLS; never assume a user-provided `owner_id` is authorization. The row mapper adds `owner_id`, and RLS independently enforces it.

## Input validation and constraints

- Titles: task 1–180, branch 1–72, milestone 1–110, journal 0–120; avoid empty meaningful names.
- Task urgency integer 1–5, effort 0–1440 min, enum status, criteria ≤1200, description ≤3000, resource URL valid http/https ≤600; due date a valid civil date or NULL.
- Journal HTML ≤80,000 chars; **sanitize before storing and before rendering**, validate URL attributes, reject executable elements. `execCommand` is deprecated; migration editor required before production.
- Widget x,y finite within supported world bounds, dimensions within per-widget limits in `src/board.js`; server has broad guardrails.
- Branch moves must prohibit cycles, orphan parents, and cross-owner links. SQL trigger + composite FK are a second line of defense.
- CSV/JSON imports have hard limits (`src/app.js` size and array counts) but require production-grade schema/version/transaction tests.

## Error model (proposed interface)

```ts
type OrbitError = { code: 'AUTH_REQUIRED'|'FORBIDDEN'|'VALIDATION'|'CONFLICT'|'NETWORK'|'STORAGE'|'IMPORT'; message:string; retryable:boolean; correlationId?:string };
```

Map PostgREST `23503` → relation invalid, `23514` → validation constraint, `42501` → unauthorized, `23505` → duplicate, network timeout → retryable. These are tentative mappings; verify actual SDK/PostgREST errors before adopting. **Do not log private payloads**.

## Data access conventions

- A repository returns mapped V6 model shapes; view modules keep receiving the same arrays/objects as before.
- Explicit load/mutation lifecycle; no invisible writes in render functions.
- `owner_id` always taken from the verified session, never from an editable input.
- Return server authoritative row on write; synchronize local state and related widgets after success.
- Prefer server transaction for multi-table import and ensure child records cannot reference other owners.
- No Storage or Edge Function endpoint is part of existing MVP. Plan them only if new feature scope requires.
