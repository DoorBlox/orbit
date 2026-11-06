# PR title

Prepare ORBIT 1.0.0 private release and fail closed on Production misconfiguration

# PR description

Production builds could silently produce local prototype mode when cloud inputs
were absent. Require complete Production configuration, an independently reviewed
API/site target, development exclusions and exact private CSP before replacing any
artifact. Add a release verifier for version, clean source commit, exact inventory,
symlinks, native-source hashes and rebuilt SDK integrity. Local/Preview behavior
and all app/Auth/RLS/sync/UI source remain unchanged.

Prepare an offline-only seven-table nonowner mutation plan that refuses owner IDs
and unreviewed targets; no hosted request or fixture mutation is executed. Version
metadata is 1.0.0. Include release notes, actual security findings, production gates,
backup/export/rollback procedures and a concise NO-GO record.

Validation: 163 local unit tests and all required checks pass; five-viewport QA,
24 cloud, 25 motion and five close-out cases plus HTTP delivery smoke pass.
Dependency audit reports zero vulnerabilities. CI retains prior checks, honors
bundled Chromium consistently, adds the close-out/signature checks and triggers
on this M3 branch. M2/M2.5 evidence is preserved; completed hosted acceptance and
onboarding were not repeated.

Refs #2. **Not Production GO:** actual Production target/configuration/protection/
Auth redirects, hosted write validation and final remote CI remain gated. No merge,
deployment, Auth/RLS/DNS/schema change or live mutation is included. This branch is
stacked on `codex/m25-motion-polish` at `9b54974`; review M3 changes relative to that
base. See M3-READINESS-CHECKPOINT.md and M3-LAUNCH-RUNBOOK.md for precise limits.
