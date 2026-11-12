# ORBIT Worker W3 — Product Experience

**Startup state: NOT STARTED.** Read [parallel command protocol](../ORBIT_PARALLEL_COMMAND_PROTOCOL.md), [master BP roadmap](../../plans/ORBIT_POST_2_4_EXECUTION.md), current handoff and latest PR state. The owner expressly **wants ambitious, high-craft UX and architecture innovation**, not repetitive conservative fixes. Question poor layouts and assumptions, research references, compare concepts, implement reversible alternatives and judge them against usability, performance, privacy and beauty. Preserve ORBIT's extensible freeform spatial world; no generic dashboard replacement or silent data loss.

**Mission:** Remaining BP-06, BP-07, BP-08, BP-11, BP-13, BR-01, PJ-03, TOUCH-01, FO-01 and AUTH-MASCOT, including meaningful accessibility, Excalidraw editing ergonomics, nested spatial navigation, project milestones/links, optional focus timer and physical touch acceptance.

**Important live startup fact:** BR-01 [PR #86](https://github.com/DoorBlox/orbit/pull/86) was open at head `ade306456cba0b0538224429a9b02a44a8e9231a` and all four required CI workflows succeeded when checked on 12 Nov. First requery current state, inspect diff and reviewer threads, then decide whether to source-merge or address defects. Do **not** duplicate Universal Jump in a second branch if already merged.

**Own:** `src/app.js`, `src/styles.css`, `src/projects.js`, `src/project-shelf.js`, `src/quick-jump.js`, `src/board.js`, `src/inline-canvas.js`, UI-focused files and tests. Coordinate any W2-owned media/backup API, W1-owned sync/repository and W4-owned CI scripts via PR discussion before editing.

**First executable action after resolving #86:** Choose highest-value READY user-facing item from the canonical roadmap (PJ-03 milestones/resource editor or structured-text/IME reliability are strong candidates); create test-first, synthetic viewport/keyboard/10-theme visual evidence, then implement and open a reviewable feature PR. Critique and replace bad UI with a cohesive alternative when justified; synthetic emulation is not physical Safari/Android acceptance.

**Relevant skills:** oil-ui/design-taste/frontend-design-engineering, ui-ux-pro-max, apple-design, emil-design-eng, accessibility-audit, TDD, animations/gestures and verification. Use task-matched skills, search current design references/maintained docs, inspect screenshots rather than inventing generic mockups. Avoid unnecessary motion and package bloat.

**Context checkpoint (update during work):**
- Observed creation main: `183a6b355f85c05c055125d7fe8f449145edf241`; re-query.
- #86: OPEN with 4/4 reported green at creation; do not assume still open.
- Active W3 branch/PR/head: none created for W3 setup.
- Owner-device acceptance: NOT RUN by W3.
- Next action: inspect #86 actual diff/comments and make review/merge determination.
- Rollover: record exact PR, head, status, test data, screenshots, decisions, blockers and one next executable file-level action, then continue in a new ORBIT Project chat.
