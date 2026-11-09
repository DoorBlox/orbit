# BP-06 — synthetic spatial-layout baseline (Chromium)

**Work unit:** BP-06 first slice **SOURCE MERGED** via [PR #47](https://github.com/DoorBlox/orbit/pull/47) at `78830dcf251da19a516ad276d068d84c5ae3ffea`. [Exact-head workflow run 42653091662](https://github.com/DoorBlox/orbit/actions/runs/42653091662): 4/4 required checks green. Synthetic artifact ID `13691052030`, 7-day retention through 16 Nov 2026 UTC. **Not** full BP-06 verification or signed-in Production acceptance.

## Test method
- Run `python tests/qa_m1.py` in the existing GitHub Actions `static-quality` pipeline after building the static app. The runner invokes `tests/qa_spatial_baseline.py` using the same disposable, locally hosted, unauthenticated prototype. No private user, journal, OAuth session, provider token, or hosted database is contacted.
- Five CSS viewport sizes: desktop 1440×900, tablet 768×1024, phone 390×844, narrow 320×700, landscape 844×390. Assert that **all six existing IDs** (timeline, constellation, active, completed, space, journal) are present once and have a keyboard-focusable drag grip and minimap jump point. **Do not assert total widget count equals six.**
- Focus each legacy widget and recover its grip into the viewport using the same `SpatialBoard.ensureVisible` path used for keyboard focus. Verify finite camera values and unchanged world coordinates before/after navigation and reload.
- Capture 10 themed desktop screenshots (one per currently supported theme), plus two screenshots per viewport (constellation and Space), and narrow-phone 174%/200% **CSS text enlargement simulations**. The latter are **not** real browser page zoom and must not be reported as such.
- Generated PNGs `qa/bp06-*.png` and structured `qa/bp06-results.json` are uploaded by the existing quality job into the seven-day `m1-browser-evidence` artifact; they are not added to public source control. Screenshots use synthetic sample data only.

## Pass/fail and limits
- The test suite fails closed if a legacy widget, keyboard recovery target, navigable minimap marker, finite camera, or stable layout round-trip disappears. It intentionally permits additional widgets.
- Passing CI means the **synthetic Chromium checks** passed at the reviewed source SHA. It does not establish real 174%/200% browser zoom, physical Safari, Android, all screen readers, live Supabase image pixels, real-account backups, device performance, or screenshot-based design approval.
- Baseline screenshot files are evidence for human comparison; there is **no automated pixel-diff quality score** or performance/billing claim in this slice.

## Next work
- **SP-01A completed in source:** [PR #48](https://github.com/DoorBlox/orbit/pull/48) centralizes six immutable legacy descriptors and proves a seventh synthetic descriptor. **SP-01B next:** actually mount a seventh synthetic widget, add keyboard/minimap and optional hide/reopen, then design and test compatible persistence/backup before any user-visible feature. Avoid a new backup format or database schema without requirements.
- Separately complete BP-06 browser text zoom and physical-device matrix with permission-safe owner evidence. BP-01 private media remains owner-gated.

[Expandable workspace product plan](../plans/ORBIT_EXPANDABLE_SPACE_PROJECTS_BLOG_FOCUS.md) · [Original evidence brief](DESIGN_EVIDENCE_PLAN.md) · [Handoff](../CHATGPT_HANDOFF.md).
