# ORBIT — ChatGPT tools, skills, and execution playbook

**Active workflow, 9 November 2026.** ORBIT is developed directly in ChatGPT with connected integrations. No Codex app, CLI or Codex-formatted prompt is required. This document explains how to choose tools and installed skills; exact availability may change between sessions, so inspect the live tool catalog before using them.

## Connected services — what to use for which work

| Task | Primary tool or connection | Operating boundary |
| --- | --- | --- |
| GitHub repo source, issues, PRs, branch protection, CI checks, source commits | **Connected GitHub app**, repository DoorBlox/orbit | Inspect main and open PRs before editing. Create focused feature branches, review actual diff, wait for all four exact-head checks, squash-merge safe approved PRs. No production diary content in source or Actions artifacts. |
| Production status, preview, performance metrics, alias, rollback | **Connected Vercel app**, orbit.starscene.com | Read actual deployed SHA and environment. Never assign custom domains or weaken deployment protection without an explicit owner-approved release step. |
| Postgres schema, RLS policies, migrations, Auth and private media | **Connected Supabase app**, project ixfgavgtwuzdgucjriec | Prefer read-only SQL and introspection. Run local isolated tests. Hosted migrations, Auth changes, data restores, object deletion and credential use require separately scoped consent. |
| JavaScript, source checks, tests, static browser fixtures | **Local execution/container and GitHub Actions** | Use synthetic fixtures and targeted tests, then exact-head required CI. No needless manual workflows; documentation-only fast path was added in PR #36. |
| Screenshots, responsive and accessibility testing | **Playwright/browser tools when available; privacy-safe supplied screenshots** | Never pretend to have authenticated browser access or screen-reader validation when not performed. Dummy data and synthetic captures are preferred. |
| Current library APIs, cost limits, alternative products | **Official docs and current public web references**, after repository search | Verify maintained version/license, bundle, semantics and free-tier conditions before recommending a dependency or provider. |

These tools can be used from the normal ChatGPT conversation. The owner need not activate a Codex workspace or instruct ChatGPT how to invoke the already-connected integrations. Never claim an unavailable tool or authenticated test ran.

## Task-matched skills — not a ceremonial checklist

Always check the available skills catalog, invoke the most specific matching installed skill and follow its actual instructions. Do not load or run every skill for every task. Names below are pointers to tools known to this project; availability is session-dependent.

| Work type | Suggested installed skills | How they help ORBIT |
| --- | --- | --- |
| Agent-operated feature delivery and safe handoffs | **ecc-agentic-engineering**, **ecc-blueprint**, **ecc-search-first**, **ecc-verification-loop** | Reconstruct exact state, decompose bounded tasks, search existing helpers before adding packages, implement, verify, and preserve a GitHub handoff. |
| Supabase schema, SQL/RLS, media, backend security | **supabase**, **supabase-postgres-best-practices**, **ecc-security-review**, **security-audit** | Read policies and definitions, design additive migrations, compare real SQL, validate tenant isolation and safe rollback. |
| CI, browser regressions, test fixtures | **ecc-verification-loop**, **ecc-e2e-testing**, **ecc-python-testing**, **ecc-eval-harness** | Focused browser and Node tests; exact check outcomes; no invented code coverage or redundant workflow dispatch. |
| UI, visual hierarchy, contrast, touch and responsive behavior | **apple-design**, **design-taste-frontend**, **ui-ux-pro-max**, **frontend-design-engineering**, **web-design-guidelines** | Inspect actual ORBIT screenshots and interactions. Keep the one continuous spatial world, six movable windows and paper journal. |
| Designing a truly new page or component | **hallmark** and, if installed, **impeccable** | Deliberate design direction and quality review. Hallmark is not for unsolicited overhaul of an existing design; do not claim an unavailable automated Impeccable tool executed. |
| Vercel cost/performance | **vercel-optimize**, related Vercel plugin skills | Analyze verified metrics, not speculative savings. Keep user on free-capable infrastructure where adequate. |
| Official embedded Excalidraw, as a React island only | **ecc-search-first**, **frontend-design-engineering**, **vercel-react-best-practices**, **vercel-composition-patterns**, **ecc-e2e-testing** | Research official Excalidraw APIs and dependency cost, lazy-load a React/ReactDOM component in the existing native JS app, test native-scene interoperability and privacy. |

React/Next performance rules do not automatically govern ORBIT's native JavaScript application. Apply React-specific guidance only to the planned isolated Excalidraw integration. Do not assume a working Canva/Figma editor, deploy tool, or other account connection without inspecting the current tools.

## ChatGPT's repeatable implementation loop

1. **Recover live context without user prompts.** Read [CHATGPT_HANDOFF.md](../CHATGPT_HANDOFF.md), [AGENTS.md](../AGENTS.md), [CURRENT_STATE.md](CURRENT_STATE.md), [post-2.4 blueprint](../plans/ORBIT_POST_2_4_EXECUTION.md), then the GitHub main SHA, issues, PRs and affected source files. Check Vercel/Supabase only when the task needs actual external state.
2. **Select the next SAFE READY work unit.** Follow dependencies, user priorities and previously approved scope. Avoid creating another planning-only PR if implementation can be done now.
3. **Find the existing code and tests first.** Establish the baseline, risks, acceptance criteria and reversible change. Compare third-party libraries before installing.
4. **Implement and verify.** Change one bounded slice, write regression tests, use local/synthetic data, inspect actual diff and build artifacts. Security-related edits receive isolated pgTAP/HTTP checks; UI edits receive relevant browser, touch and keyboard checks.
5. **Run PR checks efficiently.** Preserve required static-quality, local-postgres-rls, production-artifact-dry-run and unauthenticated-protection contexts. Use the Markdown-only fast path for real docs-only PRs; no workflow_dispatch simply to repeat green tests.
6. **Review and complete the PR.** Validate exact head SHA, no unintended files, no secret/media leakage, proper conflict behavior and all required statuses. Merge safe non-destructive code/docs changes when approved gates pass. Do not equate a GitHub merge with a Vercel release.
7. **Hand off exact results, not intentions.** Update active CHATGPT_HANDOFF.md once with verified GitHub SHA/PR, tests PASS/FAIL/NOT RUN, Production/data state, blocker, and the exact next file-level task. Update operations, history and the roadmap only where appropriate. Continue the next independent safe step during the active conversation when possible.

**The assistant does not run invisibly after the conversation ends.** A later ChatGPT session should resume from the repository, with no need for the owner to restate task history or prepare a special prompt.

## Immediate execution priorities

**Foundation:** BP-04 read-only migration history parity and safe procedure, BP-02 real media-inclusive backup/restore on synthetic data, BP-03 low-cost synchronization, BP-06 visual and accessibility baseline. **Creative priority:** EX-00 actual official Excalidraw feasibility and EX-01/EX-02 integration into BOTH Journal and sticky notes. **Owner-gated:** issue #26 authenticated image display evidence, any hosted SQL/Storage deletion, Vercel promotion, OAuth account/billing changes. Later issues #29 media gallery and #32 ChatGPT MCP require safe scopes.

The owner makes product decisions and provides uniquely private consent or test access when necessary. ChatGPT does the coding, auditing, source PRs, tests and handoffs.
