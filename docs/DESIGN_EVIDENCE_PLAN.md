# ORBIT — visual and interaction evidence brief

**Status:** BP-06 synthetic Chromium **SOURCE MERGED** [PR #47](https://github.com/DoorBlox/orbit/pull/47), four exact-head checks passed in [run 42653091662](https://github.com/DoorBlox/orbit/actions/runs/42653091662). `tests/qa_spatial_baseline.py` is called by `tests/qa_m1.py`; this is not complete real-device BP-06 acceptance. Screenshots/JSON are CI artifacts retained seven days. **No authenticated real-user screenshot, real Safari/Android or Production claim.**

## What the owner can supply (privacy-safe)

A useful starting set is (1) a **full desktop workspace** view at ~1440x900 with synthetic tasks and all six windows visible; (2) a narrow phone view at ~390x844 showing navigation and Space; (3) Journal editing and its toolbar; (4) one sticky note with drawing and image controls; (5) Night Garden or Graphite theme with dense task nodes; (6) optional 15–30-second screen recording of pan, window drag/resize, minimap travel and drawing. If accessible, also collect the sign-in shell with no account details.

Only show a disposable/dummy workspace. Hide account emails, personal tasks, personal journal text, private images, network tokens and signed media URLs. Redact browser address if it includes an OAuth fragment or query. The source repository is public.

## Baseline grid

| Axis | Planned cases | Pass criterion |
| --- | --- | --- |
| Widths | 320, 375, 390, 768, 1440 CSS pixels and large desktop | No blocking overlap, clipped primary control or unreachable widget |
| Scaling | 100%, browser text zoom 174% and 200% | Text, navigation, modal and paper remain operable without losing saved coordinates |
| Themes | All ten, plus high-contrast/reduced-transparency | Text and controls remain discernible; no hidden focus or illegible clock |
| Pointer | Mouse, touch, trackpad, keyboard-only, reduced motion | Movement, editing and close/undo have non-touch alternatives |
| Browsers | Chromium first; real Safari/iOS and Android Chrome when available | No documented P1 input/keyboard regression |
| Editors | Journal contentEditable, sticky Markdown preview, native pen; future Excalidraw | Undo/Save/Cancel, focus, keyboard IME, theme/paper and export work |
| Media | Authenticated PNG/JPEG/WebP load, error and retry in journal and sticky | Owner-only, refresh stable, no permission leak; #26 remains open until recorded |
| Density | Synthetic 30, 100, 300 and 1000 tasks | Measure script/paint/long tasks before recommending virtualization |

## Design principles and decision process

Keep the V6 spatial concept, radial branch relationships, independent cameras, the six original freely movable/resizable widgets **as compatibility defaults, not a maximum**, paper journal, privacy and existing themes. Audit aesthetics against actual screenshots, not from code alone. Improve discoverability, hierarchy, optional single-widget Focus mode on phones, offscreen recovery, semantic tokens, input targets, contrast and reduced-motion experience. No automatic redesign or all-React migration.

Retain nonprivate screenshots as `qa/bp06-*.png` and scorecard metadata as `qa/bp06-results.json` in the exact-head `m1-browser-evidence` CI artifact. `docs/BP06_SYNTHETIC_LAYOUT_BASELINE.md` defines tested scope and remaining real-device evidence. Do not commit raw user screenshots. Record observed device/browser, issue severity, reproduction steps and whether the result is **verified**, **inferred from source**, or **requires real-device validation**. Images must never contain real diary content.

## Excalidraw design direction

The user explicitly prioritizes **the full official upstream editor**, in BOTH journal and sticky notes, not just external file interchange. Treat it as a **lazy island**: render the existing UI by default, import React/Excalidraw only on Draw/Edit; keep a warm paper canvas and adapt chrome to ten themes; avoid automatic erasure on appearance changes. Preview this editor with synthetic drawings during EX-00. Image asset persistence and deletions remain gated by private-media safety and backup coverage.

Related: [Execution blueprint](../plans/ORBIT_POST_2_4_EXECUTION.md), [Issue #31](https://github.com/DoorBlox/orbit/issues/31), [Issue #29](https://github.com/DoorBlox/orbit/issues/29).
