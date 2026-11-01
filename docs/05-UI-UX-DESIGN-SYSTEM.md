# 05 — Existing UI/UX design system and limited audit

## M1 scoped accessibility fixes

Diagnosed bugs: Your space lacked a keyboard move grip; graph rerenders discarded focus; dynamic branch fields lacked labels; short landscape viewports cropped focused journal controls. M1 adds the missing existing-style grip, labels/focus recovery, a visible paper/timeline focus outline and camera reveal of focused controls. Stored spatial coordinates and touch gestures are retained.

Small paper text was below 4.5:1 against #F8F1DD: saved-state #987F6D measured 3.33:1, footer #9B846E 3.15:1 and empty editor #B29E86 2.29:1. These labels now use the existing brown family through --journal-muted #735B4A (above 4.5:1 against the paper base). This is a nominal token measurement; full moving-glass contrast remains a separate audit.

Five-viewports/keyboard/reduced-motion/high-contrast and representative 200% text enlargement pass; physical Safari/Android/VoiceOver and full WCAG/text-zoom testing remain open. The spatial world, pastel/glass atmosphere, unboxed glowing tasks and paper journal are preserved. Before/after images and scope limits: [M1 report](decisions/M1-IMPLEMENTATION.md).


## Visual identity (source, not redesign)

Source: `src/styles.css:1-20`, `index.html`, V6 QA screenshots `qa/v6-clean-overview.png` and `qa/v6-clean-journal.png`. ORBIT is **light, atmospheric, spatial, glass-like**, not a card-heavy dashboard. Its signature is a continuous scrapbook with six independent windows. Typography/shape carry hierarchy; high-contrast readable content sits over a slow pastel wash.

### Existing tokens (literal source values)

| Token | Value | Usage |
|---|---|---|
| `--canvas` | `#F0F5FA` | pastel base |
| `--ink` | `#213451` | strong ink |
| `--text` | `#263954` | body text |
| `--muted` | `#586D88` | secondary text |
| `--soft` | `#76869A` | quieter secondary |
| `--accent` | `#3D6DAB` | interactive accents |
| `--focus` | `#315CBE` | visible focus outline |
| `--glass` | `rgba(255,255,255,.46)` | frosted surfaces |
| `--edge` | `rgba(255,255,255,.83)` | edge highlight |
| Fonts | `-apple-system, BlinkMacSystemFont, Segoe UI, Inter, Arial, sans-serif` | UI system sans; journal paper has separate styling |

### Interaction grammar

- **Spatial camera** in `src/board.js` pans/zooms entire `#spatial-world`; widget title bar/grip drags, resize corner changes width/height.
- **Graph camera** in `src/constellation.js` zooms radial subtree independently; spring drag is temporary, not reparenting.
- **Tasks** use typography and colored glow without surrounding boxes; expanding task reveals indented detail and pushes subsequent rows down.
- **Timeline** is a horizontal zoomable ruler with dedicated vertical lanes: deadlines above axis, milestones below, journal markers below milestones.
- **Journal** is a warm-page WYSIWYG widget; dated, reversible delete, no visible Markdown syntax while typing.
- **Navigation** via map, fit controls, and spatial navigator; never replace with conventional tabs without approval.

## Anti-slop & Apple-design quality findings

These are evidence-based on V6 CSS/screenshots, not a claim of an automated contrast audit.

| Lens | Status | Observation / recommended scoped action |
|---|---|---|
| Integrity | PASS (local) | 'LOCAL PROTOTYPE' label correctly signals no cloud (until Auth implemented, then update copy) |
| Distinctive design | PASS | non-grid spatial layout, tactile paper journal, colored text-level tasks; **preserve** |
| Accessibility | NEEDS WORK | canvas graph is visually rich, but speech/screenreader hierarchy and zoomed text sizes need dedicated physical-device/AT tests; don't imply Apple-HIG certification |
| Dense overview | NEEDS WORK | all widgets shrunk to unreadable size in `qa/v6-clean-overview.png`; acceptable for spatial location only, but nearby large labels/screenreader alternatives are needed |
| Glass contrast | NEEDS WORK | translucent surfaces can shift contrast over moving background; test real CSS-composited values, 4.5:1 normal text target, reduced-transparency conditions |
| Motion | NEEDS WORK | persistent animation may distract; honor `prefers-reduced-motion` and consider pause when document hidden |
| Responsive | PARTIALLY VERIFIED | simulated 320/390px Chromium passed; iOS Safari and Android physical not tested |
| Keyboard | PARTIALLY VERIFIED | title grip and resize have arrow controls; full voiceover focus ordering unverified |
| Implementation | PASS (local build) | keep static ESM instead of importing unrelated framework/component library |

## Explicitly preserved exceptions

Apple's native Liquid Glass guidance limits that material to a floating control layer. ORBIT intentionally uses a **custom web glass aesthetic** on content widgets, because that is an explicit product preference. Preserve the look; verify readable and accessible fallbacks instead of claiming native material compliance.

## Scoped quality improvements only

1. Adopt semantic labels/focus traversal for every widget without changing placement.
2. Validate contrast and text scaling in real browsers with moving background.
3. Give explicit offline/pending/saved feedback when cloud sync is added.
4. Keep tap targets generous and titles accessible on touch; preserve navigator collapse.
5. Audit slow animation and canvas rendering on lower-end hardware.
6. No new dashboard cards, tabs, decorative gradients, stock imagery or duplicate task displays.

## Test matrix

Desktop 1440×900, tablet 900×1100, small phones 320×700 and 390×844, landscape 844×390; 200% browser text zoom, long task names, 500 tasks, empty/overdue/completed states, keyboard-only, Android Chrome and iOS Safari physical, reduced motion/transparency, and light dynamic backgrounds. Existing scripted Chromium checks cover the viewport sizes only, not this entire matrix.
