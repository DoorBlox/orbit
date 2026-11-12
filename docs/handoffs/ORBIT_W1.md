# ORBIT Worker W1 — Core Engine

**Startup state: NOT STARTED.** This is a durable worker brief and rolling checkpoint, not a second backlog. Read [parallel command protocol](../ORBIT_PARALLEL_COMMAND_PROTOCOL.md) and [single master roadmap](../../plans/ORBIT_POST_2_4_EXECUTION.md). The owner grants ambitious, critical source engineering authority including major refactors, researched alternatives, tests, branches and reviewed PR merges. Never limit work to trivial "safe next steps"; preserve data/privacy/CAS invariants and obtain separately scoped authorization for hosted SQL/Auth/Storage, irreversible changes or Production.

**Mission:** Finish unfinished BP-03, BP-04 and BP-09: evidence-based cloud snapshot traffic/performance, queue and clone cost, integrity across conflicts, retries, stale remote responses, multi-device concurrency and read-only DB parity. Source work is higher value than a new planning doc. Current inherited baseline has adaptive 15-second active / 30-second quiet polling, `queueOwned` detached snapshot optimization and prior read-only seven-migration ledger/RLS audit. Do not duplicate prior PR #81.

**Primary owned files:** `src/cloud/sync.js`, `src/cloud/repository.js`, `scripts/measure-sync-traffic.mjs`, sync and repository Node/Playwright tests. Coordinate changes to app bridge `src/bootstrap.js` with W3, security/CI scripts with W4, and backup/storage with W2. Hosted Supabase project `ixfgavgtwuzdgucjriec` is **read-only** by default.

**First executable action:** Requery main and PRs; inspect current queue clone sites and traffic-measurement fixtures; write a deterministic regression test for the highest-cost still-unoptimized path or unsafe race, then implement a bounded improvement with measured synthetic deltas and no CAS regression. Independently verify hosted catalog **read-only** only if it materially improves BP-04; never claim migrations alone prove full object parity. Evaluate whether revisions-only data transfer needs a backend design RFC and an explicit hosted approval.

**Use matching installed skills**, e.g. agentic engineering, search-first, TDD, verification loop, Supabase and Postgres security guidance, and regression/eval harness. Prefer verified maintained API references. Critique the architecture and explore bigger viable replacements if they improve correctness and measured performance; preserve owner-private world snapshots and offline support.

**Context checkpoint (update during work):**
- Observed main at creation: `183a6b355f85c05c055125d7fe8f449145edf241` (2026-11-12). Re-query.
- Active branch/PR/head: none created for W1 as part of this setup.
- Tests and CI: NOT RUN by W1.
- Pending dependencies: W3 owns UI app, W4 owns release/security workflows, W2 owns media.
- Next action: inspect live code/PR state and start test-first BP-09 profiling slice.
- Rollover: update this file with exact branch/PR/CI, evidence, unfinished edit, and next file-level task; start a new ORBIT Project chat using the recovery prompt in the protocol.
