# 04 — MVP gap analysis and delivery gates

## Definition

V6 is a **clickable local MVP**. A protected preview can be deployed for evaluation without private data. A production personal diary cannot ship safely until Auth, RLS, persistence, user consent for local data migration, and recovery testing are verified.

| Priority | Gap / evidence | Solution | Dependency / acceptance |
|---|---|---|---|
| P0 | No Auth, any deployed static URL can load local app | Auth shell + session restore; owner-only data before rendering | Supabase project + allowed URLs; test anonymous denied |
| P0 | localStorage is sole source of truth (`src/storage.js`,`src/journal.js`,`src/board.js`) | Versioned repository adapter, cloud writes, clear pending/saved/error state | RLS tested, second-device sync |
| P0 | No database isolation | Apply reviewed migration with per-operation owner RLS + composite FKs | `supabase db reset`, RLS cross-user test |
| P0 | Local backups may contain private diary; user may unknowingly upload | opt-in reviewed import, encryption-at-rest expectations and local export warning | import dry-run, confirm, dedupe, rollback test |
| P0 | Static website can leak a journal if user shares device/browser | logout must clear private UI in memory, no private content in public builds/screenshots | anonymous/expired-session E2E |
| P1 | `execCommand` editing deprecated (`src/journal.js`) | Tiptap/ProseMirror or another verified editor with allowlisted serialization | WYSIWYG regression, formatting & XSS tests |
| P1 | Multi-widget writes are not atomic in localStorage | transactionally write related cloud records, conflict policy (ETags / `updated_at`) | reload/no-partial-import integration test |
| P1 | Hardcoded timezone (`src/app.js`) | per-user preference default Asia/Jakarta, proper local civil dates | day-boundary testing |
| P1 | Timeline labels and collision depend on width/zoom | long milestones and density stress, mobile resize check | E2E screenshot reference at 320/390/1440 |
| P1 | Sample tasks load when storage absent (`src/storage.js`) | separate demo mode; empty signed-in account starts empty | fresh user test |
| P1 | Milestone delete uses double-click arm, no undo (`src/widgets.js`) | explicit accessible confirmation/undo | keyboard/touch test |
| P1 | No secure CSP XSS review for dynamic rich-text | sanitize before store/render, add CSP compatible with external Auth | XSS probes + security review |
| P1 | No production origin test; QA uses `page.set_content` | Playwright E2E against `npm run dev` and preview URL | Android/iOS smoke later |
| P2 | Many animated blurred layers, possible GPU load | reduced-motion, background pause on hidden tab, FPS budget | battery profiling |
| P2 | No real file uploads | defer Supabase Storage until user asks attachments | future RFC, RLS policies required |
| P2 | Reminders/Google Classroom/Pomodoro absent | separate post-release increments | explicit scope/consent |

## Milestone gates

- **Gate A (repository):** preserved frontend checksum; `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm run verify:structure` pass.
- **Gate B (safe preview):** private GitHub, preview protection independently verified, no real journal/test secrets, acceptable visual parity.
- **Gate C (database):** local Supabase SQL migrations execute; auth works; RLS denies anon/other owner; foreign-key integrity tested.
- **Gate D (integration):** a real journal entry/branch/task survives reload and signed-in second-device; failed writes visibly fail without losing edits; explicit user consent for local import.
- **Gate E (release):** security, accessibility, performance, regression, logs, backup/restore, monitoring and rollback rehearsed. Release only with human approval.

## Definition of done versus prepared

`PREPARED` = code/config/files exist and are correctly structured. `VERIFIED` = an actual test passed in the named runtime. Files alone never imply remote environments are ready.
