# ORBIT — one owner-approved GitHub progress Project (SETUP PENDING)

**Decision:** On 12 November 2026 Command HQ [reported the owner's explicit approval](https://github.com/DoorBlox/orbit/pull/164#issuecomment-6828784329) for a **single GitHub Project with Table and Board** views. This is a *mirror* of [PROGRESS.md](PROGRESS.md) and the [ONE master roadmap](../plans/ORBIT_POST_2_4_EXECUTION.md), not a second independent backlog. **No Project has been created/verified by W5** because available connected GitHub tools do not support Projects v2 creation or item/field mutation.

## Owner GitHub UI setup (one-time)

1. Open your **GitHub profile → Projects → New project**. Choose a blank **Table**, name it **ORBIT — Master Progress**; add the repository `DoorBlox/orbit` in the Project settings/description as appropriate.
2. Keep the main `All work • Table` view, add `Kanban • Board` view grouped by Status, and optionally `Needs owner` filtered to owner-acceptance or approval blockers.
3. Use project-only fields: **Work ID** (BP-00…BP-16, EX/PJ/etc.), **Worker** (W1–W6/HQ), **Status** (PROPOSED, READY, IN PROGRESS, BLOCKED, SOURCE MERGED, RELEASED, VERIFIED, DEFERRED), **Delivery** (source/Preview/Production), **Acceptance** (not run/synthetic passed/owner pending/verified), **Priority**, **Next gate**, **Evidence**, and optional **Target release**. Preserve status distinctions; do not map a green PR to RELEASED.
4. Link existing repository issues and PRs (#26/#29/#32/#115 and currently open PRs) without duplicating them. If a row for every BP is desired, add project-only **draft items**, not 17 new GitHub repository issues. Put the canonical roadmap and dashboard URLs in Project description.
5. Share the resulting **actual GitHub Project URL** with W5/Command HQ so the verified link can be added to README and PROGRESS. Do not claim a board exists before that verification.

**Optional Milestones:** create only if useful for cross-issue release objectives such as `Integrated acceptance` and `Protected release readiness`. GitHub Milestones are grouping labels, not acceptance or deployment authority.

[Current progress](PROGRESS.md) · [Source of truth](../plans/ORBIT_POST_2_4_EXECUTION.md) · [Branch hygiene](REPO_HYGIENE_POLICY.md).
