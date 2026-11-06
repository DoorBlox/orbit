import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { resolveBuildConfig, buildDist } from '../scripts/build.mjs';
import { verifyReleaseArtifact } from '../scripts/verify-release.mjs';

const target=JSON.parse(await readFile(new URL('../release/production-target.json',import.meta.url),'utf8'));
const deployment=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
const env={VERCEL_ENV:'production',ORBIT_SUPABASE_URL:'https://ixfgavgtwuzdgucjriec.supabase.co',
  ORBIT_SITE_URL:'https://orbit.starscene.com/',ORBIT_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test_only'};

test('reviewed shared project/site accepts complete private configuration, not missing inputs or public mode',()=>{
  assert.equal(target.status,'reviewed');
  assert.ok(target.developmentSupabaseUrls.includes(env.ORBIT_SUPABASE_URL),'retain development exclusion');
  assert.equal(resolveBuildConfig(env).publicRelease,false);
  assert.throws(()=>resolveBuildConfig({VERCEL_ENV:'production'}),/Production/);
  assert.throws(()=>resolveBuildConfig({...env,ORBIT_SUPABASE_PUBLISHABLE_KEY:''}),/together/);
  assert.throws(()=>resolveBuildConfig({...env,ORBIT_PUBLIC_RELEASE:'true'}),/Public release/);
});

test('shared exception is required and cannot expand to other projects, sites, decisions or broad CSP',()=>{
  for(const mutate of [
    t=>{delete t.sharedDatabaseException;},
    t=>{t.sharedDatabaseException.supabaseUrl='https://other.supabase.co';},
    t=>{t.sharedDatabaseException.siteUrl='https://other.example.test/';},
    t=>{t.sharedDatabaseException.decision='unreviewed';},
    t=>{t.sharedDatabaseException.scope='multi-user';},
    t=>{t.supabaseUrl='https://other.supabase.co';t.sharedDatabaseException.supabaseUrl=t.supabaseUrl;},
    t=>{t.siteUrl='https://other.example.test/';t.sharedDatabaseException.siteUrl=t.siteUrl;},
  ]){
    const changed=structuredClone(target);mutate(changed);
    assert.throws(()=>resolveBuildConfig(env,{target:changed,deployment}),/shared|Production|development/);
  }
  for(const override of [{ORBIT_SITE_URL:'https://orbit-emtd92fo1-doorbloxs-projects.vercel.app/'},
    {ORBIT_SUPABASE_URL:'https://other.supabase.co'}]){
    assert.throws(()=>resolveBuildConfig({...env,...override}),/Production/);
  }
  const broad=structuredClone(deployment);
  broad.headers[0].headers.find(h=>h.key==='Content-Security-Policy').value="connect-src *";
  assert.throws(()=>resolveBuildConfig(env,{target,deployment:broad}),/CSP/);
});

test('shared target builds and verifies a private artifact offline with a synthetic key only',async()=>{
  const outdir=await mkdtemp(path.join(tmpdir(),'orbit-shared-target-'));
  try{
    await buildDist({outdir,env});
    const result=await verifyReleaseArtifact({outdir});
    assert.equal(result.supabaseUrl,env.ORBIT_SUPABASE_URL);
    assert.equal(result.siteUrl,env.ORBIT_SITE_URL);
    assert.equal(result.mode,'protected-private');
    assert.ok(!JSON.stringify(result).includes(env.ORBIT_SUPABASE_PUBLISHABLE_KEY));
  }finally{await rm(outdir,{recursive:true,force:true});}
});
