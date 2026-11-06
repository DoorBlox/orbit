# PR title

M3 readiness: reconcile release documentation and preserve audit checkpoint

# PR description

README and deployment/security records still described pre-M2 local-only behavior.
Update their current-state sections to the accepted private cloud workflow and
owner-reported M2.5 CI/Preview success, while preserving historical evidence and
the no-merge/no-Production/no-live-mutation boundaries.

The dependency advisory audit reports zero vulnerabilities, the limited credential
signature scan passes, and M2/M2.5 evidence hashes remain intact. No application,
dependency, Auth/RLS or deployment configuration changes are included; completed
acceptance tests were not repeated. Documentation links/formatting were checked.

This branch is stacked on `codex/m25-motion-polish` at `9b54974`; that prior work
is not merged by this PR. Review the M3-only changes relative to that baseline.
Issue #2 is inaccessible to this session (API Forbidden; HTML 404), so its exact
plan is pending and this checkpoint does not close the issue or claim M3 GO.
See M3-READINESS-CHECKPOINT.md for exact remaining work and evidence boundaries.
