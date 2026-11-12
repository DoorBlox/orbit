# ORBIT Worker W2 — Private Media

**Status: ACTIVE / SOURCE PR PENDING REVIEW (12 Nov 2026).** W2 owns the media-service and portable-backup reference interfaces. This checkpoint is a durable work index; recheck GitHub branch heads, PRs and exact-head checks before continuing. Do not interpret source merges as Production releases or signed-in owner acceptance.

## Scope and independent state

- Base main at branch creation: `b06d2827f53032b4371d5a797bd5fe660c1ea4dc` (the parallel-worker #87 protocol was merged earlier at `de24586b`). Another worker has PR #88 open; no W3 UI files were changed here.
- Work branch: `feat/orbit-w2-private-media-inventory-20261112`.
- Latest checkpoint commit before PR creation: `93d194c91a5eea1e534c4eb763dda03972a5ecd8`. Check latest branch SHA independently; this file itself will advance the branch.
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

## Verification and next executable action

- Synthetic tests were authored first. Local `git clone` was not available in the ChatGPT container due DNS/network isolation; local Node tests **NOT RUN**. Run `node --test tests/bp12_media_library.test.mjs tests/media.test.mjs tests/portable_backup.test.mjs tests/bp10_media_leases.test.mjs` in repo-capable CI or a full clone, then `npm run check`.
- Required exact-head GitHub gates to verify after opening PR: `static-quality`, `local-postgres-rls`, `production-artifact-dry-run`, `unauthenticated-protection`. All **PENDING/NOT YET VERIFIED** at this checkpoint. Read job logs for failures, fix tests or source, regenerate M2 hashes and re-run exact-head gates naturally via branch push. Do not greenwash historical checks.
- **Next single action:** open and inspect the focused W2 PR, check exact-head Actions conclusions, repair any observed failures in `src/cloud/media.js`, `src/cloud/portable-backup.js`, `tests/bp12_media_library.test.mjs`, then review diff and merge only when all four pass. Update this W2 checkpoint with final PR/head/merge evidence. Commander owns shared roadmap and main handoff.
- Rollback: revert the source-only PR; no hosted data, user secrets, Storage objects or Production deployment changed. Real gallery display remains a separate W3 integration unit.

Resume by independently re-reading `AGENTS.md`, `docs/ORBIT_PARALLEL_COMMAND_PROTOCOL.md`, the single `plans/ORBIT_POST_2_4_EXECUTION.md`, `CHATGPT_HANDOFF.md` and this file; check actual main and PR state before proceeding.
