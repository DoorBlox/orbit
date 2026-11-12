import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const workflows = new URL('../.github/workflows/', import.meta.url);
const STAGE = 'bp05-stage-reviewed.yml';

test('BP-05: obsolete pinned 1.0.0 Production staging workflow is not dispatchable', async () => {
  const files = (await readdir(workflows)).filter(file => /\.ya?ml$/.test(file));
  assert.ok(!files.includes('m6-stage-only-production.yml'),
    'Remove the legacy manual staging workflow from active GitHub Actions, not just its warning comment.');
  assert.ok(files.includes(STAGE), 'Review-gated staging workflow must exist.');
  for (const file of files) {
    const source = await readFile(new URL(file, workflows), 'utf8');
    assert.ok(!source.includes('fc5af5a8cd2c99d1e104615e72c3cd2b460f60d6'),
      `Active workflow ${file} must not silently stage the obsolete 1.0.0 commit.`);
    const active=source.split('\n').filter(line=>!/^\s*#/.test(line)).join('\n');
    assert.doesNotMatch(active, /\bvercel\s+(?:promote|rollback|alias)\b/,
      `Active workflow ${file} must not promote/rollback/alias.`);
    if(file!==STAGE)assert.doesNotMatch(active, /\bvercel\s+(?:deploy\b|--prod\b)/,
      `Active workflow ${file} must not contain a deployment operation.`);
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

test('BP-05: manual stage is exact-main, approval-scoped, unaliased and non-promoting',async()=>{
  const source=await readFile(new URL(STAGE,workflows),'utf8');
  const active=source.split('\n').filter(line=>!/^\s*#/.test(line)).join('\n');
  assert.match(source,/^  workflow_dispatch:/m);
  assert.doesNotMatch(source,/^  (?:push|pull_request|schedule):/m);
  assert.match(source,/github\.ref == 'refs\/heads\/main'/);
  assert.match(source,/environment:\s*\n\s*name: orbit-release-staging/);
  for(const command of ['preflight','approval','artifact','protect'])assert.ok(source.includes('node scripts/bp05-stage-gate.mjs '+command));
  assert.match(source,/node scripts\/bp05-release-preflight.mjs/);
  assert.match(source,/npm run verify:source/);
  assert.match(source,/node scripts\/verify-release.mjs/);
  assert.equal((source.match(/vercel deploy --prebuilt --prod --skip-domain/g)||[]).length,1);
  assert.doesNotMatch(active,/\bvercel\s+(?:promote|rollback|alias)\b/);
  const [preflight,stage]=source.split(/^  stage-with-approval:/m);
  assert.ok(stage);
  assert.doesNotMatch(preflight,/secrets\.|VERCEL_TOKEN|vercel deploy/);
  assert.match(stage,/secrets\.VERCEL_TOKEN/);
  assert.match(stage,/ORBIT_STAGE_APPROVED_SHA/);
});
