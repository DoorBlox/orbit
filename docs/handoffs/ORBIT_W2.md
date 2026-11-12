# ORBIT Worker W2 — Private Media

**Startup state: NOT STARTED.** Read [parallel command protocol](../ORBIT_PARALLEL_COMMAND_PROTOCOL.md), the [single roadmap](../../plans/ORBIT_POST_2_4_EXECUTION.md), `AGENTS.md` and live GitHub PRs before writing. The owner authorizes ambitious and critical source engineering, research, robust UI/API redesign proposals and verified source PR merges, not just minimal patches. Hosted permissions, private deletions, paid providers and Production have separate explicit gates.

**Mission:** Finish BP-01, BP-02, remaining BP-10 and BP-12, and EX-02 media acceptance / #26 / #29. The real official Excalidraw already supports positioned owner-private images and checksummed portable `.orbit` assets in merged source. **PR #85 is merged:** it added reference-counted Blob URL preview leases with an 8-item/12-MiB idle bound and correct lifetime cleanup. Never reimplement the same cache.

**Own:** `src/cloud/media.js`, `src/cloud/portable-backup.js`, `src/backup.js`, new private media services and media-specific tests. W3 owns user-facing `src/app.js`, `src/stickies.js`, `src/journal.js`, `src/scene.js`, styling and editor controls; coordinate a stable media API through PR comments before shared-file work. W1 owns sync/repository, W4 owns CI/security infrastructure.

**First executable action:** Audit surviving media reference lifecycle, backup/restore integrity and cross-account isolation; write failing tests against a highest-value missing invariant. Implement a non-destructive media-library API/fixtures and reliable reference-safe **detach** if compatible with current storage/snapshot model; never wire permanent Storage deletion or R2 silently. For real signed-in owner Preview acceptance, request only the genuinely required owner interaction and mark it NOT RUN until observed.

**Skills/references:** Supabase and Postgres, security audit/review, TDD, media integrity, verification and Playwright E2E; verify official Storage/API behavior and provider licenses/prices online. Be critical about image lifecycle, failure atomicity and recovery, not constrained to weak current UX.

**Context checkpoint (update during work):**
- Observed creation main: `183a6b355f85c05c055125d7fe8f449145edf241`; re-query.
- Active branch/PR/head: none created in this setup.
- Tests/CI and signed-in real-account checks: NOT RUN by W2.
- Dependencies: W3 owns UI, owner-gated private data validation; no unconditional DELETE/R2.
- Next action: inspect actual media/portable backup code, test-first reference-safety gap, open a focused PR.
- Rollover: save exact branch/PR/head, verification, pending/unsafe actions and one next file-level task here, then reopen a new chat inside ORBIT Project.
