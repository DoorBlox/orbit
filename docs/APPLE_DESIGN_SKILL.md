# ORBIT - Apple Design Skill integration

**Status (2026-11-01): User confirmed the upstream skill was installed; its complete instruction entrypoint and relevant HIG references were invoked successfully for the Apple-design audit. Future chats should confirm skill availability rather than assume a permanent connection.**

Upstream repository: https://github.com/dickwu/apple-design-skill

## Purpose

Use the upstream Apple Design Skill as a rigorous *design review and improvement framework* for ORBIT's desktop, tablet, and mobile UX. It is not a source-code dependency or an instruction to reproduce Apple UI verbatim. Keep the upstream skill up to date independently. Do not assume the skill has been installed merely because this file exists.

## Install and activation

**ChatGPT:** User downloads the upstream repository ZIP through GitHub -> Code -> Download ZIP; then ChatGPT sidebar -> Plugins -> Skills -> Create -> Upload from your computer. ChatGPT will scan the uploaded skill. If the upload fails due to structure, repackage the full repository in a ChatGPT-compatible single-skill ZIP rather than dropping the supporting reference documents. This step requires explicit user action; an assistant reading this documentation cannot install skills into the user's account.

**Local Codex developer environment (optional):** In a Git-enabled, internet-connected local project root, follow the upstream documented command:

```bash
npx skills add dickwu/apple-design-skill -a codex
```

Review the repository's SKILL.md and scripts before installing. The command is for compatible local coding agents; it is *not* how ChatGPT web installs a skill.

Alternative project integration (if using the upstream's supported workflow): add the repository as a `.design-rules` submodule and point AGENTS.md at `.design-rules/SKILL.md` and its `references/` content. Do not run `scripts/pull-hig.mjs` without explicit approval; the upstream README says it performs numerous external requests and regenerates reference files.

## Core ORBIT review lenses

1. **Legibility and semantic zoom:** all leaf tasks remain represented in the fit-all graph; close zoom produces readable task labels and criteria. Test font scaling, label collisions and contrast under actual data density. Never claim every task can be readable at world zoom.
2. **Touch-first input:** meaningful targets >=44 CSS px (or equivalent accessible gesture affordance); one-finger pan, two-finger pinch, tap selection, touch-safe editing, keyboard avoidance, device safe areas and landscape checks.
3. **Reduced-motion resilience:** spring physics only when user directly manipulates a branch; stable resting layout; low-amplitude ambient movement; honor prefers-reduced-motion. No perpetual jiggle of all nodes.
4. **Glass layers:** reserve expensive blur/translucency for a small number of active controls and structural nodes. Keep text and task information readable without transparent backdrops; never render hundreds of heavy filter-backed glass cards. Ensure dark/contrast variation.
5. **Non-modal, no-tabs navigation:** preserve ORBIT's deliberate spatial navigation. The upstream HIG's conventional navigation recommendations are heuristics, not unconditional requirements. Supply reliable fit-all, back, search, focused-context, keyboard and accessible alternatives instead of forcing a tab bar.
6. **States and feedback:** obvious loading/saving/error/retry/undo; task drag must distinguish temporary elastic manipulation from persistent reparenting; destructive changes must be recoverable.
7. **Performance:** benchmark 100/500/2000 leaf tasks on midrange phones. Use a stable graph layout and lightweight rendering. Review pinch/zoom latency, input delay, canvas hit testing, memory, and screen-reader fallback.
8. **Privacy-first:** diary text, task details, school accounts, and external links are sensitive. No public task data; auth/RLS before real sync; never embed tokens in frontend.

## Review process (using the upstream skill)

Read its actual `SKILL.md`, consult its topic lookup document and only the relevant HIG reference pages. Review desktop and mobile separately. Classify issues by impact; propose a narrow, testable fix; record decisions in `docs/DECISIONS.md` and acceptance checks in `docs/ROADMAP.md`. Keep visual uniqueness, non-modal interactions and the human goals in `docs/PRODUCT_SPEC.md` as project-level invariants.

## Provenance and compatibility

The Apple Design Skill is third-party and not affiliated with Apple or ChatGPT. Its upstream content can change. No code from that skill is shipped in this ORBIT archive, and this file is not a substitute for the complete skill. If available, compare recommendations with official Apple HIG and W3C WCAG rather than treating a derivative checklist as authoritative.

## Applied audit

See [APPLE_DESIGN_REVIEW_V2.md](APPLE_DESIGN_REVIEW_V2.md) for the completed review, code changes, measurements, test results, and follow-up gates. The upstream skill remains a developer aid, not a runtime dependency.


## V3 applied usage

The user installed the skill and it has been loaded during V3's design review. See `docs/APPLE_DESIGN_REVIEW_V3.md` for audited design decisions, including user-led glass on content, fully general branches, unboxed task text, inline reflow and 320px mobile interaction. Do not confuse previous dark V2 advice with the current V3 specification.
