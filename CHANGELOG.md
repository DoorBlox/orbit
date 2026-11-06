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
