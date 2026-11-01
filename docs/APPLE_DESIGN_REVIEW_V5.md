# ORBIT V5 — Apple Design and web UX review

**Artifact**: custom dependency-free static web application, desktop/tablet/mobile; not a native Apple app. Apple's HIG applies as design guidance, not mandatory iOS component conformity.

## What works

- **Distinctive thesis**: a personal spatial scrapbook rather than a conventional dashboard, carrying over the user's personal visual concept. `design-principles.md › Purpose/Delight` informs intentional spatial identity.
- **Layout flexibility**: move and arrange arbitrary widgets in one world without requiring fixed list-page layouts (`layout.md › Adaptability`).
- **Motion**: slow atmospheric colors behind content, not on the letters; reduced-motion alternative (`motion.md › Best practices`).
- **Input**: mouse and touch panning, separate draggable grip, keyboard arrow repositioning of widgets, minimap dot navigation (`gestures.md › Best practices`).
- **Data integrity**: explicit journal Undo, full JSON export and local status messages (`feedback.md › Best practices`).

## Improvements remaining before production

1. **High — Screen-reader parity**: a spatial map lacks an equivalent linearized hierarchy/task list navigation experience for assistive technologies. Existing task widgets partly help but need full keyboard/focus audit (`accessibility.md › Vision/Mobility`).
2. **High — Real device legibility and touch**: world zoom makes global fit labels intentionally tiny; focused widgets must be tested on physical iOS and Android, not only Chromium emulation. Mini-map dots are smaller than ideal 44px mobile targets (`accessibility.md › Mobility`; `layout.md › Adaptability`).
3. **Medium — Material clarity**: user specifically prefers large-area translucent glass despite Apple's more restrained recommendation for Liquid Glass on functional controls; reduce transparency works but contrast should be measured for each selected state (`materials.md › Liquid Glass`).
4. **Medium — Journal rich text**: prototype uses `document.execCommand` and simple sanitization; adopt structured editor, add large-text and selection/IME coverage, especially iOS keyboard (`entering-data.md › Best practices`).
5. **Medium — Widget collisions**: freely positioned objects can overlap; add future snapping/collision guides plus an intuitive reset-layout action to recover lost widgets (`layout.md › Visual hierarchy`).
6. **Medium — Real source-of-truth privacy**: browser-local journal is not an authenticated private vault. Set up proper data protection before hosting sensitive entries (`privacy.md`, general responsibility principle).

**Verdict:** Strong visual direction and functional prototype, but not production-accessibility or private-account ready. Browser QA is documented; real-device and deploy checks remain.
