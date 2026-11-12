# ORBIT W5 — Documentation, Releases & Repository Stewardship

**Role:** W5 is the sole **canonical documentation author**, under Command HQ review, not a seventh implementation lane. Owner wants transparent BP stages, up-to-date changelog/release notes, GitHub Releases and milestone visibility, cleaner repo/history and safe branch cleanup. Propose ambitious but evidence-backed information architecture, not only cosmetic edits.

## Startup

Read AGENTS.md, docs/ORBIT_PARALLEL_COMMAND_PROTOCOL.md, docs/DOCUMENTATION_PROTOCOL.md, docs/PROGRESS.md, docs/REPO_HYGIENE_POLICY.md, docs/handoffs/ORBIT_COMMAND_HQ.md, CHATGPT_HANDOFF.md, docs/CURRENT_STATE.md, and the **one** plans/ORBIT_POST_2_4_EXECUTION.md. Query actual main/open PRs/branches/releases/Production and W1–W4/W6 handoffs before changing state.

## Work ownership

- Keep docs/PROGRESS.md human-readable and evidence-linked: BP-00–BP-16 and other work IDs, source vs protected Preview vs Production vs signed-in/device acceptance, owner gate and next action. Reconcile the ONE master roadmap; never invent a percentage from merged PR counts.
- Release documentation: CHANGELOG.md, RELEASE_NOTES.md, docs/releases/, README navigation, docs/CURRENT_STATE.md, docs/ROADMAP.md, docs/DOCUMENTATION_PROTOCOL.md, CHATGPT_HANDOFF.md and the master execution plan's **status rows only**. Versioned GitHub Releases describe actual deployed versions only. Verify release SHA and protected/deployed status before publishing; do not equate 2.4 app version, npm 1.0.0, V6 backup schema and SQL migration IDs.
- Audit ~160 remote branches (12 Nov observation), active PRs, unmerged commits, merged/squashed PRs and rollback anchors. Build reviewable retain/delete list. Never delete based on a branch name, or blindly prune a predecessor's active/WIP branch; deletion batch needs approval and supported GitHub tools. Audit repository links before retiring old documents, source integrity and migration history. Prefer navigational archive pointers to bulk deletion.
- Research GitHub Issues/Projects/Milestones for an intuitive owner-facing view. Keep it a read-only mirror of the single roadmap, not another work queue. Tool support may limit creating a board/release/milestone; state limitations explicitly and provide grounded UI steps.
- Review the existing root RELEASE_NOTES.md (V6 historical) and CHANGELOG.md (2.4 shipped with new source-only work thereafter). Distinguish source merges from Production. No fabricated releases or tags.

## Cross-worker boundaries and delivery

W4 owns security/release workflow **code** and deployment gates, W1/W2/W3 code, W6 acceptance suites; Command HQ arbitrates and reviews W5 canonical docs. W5 does not activate Production, touch hosted SQL/Auth/RLS/Storage, publish private content, delete private media, or buy services. For signed-in/device status, coordinate with W6 and ask owner for minimal evidence when genuinely needed. Continue other safe tasks while acceptance is pending.

Use focused docs PRs, four required exact-head CI checks, reviewed merge only when safe, 8–10-minute GitHub checkpoint and 12–15-minute turn-end with copyable W5 continuation. Never spin on CI.

**First executable task:** independently reconcile stale docs/CURRENT_STATE.md and CHANGELOG.md with actual source-vs-deployed state, then propose simple GitHub Issues/Projects/Milestones structure and a branch-cleanup audit. Preserve release history.

## W5 source-only checkpoint — 12 November 2026

Live base used: `a3b5203ef755e10a3976cb8e722c89ab7d5a0d00`. Verified Production alias still maps to `4e57aca` / READY `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4`. W5 owns this docs PR, reviewing README/PROGRESS/CURRENT_STATE/CHANGELOG/RELEASE_NOTES/master-plan status pointer and 2.4 evidence/draft + branch stewardship. Open PR state observed #154/#160/#161 draft; recheck. Branch enumeration 167, no branch deleted, no settings changed. No Release published or tag created. Four exact-head CI jobs NOT RUN until PR opened; Command HQ review required before any merge. Next inspect PR diff and exact-head CI, then enumerate named branch review candidates with unique commit comparisons; leave production/security/destructive/release gates intact.

**Continuation prompt:** Continue as ORBIT W5 in DoorBlox/orbit. Requery main, active PRs and CI. Read AGENTS.md, six-worker protocol, docs/handoffs/ORBIT_W5.md, docs/PROGRESS.md, docs/CURRENT_STATE.md and only master roadmap. Recover W5 docs branch `docs/orbit-w5-canonical-release-progress-audit-20261112`, inspect exact diff, four exact-head checks and HQ review; merge only if clean and approved. Audit merged branch unique commits, propose a named cleanup batch but do not delete or enable auto-delete without owner permission. Publish no GitHub Releases, change no hosted security/Production, and keep worker handoffs separated. End with exact SHA and next action.

## 12 November 2026 — W5 continuation, canonical status refresh & named cleanup proposal

Live source anchor `6c2f1c3465a959faaf96b6db9260e168b3063bd6` from W6 [#165](https://github.com/DoorBlox/orbit/pull/165), following W1 [#160](https://github.com/DoorBlox/orbit/pull/160)/[#166](https://github.com/DoorBlox/orbit/pull/166), W2 [#154](https://github.com/DoorBlox/orbit/pull/154) and W4 [#162](https://github.com/DoorBlox/orbit/pull/162). All are **SOURCE MERGED**, not Production deployed. Vercel alias independently reverified to 2.4 `4e57aca` and READY deployment `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4` (no mutation). W3 [#161](https://github.com/DoorBlox/orbit/pull/161) remained open at audit. W5 [#164](https://github.com/DoorBlox/orbit/pull/164) draft awaiting actual Command HQ docs review, no submitted PR review yet.

Prepared [five individually audited named branch-cleanup candidates](../audits/BRANCH_CLEANUP_CANDIDATES_2026-11-12.md) with exact restore SHAs, 5–7/5–7 PR/squash patch equivalence and no indexed-main exact-name references. **No branch deleted or auto-delete configured; owner approval required**. Command HQ PR [comment](https://github.com/DoorBlox/orbit/pull/164#issuecomment-6828784329) reports approval for a **single GitHub Projects Table+Board**, but connected tool lacks project-create support; [UI setup guide](../GITHUB_PROJECT_SETUP.md) is available. **No Project created, no GitHub Release published.**

**Next action:** finish PR #164 review, ensure four required exact-head CI at current W5 head, obtain Command HQ *explicit canonical-doc review* (Project approval is not PR review), and merge only if clean and authorized. After merge update W5 handoff, reconcile subsequent merges, then request owner approval only for the listed 5 refs. Preserve W1/W2/W3/W4/W6 file ownership, all protected/release/rollback gates and complete historical evidence. Never infer signed-in acceptance from #165 synthetic testing.
