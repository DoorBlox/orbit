# ORBIT decision and verification archive

**Updated 8 November 2026.** This directory preserves dated M0–M6 decisions, QA records, pre-launch risk gates and reviewed migration plans. Many earlier entries legitimately say **NO-GO**, "local-only", "not yet deployed" or "private repository" because those statements describe a **historical checkpoint**.

The current ORBIT 1.0.0 single-owner Production state is documented in:

- [Current working handoff](../../CODEX_HANDOFF.md) — exactly what a new conversation should load.
- [Operations and rollback](../OPERATIONS.md) — live hostnames, deployment IDs, Auth/security boundaries, safe release procedure.
- [Milestone implementation ledger](../PROJECT_HISTORY.md) — chronological milestones, PRs and CI evidence.
- [1.0.0 release record](../releases/1.0.0.md) — owner-accepted Production release, test limitations.
- [M6 GitHub issue #2](https://github.com/DoorBlox/orbit/issues/2) — live configuration checks, actual hosted HTTP test results and domain switch logs.

Key historical files worth keeping: `M0-BASELINE.md` for original source acceptance, `M2-HOSTED-CLOSEOUT.md` for Auth cloud acceptance, `M2_5-IMPLEMENTATION.md` for motion tests, `M3-SECURITY-AUDIT.md` for release hardening, `M5-M6-LIVE-RECONCILIATION-20261107.md` for the **pre-launch** hold, and `M6-PRODUCTION-STAGING-NO-COST-20261107.md` for the **pre-promotion** staging plan.

Do not rewrite dated evidence to say the release was already live in the past. Instead use the newer current-state documents, and independently recheck Vercel/GitHub/Supabase before taking action.
