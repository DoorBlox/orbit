# ORBIT — four-worker parallel execution protocol

**Established 12 November 2026 by owner instruction.** This is an **operations/coordination contract, not a second roadmap**. Product scope, dependencies, and BP statuses remain exclusively in [the master BP-00–BP-16 roadmap](../plans/ORBIT_POST_2_4_EXECUTION.md). This document describes how four active ChatGPT worker conversations can work safely at high speed under a fifth ChatGPT commander conversation.

## Owner mandate and authority

The owner wants **four separate, simultaneously active developer chats** inside the existing ORBIT ChatGPT Project, with a **fifth commander chat** for prioritization, architecture review, scope arbitration, integration, and accurate progress reports. The commander is *not* Worker 1. The initial browser-side assembly has not been performed by this documentation PR: do not represent worker chats as launched just because these files exist.

The four workers are empowered to do substantive engineering end to end, not merely propose tiny low-risk changes. They may challenge weak assumptions; perform rigorous product, security, accessibility and architecture critiques; research official documentation, maintained examples, independent design references and licenses; explore radical but justified alternatives; add/refactor modules; significantly change UX while preserving ORBIT's spatial identity; build tests; open and merge source PRs after the defined quality gates. Treat prior design decisions as revisable hypotheses except the current owner's express privacy, recovery, spatial-identity and release requirements. **Do not choose the smallest or least ambitious patch merely because it seems safe.** Choose the highest-value READY work supported by evidence, make a reversible experiment where feasible, and report adverse findings honestly.

Use **task-relevant installed skills proactively**. Inspect the skill catalog and read the most specific matching skill before working. Apply skill workflows rather than naming them ceremonially. Search the repo before inventing new code; verify current upstream APIs, product references, cost and licenses on the web when material. Compare alternative approaches and run a critical self-review before requesting merge. No needless package/framework rewrite: large architecture changes need a measured reason and compatibility plan.

Broad delegated authorization covers ordinary code and docs edits, feature branches, tests, security research using nonprivate/synthetic data, architecture or UI refactors, non-destructive experiments, PR creation, reviewing exact diffs, merging green non-conflicting **source** PRs, and reviewing protected Preview deployments. **It does not silently authorize** data deletion or migration, changes to hosted SQL/RLS/Auth/Storage, access to privileged credentials, public publishing of formerly private data, paid providers, removal of Preview protection, or Production/domain/alias changes. Those require explicit, separately scoped owner approval, an evidence-backed recovery plan and release gates. Source merge is never proof of Production release or signed-in acceptance.

## Five conversations, four worker owners

| Chat | Work ownership | Owned source/code areas and mutual exclusion |
| --- | --- | --- |
| **Commander** | This chat; reviews live GitHub state, arbitration, integration, status, and owner-only gates; not an implementation worker | Owns canonical coordination summary and reconciles single roadmap, CURRENT_STATE and CHATGPT_HANDOFF after worker merges. Can inspect all PRs. |
| **W1 — Core Engine** | BP-03, BP-04 and BP-09 unfinished reliability/performance/DB-parity acceptance; robust CAS, retry and measurement | Owns `src/cloud/sync.js`, `src/cloud/repository.js`, `scripts/measure-sync-traffic.mjs`, sync tests. **Read-only** hosted DB audits unless specifically authorized. |
| **W2 — Private Media** | BP-01, BP-02, BP-10, BP-12 and EX-02 media integrity/portable backup/privacy; #26 and #29 | Owns `src/cloud/media.js`, `src/cloud/portable-backup.js`, `src/backup.js`, media fixtures/tests; media consumers in W3 must agree API first. |
| **W3 — Product Experience** | BP-06, 07, 08, 11, 13, BR-01, PJ-03, TOUCH-01, FO-01, AUTH-MASCOT; Excalidraw UX, spatial navigation and frontend | Owns `src/app.js`, `src/styles.css`, `src/projects.js`, `src/project-shelf.js`, `src/quick-jump.js`, `src/board.js`, `src/inline-canvas.js`, UI tests. |
| **W4 — Platform / Security / Release** | BP-00, BP-05, BP-15, BP-16, security of PUB-00/01/02, #32 OAuth/MCP, CI and preview/release safety | Owns `.github/workflows/`, targeted security and release scripts/tests and design RFCs. Coordinate Supabase/repository interfaces with W1 before editing them. |

The roles are ownership defaults, not fixed permission walls. When a feature genuinely crosses two owners, open a short GitHub PR/issue discussion specifying exact shared files, contract, responsible edit owner, tests and dependency; **one worker writes the shared files at a time**. Do not replace W2 code from W3 or vice versa without explicit coordination. Each worker can work on independent issue-sized slices without waiting for another worker's idle chat.

## Git integration and merge discipline

