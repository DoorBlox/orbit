// BP-05: fail-closed source/reviewer/artifact/privacy gates for a *manual* stage-only job.
// This module does not deploy, promote, modify Auth or read owner-private data.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const SHA = /^[0-9a-f]{40}$/;
const PROJECT_ID = 'prj_FZH5dyyZvUXfVmTz04HBCMbIrQk5';
const TEAM_ID = 'team_xHRnXQbjaIEx2rNZ94p5QBao';
const SITE_URL = 'https://orbit.starscene.com/';
const SUPABASE_URL = 'https://ixfgavgtwuzdgucjriec.supabase.co';
const PREFLIGHT_PATH = '.github/workflows/bp05-release-preflight.yml';
const MAX_PREFLIGHT_AGE_MS = 24 * 60 * 60 * 1000;
const noGo = message => { throw Error('BP-05 NO-GO: ' + message); };

export function selectRecentPreflight({runs, reviewedSha, now = Date.now()}) {
  if (!SHA.test(reviewedSha || '') || !Array.isArray(runs) || !Number.isFinite(now))
    noGo('invalid exact-main source or preflight evidence.');
  const match = runs.find(run => {
    const created = Date.parse(run?.created_at);
    const file = typeof run?.path === 'string' ? run.path.split('@')[0] : '';
    return run?.head_sha === reviewedSha && run?.head_branch === 'main' &&
      run?.event === 'workflow_dispatch' && run?.status === 'completed' &&
      run?.conclusion === 'success' && file === PREFLIGHT_PATH &&
      Number.isFinite(created) && created <= now + 120000 &&
      created >= now - MAX_PREFLIGHT_AGE_MS;
  });
  if (!match) noGo('run the exact-main NO-DEPLOY preflight successfully within 24 hours before staging.');
  return match;
}

export function assertStageApproval({reviewedSha, approvedSha, projectId, orgId, cliVersion}) {
  if (!SHA.test(reviewedSha || '') || approvedSha !== reviewedSha)
    noGo('separately approved environment SHA must equal the exact reviewed main SHA.');
  if (projectId !== PROJECT_ID || orgId !== TEAM_ID)
    noGo('Vercel project/team differs from reviewed ORBIT private target.');
  if (typeof cliVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(cliVersion))
    noGo('Vercel CLI must be an explicitly pinned stable three-part version.');
  return {ok: true, reviewedSha, cliVersion};
}

export function assertStageArtifact(report, reviewedSha) {
  if (!SHA.test(reviewedSha || '') || !report || typeof report !== 'object' ||
      report.commit !== reviewedSha || report.version !== '1.0.0' ||
      report.mode !== 'protected-private' || report.siteUrl !== SITE_URL ||
      report.supabaseUrl !== SUPABASE_URL)
    noGo('production-format artifact does not match reviewed source and private target.');
  if (!Array.isArray(report.files) || report.files.length < 10 ||
      report.files.some(f => typeof f?.path !== 'string' || !/^[\w./-]+$/.test(f.path) ||
        typeof f.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(f.sha256)))
    noGo('artifact checksum inventory is incomplete or invalid.');
  const paths = report.files.map(f => f.path);
  if (new Set(paths).size !== paths.length || paths.some(p => p.includes('..') || p.startsWith('/')))
    noGo('artifact inventory contains duplicate or unsafe paths.');
  // A checksum-only report is allowed. Never upload or log keys, sessions or headers.
  const serialized = JSON.stringify(report);
  if (/sb_(?:publishable|secret)_|bearer\s|authorization|access_token|refresh_token|service_role|jwt/i.test(serialized))
    noGo('artifact report contains potentially credential-bearing fields.');
  return {ok: true, fileCount: paths.length};
}

export function assertStageUrl(value) {
  let url;
  try { url = new URL(value); } catch { noGo('stage must return a valid raw HTTPS Vercel URL.'); }
  if (typeof value !== 'string' || ![url.origin, url.href].includes(value) || url.protocol !== 'https:' ||
      url.username || url.password || url.port || url.pathname !== '/' ||
      url.search || url.hash || !url.hostname.endsWith('.vercel.app') ||
      !/^orbit-[a-z0-9-]+-doorbloxs-projects\.vercel\.app$/.test(url.hostname))
    noGo('stage target must be an exact raw protected *.vercel.app origin, never the public alias.');
  return url.href;
}

