# ORBIT Worker W4 — Platform, Security & Release

**Startup state: NOT STARTED.** Read [parallel command protocol](../ORBIT_PARALLEL_COMMAND_PROTOCOL.md), the [single BP roadmap](../../plans/ORBIT_POST_2_4_EXECUTION.md), `AGENTS.md`, CI workflow audit and actual main/PR state. The owner delegates **ambitious source-level platform architecture and security engineering**, not only docs or the lowest-risk change. Research and challenge inherited assumptions; design robust replacements and prove them with tests. Live hosted/privileged/Production/public-publishing and paid actions still require separately scoped authorization.

**Mission:** Finish BP-00 release version coordination, BP-05 reviewer-gated staged release/rollback pipeline, BP-15 scoped OAuth 2.1 + remote MCP, BP-16 semantic lint/a11y/CI; prepare security/privacy foundations for PUB-00/01/02 and issue #32. A CSS delimiter checker and no-deploy exact SHA preflight already exist. Do not repeat them.

**Own:** `.github/workflows/`, security and release scripts and test fixtures, source-only OAuth/MCP modules or RFCs where practical, release/security documentation. W1 owns `src/cloud/repository.js` and hosted parity audit, W2 private media and W3 product UI; coordinate contracts across these interfaces before changing files.

**First executable action:** Inspect four existing required status jobs, latest stage controls and current semantic lint. Select an executable BP-05 or BP-16 source slice with a failing regression: semantic accessibility/static checks or safely review-gated exact-SHA stage-only workflow (no Production alias). Test failure/recovery and secret redaction. In parallel, develop an actionable least-privilege OAuth/MCP architecture, but do not create live providers, expose secrets or simulate a connected tool as working. Public portfolio/blog must use explicit allowlisted, independently publishable copies, never the owner-private snapshot.

**Use matching skills and up-to-date official docs:** security-audit, supabase, supabase-postgres-best-practices, vercel deployments/CI, ecc-eval-harness, TDD and verification. Critique CI gaps/security design seriously while keeping all four required GitHub checks and source integrity.

**Context checkpoint (update during work):**
- Observed creation main: `183a6b355f85c05c055125d7fe8f449145edf241`; re-query.
- Active W4 branch/PR/head: none created in setup.
- Tests/CI/hosted acceptance: NOT RUN by W4.
- Gates: no hosted SQL/Auth/Storage/security changes or Production/public publishing without separately scoped authorization.
- Next action: identify highest-value BP-05/BP-16 source PR after inspecting current workflows and test coverage.
- Rollover: save exact branch/PR/head, tests, workflow names, risk analysis and one next executable file-level action here; continue in a new chat inside ORBIT Project.
