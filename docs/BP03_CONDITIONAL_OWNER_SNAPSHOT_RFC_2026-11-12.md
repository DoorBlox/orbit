# BP-03 / BP-09 — Conditional Owner Snapshot Read RFC (design only)

**Status: PROPOSED — NOT APPROVED FOR HOSTED IMPLEMENTATION.** 12 November 2026. Owner gates: hosted SQL/function/grant changes, rollout and Production require separate explicit authorization. This is evidence supporting the [single master roadmap](../plans/ORBIT_POST_2_4_EXECUTION.md), **not a new execution queue**.

## 1. Problem and reproducible evidence

The existing authenticated `public.load_owner_snapshot()` RPC serializes the entire per-owner workspace **even when its revision is unchanged**, and the browser currently polls every 15 seconds while active or every 30 seconds after two quiet minutes. See `supabase/migrations/20261108161935_orbit_tenant_private_workspaces.sql`, `scripts/measure-sync-traffic.mjs` and W1 synthetic workload benchmark `scripts/measure-sync-workloads.mjs` ([source PR #98](https://github.com/DoorBlox/orbit/pull/98), four required exact-head CI checks).

The 3,000-task fixture contains generated text, five synthetic journals and no owner information. Node 22 local UTF-8 JSON (uncompressed; no HTTP/Auth overhead): **1,666,767 bytes per full response**, **240 reads / 400,024,080 response bytes/hour** for active 15-second polling, and **123 reads / 205,012,341 response bytes/hour** for clean quiet polling. Five notebook-like journal pages and each task are reconstructed during current client normalization; source-only PR #101 proposes skipping that normalization on known-equal revision, but it **cannot reduce the full response bytes**. Local structuredClone proxy on the fixture was ~11 ms median per copy (runtime-specific).

Synthetic two-client CAS, offline reconnect and explicit discard behavior are exercised by `tests/cloud_sync_workloads.test.mjs`. These counts are **models**, not captured owner traffic, actual transfer bills, measured backend CPU or deploy acceptance. Read request counts also exclude `auth.getUser()` verification traffic.

## 2. Alternatives and decision rationale

1. **Keep full snapshots, poll less often.** Lowest engineering cost, but pushes other-device freshness beyond the current 15/30-second contract; still wastes large payloads.
2. **Use Realtime/CDC instead of polling.** Could be low latency, but adds subscription lifecycle, resync gaps, Auth/RLS complexity and hosted cost. Not justified before simpler conditional RPC evidence.
3. **Preferred candidate: one conditional, owner-scoped RPC** `public.load_owner_snapshot_if_changed(p_known_revision bigint)`. On unchanged revision return only `{revision, unchanged:true}`; on changed/initial load return the exact existing canonical snapshot shape. The current code remains a production-compatible fallback until an approved staged rollout.

The conditional query must read revision and snapshot **within one PostgreSQL statement/MVCC snapshot**. Do not query the revision in PL/pgSQL, then separately query collections under READ COMMITTED; a concurrent writer could produce inconsistent version + content. Use a single `SELECT` with a revision CTE and `CASE` around the existing validated projection, prove with adversarial concurrent tests and `EXPLAIN` that unchanged requests skip expensive collection aggregation. Reuse the **actual latest** hosted function definition, not the older partial source snippet; private extensions must remain in the projection.

A full `load_owner_snapshot()` request must still be available for explicit discard/reload, initial data recovery and compatibility. No stale draft is overwritten or automatically discarded.

## 3. Security contract (nonnegotiable)

- New RPC is **SECURITY INVOKER**, empty `search_path`, schema-qualified objects, `auth.uid()` bound to current caller; **never accept caller-supplied owner_id**.
- Explicitly revoke EXECUTE from PUBLIC and anon; grant only to authenticated. Existing private `workspace_revisions` owner-scoped SELECT and RLS must remain active. Grant changes affect only the proposed new function and need prior approval.
- Fast-path success may return **only a revision/boolean**, never private content, cross-account revision, image bytes, journal titles or identifiers.
- Client still calls `auth.getUser()` and enforces `ownerId` consistency. On account switch, abort pending requests and dispose old view; a new account obtains its own initial full snapshot.
- Server rejects negative/invalid `p_known_revision`. A malformed response fails closed. Missing endpoint is not confused with unauthorized/network errors.
- For conflict: `save_owner_snapshot` retains existing `p_expected_revision` CAS; a stale draft remains locally until **explicit** user recovery. A conditional read must never be used to authorize a write.
- Never expose private data through browser cache, public portfolio projection, telemetry, logs or a service-role client. HTTP caching of authenticated JSON must be reviewed separately.

Supabase official references: [database functions (security invoker and grants)](https://supabase.com/docs/guides/database/functions), [RLS requirements](https://supabase.com/docs/guides/database/postgres/row-level-security), [Data API security](https://supabase.com/docs/guides/api/securing-your-api).

## 4. Client rollout gate (future, not implemented)

- Keep existing repository's full snapshot RPC as default. After a locally verified migration and a **separate** owner-approved staged release, enable the new RPC behind an explicit capability gate, not a silent assumption.
- For an already accepted revision, ask the conditional RPC. On `unchanged:true`, retain current local snapshot; on greater revision, fully validate/sanitize all returned objects before applying. If a reply is stale or local dirty state emerges, ignore it without revision advancement.
- Initial mount and explicit user-controlled reload must always obtain a complete validated snapshot. Missing-function fallback is allowed **only** for a precisely identified missing-RPC error after verification; do not fallback on 401/403, RLS, invalid payload, or transient network faults and do not hide implementation bugs.
- Preserve visibility-aware polling cadence and offline retry. Provide a safe switch back to the old full RPC before shipping.

## 5. Acceptance evidence and ownership gates

1. **BP-04 full ledger/object parity before rollout:** independently read-only compare hosted function definitions, owner revision-trigger coverage, ACLs, RLS, private extension joins, Storage implications and actual migration ledger to clean local migrations. Filename parity alone is insufficient. A direct table mutation that fails to bump revision would silently freeze data and must block rollout.
2. **Synthetic local tests:** null/0/equal/greater/stale known revision, malformed and forbidden identity, two distinct authenticated users, anonymous denial, extension parity, 15/30s clock, offline edits/reconnect, CAS conflict and explicit rollback.
3. **Concurrent PostgreSQL tests:** simultaneous data mutation and probe return a revision consistent with the exact returned snapshot, without a TOCTOU window; no cross-tenant content or revision disclosure; `EXPLAIN` proves unchanged branch avoids large aggregate scans.
4. **Transport benchmarks:** 30/300/3000-task fixtures, no-change and changed scenarios, latency, response bytes, Auth and RPC request counts, DB CPU; measure in disposable/local DB before any hosted probe. Require at least **95% lower uncompressed snapshot response bytes** on unchanged, large-workspace quiet reads while preserving change freshness.
5. **Owner-gated staging:** backup, reviewed migration, exact reviewed source, stage protection, signed-in owner plus second controlled account, real two-device concurrent save/read, offline recovery, safe fallback and rollback. No production custom-domain alias until separately approved.

**Decision requested later:** approve or decline narrowly scoped additive owner-conditional RPC migration and protected staging once BP-04 read-only catalog parity and local adversarial tests are complete. **This RFC grants no hosted write permission.**
