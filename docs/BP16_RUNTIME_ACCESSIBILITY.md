# BP-16 real-origin accessibility regression contract

**Source-only synthetic browser automation; not a WCAG 2.2 AA certification.**

The existing `scripts/check-html-semantics.mjs` enforces static markup on every lint run. New `tests/qa_bp16_accessibility.py` checks browser-computed keyboard, modal, focus and ARIA behavior against the real built ORBIT spatial UI in Chromium. The required `static-quality` GitHub job runs it after the existing M1 real-origin suite; only localhost synthetic data is involved. Browser evidence is a brief `qa/bp16-accessibility-results.json`, retained with the existing short-lived QA artifacts.

The test covers desktop and touch-capable 390px width: a visible keyboard-accessible Jump trigger; native top-layer named modal dialog; focused, visibly outlined search field; Tab and Shift+Tab focus containment; close via Escape with focus returned to the original trigger; keyboard reopening; empty-results removal of stale `aria-activedescendant`; `role=combobox` `aria-controls`/`aria-describedby` pointing to intended elements; exactly one `aria-selected=true` active option; ArrowUp/Down changing the active ID; Ctrl+K not hijacking the capture editor; and an existing widget grip accepting keyboard movement with an observable focus ring.

**Limitations:** Chromium is one browser engine, and the fixtures use a local unauthenticated account, not Production login. Native modal trapping can differ for mobile assistive technologies. Additional W3- and owner-assisted checks are still required for signed-in cloud shell, journal and Excalidraw dialogs, authentic screen-reader announcements, contrast over ten theme presets, physical touch, high zoom, RTL/localization, and visual regression. Missing consent and hosted release gates remain unchanged.

**Cross-worker ownership:** W4 only writes `tests/qa_bp16_accessibility.py`, CI workflow wiring and W4 handoff. If a test uncovers a product-side focus/label regression, coordinate its reproduction with W3 rather than editing W3-owned `src/app.js`, `src/quick-jump.js`, `src/styles.css` or other active UI source on this PR. Do not suppress a genuine failure to make CI green.

**Reproduction:** `npm ci --ignore-scripts && npm run build && python -m pip install -r tests/requirements-browser.txt && python -m playwright install chromium && ORBIT_BROWSER_BUNDLED=1 python tests/qa_bp16_accessibility.py`.

**Acceptance:** all required exact-head GitHub checks on the final PR commit; browser test exit 0 and evidence with synthetic results; independent review of the diff. Source merge is not a Production deployment or WCAG sign-off.
