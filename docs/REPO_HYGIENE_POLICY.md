# ORBIT — safe repository cleanup and release-record policy

**Audit snapshot 12 November 2026:** GitHub listed **160 branches**, `delete_branch_on_merge=false`, **zero GitHub Releases**, and root `RELEASE_NOTES.md` still describes legacy V6. `CHANGELOG.md` has 2.4 Production at its top, while newer work is merged on `main`. There were seven open **issues** excluding PRs at the audit. These facts are dated observations; requery before making claims or changes.

## Which record answers which question?

| Place | Purpose | Source of truth / update discipline |
| --- | --- | --- |
| [PROGRESS.md](PROGRESS.md) | Human-readable BP-00–BP-16 / features status, next owner gate, six workers | W5 reconciles evidence, mirrors single roadmap |
| [ORBIT_POST_2_4_EXECUTION.md](../plans/ORBIT_POST_2_4_EXECUTION.md) | ONLY active dependency/priority execution queue | W5 updates work-state evidence; Commander arbitrates |
| [CHANGELOG.md](../CHANGELOG.md) | Changes by feature release; optional explicit **Unreleased — source-only** section | Never call merged source shipped |
| [RELEASE_NOTES.md](../RELEASE_NOTES.md), [docs/releases/](releases/) | Short user-facing notes for verified *shipped* versions; V6 note is archival | Source SHA, exact deploy ID and rollback evidence required |
| [GitHub Releases](https://github.com/DoorBlox/orbit/releases) | GitHub's official downloadable/tagged public **published release** record | Publish only from proven Production source, with appropriate owner approval |
| [GitHub Issues](https://github.com/DoorBlox/orbit/issues) / Projects | Work tracking, milestones and acceptance tasks | Links to BP IDs + the one roadmap; never a second competing queue |
| [GitHub PRs](https://github.com/DoorBlox/orbit/pulls) / Actions | Exact source merge evidence and four checks | Branch HEAD + actual CI outcome; source-only unless a release is independently verified |

A **GitHub Milestone** groups issues/PRs toward a release or outcome (e.g., “Private media owner acceptance”). It does not automatically deploy code or replace BP status. A **GitHub Project** provides a filterable board/table with fields such as BP, status, worker, owner action and release target. Use when supported by connected tools or give owner UI setup; do not invent a board.

## Branch retention and deletion gate

1. Inventory every branch with **ref name + tip SHA**, default/main/active PR association, unmerged commits and branch reachability. GitHub squash merges mean the old PR head may **not** be a direct ancestor of `main`, even if the PR was merged; verify the PR's merge metadata, diff and any unique unmerged work.
2. **Always retain:** `main`; protected/release rollback refs; active or recent worker branches; unmerged PR/WIP; unique unreviewed commits; still-used CI/docs links; anything of uncertain ownership. A CI-pending old chat does not mean the branch is dead.
3. **Eligible for review:** closed-and-merged worker branch with no active writer or unique unmerged work, safe rollback through GitHub commits/PR, clear retention evidence and appropriate quiet interval. Put candidates in a PR-linked audit with branch, HEAD, associated PR, disposition and restore pointer.
4. **Before deletion**, ask owner to approve the specific batch (not a blanket “delete 160”). Use an explicitly supported GitHub UI/API action; if absent, provide accurate owner UI steps rather than claiming deletion. Avoid force-push/rewriting Git history. No deletion of hosted user data.
5. Ask owner whether to enable **Settings → General → Pull Requests → Automatically delete head branches** for future merged PRs. This was disabled at audit. Preserve special long-running branches first; GitHub settings change requires the owner's explicit action/approval.

## Documentation cleanup

- Do a **link/import/reference audit** before moving or deleting documents. Immutable V6/M1/M2 source manifests, migrations, runbooks, security evidence and prior signed release audit trails may be essential.
- Prefer a short current entry point in README, PROGRESS, one roadmap and one HQ handoff. Make archived or superseded pages clearly labeled and link to current counterparts. Git history preserves former content, but existing deep links can break after moves.
- A repository with many commits can be healthy; reducing obsolete **navigation** is often safer than deleting provenance. Small reviewed PRs first, never a destructive bulk cleanup.

**W5 owns this repository hygiene workstream. W4 owns release automation/security code; Command HQ reviews canonical documentation and approval gates; W6 owns acceptance evidence.**
