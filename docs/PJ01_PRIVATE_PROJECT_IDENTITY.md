# PJ-01 — private reversible project identity

**Status:** source model/backup implementation, not a user-visible Projects feature.

An ORBIT project is an existing branch with optional owner-private metadata keyed by its stable branch ID. Marking and unmarking never change task IDs, branch hierarchy, positions, task assignments or journal entries.

- `extensions.projects` maps existing branch IDs to metadata: description (maximum 4,000 plain-text characters), status (`active`, `paused`, `completed`), and at most 12 validated HTTP(S) links. The branch itself remains the source of its displayed title.
- `src/projects.js` validates IDs, URLs, metadata sizes and semantic toggling. Mark is idempotent; unmark removes only private metadata. Rename and reparent preserve identity because the branch ID remains the same.
- When an existing branch is intentionally removed, its project metadata is dropped; Undo restores it together with the original branch and tasks.
- Version-6 backups and existing owner-scoped CAS cloud snapshots carry projects inside normalized extensions. Invalid or orphan project references fail before staged restore writes. Old backups lacking extensions preserve the already stored extension data.

**Not public:** Marking a branch as a project does not authorize publication. No anonymous data API, public visibility field, portfolio page, website, new hosted SQL/RLS/Storage policy or paid service is added. Public projection will require separate explicit review and consent. Very old code that drops unknown extension fields is not guaranteed lossless downgrade compatibility.

**Evidence:** Unit tests check immutable task/branch state, mark/unmark, rename/reparent, deletion/Undo, unsafe IDs/URLs, bounded descriptions and links, private extension roundtrip and atomic V6 backup behavior. Four exact-head checks required before source merge.

**Next PJ-02:** Provide keyboard-accessible branch actions (including right-click Turn into project) and a useful private Projects shelf powered by the SP-01B optional-widget layer. There is deliberately no placeholder UI here.
