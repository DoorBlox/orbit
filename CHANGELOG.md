## 1.0.0 private release candidate — 2026-11-06 (not Production-published)

- Preserve accepted M2 private cloud functionality and M2.5 motion fixes.
- Fail closed when Production cloud configuration is absent, unreviewed, mismatched or development-scoped; enforce exact private CSP before artifact replacement.
- Verify committed release artifacts, inventory, native files and rebuilt SDK integrity; never print keys.
- Prepare offline-only nonowner CRUD fixture plans; no hosted mutations or Auth/RLS changes.
- Add release guard/plan tests, complete private recovery browser CI coverage, and reconcile release notes, security findings, backup/rollback and remaining launch gates.

## M2.5 Motion Polish — 2026-11-06

- Give manual wheel, zoom and keyboard camera input priority over navigation.
- Resolve active motion when reduced motion is enabled and cancel animation handles on teardown.
- Preserve 60Hz elasticity with elapsed-time integration and bounded background catch-up.
- Continue graph pinch into one-finger pan without jumps; clear canceled gestures safely.
- Add 18 deterministic motion tests and 25 five-viewport Chromium cases to CI; preserve existing cloud regressions and source provenance.
- Preserve camera timing, CSS identity, widget persistence and Auth/RLS/sync; defer unsupported P2 visual changes. No deployment.

## M2 no-domain password acceptance — 2026-11-03

- Add temporary password sign-in; retain OTP and Google without changing UUID authorization or RLS.
- Verify the existing confirmed identity, document administrator password/owner setup, and distinguish hosted password acceptance from untested OTP delivery.

## M2 Email OTP patch — 2026-11-02

- Use existing-user Email OTP as the visible sign-in method; retain Google OAuth for future configuration.
- Preserve server UUID ownership/RLS and add cooldown, generic failures and stale verification cleanup.
- Document administrator enrollment, Magic Link Token template and hosted SMTP acceptance.

## M1 — 2026-11-01

- Protect corrupt local records, retain recoverable originals and surface failed saves.
- Validate and recover V5/V6 imports; harden CSV, clipboard HTML and static CSP.
- Fix six-window keyboard movement/focus, paper-label contrast and landscape reachability.
- Add milestone Remove/Undo and shared Asia/Jakarta civil dates.
- Add actual-origin regression tests, dual original/current source integrity and browser CI.
- Preserve vanilla spatial scrapbook UX; disable automatic Git deployment pending approval.

# Changelog

## 0.5.0 — 2026-11-01
- Replaced fixed page/grid scrapbook composition with independent draggable widgets on one spatial canvas.
- Added global pan, zoom, pinch and spatial navigator; widget layout persists on device.
- Adapted inner constellation pointer handling for an outer scaled camera.
- Added editorial journal pages, WYSIWYG, autosave, Markdown export, deletion and Undo, HTML sanitization.
- Expanded JSON backup to version 5: includes journal entries and spatial positions.
- Added responsive mobile-focused journal and no-overlap corner navigation/capture arrangement.
- Migrated prior Python browser tests to docs archive and added current V5 QA.

## 0.4.0
- Integrated timeline, active/completed task widgets and animated background into conventional scrapbook grid (superseded by V5 spatial layout).

## V6 — 2026-11-01

Window-like title bar dragging; per-widget persistent pointer/touch/keyboard resizing; milestone overflow correction with dedicated timeline lanes; clickable journal markers grouped by date; date-only journal editing and V5 ISO migration; compact mobile spatial navigator; full-backup sizes and V6 QA tests. Future deployment remains not yet executed.

### M3 reviewed shared-target follow-up

- Explicit owner-approved exception for shared project `ixfgavgtwuzdgucjriec` and
  protected `https://orbit.starscene.com/`; other targets and public mode remain rejected.
- Document exact Production environment/CSP/Auth requirements and shared-data risks.
  No live configuration, Auth/RLS/data or deployment changes. Issue #4 remains future work.

### M3 least-privilege release gate

- Add an unapplied additive migration revoking authenticated TRUNCATE/TRIGGER/
  REFERENCES on seven private tables; retain normal CRUD/RLS/snapshots/conflicts.
- Verify 58 new SQL assertions, grant-drift rollback, generated baseline-guarded
  fixture cleanup and real local Auth/API/browser regressions. No live changes.
- Record owner-confirmed `552720b` CI PASS and PR #3; consolidate Production/Auth
  checklist and remaining live authorization/verification gates.
