# ORBIT — documentation and handoff protocol

**Adopted:** 9 November 2026. **Purpose:** prevent context loss, contradictory state claims, uncontrolled scope growth and accidental infrastructure changes. This document is a maintained rulebook, not another release history.

## Agent-owned execution and continuity

ChatGPT owns executing approved implementation work, not merely writing the plan. After each code or CI change, it records exact head/PR/check evidence, resolved and unresolved test gates, and a single file-level next task in CHATGPT_HANDOFF.md. Do not require the owner to manage the project through reminder prompts. The assistant can only advance work during active conversations unless an automation is explicitly created. Separately approve production changes, hosted data, identity access, destructive operations and paid resources.

## Active ChatGPT workflow and historic compatibility

ORBIT's owner works directly in **ChatGPT**, not a Codex-specific client. The maintained [CHATGPT_HANDOFF.md](../CHATGPT_HANDOFF.md) contains exact task continuity; the [tool/skills playbook](CHATGPT_TOOL_PLAYBOOK.md) maps the connected integrations and installed skills. The old CODEX-named handoff is a short compatibility pointer; its full original content is archived. New task status, handoff and delivery evidence belong exclusively in the ChatGPT handoff.

## Source-of-truth priority

1. **Observed system state:** live GitHub branch/PR/check SHA, Vercel deployment/domain/protection, Supabase migrations/RLS/Storage. Never infer a present result from a historical document.
2. **Current human-readable digest:** [CURRENT_STATE.md](CURRENT_STATE.md). One short page containing deployed source, known-good rollback, live capabilities, blockers, issue state and next task.
3. **ONLY active execution roadmap:** [ORBIT_POST_2_4_EXECUTION.md](../plans/ORBIT_POST_2_4_EXECUTION.md), all BP-00–BP-16 **and** integrated SP/PJ/BR/TOUCH/FO/PUB/AUTH work units, priorities, dependencies and gates. Do not maintain another active roadmap or task queue; historic design/proposal files and docs/ROADMAP.md are archival/navigation only.
4. **Contributor rules:** [AGENTS.md](../AGENTS.md), stable constraints, privacy, cost budget and test gates. Avoid copying the live checkpoint into every rule.
5. **Handoff:** [CHATGPT_HANDOFF.md](../CHATGPT_HANDOFF.md), maximum useful summary of next step, branch/ref, results and unresolved decisions.
6. **Operational runbook:** [OPERATIONS.md](OPERATIONS.md), staging, data backups, rollback, Auth/CSP/aliases and incident response.
7. **Historical evidence:** [PROJECT_HISTORY.md](PROJECT_HISTORY.md), [decisions/](decisions/), old milestones/blueprints, changelog. Historical statements must remain dated and must NOT override the current state.

## Update contracts and file owners

| Event | Update | Do not do |
| --- | --- | --- |
| Start a development session | Read CURRENT_STATE, AGENTS, handoff, relevant plan and code/test paths; verify live repo SHA if writing | Assume previous conversation's branch is still current |
| Start a work unit | Record ID, status, issue, owner, dependencies, relevant files, test strategy, safe rollback | Change unrelated UI/cloud permissions |
| Complete a source PR | Update plan work-unit status and handoff, link PR SHA, acceptance and untested items; minimal changelog if behavior changed | Mark it Production merely because PR merged |
| Stage a deployment | Record exact built SHA, protected URL, target, runtime config and checks in OPERATIONS/handoff | Promote or disable protection automatically |
| Promote Production (separately authorized) | Verify alias maps to expected READY source, unauthenticated privacy, release notes, rollback; update CURRENT_STATE and history | Claim private-owner or image function works without signed-in evidence |
| Hosted database migration | Capture approved backup, staged tests, source filename + hosted ledger IDs, data impact, rollback; update operations/state | Rewrite historical migration files or call db push to guess compatibility |
| Design change | Attach synthetic screenshot matrix, viewports/themes, a11y and motion notes; document accepted deltas | Replace the freeform spatial model or existing saved widget positions; a fixed six-widget count is not a requirement |
| New external provider / paid tier | Separate consent, cost boundary, privacy/threat review, disable/reversal plan | Assume "free tier" implies no bill or no user action |

## Product-count clarification

The six original named widgets are a historical layout/default, **not a maximum**. Future widgets and a linked public portfolio/blog are permitted in active plans. Preservation means existing IDs, positions, sizes, data and the freeform spatial experience continue to work. Do not let an old milestone screenshot or historical status paragraph block extensibility. See the [integrated spatial and Projects work units](../plans/ORBIT_POST_2_4_EXECUTION.md#integrated-feature-work-contracts--all-tracked-in-this-master-roadmap).

## Work-unit state machine

**New requirements must be inserted into the existing master roadmap at the right dependency edge and priority—not into a separate plan.** Supporting technical contracts, visual evidence and security RFCs may live elsewhere as evidence, but cannot introduce another independent implementation order.

Use only **PROPOSED**, **READY**, **IN PROGRESS**, **BLOCKED**, **SOURCE MERGED**, **RELEASED**, **VERIFIED** or **DEFERRED**. A feature can be RELEASED but still not VERIFIED for a specific acceptance criterion (example: #26). Link evidence next to each state; don't collapse independent source/preview/production/owner-check states.

Each BP, EX, SP, PJ, BR, TOUCH, FO, PUB and AUTH work unit must contain: ID, user value, evidence and issue, dependencies, scope and target paths, out-of-scope, security/data/cost risks, tests with precise pass criteria, rollback, required owner action, artifact/PR SHA and next session task. Revise dependency edges whenever a requirement changes. One unit, one focused PR, unless tightly coupled changes demonstrably require batching.

## Version language

- **App release**: user-visible marketing label (currently 2.4). This is NOT necessarily package.json version.
- **Package**: npm package.json version remains 1.0.0. Any bump must update reviewed build, release-guard assertions, metadata and CI together, not independently.
- **Backup schema**: ORBIT JSON export uses format version 6. Changes need explicit compatible readers/fixtures; never automatically equate this to app semver.
- **SQL migrations**: filename timestamp and hosted ledger version; verify both against actual definitions before further live changes.
- **Commit and deploy**: source commit and deployed artifact ID are separate. A documentation merge changes main without automatically updating the deployed application.

## CI and data cost rules

Do not manually dispatch an existing heavy workflow simply to "check again." Main requires four checks (static-quality, local-postgres-rls, production-artifact-dry-run, unauthenticated-protection). PRs currently trigger required checks; optimize their scoping later in BP-16, without spoofing or disabling status contexts. Batch documentation changes. Use synthetic workspace data for browser/SQL fixtures; never upload production journal, screenshots with identifying data, raw signed URLs or secrets to CI artifacts, GitHub or general analytics.

## No silent authorization creep

The owner's consent to **plan and start documentation/research** is not consent to apply hosted migrations, delete private media, buy R2, create OAuth providers, expose public content, change production protection or alias, or merge a risky feature without validation. Obtain a separate explicit decision for irreversible/release/provider actions. Rollback of code does not restore deleted or migrated data.

## Session handoff template

At the END of a task update [CHATGPT_HANDOFF.md](../CHATGPT_HANDOFF.md) once, with: (a) exact source/PR/deploy SHA; (b) shipped vs source-only; (c) completed BP/EX checks and their evidence; (d) blocker and owner actions; (e) the next single work unit with file paths and do-not-touch list; (f) rollback and any security/cost constraints. Preserve detailed research in its named plan/evidence file rather than copying pages into AGENTS/README/handoff.

Archive earlier checkpoints by dating them, not by erasing or retroactively editing their conclusions.
