# Apple Design review — ORBIT V3 Light Glass

**Date:** 2026-11-01. **Platform:** responsive web prototype, tested using Chromium simulation (desktop/tablet/mobile), not a native iOS app. **Rating:** Good for a design prototype; more rigorous accessibility, device, and scale testing is required before production. This review applies transferable HIG principles without claiming that a custom website must follow native iOS tab conventions.

## Product thesis

One continuous, endlessly navigable map of personal life. Its signature is clear: a correctly scaling central identity, free-depth flexible branches, and typography-only colored tasks that expand into indented details without modals or dashboards. The user supplied annotated images explicitly rejecting the old boxed NEXT ACTIONS card, fixed hierarchy, dark surface, and oddly scaled center.

## Findings resolved in V3

1. **High · structure and scanning (`layout.md › Visual hierarchy`):** Old V2 enforced role/project layout and boxed task stacks. V3 allows branches of arbitrary depth and renders tasks as an ordered text list outside their terminal branch, aligned on a shared outer radial horizon. Dynamic child placement encodes the actual structure, not guessed semantic types.
2. **High · center scaling (`layout.md › Adaptability`):** Root rendering now participates in the same camera transform as branch nodes. Camera focus treats the root as an ordinary map target; Fit All remains separate. This addresses the user-observed root zoom imbalance, though real-device subjective QA is still needed.
3. **High · user intent (`design-principles.md › Purpose` / `layout.md › Visual hierarchy`):** No dashboard task cards, row containers or dots. Text glow encodes urgency/deadline, while near-zoom metadata provides non-color information. Hover/tap reveals descriptions and criteria *within the list flow*, shifting later task rows down.
4. **High · entry and agency (`entering-data.md › Best practices`):** Add/rename/move branches through focused, in-place controls; tasks capture with name only and edit without pop-up menus. Hierarchy reparenting is explicit so ordinary springy drag cannot silently change data.
5. **Medium · motion (`motion.md › Best practices`):** Spring-back conveys reversible physical manipulation. Slowed background light drift is subtle and automatically suppressed by reduced-motion preferences.
6. **High · mobile gestures (`gestures.md › Best practices`, `accessibility.md › Mobility`):** Task tap pins reveal, near focus makes text readable, on-screen zoom/fit controls and keyboard operations provide alternatives to pinch or hover. 320px and 390px simulated checks passed.
7. **High · text and color (`color.md › Best practices`, `accessibility.md › Vision`):** Task text colors were darkened for an approximately 5:1 or higher contrast ratio on the base blue-white background, instead of relying on translucent neon glow. The deadline label, urgency number and overdue underline supplement color at close zoom.

## Intentional Apple HIG departures

- **Glass on content:** The user explicitly wants glass on every structural branch. Apple's `materials.md › Liquid Glass` reserves *native Liquid Glass* for floating functional layers and discourages use throughout content. V3 uses **original frosted CSS styling** on content branch nodes, not native Liquid Glass. The terminal task words remain unboxed for clarity. `prefers-reduced-transparency` disables blur.
- **No tab navigation:** ORBIT deliberately uses spatial exploration instead of native iOS tab bars. The web interface compensates with Fit All, wheel/pinch zoom, explicit actions, and a capture/find line. This is a user-led design departure, not a blanket claim of platform compliance.
- **Dark mode preference:** The original dark-only canvas was replaced with the explicitly requested light immersive canvas. The current prototype intentionally has no automatic dark mode adaptation; future production must consider user preference and readability, but should not silently reverse the user-approved aesthetic.

## Remaining concerns / verification limits

- **Critical before public launch:** Full screen-reader exploration of SVG paths and dense world-coordinate task list is not established. `role=button` task rows contain nested buttons; semantic restructuring may be needed for robust VoiceOver behavior. Also test 200% enlarged text and high-contrast modes with actual devices.
- **High before public launch:** A preliminary headless DOM-load smoke test created 100, 500, and 2,000 task rows without errors; **interactive** frame-rate, memory, battery and 10,000-task performance remain unverified. SVG connection dimensions now follow actual graph bounds rather than allocating a fixed 24,000px SVG; however DOM per-task rendering is still not optimized for thousands. Implement view-dependent rendering and spatial hit testing while retaining the promise that all tasks remain *represented* in fit-all.
- **Medium:** Root and task focus camera positions require real iOS Safari/Android touch validation, including orientation and safe-area behavior.
- **High security:** Prototype storage is browser-local and not authenticated. Do not claim private account security or phone/desktop syncing; full JSON backup must remain available during migration.
- **Medium:** The blend/glow look is a design judgment, not a measurement of native system Liquid Glass. Test reduced-transparency legibility and color alternatives independently.

## Reviewed sources

Installed `apple-design` skill and relevant local HIG pages: `accessibility.md › Vision/Mobility`; `layout.md › Visual hierarchy/Adaptability`; `typography.md › Ensuring legibility`; `color.md › Best practices`; `designing-for-ios.md › Best practices`; `gestures.md › Best practices`; `materials.md › Liquid Glass`; `liquid-glass.md › The two layers`; `motion.md › Best practices`; `entering-data.md › Best practices`; `feedback.md › Best practices`; `cross-platform.md`.
