# Architecture decisions

**2026-11-01, V5.** Reject V4's page-level CSS grid/sections. Accept one zoomable/pannable space containing independently movable items. World positions are saved per widget. Introduce small spatial navigator rather than tabs or a new menu. Keep the interior constellation's own zoom and elasticity, corrected for outer transform scale.

**Journal.** Use a dependency-free sanitized contentEditable editor for the prototype to permit offline self-contained HTML; Markdown export on demand. Accept the legacy formatting command API only as temporary technical debt, to replace with Tiptap/structured JSON for production. Persist locally and include pages in full backup.

**Motion/materials.** Keep original layered CSS background; do not copy Spicy Lyrics' AGPL-3.0 Kawarp integration. User intentionally favors glass-like structural content over strict Apple Liquid Glass material placement. Accessibility/legibility override decorative detail.

**Mobile.** Retain spatial world with zoom, spatial navigator, direct item focus, mobile-specific paper dimensions and smaller background blur. Do not replace with a stack of sections at mobile widths.

**Security.** Delay personal diary sync until authenticated private backend. Local browser storage only. Warn user before using sensitive data online.


**2026-11-01, V6 — windows rather than move-only glass cards.** User clarified that the blank header/title area is a move handle, not just a tiny six-dot grip; implement Windows-like pointer drag with explicit exclusion for title-bar actions and editable fields. Bottom-right resize handles change a widget’s persisted width and height. Add keyboard resize alternatives. Do not collapse to fixed page sections.

**Timeline and diary temporal link.** Timeline must reserve vertical space BELOW the axis for milestone names and journal-date pages; previous 192px scroll region cropped milestones. Dated journal pages appear as clickable page markers grouped per day, not as floating overlays. Journal date is editable in place, normalized to `YYYY-MM-DD`, and old ISO dates migrate using Asia/Jakarta civil date. A blank journal page doesn't count as a timeline event.

**Mobile polish.** Keep navigator available but collapse it to a small compass until activated to avoid covering the journal heading. No touch gesture should be the sole way to resize; arrow-key equivalent remains.
