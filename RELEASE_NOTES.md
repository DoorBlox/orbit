> **Historical V6 visual-feature notes (1 November 2026).** These notes document how the original interface was built. ORBIT **1.0.0 is now in protected Production**; see [current release notes](docs/releases/1.0.0.md), [README](README.md), [operations](docs/OPERATIONS.md) and [handoff](CODEX_HANDOFF.md). The original V6 limits below ("no authentication/cloud") no longer describe the live product.

# ORBIT V6 — Window interactions + journal on the timeline

### New

- Drag any unused part of a widget's title bar or its six-dot grip, like a desktop window. Header buttons remain clickable.
- Resize each widget with a lower-right handle (pointer/touch; keyboard arrows with Shift for large steps). Persist sizes locally and in full JSON backups.
- Timeline lane layout reserves room for deadline markers, readable milestones and dated journal pages. Milestone labels no longer fall below a clipped 192px scroll region. Timeline expands its date window to include existing older/future entries.
- Every *written* journal date appears beneath the timeline with a paper marker; multiple pages on one date show a count. Click a marker to open that entry in the journal widget.
- Journal dates can be edited directly on paper, and are normalized to stable `YYYY-MM-DD` keys. Old V5 ISO dates are interpreted in Asia/Jakarta for migration.
- On narrow phones the spatial navigator collapses to a small floating compass rather than obscuring the diary page.
- V6 backup JSON stores window positions **and dimensions**, milestones, tasks, and dated journal entries. V5 backups still import.

### Intentional remaining limits

No encrypted or cloud storage, no authentication, no cross-device synchronization. Window collision prevention isn't implemented (windows can overlap after moving/resizing). Browser tests simulate devices, not real iPhone Safari or Android Chrome. Current editor uses a temporary browser editing implementation, with a structured editor intended for production.
