# ORBIT portable private backup — format v1 (BP-02)

**Source status, 9 Nov 2026:** implementation in review, not deployed. ORBIT 2.4 Production still has path-only legacy JSON exports. This describes the proposed browser-only portable recovery source.

## Recovery goal and format

The legacy ORBIT V6 JSON export contains tasks, journal, branches, widgets and sticky notes plus **private image Storage paths**—but not private image bytes. The new **Download full backup (with images)** action in the authenticated owner panel produces a single **.orbit JSON archive with Base64 image bytes and per-image SHA-256**, containing every image **currently referenced** by a journal or sticky.

The envelope has format **orbit-portable-backup**, version **1**, exportedAt, manifest with assetCount/totalBytes (and optional selected detached libraryOnlyPaths), snapshot (validated existing ORBIT backup version 6), and sorted assets. Each asset includes path, MIME, size, SHA-256 and Base64 data. Repeated references to one object are deduplicated. No signed URL, JWT, service-role key or live endpoint is embedded. The filename is orbit-private-backup-YYYY-MM-DD.orbit.

**Important:** this file is **NOT encrypted, compressed, authenticated or signed**. The checksum detects accidental or malicious byte changes relative to its manifest, but someone who can edit both bytes and checksum can forge it. Store it privately, import only files from trusted sources and do not commit/upload it to GitHub or public CI.

An initial lightweight Base64-JSON format was chosen to avoid a new ZIP dependency in ORBIT's native-module build. Later streaming ZIP/compression can be considered with measured need. The current limits are 96 referenced images, 64 MiB total bytes, 5 MiB per image, and 96 MiB textual archive. If any referenced image is missing, invalid or beyond limits, **the entire export fails**, not silently partial.

**Current source evolution (12 Nov 2026, W2):** Existing v1 readers still accept original archives with only the `assetCount` and `totalBytes` manifest. The lower-level `createPortableArchive` API now also accepts an **explicit optional** `libraryPaths` array for owner-selected private files that are no longer referenced by notes, Journal, or canvas. Those selected detached images are deduplicated against referenced assets, sorted and checksummed using the same 96-item, 64 MiB, 5 MiB/file limits. The manifest includes canonical `libraryOnlyPaths` only when such detached files are included, and import verifies list order, uniqueness, path ownership and exact asset matching before uploading. Detached bytes are privately reuploaded on restore without fabricating new note or Journal references, and never physically deleted. **Important:** The existing owner-facing backup button does not yet provide a library selector or pass `libraryPaths`; without explicit UI integration, it still includes referenced images only. This source API is not a promise of full orphan recovery or a Production deployment. Owner selection, any bulk listing/recovery, and signed-in tests remain outstanding. Canvas image references are already supported in .orbit source backups. Standalone image-bearing .excalidraw interchange remains separate. The existing V5/V6 JSON backup workflow remains compatible.

## Export and restore workflow

1. Authenticated owner requests full export. The app commits local journal input, validates the workspace, downloads each referenced private object with owner checks **before and after** the network call, verifies PNG/JPEG/WebP signatures and hashes, and downloads the completed archive. A draft pending cloud sync is captured as local state; it is not represented as already saved.
2. Owner selects **Review full backup for restore**. Local browser validates exact version, workspace structure, matching path manifest, canonical Base64, MIME/signatures, byte counts, checksum, image limits and all references **before any upload**. Invalid files are rejected without changes.
3. If no unsaved/conflicting cloud draft is pending, require an explicit confirmation that restore **replaces** the current private workspace. Recommend exporting its existing backup first.
4. Upload inspected bytes to NEW random private paths under the **current signed-in owner** via existing upload with upsert disabled. References are remapped so journal and sticky reuse the new paths; no old owner's storage path becomes an active reference.
5. Only after all uploads succeed does the app stage the snapshot and use existing CAS-protected cloud synchronization. An authentication failure, changed account, invalid file or upload problem must not replace cloud data or weaken Storage RLS. A failed cloud save leaves a local in-session draft and a clear warning.
6. **Cloud writes and Storage uploads are not one atomic transaction.** A failed restore may leave some unused private objects; they are **not auto-deleted**. Cleanup and safe permanent deletion belong to #29. Do not sign out until cloud synchronization is confirmed.

### Restoration review integrity (W2 source hardening, 12 Nov 2026)

The `inspectPortableArchive` result is an **in-memory reviewed object**, not a new portable format. A private module-held review record binds the normalized workspace snapshot and every source asset's SHA-256/size/type/path. `rehydratePortableArchive` now accepts only an object returned by the current review session; it rejects reconstructed or mutated review objects, wrong-source-account image references, changed bytes, missing/reordered assets, and changed workspace content. It verifies **all** bytes and reference paths and clones the reviewed snapshot **before the first upload**. The verified blobs are then passed to owner-scoped Storage uploads. A failed upload does not return a restored workspace; earlier completed uploads may remain as recoverable unreferenced objects and must not be automatically deleted. Retrying an unchanged reviewed object creates fresh private objects, rather than reusing unsafe partial writes.

This review record is ephemeral and **is not an authentication signature for the .orbit file**. Importing a trusted local archive always requires a fresh `inspectPortableArchive` call, an explicit user confirmation, and the existing CAS cloud-save flow. Source tests are synthetic; signed-in user restore and second-account isolation still need owner acceptance.

## Acceptance and what remains unverified

Tests must cover complete export/import roundtrip with synthetic files, multiple references and deduplication, forged image signatures, changed checksums, missing/extra assets, owner isolation, switched login mid-download, failure before cloud import, legacy V6 backup compatibility and size guards. The build allowlist must copy the new module, and Bootstrap must pass authenticated media and owner ID.

Four required exact-head GitHub statuses must be green for source merge. **Real-account signed-in Production backup/restore and image visibility are NOT yet verified** (#26 remains open). No hosted migration, Storage policy change, Production promotion, billing action or destructive data operation is authorized by this source PR.

Rollback is source-only: revert the branch/PR if CI fails. A source merge does not deploy ORBIT; any future release needs separately approved staging and authenticated acceptance.

Related: [Execution blueprint](../plans/ORBIT_POST_2_4_EXECUTION.md), [ChatGPT handoff](../CHATGPT_HANDOFF.md), [private media issue #29](https://github.com/DoorBlox/orbit/issues/29), [Excalidraw issue #31](https://github.com/DoorBlox/orbit/issues/31).
