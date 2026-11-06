# 01 — ORBIT project overview

**Baseline:** ORBIT V6 Spatial Scrapbook; source supplied in `ORBIT_Spatial_Scrapbook_V6_Project.zip` within this conversation (1 November 2026). **This handoff does not create a new website.** It preserves `index.html`, all files in `src/` originally present, and `assets/orbit.svg` byte-for-byte. Hashes: `docs/reference/V6_SOURCE_MANIFEST.json`. Runtime behavior is unchanged except for new **unimported** cloud mappers/config preparation and independent Node build/test scripts.

## Mission

One private personal universe that reduces the mental cost of remembering responsibilities while protecting room for curiosity, reflection, and rest. Its primary canvas is **one unbounded-feeling, pan/zoom scrapbook**; no fixed navigation tabs, dashboard grid, or section routes. Six independently movable and resizable windows sit in this common coordinate space: **Constellation, Continuum, Things to do, Already done, Your space, Journal**.

## Current status

- **Working local frontend:** static, native browser ES modules (no runtime npm dependencies), HTML/CSS/JS, localStorage saves, responsive desktop/mobile interaction, V6 offline preview, screenshot QA.
- **This handoff prepared:** automated static build to `dist/`, lockfile, CI, proposed owner-only PostgreSQL schema, RLS policies, source-compatible row mappers, test scaffolding, env template, Codex plan.
- **Not implemented:** hosted environment, Supabase client/auth, persistence, actual file storage, secure diary synchronization, Google Classroom, calendar reminders, real browser E2E CI, Tiptap, monitoring.
- **Do not expose private journal data:** static V6 has no login or route protection; private GitHub != private Vercel deployment. New visitors see sample tasks; `localStorage` is per browser/device.

## Audience and roles

Current product: one owner and their separately authenticated sessions; no team/member sharing. A future multi-user product requires explicit product approval and a new authorization model. No student/classmate or administrator role exists in V6.

## Core invariants to retain

1. Free-depth radial tree centered on HISYAM; structurally identical treatment for branches; terminal task text **unboxed**, color + ordering by deadline or urgency.
2. Completed tasks exit the active graph but remain in completed widget and historical timeline.
3. Shared underlying task data across constellation, active/completed widgets, and timeline; never maintain independent copies.
4. Separate graph and scrapbook cameras; elastic graph-node pull, global canvas pan/zoom, all windows draggable by title/grip and resizable by corner/keyboard; positions and sizes in backups.
5. Journal pages retain editable date, paper typography, sanitized WYSIWYG display, Markdown export, timeline page markers linking into the editor; no streaks or mandatory daily entries.
6. Light animated pastel atmosphere; glass effects and accessibility alternatives; mobile touch/pinch and collapsed spatial navigator.
7. Preserve `Just Because` branch and no guilt-based progress measures.

## What this handoff enables

Open folder in VS Code/Codex, verify V6, run `npm ci`, `npm run check`, then implement milestones in `docs/14-CODEX-IMPLEMENTATION-ROADMAP.md`. A human must approve access control, credential configuration, migrations, external service linking, and deployments.

## Original source map

| File | Responsibility |
|---|---|
| `index.html` | All six widget DOMs and controls, no router |
| `src/styles.css` | Design tokens; glass, glow, paper, canvas, media queries |
| `src/app.js` | State coordinator, capture/search, CRUD, imports/backups |
| `src/storage.js`, `src/model.js`, `src/data.js` | localStorage, task validation, demo branches/tasks |
| `src/constellation.js`, `src/layout.js` | radial graph rendering, camera, elasticity, stack geometry |
| `src/widgets.js` | active/completed views, horizontal timeline/milestones/journal markers |
| `src/journal.js` | rich-text pages, sanitizer, autosave, Markdown export |
| `src/board.js` | global scene, draggable/resizable windows, navigator, persistence |
| `src/csv.js` | CSV parsing and import/export |
| `src/cloud/` | **New, inactive** backend mapping/config contracts |

## Verified local baseline

Executed `npm test` (existing V6 baseline: pass) and original `python tests/qa_v6.py` in Chromium on desktop/tablet/phone/small/landscape (pass, screenshots/fixtures); new handoff `npm run lint`, `npm test`, `npm run build` pass. Existing browser QA generally loads a self-contained HTML string with mocked localStorage; it is not an authenticated production-origin test. See `docs/13-SECURITY-AND-TESTING.md` for exact scope and gaps.
