# Preserved M2 acceptance evidence

Archived on 6 November 2026 (Asia/Jakarta) for the owner's conditional acceptance
of protected password-based private use. Files were copied from completed runs;
tests and onboarding were not repeated for this archive.

`manifest.json` records the verified application baseline, owner-reported hosted
results, accepted unverified coverage and SHA256 hashes of the six preserved files.
The hosted entries transcribe the user's observations; no raw tokens, sessions,
private journal records or independent agent-hosted execution are claimed.

- `m1-results.json`: existing local viewport/recovery/persistence suite.
- `m2-results.json`: 24 mocked cloud browser cases.
- `m2-closeout-results.json`: five additional local mocked-cloud close-out cases.
- `local-check.log`: 138 unit tests plus syntax/provenance/build/structure checks.
- `local-sql.log`: 147 local SQL assertions and three concurrency scenarios.
- `local-http.log`: real local GoTrue/PostgREST/SDK/browser integration.

Logs and fixtures contain synthetic test data, not real hosted credentials or
personal journal content. Local write-policy tests are not hosted CRUD evidence.
See [handoff](../../../decisions/M2-TO-M2_5-HANDOFF.md) and
[close-out](../../../decisions/M2-HOSTED-CLOSEOUT.md) for scope and limitations.
