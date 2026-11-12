# BP-00 — Separate ORBIT application, npm artifact and backup identities

**Status (12 November 2026): source-only version contract, not a release migration.** See `scripts/version-contract.mjs` and `tests/bp00_version_contract.test.mjs`.

A single global version number would be unsafe: the user-facing app feature release, npm build artifact, workspace snapshot and portable archive are separate protocols and currently carry **different correct values**.

| Domain | Current, intentional identity | Governs |
| --- | --- | --- |
| Published application feature release | `2.4` | Existing deployed product feature set, **not** latest merged main |
| npm/build artifact package | `1.0.0` | `package.json`, `package-lock.json`, production artifact reports and BP-05 reviewed-stage report checks |
| Legacy workspace snapshot/export | `orbit-backup`, version `6` | Current locally generated workspace JSON |
| Legacy snapshot import compatibility | Versions `5` and `6` | Recovery of older backups without unilateral format migration |
| Portable private-media archive | `orbit-portable-backup`, outer version `1` | Image-byte/checksum envelope; its nested workspace snapshot remains version `6` |
| Interrupted-restore recovery marker | Version `1` | Local rollback safety marker, **not** backup schema |
| Reviewed Production target settings | `schemaVersion: 1` | Deployment metadata, **not** app or archive version |

## What changed

- New `scripts/version-contract.mjs` captures the distinct identities in a frozen, source-only object. Its package/lock validator requires **both** top-level and root lock entries to equal the reviewed npm name and `1.0.0` and checks manifest dependency pin consistency. It blocks an accidental rename, package bump, lock drift or dependency mismatch rather than silently treating `2.4` as npm `2.4.0`.
- `scripts/verify-release.mjs` now invokes that package-lock validator before checking an exact protected build. The existing cryptographic output-file comparison and no-private-key report rules remain intact.
- `scripts/bp05-stage-gate.mjs` checks the artifact's package version against the same constant, retaining all existing approval/SHA/SSO checks. This is not a stage trigger.
- Synthetic tests validate correct and corrupt package/lock metadata and exercise **real** `validateBackup`, `createPortableArchive`, and `inspectPortableArchive` functions using zero-media synthetic fixture data to prove that a V1 archive correctly wraps a V6 snapshot while V5 snapshots remain importable. The test never uploads, fetches user data or changes W2's portable-backup implementation.

## Release/rollback gate

This change deliberately **does not** rewrite the npm package version, alter serialized backup layouts, edit `src/app.js` or W2 media code, change Production target config, touch GitHub environments, start a Vercel build/deployment, or claim merged source is currently live. If a later owner-authorized release changes any identity, coordinate the package, full lockfile regeneration, CI/build artifact manifest, staging runbook, importer compatibility, and signed-in restore verification in one separately reviewed migration. Revert this source PR to undo the version audit without any user-data migration.

Source acceptance: `npm test`, `npm run lint`, `npm run build`, the four required exact-head GitHub check conclusions, and an inspected clean merge. Genuine signed-in archive restore and Production promotion remain separately owner-gated.
