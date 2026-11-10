import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const SHA = /^[0-9a-f]{40}$/;
export function validateReleaseHead({reviewedSha, checkoutSha, mainSha, worktreeStatus}) {
  if (![reviewedSha,checkoutSha,mainSha].every(v=>typeof v==='string'&&SHA.test(v)))
    throw Error('BP-05 NO-GO: a full lowercase 40-character reviewed SHA is required.');
  if (reviewedSha!==checkoutSha || reviewedSha!==mainSha)
    throw Error('BP-05 NO-GO: reviewed SHA must equal both checkout and current main.');
  if (typeof worktreeStatus!=='string' || worktreeStatus.trim())
    throw Error('BP-05 NO-GO: source worktree must be clean.');
  return {ok:true,sha:reviewedSha,stageOnly:true};
}

if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
  try {
    const proof=validateReleaseHead({
      reviewedSha:process.env.ORBIT_REVIEWED_SHA,
      checkoutSha:git('rev-parse','HEAD'),
      mainSha:git('rev-parse','refs/remotes/origin/main'),
      worktreeStatus:git('status','--porcelain'),
    });
    // This is an offline/no-secret preflight, NOT a deployment permission.
    console.log('PASS: exact main commit checked, clean worktree, no alias, stage or Production operation.');
    console.log('Reviewed SHA: '+proof.sha);
  } catch(e) { console.error(e.message); process.exitCode=1; }
}
