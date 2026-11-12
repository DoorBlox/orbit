> **W2 BP-02/12 detached-media recovery SOURCE MERGED (12 Nov 2026):** [PR #95](https://github.com/DoorBlox/orbit/pull/95), final reviewed head `a39a04a230339106fbc7129e790232442f5eaf48`, squash merge `533afd85e2423e02691c2393bbc46ae9ad6478d9`, all four exact-head checks **SUCCESS**: [static-quality](https://github.com/DoorBlox/orbit/actions/runs/43191443598) (new backup tests, source integrity, browser cloud/undo), [local-postgres-rls](https://github.com/DoorBlox/orbit/commits/a39a04a230339106fbc7129e790232442f5eaf48/checks), [production-artifact-dry-run](https://github.com/DoorBlox/orbit/commits/a39a04a230339106fbc7129e790232442f5eaf48/checks), [unauthenticated-protection](https://github.com/DoorBlox/orbit/commits/a39a04a230339106fbc7129e790232442f5eaf48/checks). Initial rebase failed **only** source hash for W3 `src/project-shelf.js`; W2 reconciled main M2 hash, retained W3 source, reran four checks and merged only after success. `createPortableArchive` accepts explicit optional owner-scoped `libraryPaths`, deduplicates selected detached files, enforces legacy quotas, encodes canonical `manifest.libraryOnlyPaths`; `inspectPortableArchive` verifies manifest and file paths before uploading. `rehydratePortableArchive` restores detached bytes privately without fabricating workspace references. **Existing owner backup UI still passes no `libraryPaths`; by default exports referenced images only.** Next executable file-level task: agree with W3 on explicit owner-facing selected detached media export/import and non-destructive gallery UX in W3-owned `src/cloud/owner-tools.js` / `src/app.js`; W2 only changes the media API if a documented need arises. Real signed-in two-account/physical/Production acceptance NOT RUN. #26/#29/#31 stay OPEN. No Storage DELETE, hosted SQL/Auth/RLS/Storage mutation, account data migration, R2/paid service, or Production alias action. Rollback source-only by reverting `533afd85` after checking other merged commits; no Storage object deletion occurred. Verified main immediately after #95 merge: `533afd85e2423e02691c2393bbc46ae9ad6478d9`; independently recheck at continuation.

# ORBIT Worker W2 — Private Media

**Status: BP-12 PRIVATE MEDIA API SOURCE MERGED (12 Nov 2026).** W2 owns the media-service and portable-backup reference interfaces. This checkpoint is a durable work index; recheck GitHub branch heads, PRs and exact-head checks before continuing. Do not interpret source merges as Production releases or signed-in owner acceptance.

## Scope and independent state

- Base main at branch creation: `b06d2827f53032b4371d5a797bd5fe660c1ea4dc` (the parallel-worker #87 protocol was merged earlier at `de24586b`). Another worker has PR #88 open; no W3 UI files were changed here.
- Work branch: `feat/orbit-w2-private-media-inventory-20261112`.
- **Delivered:** [W2 PR #90](https://github.com/DoorBlox/orbit/pull/90), source branch `feat/orbit-w2-private-media-inventory-20261112`, reviewed rebased exact head `f06922d34c869e121ccc839f8b62fbd4f31c1f00`, **squash-merged** to `main` at `c17dd6ac4ad6b7fb355aa7e923b6305a8bfdf18f`. The rebase preserved W1's `src/cloud/sync.js` changes and both workers' M2 manifest hashes.
- Existing BP-10 private preview leases with bounded idle cache were already SOURCE MERGED in PR #85. Do **not** replace them. Production still separately gated.

## Actual source changes

- `src/cloud/media.js`: `listOwnMedia({offset,limit})` read-only Supabase Storage API using the verified owner folder, bounded page size and offset, strictly filtered paths, dedupe and before/after authenticated checks. Does NOT list all users, return signed URLs or enable deletion. Post-operation auth verification after `upload()` and `signedUrl()` closes a mid-request account-switch race; successful upload that finishes during sign-out is left as non-deleted unreferenced media, never exposed to another user.
- `src/cloud/portable-backup.js`: `collectMediaReferenceUsage(snapshot,{ownerId})` indexes reference counts across note attachments, journal images, sticky canvas and journal canvas *file metadata*, including file entries not currently rendered. Existing `collectReferencedPaths` delegates to the shared index. `detachMediaReference(snapshot,{kind,id,elementId,ownerId})` creates an independent clone and removes only the selected reference; shared canvas file metadata survives until last referencing element is removed. No upload/delete/DB writes.
- `tests/bp12_media_library.test.mjs`: deterministic owner switching, pagination and malformed responses; shared media counts, cloning, immutability, exact-target detach, canvas fileId sharing and fail-closed invalid targets.
- `docs/reference/M2_SOURCE_MANIFEST.json`: updated **only M2** hashes for two changed runtime sources. Original V6 and M1 provenance untouched.

## Behavior and risk boundaries

1. The new private media API is **library/source-only**: W3 owns the visible Gallery UI and its media API integration; do not edit `src/app.js`, `src/scene.js`, `src/stickies.js` or `src/journal.js` without an agreed GitHub file contract. Offer W3 the `listOwnMedia`, `collectMediaReferenceUsage`, and `detachMediaReference` signatures in the PR.
2. Permanent Storage DELETE, media migration/R2, hosted SQL/Auth/Storage/RLS changes, private user-data mutation and Production release require **separate explicit owner authorization**. The returned detached snapshot must pass through the existing CAS save path; W3 integration cannot silently overwrite owner state.
3. An in-flight upload may leave an orphan after auth expiration; this is intentional non-destructive failure, and the media library should expose safe recovery later. Reference count zero is **not** enough to prove physical deletion is safe without a verified cloud snapshot/recovery plan.
4. Real authenticated owner/second-account image display, .orbit export/import, physical devices and Production checks remain **NOT RUN**. Do not close #26/#29/#31 on source-only test evidence.

## Verified source gate for PR #90

- Exact-head commit: `f06922d34c869e121ccc839f8b62fbd4f31c1f00`.
- `static-quality`: **SUCCESS**, [Actions job](https://github.com/DoorBlox/orbit/actions/runs/43188973884); includes unit tests, original V6/M1/M2 source verification, build and browser recovery/motion checks.
- `local-postgres-rls`: **SUCCESS**, [Actions run](https://github.com/DoorBlox/orbit/actions/runs/43188973867).
- `production-artifact-dry-run`: **SUCCESS**, [Actions run](https://github.com/DoorBlox/orbit/actions/runs/43188973857).
- `unauthenticated-protection`: **SUCCESS**, [Actions run](https://github.com/DoorBlox/orbit/actions/runs/43188973821).
- Complete source diff reviewed before merge; GitHub reports PR #90 CLOSED/MERGED. Rebase was required because another worker committed new sync source and M2 hashes. Merged main confirmed at `c17dd6ac4ad6b7fb355aa7e923b6305a8bfdf18f` immediately afterward; re-query actual main before further work.
- Local clone/test execution **NOT RUN** due isolated container DNS, but required GitHub-hosted unit/integration/browser gates above passed.
- Signed-in owner/second account, physical touch and real Production media restore: **NOT RUN**. This PR did not change hosted SQL, Auth/RLS/Storage, billing, user Storage objects, public assets, or Production.

## Next executable W2 work (single slice)

1. Inspect `src/cloud/portable-backup.js`, `tests/portable_backup.test.mjs`, `src/cloud/media.js` and W3's prospective gallery UI changes on the current main. Add an owner-private, explicit inventory-to-backup recovery policy covering **detached media files** without accidental deletion or unbounded archive growth; test missing/duplicate shared assets, export limits, owner switches and import rollback with synthetic fixtures. Preserve v1 archive reader compatibility and source manifests. First test whether existing `createPortableArchive` can be extended safely rather than inventing a second format.
2. Coordinate any UI files (W3 owns `src/app.js`, `src/scene.js`, `src/stickies.js`, `src/journal.js`, CSS and editor). API contract was posted to W3 [PR #88](https://github.com/DoorBlox/orbit/pull/88) and recorded in #90. No W2 edits to W3 UI without a written ownership agreement.
3. Owner acceptance remains a separate BP-01/BP-02/EX-02 gate: signed-in image rendering, complete .orbit restore on disposable account, different-account isolation and actual device testing. #26/#29/#31 remain OPEN until real evidence. Do not offer permanent Storage DELETE or R2 rollout without separately scoped owner permission.

**Rollback:** revert source merge `c17dd6ac` (taking care not to discard concurrent work) if an unanticipated regression is confirmed. Source-only rollback cannot delete or restore private Storage objects, and none were intentionally modified here.

Resume by independently re-reading `AGENTS.md`, `docs/ORBIT_PARALLEL_COMMAND_PROTOCOL.md`, the single `plans/ORBIT_POST_2_4_EXECUTION.md`, `CHATGPT_HANDOFF.md` and this file; check actual main, PRs and four exact-head checks before proceeding.
