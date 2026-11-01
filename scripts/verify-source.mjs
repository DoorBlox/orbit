import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const baseline='06f8039c724dd653a4bb8b84f7384d86d1ad90eb';
const originalPath='docs/reference/V6_SOURCE_MANIFEST.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const gitFile=file=>execFileSync('git',['show',`${baseline}:${file}`],{maxBuffer:16*1024*1024});
const originalBytes=await readFile(originalPath);
if(!originalBytes.equals(gitFile(originalPath)))throw Error('Original V6 manifest changed.');
const original=JSON.parse(originalBytes);
for(const file of original.preserved_unchanged){
  if(sha(gitFile(file))!==original.hashes[file])throw Error(`Original provenance mismatch: ${file}`);
}
async function inventory(dir){
  const files=[];
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const name=`${dir}/${entry.name}`;
    if(entry.isDirectory())files.push(...await inventory(name));
    else if(entry.isFile())files.push(name);
    else throw Error(`Unexpected non-regular source entry: ${name}`);
  }
  return files;
}
const files=['index.html',...await inventory('src'),...await inventory('assets')].sort();
const current=JSON.parse(await readFile('docs/reference/M1_SOURCE_MANIFEST.json','utf8'));
if(current.baselineCommit!==baseline||JSON.stringify(files)!==JSON.stringify(Object.keys(current.files).sort()))throw Error('M1 source inventory differs from reviewed manifest.');
for(const file of files){
  const entry=current.files[file];
  if(!entry.reason||sha(await readFile(file))!==entry.sha256)throw Error(`Unreviewed source change: ${file}`);
}
console.log(`PASS: immutable V6 provenance (${original.preserved_unchanged.length} Git blobs) and reviewed M1 source (${files.length} files).`);
