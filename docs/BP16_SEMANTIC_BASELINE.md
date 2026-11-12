# BP-16 — static semantic/accessibility quality gate

**Source-only implementation, November 2026.** `scripts/check-html-semantics.mjs` is integrated into the existing `npm run lint` alongside syntax and CSS structural checks. It guards the checked-in `index.html` and is covered by synthetic tests plus a real-index baseline test in `tests/html_semantics.test.mjs`.

This is a **bounded static HTML validator**, not a claim of WCAG 2.2 AA conformance, runtime-screen-reader compatibility or a complete semantic parser. The preserved V6 spatial app has interactive DOM created at runtime; those dynamic controls remain governed by browser/keyboard tests and manual testing. It does not change source UI, glyphs, layout, color, animation or private data.

## Enforced source invariants

- Exactly one static `<main>` and an explicit valid document language.
- Non-empty, valid and unique element IDs (no conflicting ARIA targets).
- Every static `for`, `aria-labelledby`, `aria-describedby` and `aria-controls` reference points to an actual ID.
- Static `<button>` elements have explicit native `type` and an accessible name through visible text or `aria-label`, `aria-labelledby` or `title`; no empty `aria-label`.
- Valid `aria-expanded`, `aria-hidden` and `aria-pressed` values; obvious static `aria-hidden=true` focusable elements are blocked.
- `<img>` must declare `alt` (empty is permitted for decoration); iframe must have a non-empty title.
- No `javascript:` or `data:` anchor URLs, and `target=_blank` links require `rel=noopener`.

The checker excludes comments, script and style bodies, recognizes `>` inside quoted attributes, and produces simple error codes. It audits only the first-party checked-in static HTML; deliberately does not parse runtime inserted HTML, forms built by JavaScript, shadow DOM, user-authored notes, CSS contrast, ARIA widget behaviors, motion accessibility or pointer/keyboard usability. Runtime browser test suites already cover navigation and focus behavior, including real-origin interactions and reduced-motion. Those must remain required CI checks.

## Follow-up ownership

W3 owns UI-level interaction/label fixes; W4 owns CI semantics guard. Future BP-16 phases should add an axe-core or similarly maintained runtime accessibility engine in the browser suite under independent review, audit built UI across signed-out and signed-in states, validate color contrast across theme presets and verify actual keyboard/screen-reader assistive paths. Do not assert semantic static lint alone closes WCAG compliance or release acceptance.

To check locally: `npm run lint`, `node --test tests/html_semantics.test.mjs`, then real browser and device tests. A failing assertion should be fixed by improving the accessibility semantics or by documenting a specific, reviewable dynamic exception; never blanket-ignore the checks.