1. At session start re-read `AGENTS.md`, `CHATGPT_HANDOFF.md`, `docs/CURRENT_STATE.md`, this protocol, the assigned worker file, relevant source/tests, and query **actual** main/PRs/CI. Historical handoffs do not supersede GitHub.
2. Use `feat/orbit-w1-<slice>` through `feat/orbit-w4-<slice>` (or `fix/`, `perf/`, `ci/` counterparts), always from freshly verified main. Open a single focused PR per testable slice titled `[W1] ...`, etc. Preserve immutability of V6/M1 historical manifests. Update the reviewed M2 source manifest with all touched hashed sources before final check.
3. Run focused tests and required CI. Review **all four required exact-head statuses**: `static-quality`, `local-postgres-rls`, `production-artifact-dry-run`, `unauthenticated-protection`. A previous head's greens do not apply after pushing. Inspect actual diff and security/backup/compatibility risks. Do not manually rerun green workflows for decoration.
4. Source-merge only when exact-head checks pass, no unresolved blockers, and changes are non-conflicting with other ongoing PRs. Where concurrent branches touch the same file, coordinate merge order and rebase/update source manifest; no blind force-push of protected main. If uncertain, defer merge to commander review, **not implementation**.
5. Default to synthetic fixtures and redacted logs; never put private journal/image bytes, authenticated signed URLs, sessions or secrets into source/CI artifacts. Protected Preview may be used for authorized validation, but differentiate synthetic vs signed-in owner vs physical-device evidence.
6. Only the commander updates the shared coordination summary and reconciles the single master roadmap after source merges to avoid four competing concurrent documentation edits. Workers put detailed, durable progress in their **own** `docs/handoffs/ORBIT_WN.md` files and PR descriptions. If the commander is absent, do not stall working source PRs; leave exact merger-ready evidence and proposed canonical corrections in the worker checkpoint.

**Observed startup anchor (not a timeless assertion):** main `183a6b355f85c05c055125d7fe8f449145edf241` on 12 November 2026; PR #85 (BP-10 private Blob leases/capped idle cache) already merged; PR #86 (BR-01 Universal Jump, head `ade306456cba0b0538224429a9b02a44a8e9231a`) open with four successful required workflows observed. Requery before every next action. Latest independently verified Production was older source `4e57aca`; never conflate main, Preview and Production.

## Continuity when chats reach context or length limits

A conversation is **not** a durable task database and cannot restart itself. Before a major phase transition, after a merge, or when nearing context limits, the worker must update **only its own** file `docs/handoffs/ORBIT_W1.md`–`W4.md`, on an active source PR or its own small docs PR. Preserve short, evidence-linked checkpoints rather than copying the entire chat.

Each checkpoint must state:
- **Objective and actual state**: NOT STARTED / ACTIVE / PR OPEN / SOURCE MERGED / BLOCKED; date, exact main SHA, work branch and current head.
- **What changed**: filenames, constraints, critical invariants, important design rationale, experiments rejected.
- **Evidence**: PR URL, four exact-head CI conclusions/run links, targeted test commands/results, synthetic vs owner/physical checks.
- **Pending**: open review comments, blockers/approvals, cross-worker contracts, no-touch paths.
- **Next executable action**: one exact file-level action; commands/tool queries to reproduce; rollback method.
- **Security**: no private tokens, signed URLs, user data or transcript dumps. Mark unknown outcomes **UNKNOWN**, not PASSED.

If a worker chat fills up: (1) finish or park its current atomic edit; (2) save the checkpoint and ensure its last Git commit/PR is durable; (3) create a **new chat in the same ORBIT ChatGPT Project**, titled `ORBIT Wn — <role> (continuation 2)`; (4) paste the recovery prompt below. The new chat independently re-queries live repository state and uses the checkpoint as an index, never as present truth. The commander can inspect PRs/handoff files to arbitrate; it cannot automatically see or send into other private chats from this session.

**Universal recovery prompt:**
> You are ORBIT Worker Wn continuing after a context rollover. Work inside `DoorBlox/orbit`. First inspect current `main`, open PRs, required CI and `AGENTS.md`. Read `docs/ORBIT_PARALLEL_COMMAND_PROTOCOL.md`, `plans/ORBIT_POST_2_4_EXECUTION.md`, `CHATGPT_HANDOFF.md` and `docs/handoffs/ORBIT_Wn.md`. Resume from the final checkpoint's next executable action after verifying it is still necessary; do not repeat merged work or reset earlier branches. You have the owner's broad source-engineering/design authorization stated in the protocol; use matching skills, research current references, be critical, implement and test real changes, maintain your own checkpoint. No silent Production/hosted-security/destructive/paid action.

## ChatGPT Project assembly

Existing ORBIT Project URL: https://chatgpt.com/g/g-p-6af574aac5b48191ab8c09a663e6091b-orbit

Create **four new chats in that project** (not elsewhere), named `ORBIT W1 — Core Engine`, `ORBIT W2 — Private Media`, `ORBIT W3 — Product Experience` and `ORBIT W4 — Platform & Release`. Each first user message should supply its worker handoff file URL and this protocol URL, instruct the agent to read both, verify current repository/PRs, and start executing its workstream with all delegated source authority and safeguards. The existing commander chat stays command-only; do not accidentally launch W1 in it.

**Browser capability caveat:** On 12 November 2026 this commander Chat-mode connection exposed only tab listing/reading and the browser host specifically blocked content access to `chatgpt.com`. This repo artifact does **not** claim the four chats were created. A user-authorized ChatGPT **Work mode** browser session can attempt project UI assembly if that runtime has permitted control; if not, the owner opens the project and sends the four starter prompts manually. Never bypass a browser host restriction through alternative automation or raw browser internals.
