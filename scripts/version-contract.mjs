/** BP-00: deliberately separate ORBIT version domains.
 *
 * This source-only contract coordinates release artifact evidence. It does NOT
 * bump npm packages, migrate user backups, change a live application label or
 * authorize a Production deployment.
 */
export const ORBIT_VERSION_IDENTITIES = Object.freeze({
  appRelease: '2.4',             // Already-live user-visible product release.
  artifactPackage: '1.0.0',      // Locked npm/build verification identity.
  packageName: 'orbit-spatial-scrapbook-prototype',
  snapshotFormat: 'orbit-backup',
  snapshotCurrent: 6,            // Nested workspace snapshot format, not npm.
  snapshotAccepted: Object.freeze([5, 6]),
  portableFormat: 'orbit-portable-backup',
  portableArchive: 1,            // Outer portable image archive format.
  restoreMarker: 1,              // Local rollback marker is not backup schema.
  productionTargetSchema: 1,     // Reviewed deployment target config schema.
});

const fail = reason => { throw Error('BP-00 VERSION NO-GO: ' + reason); };
const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);

/** The package-lock top level and root entry must both match the exact release
 * artifact package. Never equate the npm identity to the 2.4 app or V6 backup.
 */
export function assertPackageLockAgreement(pkg, lock) {
  const ids = ORBIT_VERSION_IDENTITIES;
  if (!record(pkg) || !record(lock) || !record(lock.packages) ||
      !record(lock.packages['']) ||
      pkg.name !== ids.packageName || pkg.version !== ids.artifactPackage ||
      pkg.private !== true || pkg.type !== 'module' ||
      lock.name !== pkg.name || lock.version !== pkg.version ||
      lock.packages[''].name !== pkg.name ||
      lock.packages[''].version !== pkg.version ||
      lock.lockfileVersion !== 3) fail('npm package and root lock identity must match reviewed 1.0.0.');
  for (const section of ['dependencies','devDependencies']) {
    if (!record(pkg[section]) || !record(lock.packages[''][section])) {
      fail('npm dependency section unavailable.');
    }
    const a = pkg[section], b = lock.packages[''][section];
    if (Object.keys(a).length !== Object.keys(b).length ||
        Object.keys(a).some(name => typeof a[name] !== 'string' ||
          a[name] !== b[name])) fail('package manifest and lockfile dependencies differ.');
  }
  return Object.freeze({packageName:pkg.name,artifactVersion:pkg.version});
}

/** Production artifact reports are intentionally versioned by npm; neither
 * a portable archive v1 nor an app v2.4 is a valid substitute.
 */
export function isArtifactPackageVersion(value) {
  return value === ORBIT_VERSION_IDENTITIES.artifactPackage;
}

/** Check fields from an actually exported workspace and portable wrapper. A
 * valid archive V1 can contain a workspace snapshot V6; this is not drift.
 */
export function assertBackupVersionPair(snapshot, portable) {
  const ids = ORBIT_VERSION_IDENTITIES;
  if (!record(snapshot) || snapshot.format !== ids.snapshotFormat ||
      snapshot.version !== ids.snapshotCurrent ||
      !record(portable) || portable.format !== ids.portableFormat ||
      portable.version !== ids.portableArchive ||
      !record(portable.snapshot) || portable.snapshot.format !== snapshot.format ||
      portable.snapshot.version !== snapshot.version) {
    fail('portable wrapper and nested workspace snapshot must use their separate schemas.');
  }
  return Object.freeze({
    snapshotVersion:snapshot.version,portableArchiveVersion:portable.version,
  });
}
