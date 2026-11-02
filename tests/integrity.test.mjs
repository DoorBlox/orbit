import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, symlink, writeFile, appendFile, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveBuildConfig, buildDist, browserModules } from '../scripts/build.mjs';

const jwt=role=>`${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({role})).toString('base64url')}.synthetic_signature`;
const configured={ORBIT_SUPABASE_URL:'https://synthetic.supabase.co',ORBIT_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',ORBIT_SITE_URL:'https://orbit.example.test/'};

test('integrity accepts reviewed M2 and rejects current, extra and historical changes',async()=>{
  const root=process.cwd(),folder=await mkdtemp(path.join(tmpdir(),'orbit-integrity-'));
  const check=()=>execFileSync(process.execPath,[path.join(root,'scripts/verify-source.mjs')],{cwd:folder,stdio:'pipe'});
  try{
    await mkdir(path.join(folder,'docs/reference'),{recursive:true});
    for(const file of ['index.html','src','assets','docs/reference/V6_SOURCE_MANIFEST.json','docs/reference/M1_SOURCE_MANIFEST.json','docs/reference/M2_SOURCE_MANIFEST.json'])
      await cp(path.join(root,file),path.join(folder,file),{recursive:true});
    await symlink(path.join(root,'.git'),path.join(folder,'.git'));
    assert.match(check().toString(),/immutable V6 provenance.*historical M1.*reviewed M2/);
    await appendFile(path.join(folder,'src/app.js'),'\n// unreviewed change\n');
    assert.throws(check,/Unreviewed source change/);
    await cp(path.join(root,'src/app.js'),path.join(folder,'src/app.js'));
    await writeFile(path.join(folder,'src/unexpected.js'),'export const unexpected=true;');
    assert.throws(check,/inventory differs/);
    await rm(path.join(folder,'src/unexpected.js'));
    await appendFile(path.join(folder,'docs/reference/V6_SOURCE_MANIFEST.json'),'\n');
    assert.throws(check,/Original V6 manifest changed/);
    await cp(path.join(root,'docs/reference/V6_SOURCE_MANIFEST.json'),path.join(folder,'docs/reference/V6_SOURCE_MANIFEST.json'));
    await appendFile(path.join(folder,'docs/reference/M1_SOURCE_MANIFEST.json'),'\n');
    assert.throws(check,/Historical M1 manifest changed/);
  }finally{await rm(folder,{recursive:true,force:true});}
});

test('public build config is explicit, allowlisted and keeps protected preview mode',()=>{
  assert.equal(resolveBuildConfig({}),null);
  assert.equal(resolveBuildConfig({UNRELATED_SECRET:'synthetic_not_shipped'}),null);
  assert.deepEqual(resolveBuildConfig(configured),{
    supabaseUrl:'https://synthetic.supabase.co',publishableKey:'sb_publishable_synthetic',siteUrl:'https://orbit.example.test/',publicRelease:false,
  });
  assert.equal(resolveBuildConfig({...configured,ORBIT_SUPABASE_PUBLISHABLE_KEY:jwt('anon')}).publicRelease,false);
  assert.equal(resolveBuildConfig({...configured,ORBIT_SUPABASE_URL:'http://127.0.0.1:54321',ORBIT_SITE_URL:'http://localhost:4173'}).siteUrl,'http://localhost:4173/');
  for(const key of ['ORBIT_SUPABASE_URL','ORBIT_SUPABASE_PUBLISHABLE_KEY','ORBIT_SITE_URL'])assert.throws(()=>resolveBuildConfig({...configured,[key]:''}),/together/);
  for(const key of ['sb_secret_synthetic',jwt('service_role'),jwt('authenticated'),'unexpected-key']){
    assert.throws(()=>resolveBuildConfig({...configured,ORBIT_SUPABASE_PUBLISHABLE_KEY:key}),/publishable key or legacy anon JWT/);
  }
  for(const url of ['http://example.test','https://user:pass@synthetic.supabase.co','https://synthetic.supabase.co/path','https://synthetic.supabase.co/?token=private','javascript:alert(1)']){
    assert.throws(()=>resolveBuildConfig({...configured,ORBIT_SUPABASE_URL:url}),/requires HTTPS/);
  }
  assert.throws(()=>resolveBuildConfig({...configured,ORBIT_SITE_URL:'https://orbit.example.test/#token'}),/requires HTTPS/);
  assert.throws(()=>resolveBuildConfig({...configured,ORBIT_PUBLIC_RELEASE:'true'}),/Public release is not enabled/);
  assert.equal(resolveBuildConfig({VERCEL_ENV:'preview',VERCEL_URL:'synthetic-build.vercel.app'}),null);
  assert.equal(resolveBuildConfig({...configured,ORBIT_SITE_URL:'',VERCEL_ENV:'preview',VERCEL_URL:'synthetic-build.vercel.app'}).siteUrl,'https://synthetic-build.vercel.app/');
  assert.throws(()=>resolveBuildConfig({...configured,ORBIT_SITE_URL:'',VERCEL_ENV:'production',VERCEL_URL:'synthetic-build.vercel.app'}),/together/);
  for(const host of ['https://synthetic.vercel.app','synthetic.vercel.app:443','synthetic.vercel.app/path','synthetic.vercel.app?token=synthetic','synthetic.vercel.app.attacker.test','user@synthetic.vercel.app','synthetic..vercel.app','-synthetic.vercel.app','vercel.app']){
    assert.throws(()=>resolveBuildConfig({...configured,ORBIT_SITE_URL:'',VERCEL_ENV:'preview',VERCEL_URL:host}),/exact \*\.vercel\.app hostname/);
  }
});

test('build emits native app plus isolated SDK and only public config',async()=>{
  const folder=await mkdtemp(path.join(tmpdir(),'orbit-build-'));
  try{
    const outdir=path.join(folder,'dist');
    await buildDist({outdir,env:{...configured,UNRELATED_SECRET:'synthetic_not_shipped'}});
    const config=await readFile(path.join(outdir,'src/runtime-config.js'),'utf8');
    assert.match(config,/"publicRelease":false/);
    assert.ok(!config.includes('synthetic_not_shipped'));
    const client=await readFile(path.join(outdir,'src/cloud/client.js'),'utf8');
    assert.ok(!/import\(['"]@supabase\/supabase-js['"]\)/.test(client),'SDK package import must be bundled');
    assert.equal(await readFile(path.join(outdir,'src/app.js'),'utf8'),await readFile('src/app.js','utf8'),'scrapbook stays native and byte copied');
    assert.ok((await readFile(path.join(outdir,'index.html'),'utf8')).includes('./src/bootstrap.js'));
    const expected=['index.html','assets/orbit.svg','src/runtime-config.js','src/cloud/client.js',...browserModules.map(file=>`src/${file}`)].sort();
    const inventory=async dir=>{
      const {readdir}=await import('node:fs/promises');const files=[];
      for(const entry of await readdir(path.join(outdir,dir),{withFileTypes:true})){
        const name=dir?`${dir}/${entry.name}`:entry.name;
        if(entry.isDirectory())files.push(...await inventory(name));else files.push(name);
      }
      return files;
    };
    assert.deepEqual((await inventory('')).sort(),expected);
    await buildDist({outdir,env:{}});
    assert.match(await readFile(path.join(outdir,'src/runtime-config.js'),'utf8'),/runtimeConfig = null/);
    await writeFile(path.join(outdir,'previous-artifact'),'synthetic');
    await assert.rejects(buildDist({outdir,env:{...configured,ORBIT_SUPABASE_PUBLISHABLE_KEY:jwt('service_role')}}),/publishable key or legacy anon JWT/);
    assert.equal(await readFile(path.join(outdir,'previous-artifact'),'utf8'),'synthetic','invalid config does not destroy prior artifact');
  }finally{await rm(folder,{recursive:true,force:true});}
});
