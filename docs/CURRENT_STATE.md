> **Source checkpoint — 10 November 2026:** [PJ-02A PR #53](https://github.com/DoorBlox/orbit/pull/53) source-merged at `0b2df5d6709014adef78c8348d98ecc5ca241186`, all four exact-head checks green after repairing a synthetic initial-storage test fixture. First-party branch action offers private Turn into project / Remove project status via right-click, Shift+F10 and More actions, without changing task or branch data. **Not Production**, not an actual Projects management window and not public portfolio publishing. [Product/UX backlog](../plans/ORBIT_PROJECT_EXPERIENCE_BACKLOG_2026_11_10.md); **PJ-02B actual private Projects widget next**.
> **Source closeout — 9 November 2026:** SP-01B [PR #50](https://github.com/DoorBlox/orbit/pull/50), source squash `0a8e1a92`, and PJ-01 [PR #51](https://github.com/DoorBlox/orbit/pull/51), source squash `50d8a6fe88645588eb37bc3fb0e6dcc35b3c24e3`, each passed four exact-head required checks. SP-01B enables test-only seventh DOM widget and private optional layout with untouched legacy six root coordinates. PJ-01 stores private reversible project identity on existing branches. **Neither adds a user-facing Projects UI or Production deployment.** PJ-02 accessible right-click/keyboard actions and shelf are next.
> **Latest source checkpoint (9 November 2026):** [BP-06 PR #47](https://github.com/DoorBlox/orbit/pull/47) merged at `78830dcf` with a synthetic Chromium spatial matrix and short-lived screenshot artifacts. [SP-01A PR #48](https://github.com/DoorBlox/orbit/pull/48) merged at `f422de6bbbafb4e352edde604ce9315a193e7680` with a validated extensible widget registry and backward-compatible original six defaults. Both had 4/4 exact-head checks green. **This is source only, not a new Production release, public website or seventh mounted widget.** Next SP-01B must validate a real seventh widget and the persistence/backup compatibility boundary.

> **New source-only checkpoints (9 November 2026):** [PR #44](https://github.com/DoorBlox/orbit/pull/44) corrected the fixed-six misconception and introduced the [open-ended workspace plan](../plans/ORBIT_EXPANDABLE_SPACE_PROJECTS_BLOG_FOCUS.md), squash `33d5f259`. [PR #45](https://github.com/DoorBlox/orbit/pull/45) added deterministic synthetic BP-03 traffic measurements and regression tests, squash `4b603b2c58e4ebef9fd66eebf33534cef2a7ace3`. Four required exact-head checks passed for both. **Source only; not Production deployment or real billed traffic evidence.** Existing six widget positions remain valid, without imposing a lifetime cap.

> **Owner architectural correction (9 November 2026):** the six current default widgets are **not a fixed or requested limit**. ORBIT's lasting principle is its freeform spatial workspace and preservation of the six existing widgets/layout data. Future Projects space, branch promotion, Focus/Pomodoro, public portfolio/blog and an opt-in Journal -> blog draft are planned, not released. [Feature blueprint](../plans/ORBIT_EXPANDABLE_SPACE_PROJECTS_BLOG_FOCUS.md). Publishing requires a separate reviewed public-content security boundary.

> **Source checkpoint 9 November 2026:** EX-01 official lazy Excalidraw [PR #41](https://github.com/DoorBlox/orbit/pull/41) source merged at `cbb6d405`; BP-03 hidden-tab polling first slice [PR #42](https://github.com/DoorBlox/orbit/pull/42) source merged at `7440ebe0420a71ce4f96e463d3502c208bea5efb`. Both passed all four required checks. **Neither has been deployed to Production.** EX-02 images, upstream shape-preview parity, owner-signed-in QA and complete BP-03 performance work remain outstanding. Old task-status paragraphs below describe earlier checkpoints.

# ORBIT — current verified state

**Updated:** 10 November 2026 (Asia/Jakarta). **Active ChatGPT engineering handoff:** [CHATGPT_HANDOFF.md](../CHATGPT_HANDOFF.md); [tool/skill playbook](CHATGPT_TOOL_PLAYBOOK.md). **Product:** ORBIT, a private spatial scrapbook. **Status:** 2.4 is live. This is the short, canonical state summary; see [Documentation protocol](DOCUMENTATION_PROTOCOL.md) for precedence and update rules.

## Identity and deployment

- GitHub repository: [DoorBlox/orbit](https://github.com/DoorBlox/orbit), public MIT source; branch main is PR-protected. The **last verified code/CI main SHA before this documentation closeout** was `0b2df5d6709014adef78c8348d98ecc5ca241186` (PJ-02A PR #53). Check the live GitHub main SHA before acting, because documentation commits advance it.
- **Live application source SHA:** 4e57aca785259192b92010c5d0e1634a4c1efe14 (PR #33, all four required exact-head CI statuses passed).
- **Canonical Production:** https://orbit.starscene.com/ maps to READY Vercel Production deployment dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4. This is not a claim of signed-in image acceptance.
- **Rollback artifact:** READY dpl_AxaB85krmkJfDUj1T6ipqw8rodH4, built from de2523dcea497c7ee41547ca94c14f48c72688f1. If privacy/auth failure, protect all deployments before alias rollback; see [Operations](OPERATIONS.md).
- Raw Vercel deployment and Preview URLs retain Vercel Authentication (prod_deployment_urls_and_all_previews). The canonical domain is publicly reachable to the **Supabase sign-in shell**, not to private workspace data. Secondary domain orbit.allintime.space is verified in Vercel, but its current HTTP redirect behavior has NOT been independently rechecked; do not assert a verified redirect based only on old notes.
- Vercel Git auto-deployment is disabled. PR merge is NOT Production deployment approval.

## Infrastructure and authorization

- **Frontend:** native HTML/CSS/JavaScript ES modules, six resizable and draggable spatial windows, a separate radial constellation camera; Source also pins React/ReactDOM for the separate **lazy Excalidraw editor island**; the main application remains native ES modules. No fixed maximum of six widgets is intended. Do not rewrite as a generic React dashboard.
- **Supabase project:** ixfgavgtwuzdgucjriec, Singapore/Postgres 17. Eight public tables have RLS; seven private-workspace tables have per-owner permissive CRUD policies paired with a RESTRICTIVE authenticated-tenant policy. The private media bucket is orbit-private-media (PNG, JPEG, WebP, 5 MiB limit). The browser receives no service-role key.
- **BP-04 source reconciliation complete:** [PR #38](https://github.com/DoorBlox/orbit/pull/38), main e5de8b32720f1ec26637bb48ea3db26942faaa45, aligned all seven LOCAL migration filename IDs to already-applied hosted versions **without SQL edits**, passed four checks including disposable local RLS/HTTP isolation. See [migration parity ledger](SUPABASE_MIGRATION_PARITY_2026-11-09.md). Hosted SQL version history was not touched; full hosted object-level parity and a future migration remain separately gated.
- Current hosted advisory observations: leaked-password protection disabled (WARN); private.orbit_configuration RLS without policies (INFO); two permissive publication-read policies and three unused indexes (performance warnings/info). These are not proof of exposed user data or justified index deletion.
- No confirmed paid upgrade, Cloudflare R2 activation, remote MCP service, DB-branch deployment or hosted Edge Function is part of 2.4.

## Shipped in ORBIT 2.4

Six movable, resizable widgets (constellation, continuum, to-do, completed, space and journal), independent floating stickies, task branches and checklists, links, private journals and native drawing scenes; ten curated themes; optional ambient motion; theme-aware paper/glass controls and clock; Space disclosure for advanced tools; sticky markers and pointer/keyboard minimap travel. Existing CAS-protected per-account cloud snapshots, backups and Auth remain.

## Verified gaps and priorities

| ID | State | What remains |
| --- | --- | --- |
| [#26](https://github.com/DoorBlox/orbit/issues/26) | OPEN | Real owner and second-account Production image-rendering acceptance for journals and stickies. Source-level blob preview mitigation is not enough. |
| BP-02 | SOURCE MERGED, NOT LIVE | [PR #39](https://github.com/DoorBlox/orbit/pull/39) `d6064f07`: versioned `.orbit` with referenced image bytes, SHA-256 and reviewed private restore; real authenticated Production acceptance remains NOT RUN. [Format contract](PORTABLE_BACKUP_V1.md). |
| BP-03 | NOT DONE | 15-second full-snapshot sync polling and global revision conflicts need measurement and safe optimization. |
| BP-04 | SOURCE MERGED / TESTED | Local migration timestamps match hosted ledger; schema-object parity and next hosted migration remain gated. |
| BP-05 | NOT DONE | Legacy manual stage-only workflow is pinned to 1.0.0 and must not be used as a general 2.4+ release operation. |
| BP-06 | NOT DONE | Full real-device, signed-in, keyboard/assistive-tech, zoom, ten-theme and performance audit. |
| [#29](https://github.com/DoorBlox/orbit/issues/29) | OPEN | Reusable private media library, reference-safe permanent deletion and optional provider migration. |
| [#31](https://github.com/DoorBlox/orbit/issues/31) | OPEN / OWNER PRIORITY | EX-00 adapter SOURCE MERGED PR #40; real official embedded Excalidraw EX-01 **in source implementation**, pinned package and local lazy JSX/CSS/fonts, [integration evidence](EXCALIDRAW_EX01_INTEGRATION.md). Not Production deployed or signed-in accepted; binary images deferred. |
| [#32](https://github.com/DoorBlox/orbit/issues/32) | OPEN | Scoped OAuth 2.1 remote MCP/ChatGPT connector; no live integration. |
| [#2](https://github.com/DoorBlox/orbit/issues/2), [#4](https://github.com/DoorBlox/orbit/issues/4), [#22](https://github.com/DoorBlox/orbit/issues/22) | HISTORIC/OPEN | Substantially shipped work with remaining QA; reconcile carefully rather than automatically close. |

## Agent ownership and CI efficiency — 9 Nov 2026

The user explicitly designated ChatGPT as the **coding, review, audit, test and handoff executor** for the approved BP/EX implementation roadmap. The user should not be asked to manually supervise workflows or construct continuity prompts. When an active session resumes, implement the next safe ready unit after verifying the repository. The assistant cannot work between sessions without a separate automation. Production, hosted data, identity and paid-provider actions retain separate approvals.

[CI workflow audit](CI_WORKFLOW_AUDIT_2026-11-09.md): in 100 latest sampled runs, 26 quality runs consumed ~55 minutes of aggregate elapsed time and 25 RLS runs ~40 minutes. Docs-only PR #35 ran the full browser quality suite (~143 seconds) despite no application change. [PR #36](https://github.com/DoorBlox/orbit/pull/36) is **SOURCE MERGED** with all four required checks green. It introduced a fail-closed Markdown-only CI fast path, preserved required status names, and added the real 2.4 raw deployment protection canary. It did not deploy an app release. The current public repository's standard GitHub-hosted runners are free, but efficiency and review latency still matter.

## The next executable steps

1. **BP-00 documentation baseline:** this state page, [execution blueprint](../plans/ORBIT_POST_2_4_EXECUTION.md) and [protocol](DOCUMENTATION_PROTOCOL.md), plus root handoff references. Documentation-only; package/application version normalization remains separately gated because release scripts still expect 1.0.0.
2. **BP-04 read-only research** and **BP-01 owner-assisted real-account media QA** can proceed independently. No hosted mutations.
3. Specify **BP-02 media-inclusive recovery**, then investigate **BP-03** sync cost with synthetic fixtures, plus **BP-06** visual baseline.
4. EX-00 scene adapter SOURCE MERGED; EX-01 true official React Excalidraw lazy editor is in a separate source branch and must pass browser/release tests. EX-02 binary image assets remain gated by privacy/backup recovery.

## Evidence and operating rules

The detailed responsibilities, paths, dependencies, acceptance tests and rollback are in [the post-2.4 blueprint](../plans/ORBIT_POST_2_4_EXECUTION.md). Visual evidence requested from the user is defined in [Design evidence plan](DESIGN_EVIDENCE_PLAN.md). Use [CHATGPT_HANDOFF.md](../CHATGPT_HANDOFF.md) for a short session resume, [OPERATIONS.md](OPERATIONS.md) for deployments, and [PROJECT_HISTORY.md](PROJECT_HISTORY.md) plus archived docs for dated provenance. Never confuse app release 2.4, npm package version 1.0.0, ORBIT backup schema v6, SQL migration version IDs, or Git SHAs.
