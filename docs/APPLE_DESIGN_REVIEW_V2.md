# ORBIT — Apple Design / Cross-Platform UX Review

**Review date:** 2026-11-01  
**Artifact:** Phase 1 Constellation, dependency-free browser app (`index.html`, `src/`).  
**Platforms:** Responsive desktop web, tablet browser, mobile browser. This is **not** a native iOS or macOS app; Apple's HIG is used as a design and accessibility lens, not as an app-store certification.  
**Design thesis:** One spatial view gives complete awareness of personal commitments without making every task visually demand attention.  
**Assessment after corrections:** **Good prototype, not yet production-ready.** No known blocking functional error in the tested paths; accessibility and real-device checks remain open.

The review used the installed `apple-design` skill and its source-specific HIG references. Citations below identify the reference file and section; recommendations about ORBIT's spatial structure are explicitly design judgments where Apple has no matching component.

## Most consequential findings and changes

### Resolved — Mobile focus formerly reduced task readability (High)

**Evidence:** Original `src/constellation.js`, `focusNode()` and `focusTask()`: mobile task stack was scaled to ~0.72–0.86, making a 14px task title effectively ~10–12px even after selecting a project.  
**Why:** `typography.md › Ensuring legibility` and `accessibility.md › Vision` require readable text.  
**Fix:** At phone widths, project/task focus centers its terminal stack and chooses scale according to viewport/stack width; the `near` task text is 15px before scaling and can wrap to two lines. Test at **390px** measured **17.14px effective text**, **67.43px rendered task row**. At **375px** effective text **16.43px**, at **320px** effective text **15.26px**. This does not mean the full-world overview should be readable: it remains intentionally spatial/dense.

### Resolved — Destructive-action confirmation could carry between tasks (High)

**Evidence:** Original task inspector's first delete click primed a global flag; selecting another task did not reset it.  
**Why:** `undo-and-redo.md › Best practices`; `feedback.md › Best practices` emphasize predictable and recoverable changes.  
**Fix:** Selection resets the primed confirmation. Deleted tasks and bulk demo-content removal now provide in-context Undo; the keyboard can use Control/Command-Z outside form fields. Browser regression confirms task B cannot be deleted by a confirmation begun on task A (`src/app.js:117–200`).

### Resolved — Large task collection lacked direct locate (High)

**Evidence:** Full-map labels intentionally become unreadable; navigating many nodes individually would be tedious.  
**Why:** `layout.md › Visual hierarchy` supports progressive disclosure; `gestures.md › Best practices` calls for more than one way to interact.  
**Fix:** The existing bottom capture input now doubles as **Find**, without adding a menu, drawer, navigation tab, or popup. Tap the left spark/search control or press `F` / `Ctrl/Command-F`, type a task title or completion criterion, and press Enter to focus the first matching task. Matches are visually differentiated; label announces the match count. Task title drafts survive switching modes (`src/app.js:48–76, 203–232`). **Open:** multiple-match navigation is still limited; improve it before large-scale deployment.

### Resolved — Touch/keyboard discoverability and control sizes (Medium)

**Evidence:** Overview contains many tiny nodes; graph elements have roles but were not automatically magnified when keyboard-focused.  
**Why:** `accessibility.md › Vision`, `gestures.md › Best practices`, `designing-for-ios.md › Best practices`.  
**Fix:** Keyboard `Tab` to a graph node or task zooms that item to a readable location, preserving visible focus. Mobile supports a familiar double-tap-to-zoom on the empty canvas, in addition to pinch and plus/minus controls. Quick-capture toggle has a 44×44 CSS-pixel hit area. Mobile text-entry controls are >=16 CSS pixels, reducing Safari's unexpected auto-zoom risk. Tested at 320/375/390/768/844/1440 CSS-pixel viewports. This still requires real-device validation.

### Resolved — Excessive render work while typing (Medium)

**Evidence:** Inspector `input` handlers previously rebuilt every graph node on every character.  
**Why:** `motion.md › Best practices` values fluid, responsive feedback; preventing excessive work on the input path is an engineering judgment.  
**Fix:** Inspector typing persists immediately but coalesces whole-map redraws for a short 170ms idle interval (`src/app.js:140–155`). Production performance must still be profiled.

### Resolved — Accessibility preferences had incomplete material treatment (Medium)

**Evidence:** Blur-backed toolbar, capture surface, and editor had no reduced-transparency adjustment.  
**Why:** `materials.md › Liquid Glass` and `dark-mode.md › Best practices`.  
**Fix:** Added media-query fallbacks for reduced transparency, increased contrast, and reduced motion (`src/styles.css:294–310`). The node material itself is **not** browser backdrop-filter Liquid Glass; it remains a light, non-blur content-layer treatment. Blur is reserved for functional controls and the task inspector.

