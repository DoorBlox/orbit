# ORBIT Worker W1 — Core Engine

**Current state: SOURCE MERGED; 12 November 2026.** Follow the [parallel command protocol](../ORBIT_PARALLEL_COMMAND_PROTOCOL.md) and the [single master roadmap](../../plans/ORBIT_POST_2_4_EXECUTION.md). This file is W1's durable checkpoint, **not a competing backlog**. Re-query live GitHub before resuming. Source engineering is broadly owner-authorized; hosted SQL/Auth/Storage, private-data destruction, paid services and Production releases remain separately gated.

## Verified source checkpoint

- **W1 source PR:** [#89](https://github.com/DoorBlox/orbit/pull/89), branch `fix/orbit-w1-stale-read-cancellation-20261112`, exact reviewed PR head `a9695019d7ccd7bd1555057fb0ec5aa7802ac6d6`. Squash merged to `main` commit **`e616208dd98c5e4791c6be43fedfe33c66e18e0b`**. This SHA was verified by GitHub's merge API, **not** asserted to be Production.
- **Four exact-head successful GitHub Actions workflows on head `a9695019`:**
  - static-quality, run [43188061442](https://github.com/DoorBlox/orbit/actions/runs/43188061442) — SUCCESS
  - local-postgres-rls, run [43188063906](https://github.com/DoorBlox/orbit/actions/runs/43188063906) — SUCCESS
  - production-artifact-dry-run, run [43188061521](https://github.com/DoorBlox/orbit/actions/runs/43188061521) — SUCCESS (dry-run is not release)
  - unauthenticated-protection, run [43188061630](https://github.com/DoorBlox/orbit/actions/runs/43188061630) — SUCCESS
- **Changed:** `src/cloud/sync.js` (abort and detach stale read promise when a queued local edit or owner-requested reload invalidates it; guard late resolution by controller identity; serialize explicit reload against refresh); `tests/cloud_sync_stale_read.test.mjs` (three synthetic deferred-transport races); `docs/reference/M2_SOURCE_MANIFEST.json` (reviewed SHA-256 for sync.js). No V6/M1 provenance modifications.
- **Behavioral invariant:** no stale remote response should overwrite a local draft, clear a newer in-flight read, or weaken revision-CAS conflict detection. A stalled/cancel-ignoring transport no longer prevents subsequent clean refresh after a save. The test harness uses synthetic snapshots; **real signed-in multi-device, backend bytes, browser latency, and network billing are NOT VERIFIED**.
- **Merge concurrency:** W3's BR-01 #86 and PJ-03 #88 merged concurrently; W1 had no src/app.js, CSS, project, media, or workflow edits. GitHub successfully merged #89 after main advanced; no force-push.
- **Environment:** connector GitHub read/write worked. Local container had Node 22 but could not reach GitHub via DNS and had no pre-mounted repository checkout; independently verified tests are the exact PR GitHub Actions workflows, **not** a locally executed npm test. Source merge did not touch Vercel alias or hosted Supabase.

## Ownership and remaining work

W1 owns BP-03/BP-04/BP-09, primarily `src/cloud/sync.js`, `src/cloud/repository.js`, `scripts/measure-sync-traffic.mjs` and their tests. W2 owns media/backup/storage, W3 app bridge and UI, W4 security/CI. Obtain a file-level agreement before touching `src/bootstrap.js`, W2 backup/storage or W4 workflows. Hosted project `ixfgavgtwuzdgucjriec` remains read-only unless separately approved.

**Next single executable task:** Begin BP-03/BP-09 measurement slice in `scripts/measure-sync-traffic.mjs` and `tests/cloud_sync_traffic.test.mjs`: inspect the current synthetic fixture, extend it with deterministic multi-device contention, edit/quiet duty cycles, payload-byte and read/retry counts, and compare the existing adaptive 15/30-second behavior against representative workloads. Establish baseline assertions before implementation. Preserve privacy (no owner snapshots or telemetry) and report synthetic versus real figures explicitly. If revision-only backend traffic is materially better, write a narrowly scoped **design RFC only** before asking for hosted RPC/schema approval. Independently verify PRs/current main before beginning.

**Rollback:** revert source squash commit `e616208d` via a reviewed PR if a regression appears. Do not roll back or restore hosted data; Production remains separately gated. Owner-assisted authenticated two-device QA and real network profiling still remain open.
