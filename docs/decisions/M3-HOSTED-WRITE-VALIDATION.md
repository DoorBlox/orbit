# Prepared hosted nonowner write/CRUD validation — NOT EXECUTED

This document and `scripts/hosted-write-plan.mjs` prepare a narrow, disposable
**development-target** plan. They do not authorize or perform a live mutation.
The existing temporary nonowner Auth account must be preserved. The accepted
10/10 hosted read test remains PASS and is not repeated or relabeled as write proof.

## Offline preparation

After independently confirming the existing nonowner's UUID, run locally:

```sh
node scripts/hosted-write-plan.mjs CONFIRMED_NONOWNER_UUID > /tmp/orbit-write-plan.json
```

The command only generates public request metadata and synthetic payloads. It has
no network, SDK or database connection. It rejects the confirmed owner's UUID,
invalid IDs and unreviewed target origins. It generates a fresh run identifier;
never substitute a guessed user or reuse an old run. No password/token input is
accepted. The plan is pinned to the already identified development API; do not
present its results as Production validation.

## Exact authorization scope required before execution

Review the generated manifest, target project and live nonowner Auth identity.
An administrator must first confirm **no existing nonowner rows in any of the
seven tables**. Stop if that cannot be established. The natural profile/preferences
keys and the nonowner's `journal` layout key cannot be made independently random;
absence of existing rows is mandatory, not inferred from an RLS-filtered read.

Only after separate narrow approval may an authorized operator:

1. With the existing nonowner session, submit seven INSERT probes while its rows
   are absent. Each must fail with HTTP 403/42501. A duplicate/FK/validation error
   is not an authorization PASS. Stop on any unexpected accepted write.
2. After all INSERT denials, an administrator inserts exactly the seven synthetic
   rows in the reviewed manifest (branch before task) for that nonowner UUID.
   This is approved fixture seeding, not a schema/Auth/RLS/configuration change.
   Preserve a private baseline of only these synthetic rows and their exact keys.
3. Submit the scoped UPDATE and DELETE requests as the nonowner, using existing
   session credentials internally. Prefer return=representation,count=exact.
   A policy error or empty returned set is insufficient alone: an administrator
   must verify every seeded row still exists unchanged against the baseline.
4. After preserving non-sensitive results, the administrator removes only the
   exact rows it inserted (task before branch). Confirm no unrelated rows were
   affected. Do not delete the temporary Auth user or clear any owner snapshot.

No request targets the real owner's profile/preferences/layout or owner-scoped
rows. There are no full-snapshot save, publication or unpublication mutation RPCs.
If an unexpected write succeeds, stop; do not auto-clean up or expand privileges.
An isolated additional project is required for broader destructive/forged-owner
or RPC mutation tests if they cannot be made safe with the approved fixture.

## Evidence

Record run ID, target, timestamp, verified nonowner identity match, per-operation
status/code/affected-row count, baseline-unchanged booleans and cleanup confirmation.
Do not share tokens, session objects, HARs, owner content or raw private responses.
Mark each of seven × three operation cases PASS/FAIL/BLOCKED separately. A zero-row
UPDATE/DELETE of nonexistent data is **unverified**, not RLS proof.

Current status: plan generation and safety tests PASS locally; all hosted mutation
cases remain **NOT RUN — narrow authorization and fixture execution required**.
Production would need its own reviewed target, existing test identity and fixture
authorization. Nothing in this plan changes the current owner or public-read gate.
