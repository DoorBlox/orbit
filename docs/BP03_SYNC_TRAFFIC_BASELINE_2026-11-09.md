# BP-03 — synthetic full-snapshot traffic baseline (9 November 2026)

**Status: source analysis, not Production measurement.** Follow-up to [visibility-aware polling PR #42](https://github.com/DoorBlox/orbit/pull/42). No private data, hosted reads, domain/Storage/Auth/policy changes, Vercel billing claims or new RPC.

## Why measure first

ORBIT currently loads the **whole owner snapshot** on each clean foreground refresh through `src/cloud/repository.js:loadOwnerSnapshot()`, with a default `pollMs=15000` in `src/cloud/sync.js`. The merged BP-03 first slice skips periodic loads when hidden or offline and refreshes on visible return. The foreground payload can still be significant as tasks and journal data grow.

## Reproducible workload and limitations

Run `node scripts/measure-sync-traffic.mjs` in Node 22+ to simulate one connected tab for one hour with three synthetic snapshot sizes (30, 100, 300 generated task records plus 5 synthetic journal pages each). The fake scheduler advances 15-second ticks immediately; a fake repository records reads and measures the UTF-8 byte count of a serialized `{revision,snapshot}` response. No server or browser is contacted. The exact simulation is covered by `tests/cloud_sync_traffic.test.mjs`.

| Nominal case | Full owner reads/hour | Meaning |
| --- | ---: | --- |
| All foreground | 240 | One 15-second poll throughout; presumes every interval callback runs |
| All hidden | 0 | Visibility-aware controller skips periodic reads |
| Hidden 45 minutes, then visible 15 minutes | 61 | 60 foreground polls + one explicit visibility revalidation |
| Pre-BP-03 all-hidden comparison | up to 240 | Counterfactual scheduled interval calls, **not** observed historical traffic |

Estimated JSON response bytes = count of reads × UTF-8 bytes of the synthetic response. It **does not** represent observed network payloads, compressed transfer, database CPU time, Supabase billed quotas, Vercel bandwidth, browser background-timer throttling, real account size, simultaneous tab behavior or user edit cadence. This is an instrumentation baseline, not grounds for claiming a specific monetary saving.

## Interpretation / next decision

- Hidden-tab reduction is real in source and tests. Foreground still fetches the full snapshot, potentially as often as 240 nominal times/hour per idle tab.
- Consider a **cheap revision-only probe** only after checking real client/RLS permission, payload size and total request count; adding a hosted RPC or changing policy is NOT authorized. A two-stage read can even increase requests if misused.
- Before new architecture, test simultaneous writer/reader CAS safety, offline/reconnect/visibility, owner switching and profile/journal/attachments under synthetic fixtures. Never replace CAS with last-write-wins. No private snapshot sampling, instrumentation upload or production billing data collection without separately scoped approval.

[Engineering handoff](../CHATGPT_HANDOFF.md) · [sync source](../src/cloud/sync.js) · [primary blueprint](../plans/ORBIT_POST_2_4_EXECUTION.md).
