import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

// The seven hosted-applied migration IDs were inspected read-only on 2026-11-09.
// Preserve the exact reviewed SQL blobs while reconciling LOCAL filenames.
// Additional newer migrations may be appended; never rewrite these baselines.
const reviewed = [
  ['20261101153811_orbit_initial_schema.sql', '92fc175b048e640305b4924b224baf33eff56421'],
  ['20261101154355_orbit_owner_snapshots_publication.sql', 'ec616dc7f071bb0fac4ec90550f680b26eb6299e'],
  ['20261102054113_orbit_business_conflict_http_status.sql', '7d1fb01d75bfbad7af1e816ea289afacc1a82b11'],
  ['20261106142540_orbit_private_table_least_privilege.sql', '86e85d6b75fd73370235bc048d5013c23e556fcf'],
  ['20261108161935_orbit_tenant_private_workspaces.sql', '03b3c87263321118044ebc63cb8db0ea4dd0763e'],
  ['20261108185344_orbit_private_extensions.sql', '04e1f2245f8949abcd3cdca31c2fb5f98639c2a4'],
  ['20261108185405_orbit_private_media.sql', '723f40692647461b5f23a5ffb8f69bc139d8cafc'],
];

const migrations = path.resolve('supabase/migrations');
const gitBlobSha = bytes => createHash('sha1')
  .update(Buffer.from('blob ' + bytes.length + '\0'))
  .update(bytes)
  .digest('hex');

test('reviewed local migration IDs align with the seven hosted ledger timestamps', () => {
  const files = readdirSync(migrations).filter(name => name.endsWith('.sql')).sort();
  assert.deepEqual(files.slice(0, reviewed.length), reviewed.map(([filename]) => filename));
  for (const [filename] of reviewed) {
    assert.match(filename, /^\d{14}_orbit_[a-z0-9_]+\.sql$/);
  }
});

test('the seven applied SQL bodies retain exactly the reviewed Git blob hashes', () => {
  for (const [filename, expectedGitBlobSha] of reviewed) {
    const bytes = readFileSync(path.join(migrations, filename));
    assert.equal(gitBlobSha(bytes), expectedGitBlobSha, 'Unexpected SQL body change: ' + filename);
  }
});
