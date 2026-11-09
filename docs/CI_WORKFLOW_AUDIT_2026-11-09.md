# ORBIT — GitHub Actions efficiency and execution audit

**Date:** 9 November 2026. **Source baseline:** main f899923ba098d21bc2f75b87d7bdcd3189f4e857 (merged documentation PR #35). **Examined:** all five workflow YAML files, protected main, the latest 100 recorded runs out of 278, and PR #35's step-by-step timeline. This is not a GitHub billing statement or a signed-in security certification.

## The test suite is useful, but not on every change

Four required job names are enforced: **static-quality**, **local-postgres-rls**, **production-artifact-dry-run** and **unauthenticated-protection**. Keep these. Real Chromium behavior checks, V6/M1 source integrity, and isolated pgTAP plus bearer-session checks are important when app, Auth, schema, deployment or CI code changes.

Actual run sample (aggregate elapsed time of run-start to run-update, not billed minutes):

| Workflow name | Runs | Failures | Total elapsed | Median |
| --- | ---: | ---: | ---: | ---: |
| ORBIT quality | 26 | 8 | ~55 min | 143 sec |
| ORBIT local Supabase RLS security | 25 | 2 | ~40 min | 112 sec |
| ORBIT private 1.0.0 Production artifact dry run | 24 | 2 | ~7 min | 16 sec |
| ORBIT 2.2 anonymous sign-in/deployment smoke | 11 | 0 | ~5 min | 9 sec |
| ORBIT M6 unauthenticated hosted-access smoke (old name) | 14 | 1 | ~2 min | 8 sec |

The latest docs-only PR #35 ran its [quality check #42634863854](https://github.com/DoorBlox/orbit/actions/runs/42634863854) for about 143 seconds total (139 seconds job time). The four Chromium test scripts took approximately 112 seconds, plus Chromium/pip installs, despite changing only Markdown. All four required checks passed before PR #35 merged. The user's earlier screenshot captured a temporary in-progress state, not a persistent failure.

GitHub documents that **standard GitHub-hosted runner time is free on public repos** (larger runners and storage may differ). Current ORBIT is public and uses standard Ubuntu runners. The optimization reduces latency, noise and wasted capacity, not a verified cash bill.

## Evaluation of each workflow

1. **quality.yml / static-quality:** Essential on code/UI changes, but the biggest waste for Markdown-only changes. Add a safe change classifier that keeps the required job running while skipping heavy installs, build and four browser suites only for genuine docs-only diffs. Browser tests are existing regression guards; they are NOT authenticated real-account acceptance, comprehensive accessibility or performance testing. The command named npm run lint currently validates syntax only, not semantic lint.
2. **local-supabase-rls.yml / local-postgres-rls:** Keep the existing security-sensitive path gate. It already skips local Docker and pgTAP when only docs/visual sources change. Code and workflow changes still trigger full isolated database and HTTP Auth tests. It cannot certify live hosted multi-account behavior.
3. **m6-release-dry-run.yml / production-artifact-dry-run:** Useful synthetic-key artifact and production-target guard, but unneeded on docs-only PRs; add the same safe fast path. It still requires npm package version **1.0.0** even though the user-facing app is 2.4. Version changes require coordinated updates to scripts/verify-release.mjs and evidence; a cosmetic package bump is unsafe. It is NOT a real Production deployment.
4. **m6-anonymous-protection.yml / unauthenticated-protection:** Fast, useful live checks for public sign-in shell, CSP, exact public client configuration, protected raw/preview endpoints and canonical secondary redirect. **Coverage problem:** before this change the hard-coded targets described as current were old 2.2 deployments. Add the actual 2.4 Production raw URL, retain historical canaries, and explicitly update this target on each later release. A green status still does not prove #26 private images or tenant RLS.
5. **m6-stage-only-production.yml:** Historical manual workflow pinned to 1.0 SHA fc5af5a, not a usable 2.4+ release workflow. Rename its displayed title to **LEGACY**; retain the --prod --skip-domain protection. Future BP-05 must implement reviewed-SHA staging with a separate approved promotion boundary. Never dispatch the old workflow for current releases.

## How the new fast path remains safe

- The workflow itself and the required job always run. GitHub documents that using workflow-level pull_request paths filters on required statuses can leave checks **Pending**, blocking merges. Avoid them.
- The dependency-free script scripts/ci-change-scope.mjs reads the GitHub test-merge HEAD^1 vs HEAD using git diff --name-only --no-renames -z. **Only** a known nonempty set of .md/.mdx paths qualifies for skipping expensive steps. Missing ancestry, errors, manual runs, changed JS/YAML/SQL/package/CI files and code-to-doc renames all run the full suite.
- Genuine Markdown-only changes still fail CI if git diff --check detects new whitespace errors.
- Required job IDs and protected-main rules stay unchanged. Superseded PR runs in the quality and artifact families can be cancelled by unique concurrency groups; manual dispatches are not cancelled.
- This workflow-code PR must run all four required exact-head checks itself; do not manually repeat runs. Verify the first real future docs-only PR takes the fast path organically.
- The scope classifier passed **2/2 Node 22 tests**, plus synthetic local git-history checks (docs-only=true, JS change=false, manual=false). These are local results; hosted integration acceptance requires green exact-head CI.

## Remaining gaps, next work

- Measure actual runner usage from GitHub billing metrics if needed, without inventing a dollar charge. Do not repeatedly trigger Actions merely to validate counters.
- BP-16 future: semantic ESLint/type checks; selective browser suites for narrowly scoped JS changes once empirically justified; workflow documentation and accurate release/version naming.
- BP-05 future: safe modern staging/promotion workflow, not pinned old 1.0. Keep service/secret permissions narrow and no automatic deployment.
- BP-06 future: synthetic screenshot matrix, accessibility and mobile Safari/Android, real interaction/profiling benchmarks.
- BP-01/#26 remains open: real signed-in private image display is unverified; these anonymous checks cannot replace it.
- Full official embedded Excalidraw for both Journal and stickies is the owner's priority #31; start EX-00 synthetic compatibility in parallel with the BP-02 recovery work.

## Who actually runs the project?

**ChatGPT is the coding and review executor.** It should inspect the GitHub source, implement the next safe approved work unit, add tests, open/check/merge the PR when green, keep the handoff and task statuses accurate, and then advance to the next independent unit during active sessions. The owner is not responsible for writing reminder prompts, monitoring workflows or manually project-managing these tasks. The assistant cannot perform ongoing work after a conversation ends unless an automation has actually been created. Real-account QA, Production changes, hosted schema modifications, data deletion, secrets and paid provider activation still require separately scoped owner permission.

Read the [current state](CURRENT_STATE.md), [documentation protocol](DOCUMENTATION_PROTOCOL.md), [execution blueprint](../plans/ORBIT_POST_2_4_EXECUTION.md) and [agent instructions](../AGENTS.md) before taking action.
