import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertStageApproval,
  selectRecentPreflight,
  assertStageArtifact,
  assertStageUrl,
  assertProtectedStageResponse,
  assertReviewedStageRun,
  assertStageProjectProtection,
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


const reviewedEnvironment = {
  id: 23,name: 'orbit-release-staging',
  protection_rules: [{
    type:'required_reviewers',prevent_self_review:true,
    reviewers:[{type:'User',reviewer:{id:77,login:'independent-reviewer'}}],
  },{type:'branch_policy'}],
  deployment_branch_policy:{protected_branches:true,custom_branch_policies:false},
};
const reviewedRun = {
  id:123,run_attempt:1,path:'.github/workflows/bp05-stage-reviewed.yml@main',
  event:'workflow_dispatch',head_branch:'main',head_sha:sha,
};
const independentReview = {
  state:'approved',
  user:{login:'independent-reviewer',type:'User'},
  environments:[{id:23,name:'orbit-release-staging'}],
};
const reviewArgs = {
  environment:reviewedEnvironment,reviews:[independentReview],run:reviewedRun,
  reviewedSha:sha,actor:'requester',triggeringActor:'requester',runId:123,runAttempt:'1',
};

test('BP-05 requires a real independent GitHub approval on this exact run',()=>{
  assert.deepEqual(assertReviewedStageRun(reviewArgs),
    {ok:true,reviewedSha:sha,environment:'orbit-release-staging'});
  assert.throws(()=>assertReviewedStageRun({...reviewArgs,reviews:[]}),/NO-GO/);
  assert.throws(()=>assertReviewedStageRun({...reviewArgs,reviews:[{
    ...independentReview,user:{login:'requester',type:'User'},
  }]}),/NO-GO/);
  assert.throws(()=>assertReviewedStageRun({...reviewArgs,reviews:[{
    ...independentReview,user:{login:'rerun-actor',type:'User'},
  }],triggeringActor:'rerun-actor'}),/NO-GO/);
  assert.throws(()=>assertReviewedStageRun({...reviewArgs,reviews:[
    independentReview,{...independentReview,state:'rejected'},
  ]}),/NO-GO/);
  assert.throws(()=>assertReviewedStageRun({...reviewArgs,reviews:[{
    ...independentReview,environments:[{id:24,name:'orbit-release-staging'}],
  }]}),/NO-GO/);
  assert.throws(()=>assertReviewedStageRun({...reviewArgs,runId:124}),/NO-GO/);
  assert.throws(()=>assertReviewedStageRun({...reviewArgs,reviewedSha:other}),/NO-GO/);
  assert.throws(()=>assertReviewedStageRun({...reviewArgs,runAttempt:'2'}),/NO-GO/);
  assert.throws(()=>assertReviewedStageRun({...reviewArgs,run:{...reviewedRun,run_attempt:2}}),/NO-GO/);
  assert.throws(()=>assertReviewedStageRun({...reviewArgs,run:{...reviewedRun,path:'.github/workflows/quality.yml@main'}}),/NO-GO/);
});

test('BP-05 fails closed on unprotected or self-reviewable environments',()=>{
  const invalid = [
    {...reviewedEnvironment,name:'preview'},
    {...reviewedEnvironment,protection_rules:[]},
    {...reviewedEnvironment,protection_rules:[{type:'wait_timer',wait_timer:10}]},
    {...reviewedEnvironment,protection_rules:[{
      ...reviewedEnvironment.protection_rules[0],prevent_self_review:false,
    }]},
    {...reviewedEnvironment,protection_rules:[{
      ...reviewedEnvironment.protection_rules[0],reviewers:[],
    }]},
    {...reviewedEnvironment,deployment_branch_policy:null},
    {...reviewedEnvironment,deployment_branch_policy:{
      protected_branches:false,custom_branch_policies:true,
    }},
  ];
  for(const environment of invalid)
    assert.throws(()=>assertReviewedStageRun({...reviewArgs,environment}),/NO-GO/);
});

test('BP-05 confirms actual Vercel SSO protection before any deployment',()=>{
  const project = {
    id:'prj_FZH5dyyZvUXfVmTz04HBCMbIrQk5',
    accountId:'team_xHRnXQbjaIEx2rNZ94p5QBao',name:'orbit',
    ssoProtection:{enabled:true,deploymentType:'prod_deployment_urls_and_all_previews'},
  };
  assert.deepEqual(assertStageProjectProtection(project),{ok:true,projectId:project.id});
  assert.deepEqual(assertStageProjectProtection({
    ...project,ssoProtection:{enabled:true,deploymentType:'all'},
  }),{ok:true,projectId:project.id});
  for(const mutation of [
    {accountId:'team-other'},
    {id:'prj-other'},
    {name:'other'},
    {ssoProtection:{enabled:false,deploymentType:'prod_deployment_urls_and_all_previews'}},
    {ssoProtection:{enabled:true,deploymentType:'all_previews'}},
    {ssoProtection:null},
  ])assert.throws(()=>assertStageProjectProtection({...project,...mutation}),/NO-GO/);
});
