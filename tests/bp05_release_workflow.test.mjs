import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const workflows = new URL('../.github/workflows/', import.meta.url);

test('BP-05: obsolete pinned 1.0.0 Production staging workflow is not dispatchable', async () => {
  const files = (await readdir(workflows)).filter(file => /\.ya?ml$/.test(file));
  assert.ok(!files.includes('m6-stage-only-production.yml'),
    'Remove the legacy manual staging workflow from active GitHub Actions, not just its warning comment.');
  for (const file of files) {
    const source = await readFile(new URL(file, workflows), 'utf8');
    assert.ok(!source.includes('fc5af5a8cd2c99d1e104615e72c3cd2b460f60d6'),
      `Active workflow ${file} must not silently stage the obsolete 1.0.0 commit.`);
    assert.ok(!/vercel\s+(?:deploy\b|promote\b|rollback\b|--prod\b)/.test(source),
      `Active workflow ${file} must not contain an unreviewed deployment/promotion operation.`);
  }
});

test('BP-05: retiring staging preserves all four protected PR status jobs', async () => {
  const required = new Map([
    ['quality.yml', 'static-quality'],
    ['local-supabase-rls.yml', 'local-postgres-rls'],
    ['m6-release-dry-run.yml', 'production-artifact-dry-run'],
    ['m6-anonymous-protection.yml', 'unauthenticated-protection'],
  ]);
  for (const [file, job] of required) {
    const source = await readFile(new URL(file, workflows), 'utf8');
    assert.match(source, /^  pull_request:/m,
      `${file} must continue to trigger on pull requests.`);
    assert.ok(source.includes(`  ${job}:\n`),
      `${file} must retain required job ID ${job} exactly.`);
  }
});
