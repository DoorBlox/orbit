import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateReleaseHead} from '../scripts/bp05-release-preflight.mjs';

const good='a'.repeat(40),other='b'.repeat(40);
test('BP-05 release preflight permits only an exact clean main checkout',()=>{
  assert.deepEqual(validateReleaseHead({reviewedSha:good,checkoutSha:good,mainSha:good,worktreeStatus:''}),
    {ok:true,sha:good,stageOnly:true});
});
test('BP-05 rejects stale PR head, wrong main, malformed hashes and dirty sources',()=>{
  const valid={reviewedSha:good,checkoutSha:good,mainSha:good,worktreeStatus:''};
  for(const patch of [
    {reviewedSha:other},{mainSha:other},{checkoutSha:other},{reviewedSha:'main'},
    {reviewedSha:good.slice(0,7)},{reviewedSha:good.toUpperCase()},
    {mainSha:''},{checkoutSha:null},{worktreeStatus:' M src/app.js'},
  ])assert.throws(()=>validateReleaseHead({...valid,...patch}),/NO-GO/);
});
test('BP-05 preflight workflow is non-deploying and keeps secrets out of PR checks',async()=>{
  const source=await readFile(new URL('../.github/workflows/bp05-release-preflight.yml',import.meta.url),'utf8');
  assert.match(source,/workflow_dispatch:/);
  assert.match(source,/reviewed_sha:/);
  assert.match(source,/permissions:\s*\n\s*contents:\s*read/);
  assert.match(source,/ORBIT_REVIEWED_SHA:/);
  assert.match(source,/npm run verify:source/);
  assert.match(source,/npm run build:release/);
  assert.match(source,/npm run verify:release/);
  assert.doesNotMatch(source,/\b(vercel deploy|vercel promote|vercel rollback|VERCEL_TOKEN|SUPABASE_SERVICE_ROLE_KEY|secrets\.)\b/);
  assert.doesNotMatch(source,/\bpush:\s*\n/);
});
