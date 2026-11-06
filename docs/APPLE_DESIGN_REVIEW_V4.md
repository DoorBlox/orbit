# ORBIT V4 - Apple HIG-informed web design audit

Scope: a responsive web prototype, not a native iOS or macOS app. Apple's **principles** and accessibility foundations translate to the web; Apple-specific requirements for native tabs, toolbar, or native Liquid Glass APIs are not automatically required. The user's explicit preference for a no-tabs, spatial scrapbook and extensive glass-like surfaces takes precedence as product expression.

## Summary

**Rating: Needs work for production readiness; strong concept as a prototype.** The Constellation's radial spatial orientation, the adjacent active/completed rails, and the timeline above create a recognizable, product-specific experience. V4 corrects V3's obstructive overlays and improves separation of dense content. The core interface still needs measurement on real touch devices, assistive-technology testing, and collision work under extreme data density before public release.

## What works

- **Purpose and distinctiveness:** the spatial constellation as the signature element, while the task rail is deliberately legible. Reference `design-principles.md` > Purpose, Craft, Delight.
- **Progressive disclosure:** task descriptions expand in place on hover or tap. `layout.md` > Visual hierarchy; `entering-data.md` > Best practices. This preserves the overview while revealing details when they matter.
- **Consistent state feedback:** completion removes a task from active graph and moves it to a dedicated completed widget. `feedback.md` > Best practices: keep status close to relevant context.
- **Touch alternatives:** buttons and tap activation supplement mouse hover. `gestures.md` > Best practices: provide more than one way to interact.
- **Reduced motion:** moving background and idle map animation obey `prefers-reduced-motion`. `motion.md` > Best practices: add purposeful movement and make it optional.

## Critical issues to verify before production

1. **Keyboard and screen reader coverage of huge canvas/map:** V4 uses real DOM nodes and labeled buttons, but no independent VoiceOver or TalkBack validation has occurred. Ensure all tasks/branches can be found without visually panning or relying on hover. `accessibility.md` > Speech/Mobility; `gestures.md` > Best practices.
2. **High density and dynamic type:** at fit-all zoom, small branch and task labels are intentionally miniature. The five primary branch overlays and task rail mitigate that but don't turn the global view into a screen-reader or large-font list. Test text enlargement and 200% browser zoom on phones and desktop. `accessibility.md` > Vision; `typography.md` > Ensuring legibility.
3. **Data safety:** localStorage-only is insufficient for a private life archive, especially across devices; don't claim private authentication or encrypted storage. This is a product reliability/privacy requirement rather than a specific Apple-only rule.

## High/medium improvements

- **High: layout collisions** may still occur for unusually large expanded descriptions, more nested branches, or hundreds of tasks. Current sample overlap probe passed, not a general solution. `layout.md` > Adaptability / Visual hierarchy. Implement actual bounds-based repulsion or deterministic obstacle handling.
- **High: timeline crowding** is handled through small marker dots until zoomed, but stacked entries can still compete under extreme density. Test hit targets and tooltip/click detail as workload grows. `accessibility.md` > Mobility and Vision.
- **Medium: glass material.** Apple's native `materials.md` > Liquid Glass discourages applying it to all content surfaces. User intentionally requests extensive simulated glass for a web scrapbook; maintain clear text layers, colored scrims, reduced transparency and focus indication. This is a deliberate aesthetic departure, not a native HIG-compliant implementation.
- **Medium: global task legibility.** Make major branch names remain readable at overview, small task marks visible in context, and global task rail readable. Do not pretend thousands of task titles can be individually legible within a small map viewport. `layout.md` > Progressive disclosure.
- **Medium: motion restraint.** Idle breathing should pause during hover/drag/input, be very subtle, and never cause a moving tap target on touch. `motion.md` > Best practices. Current CSS pauses on focus/hover/active, but real-touch tuning remains.

## Verification actually run

- Node test: `npm test`.
- Chromium Playwright script: `python tests/qa_v4.py` across desktop/tablet/phone/small/landscape.
- Direct-parent intersection probe: `python tests/overlap_probe.py`, result zero with sample data.
- Visual screenshots examined for desktop constellation, mobile layout, and timeline.

These tests do **not** verify real Safari/Android GPU performance, screen-reader order, keyboard-only completion of every path, full persistence under HTTP/HTTPS, or Supabase (not implemented).

## Design integrity check

User-specific purpose drives the visual signature. Removing all glass or replacing the no-tabs scrapbook with a standard dashboard would break the design thesis. The current treatment can be improved without sacrificing its identity by treating controls as explicit interactive layers, keeping the map itself visually quiet, using legible text over blurred motion, and offering no-motion/opaque alternatives.