export function assertProtectedStageResponse({status, location, url}) {
  const source = new URL(assertStageUrl(url));
  if (status === 401 || status === 403) return true;
  if ([301,302,303,307,308].includes(status) && typeof location === 'string') {
    let target;
    try { target = new URL(location, source); } catch { noGo('invalid stage authentication redirect.'); }
    if (target.protocol === 'https:' && !target.username && !target.password &&
        (target.hostname === 'vercel.com' || target.hostname.endsWith('.vercel.com') ||
        (target.origin === source.origin && /(?:^|\/)(?:_vercel|auth|login|sso)(?:\/|$)/i.test(target.pathname))))
      return true;
  }
  noGo('raw stage is not demonstrably SSO-protected; do not promote or share it.');
}

async function runCommand(mode, env = process.env) {
  const reviewedSha = env.ORBIT_REVIEWED_SHA;
  if (!SHA.test(reviewedSha || '')) noGo('exact 40-character reviewed SHA is required.');
  if (mode === 'preflight') {
    if (env.GITHUB_REPOSITORY !== 'DoorBlox/orbit' || !env.GITHUB_TOKEN)
      noGo('preflight evidence requires authorized ORBIT GitHub Actions read access.');
    const endpoint = new URL('https://api.github.com/repos/DoorBlox/orbit/actions/workflows/bp05-release-preflight.yml/runs');
    endpoint.searchParams.set('event', 'workflow_dispatch');
    endpoint.searchParams.set('head_sha', reviewedSha);
    endpoint.searchParams.set('per_page', '100');
    const response = await fetch(endpoint, {
      headers: {Accept: 'application/vnd.github+json', Authorization: `Bearer ${env.GITHUB_TOKEN}`},
      redirect: 'error', signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) noGo('unable to verify source-only preflight run.');
    const payload = await response.json();
    selectRecentPreflight({runs: payload.workflow_runs, reviewedSha});
    console.log('BP-05 PASS: recent successful exact-main no-deploy preflight confirmed.');
    return;
  }
  if (mode === 'approval') {
    assertStageApproval({reviewedSha, approvedSha: env.ORBIT_STAGE_APPROVED_SHA,
      projectId: env.VERCEL_PROJECT_ID, orgId: env.VERCEL_ORG_ID,
      cliVersion: env.ORBIT_VERCEL_CLI_VERSION});
    console.log('BP-05 PASS: separately scoped SHA approval and pinned Vercel target verified.');
    return;
  }
  if (mode === 'artifact') {
    if (!env.RUNNER_TEMP || !path.isAbsolute(env.RUNNER_TEMP)) noGo('runner scratch directory missing.');
    const file = path.join(env.RUNNER_TEMP, 'orbit-reviewed-stage-report.json');
    const artifact = JSON.parse(await readFile(file, 'utf8'));
    const proof = assertStageArtifact(artifact, reviewedSha);
    console.log(`BP-05 PASS: ${proof.fileCount} reviewed private artifact hashes, no key output.`);
    return;
  }
  if (mode === 'protect') {
    const stageUrl = assertStageUrl(env.ORBIT_STAGE_URL);
    const response = await fetch(stageUrl, {
      method: 'GET', redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(12000),
    });
    assertProtectedStageResponse({status: response.status, location: response.headers.get('location'), url: stageUrl});
    console.log('BP-05 PASS: anonymous request to raw stage requires authentication.');
    return;
  }
  noGo('unknown stage gate operation.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { await runCommand(process.argv[2]); }
  catch (error) {
    // Never interpolate GitHub/Vercel API response bodies, keys or owner media into logs.
    console.error(/^BP-05 NO-GO:/.test(error?.message) ? error.message : 'BP-05 NO-GO: verification unavailable.');
    process.exitCode = 1;
  }
}
