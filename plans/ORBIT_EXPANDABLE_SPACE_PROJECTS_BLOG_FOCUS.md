# Historical product-direction record — expandable ORBIT (9 November 2026)

**ARCHIVED AS A SEPARATE ROADMAP ON 10 NOVEMBER 2026.** All SP, PJ, FO and PUB units, their dependencies, acceptance criteria, rollback and priorities now live **inside the [single unified BP-00–BP-16 master roadmap](ORBIT_POST_2_4_EXECUTION.md)**. Do not implement from this archived page or count it as another active backlog. The [full historical original](https://github.com/DoorBlox/orbit/blob/416d301f78dc930c52e3e461b122a9fcbbc4c208/plans/ORBIT_EXPANDABLE_SPACE_PROJECTS_BLOG_FOCUS.md) remains retrievable for provenance.

## Decisions retained from the original discussion

- Six V6 windows are **compatibility defaults, not a numerical limit**; ORBIT remains one pannable, draggable/resizable creative workspace rather than a fixed dashboard or mandatory React rewrite.
- A Project is a **private, reversible label on an existing branch** (not a duplicate task tree); its nested unique task counts and private backup are preserved.
- Optional Focus/Pomodoro can link to tasks/projects without per-second cloud writes, compulsory points or streaks.
- A public portfolio/blog is a **separate, curated, explicit private-to-public projection**. A Project mark or Journal edit does **not** publish source data; preview, publish, revise and unpublish require distinct deliberate actions and reviewed security.
- New hosted SQL/RLS/Auth/Storage, public posting, private deletion, providers, paid service or Production release remain separately approved gates.

## Source history

SP-00 [PR #44](https://github.com/DoorBlox/orbit/pull/44); SP-01A/B [#48](https://github.com/DoorBlox/orbit/pull/48)/[#50](https://github.com/DoorBlox/orbit/pull/50); PJ-01 [#51](https://github.com/DoorBlox/orbit/pull/51); PJ-02A/B [#53](https://github.com/DoorBlox/orbit/pull/53)/[#55](https://github.com/DoorBlox/orbit/pull/55) are source merged. PJ-02B has a protected Preview but is not Production deployed. All next work—PJ-03, PUB-00/01/02 and FO-01—must be scheduled and accepted through the unified master roadmap, not this historical source.
