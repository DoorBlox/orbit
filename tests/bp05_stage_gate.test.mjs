import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertStageApproval,
  selectRecentPreflight,
  assertStageArtifact,
  assertStageUrl,
  assertProtectedStageResponse,
} from '../scripts/bp05-stage-gate.mjs';

const sha = 'a'.repeat(40), other = 'b'.repeat(40);
const now = Date.parse('2026-11-12T09:00:00.000Z');
const run = {
  head_sha: sha, head_branch: 'main', event: 'workflow_dispatch',
  status: 'completed', conclusion: 'success',
  path: '.github/workflows/bp05-release-preflight.yml',
  created_at: '2026-11-12T08:30:00.000Z',
  html_url: 'https://github.com/DoorBlox/orbit/actions/runs/123',
};
const approval = {
  reviewedSha: sha, approvedSha: sha,
  projectId: 'prj_FZH5dyyZvUXfVmTz04HBCMbIrQk5',
  orgId: 'team_xHRnXQbjaIEx2rNZ94p5QBao', cliVersion: '51.2.3',
};

test('stage requires a fresh successful current-main manual preflight, not arbitrary CI', () => {
  assert.deepEqual(selectRecentPreflight({runs: [run], reviewedSha: sha, now}), run);
  for (const patch of [
    {head_sha: other}, {head_branch: 'feature'}, {event: 'pull_request'},
    {conclusion: 'failure'}, {conclusion: 'skipped'}, {status: 'in_progress'},
    {path: '.github/workflows/quality.yml'},
    {created_at: '2026-11-10T08:00:00Z'},
    {created_at: '2026-11-12T10:00:00Z'},
    {created_at: 'invalid'},
  ]) {
    assert.throws(() => selectRecentPreflight({runs: [{...run, ...patch}], reviewedSha: sha, now}), /NO-GO/);
  }
  assert.throws(() => selectRecentPreflight({runs: [], reviewedSha: sha, now}), /NO-GO/);
  assert.throws(() => selectRecentPreflight({runs: [run], reviewedSha: 'main', now}), /NO-GO/);
  assert.throws(() => selectRecentPreflight({runs: {workflow_runs:[run]}, reviewedSha: sha, now}), /NO-GO/);
  assert.deepEqual(selectRecentPreflight({runs: [{...run, conclusion: 'failure'}, run], reviewedSha: sha, now}), run);
});

test('stage environment requires separate exact-SHA attestation and exact reviewed Vercel team/project', () => {
  assert.deepEqual(assertStageApproval(approval), {ok: true, reviewedSha: sha, cliVersion: '51.2.3'});
  for (const patch of [
    {approvedSha: other}, {approvedSha: ''}, {reviewedSha: 'main'},
    {projectId: 'prj_othertenant'}, {orgId: 'team_wrong'},
    {cliVersion: 'latest'}, {cliVersion: '51.2.3 && echo leaked'},
    {cliVersion: '51.2.3-beta.1'}, {cliVersion: ''},
  ]) assert.throws(() => assertStageApproval({...approval, ...patch}), /NO-GO/);
});

test('artifact proof requires reviewed SHA and private exact production target, no key-bearing output', () => {
  const report = {
    commit: sha, mode: 'protected-private', version: '1.0.0',
    siteUrl: 'https://orbit.starscene.com/',
    supabaseUrl: 'https://ixfgavgtwuzdgucjriec.supabase.co',
    files: Array.from({length: 11}, (_, i) => ({path: `src/file${i}.js`, sha256: 'd'.repeat(64)})),
  };
  assert.deepEqual(assertStageArtifact(report, sha), {ok: true, fileCount: 11});
  for (const patch of [
    {commit: other}, {version: '2.4.0'}, {mode: 'public'},
    {siteUrl: 'https://other.example/'}, {supabaseUrl: 'https://attacker.example/'},
    {files: []}, {files: [{path: 'src/evil.js', sha256: 'not-hashed'}]},
    {publishableKey: 'sb_publishable_should-not-appear'},
    {authorization: 'Bearer testing'},
  ]) assert.throws(() => assertStageArtifact({...report, ...patch}, sha), /NO-GO/);
});

test('raw stage host validator denies attacker hosts, canonical public domain, path, query and credentials', () => {
  const safe = 'https://orbit-abc123-doorbloxs-projects.vercel.app/';
  assert.equal(assertStageUrl(safe), safe);
  assert.equal(assertStageUrl(safe.slice(0,-1)), safe);
  for (const bad of [
    'http://orbit-abc123-doorbloxs-projects.vercel.app/',
    'https://orbit.starscene.com/',
    'https://vercel.app/',
    'https://attacker.vercel.app/',
    'https://other-project-other-team.vercel.app/',
    'https://a.vercel.app.evil.example/',
    'https://u:p@a.vercel.app/',
    'https://a.vercel.app:444/',
    'https://a.vercel.app/private',
    'https://a.vercel.app/?secret=yes',
    'javascript:alert(1)',
  ]) assert.throws(() => assertStageUrl(bad), /NO-GO/);
});

test('unauthenticated raw staging must be SSO-protected, never an anonymous 200', () => {
  const url = 'https://orbit-abc123-doorbloxs-projects.vercel.app/';
  assert.equal(assertProtectedStageResponse({status: 401, url}), true);
  assert.equal(assertProtectedStageResponse({status: 403, url}), true);
  assert.equal(assertProtectedStageResponse({status: 307, url, location: 'https://vercel.com/login?next=xyz'}), true);
  assert.equal(assertProtectedStageResponse({status: 302, url, location: '/_vercel/sso'}), true);
  for (const response of [
    {status:200}, {status:500}, {status:302, location:'/private-journal'},
    {status:302, location:'https://attacker.example/'},
    {status:302, location:'http://vercel.com/login'},
    {status:302, location:'https://evil-vercel.com/login'},
  ]) assert.throws(() => assertProtectedStageResponse({...response, url}), /NO-GO/);
});
