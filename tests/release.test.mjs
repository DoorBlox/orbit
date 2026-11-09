import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { buildDist } from '../scripts/build.mjs';
import { verifyReleaseArtifact } from '../scripts/verify-release.mjs';

const env={ORBIT_SUPABASE_URL:'https://release-fixture.example.test',
  ORBIT_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_release',ORBIT_SITE_URL:'https://private.example.test/'};
const options={target:{schemaVersion:1,status:'reviewed',supabaseUrl:env.ORBIT_SUPABASE_URL,siteUrl:env.ORBIT_SITE_URL,
  developmentSupabaseUrls:['https://development.example.test']},deployment:{headers:[{source:'/(.*)',headers:[{
  key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://release-fixture.example.test; connect-src 'self' https://release-fixture.example.test; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
}]}]}};

test('release verifier rejects local artifacts, extra files, drift and symlinks; reports hashes without keys',async()=>{
  const outdir=await mkdtemp(path.join(tmpdir(),'orbit-release-'));
  const verify=()=>verifyReleaseArtifact({outdir,productionOptions:options});
  try{
    await buildDist({outdir,env:{}});
    await assert.rejects(verify(),/local-only/);
    await buildDist({outdir,env});
    const result=await verify();
    assert.equal(result.version,'1.0.0');assert.equal(result.mode,'protected-private');
    assert.ok(result.files.every(f=>/^[a-f0-9]{64}$/.test(f.sha256)));
    assert.ok(!JSON.stringify(result).includes(env.ORBIT_SUPABASE_PUBLISHABLE_KEY));
    await writeFile(path.join(outdir,'unexpected.env'),'synthetic');
    await assert.rejects(verify(),/unexpected files/);
    await rm(path.join(outdir,'unexpected.env'));
    const index=await readFile(path.join(outdir,'index.html'));
    await writeFile(path.join(outdir,'index.html'),'unreviewed');
    await assert.rejects(verify(),/differs from reviewed source/);
    await writeFile(path.join(outdir,'index.html'),index);
    const sdk=await readFile(path.join(outdir,'src/cloud/client.js'));
    await writeFile(path.join(outdir,'src/cloud/client.js'),'unreviewed SDK');
    await assert.rejects(verify(),/SDK bundle differs/);
    await writeFile(path.join(outdir,'src/cloud/client.js'),sdk);
    await symlink(path.join(outdir,'index.html'),path.join(outdir,'linked.html'));
    await assert.rejects(verify(),/symlink/);
  }finally{await rm(outdir,{recursive:true,force:true});}
});