## Open findings

**High — Screen-reader and full-keyboard access at large scale.** Native graph buttons are accessible, and a direct finder now exists, but the 2,000-task case needs an optional structured semantic browsing route with role/project hierarchy. A large linear Tab sequence through thousands of items is not a satisfactory experience (`accessibility.md › Vision`, `gestures.md › Best practices`). A no-tabs spatial visual interface can still have an accessible alternative without putting menus on screen by default.

**High — Real iPhone Safari and Android Chrome tests.** Automated Chromium emulation covered 320–1440 widths, portrait/landscape, tap, pinch (previous suite), double-tap, task editing, keyboard focus, reduced motion. Real-device tests must check dynamic viewport height when the software keyboard opens, scroll containment inside the task editor, safe-area insets, font scaling, screen readers, and touch latency (`designing-for-ios.md › Best practices`, `layout.md › Adaptability`). The available browser runner blocked HTTP localhost navigation, so true HTTPS-origin persistence and reload were not verified here.

**Medium — Editing overlay is a product compromise.** The compact desktop inspector and phone bottom surface cover part of the map. They are not site navigation or a blocking alert, but do intrude on the fully spatial ideal. Test whether inline task-card expansion or a translucent anchored editor would better meet the design intent without harming touch text entry (`layout.md › Visual hierarchy`, `entering-data.md › Best practices`).

**Medium — Long text and user font enlargement.** Two-line mobile task titles improve focused readability, but a 200% text-size and browser zoom audit is not yet complete. A fully responsive CSS type scale and accessible text alternative are needed (`typography.md › Ensuring legibility`).

**Medium — Graph performance at large scale.** The prototype uses DOM task rows and redraws the hierarchy; benchmark 100/500/2,000 tasks on midrange phones and measure frame rate, scroll/pinch latency, memory, and inspector input response. Canvas/WebGL virtualization may be necessary. No unsupported performance claim should be made.

**Low — Meaning of task colors.** Deadline/urgency mode labels are present and zoom reveals due text, but the mint→amber→coral gradient lacks an explicit compact legend in the overview. Add an optional accessible key without forcing constant chrome (`color.md › Best practices`).

## Color checks

Contrast calculations on defined opaque token pairs (they do not replace full on-device tests of blended/gradient pixels):

| Foreground / background | Contrast | Meaning |
| --- | ---: | --- |
| `#edf3fd` on `#090d15` | 17.44:1 | Main text / canvas |
| `#e2eaf7` on `#1c293d` | ~12.10:1 | Task title / representative dark card fill |
| `#a6b6cc` on `#182339` | ~7.61:1 | Inspector field label / representative panel fill |
| `#8494ae` on `#101b2e` | ~5.60:1 | Field placeholder / representative input fill |

`color.md › Best practices` requires one color to carry one consistent meaning. Task status isn't communicated by color alone: rows also carry due labels (when zoomed), status/urgency via accessibility names, and inspector fields. The far view remains a visual overview, not a readable task list.

## Craft notes

**Keep:** dark uninterrupted canvas, central identity, four life domains (including Just Because), stable radial arrangement, terminal task stacks, soft edge light, elastic interactions on manipulation only. These elements convey information rather than decorate a generic dashboard. Glass is concentrated in the floating functional layer in accordance with `materials.md › Liquid Glass`. Avoid adding platform tabs: ORBIT's atypical navigation is intentional, and its direct gestures, fit-all control, finder, and keyboard support are the compensating discoverability strategy.

**Remove or reconsider:** the redundant low-contrast decorative uppercase sentence at the top of the map, which competes slightly with focused content; its current low contrast is acceptable only because it is decorative (`aria-hidden`). A later typography pass should decide whether it is needed at all.

## Verified tests and known test boundary

- `npm test`: domain/model/layout and CSV regression.
- `python tests/browser_smoke.py`: desktop, tablet, 390px/375px mobile and landscape; capture, inspector, pinch, fit-all checks.
- `python tests/apple_audit_smoke.py`: desktop find/draft preservation, deletion confirmation reset and Undo, phone text dimensions at 320/375/390px, tablet/landscape, keyboard zoom and search, mobile double tap, reduced motion.
- `python tests/qa_export.py`: generated screenshots of overview, focused project, and inspector for design QA.
- `python tests/source_origin_smoke.py`: prepared as a local HTTP-origin test for the owner's computer; **not passed in this sandbox** because Chromium localhost navigation was blocked by the runtime. Use after local checkout or deployment.

**Next gate:** user checks this build on an actual phone and desktop. Then we can refine the map's spatial composition and enter Phase 2 only after a private GitHub/Vercel deployment decision.
