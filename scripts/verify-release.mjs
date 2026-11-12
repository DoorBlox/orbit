import { readFile, readdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { browserModules, resolveBuildConfig, sdkBuildOptions, editorBuildOptions } from './build.mjs';
import { assertProductionConfig } from './production-guard.mjs';
import {assertPackageLockAgreement} from './version-contract.mjs';

export async function verifyReleaseArtifact({root=process.cwd(),outdir=path.join(root,'dist'),productionOptions}={}){
  const [pkg,lock]=await Promise.all(['package.json','package-lock.json'].map(async file=>
    JSON.parse(await readFile(path.join(root,file),'utf8'))));
  assertPackageLockAgreement(pkg,lock);
  if(!(await lstat(outdir)).isDirectory()||(await lstat(outdir)).isSymbolicLink())
    throw Error('Release artifact directory must be a real directory.');
  const text=await readFile(path.join(outdir,'src/runtime-config.js'),'utf8');
  const match=text.match(/^export const runtimeConfig = (.+);$/m);
  let config;try{config=JSON.parse(match?.[1]);}catch{throw Error('Release artifact has invalid public configuration.');}
  if(!config)throw Error('Release artifact is local-only; protected Production requires cloud configuration.');
  const normalized=resolveBuildConfig({ORBIT_SUPABASE_URL:config.supabaseUrl,
    ORBIT_SUPABASE_PUBLISHABLE_KEY:config.publishableKey,ORBIT_SITE_URL:config.siteUrl});
  if(JSON.stringify(config)!==JSON.stringify(normalized))throw Error('Release artifact configuration is not allowlisted.');
  assertProductionConfig(config,productionOptions);
  const expectedConfig=`// Build-generated allowlisted public configuration. No privileged credentials.\nexport const runtimeConfig = ${JSON.stringify(config)};\n`;
  if(text!==expectedConfig)throw Error('Release artifact runtime module differs from the generated format.');
  const inventory=async(dir='')=>{
    const files=[];
    for(const entry of await readdir(path.join(outdir,dir),{withFileTypes:true})){
      const name=dir?`${dir}/${entry.name}`:entry.name;
      if(entry.isDirectory())files.push(...await inventory(name));
      else if(entry.isFile())files.push(name);
      else throw Error('Release artifact contains a symlink or non-regular entry.');
    }
    return files;
  };
  // Compare generated output independently against the reviewed locked dependency
  // build, not just a self-reported manifest in dist. The rest of ORBIT stays native.
  const sdk=await build({...sdkBuildOptions(root,outdir),write:false});
  if(!Buffer.from(sdk.outputFiles[0].contents).equals(await readFile(path.join(outdir,'src/cloud/client.js'))))
    throw Error('Release SDK bundle differs from the reviewed source and installed locked dependency build.');
  const editor=await build({...editorBuildOptions(root,outdir),write:false});
  const generated=new Map(editor.outputFiles.map(file=>[
    path.relative(outdir,file.path).split(path.sep).join('/'),Buffer.from(file.contents)]));
  if(!generated.has('src/excalidraw-island.js')||!generated.has('src/excalidraw-island.css'))
    throw Error('Release missing the lazy official editor JS/CSS bundle.');
  const fontRoot=path.join(root,'node_modules','@excalidraw','excalidraw','dist','prod','fonts');
  const fontNames=[];
  async function listFonts(directory=''){
    for(const entry of await readdir(path.join(fontRoot,directory),{withFileTypes:true})){
      const name=directory?directory+'/'+entry.name:entry.name;
      if(entry.isDirectory())await listFonts(name);
      else if(entry.isFile())fontNames.push(name);
      else throw Error('Excalidraw font package contains an unsupported filesystem entry.');
    }
  }
  await listFonts();
  if(!fontNames.some(name=>name.endsWith('.woff2')))
    throw Error('Release has no self-hosted Excalidraw web fonts.');
  const fontPrefix='assets/excalidraw/fonts/';
  const actual=(await inventory()).sort();
  const expected=['index.html','assets/orbit.svg','src/runtime-config.js','src/cloud/client.js',
    ...browserModules.map(f=>`src/${f}`),...generated.keys(),
    ...fontNames.map(name=>fontPrefix+name)].sort();
  if(JSON.stringify(actual)!==JSON.stringify(expected))
    throw Error('Release artifact contains missing or unexpected files.');
  const files=[];
  for(const name of actual){
    const bytes=await readFile(path.join(outdir,name));
    if(generated.has(name)){
      if(!bytes.equals(generated.get(name)))
        throw Error('Lazy official editor bundle differs from reviewed package build: '+name);
    }else if(name.startsWith(fontPrefix)){
      if(!bytes.equals(await readFile(path.join(fontRoot,name.slice(fontPrefix.length)))))
        throw Error('Self-hosted official editor font differs from locked package: '+name);
    }else if(!['src/runtime-config.js','src/cloud/client.js'].includes(name)){
      if(!bytes.equals(await readFile(path.join(root,name))))
        throw Error(`Release artifact differs from reviewed source: ${name}`);
    }
    files.push({path:name,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  return {version:pkg.version,mode:'protected-private',siteUrl:config.siteUrl,supabaseUrl:config.supabaseUrl,files};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())
      throw Error('Release verification requires a clean committed worktree.');
    const result=await verifyReleaseArtifact();
    const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
    console.log(JSON.stringify({commit,...result},null,2));
  }catch(error){console.error(`NO-GO: ${error.message}`);process.exitCode=1;}
}
