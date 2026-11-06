import { readFile, readdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export const V6_COMMIT='06f8039c724dd653a4bb8b84f7384d86d1ad90eb';
export const M1_COMMIT='846ad7df3fa3fdf4c63fd22f2830fed56f83a06e';
export const CURRENT_MANIFEST='docs/reference/M2_SOURCE_MANIFEST.json';
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const gitFile=(root,commit,file)=>{
  try{return execFileSync('git',['-C',root,'show',`${commit}:${file}`],{maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']});}
  catch{throw Error(`Required historical Git object unavailable: ${commit}:${file}. Use a full clone/fetch to verify provenance.`);}
};
export async function inventory(dir,root=process.cwd()){
  const files=[];
  for(const entry of await readdir(path.join(root,dir),{withFileTypes:true})){
    const name=`${dir}/${entry.name}`;
    if(entry.isDirectory())files.push(...await inventory(name,root));
    else if(entry.isFile())files.push(name);
    else throw Error(`Unexpected non-regular source entry: ${name}`);
  }
  return files;
}
export async function verifyProvenance(root=process.cwd()){
  const originalPath='docs/reference/V6_SOURCE_MANIFEST.json';
  const originalBytes=await readFile(path.join(root,originalPath));
  if(!originalBytes.equals(gitFile(root,V6_COMMIT,originalPath)))throw Error('Original V6 manifest changed.');
  const original=JSON.parse(originalBytes);
  for(const file of original.preserved_unchanged){
    if(sha(gitFile(root,V6_COMMIT,file))!==original.hashes[file])throw Error(`Original provenance mismatch: ${file}`);
  }
  const m1Path='docs/reference/M1_SOURCE_MANIFEST.json';
  const m1Bytes=await readFile(path.join(root,m1Path));
  if(!m1Bytes.equals(gitFile(root,M1_COMMIT,m1Path)))throw Error('Historical M1 manifest changed.');
  const m1=JSON.parse(m1Bytes);
  if(m1.baselineCommit!==V6_COMMIT||m1.milestone!=='M1')throw Error('Invalid historical M1 provenance.');
  for(const [file,entry]of Object.entries(m1.files)){
    if(!entry.reason||sha(gitFile(root,M1_COMMIT,file))!==entry.sha256)throw Error(`Historical M1 provenance mismatch: ${file}`);
  }
  return {original,m1};
}
export async function readCurrent(root=process.cwd()){
  const files=['index.html',...await inventory('src',root),...await inventory('assets',root)].sort();
  if(!(await lstat(path.join(root,'index.html'))).isFile())throw Error('index.html must be a regular source file.');
  const current=JSON.parse(await readFile(path.join(root,CURRENT_MANIFEST),'utf8'));
  if(current.baselineCommit!==M1_COMMIT||current.milestone!=='M2'||JSON.stringify(files)!==JSON.stringify(Object.keys(current.files).sort()))throw Error('M2 source inventory differs from reviewed manifest.');
  for(const entry of Object.values(current.files))if(typeof entry.reason!=='string'||!entry.reason.trim())throw Error('M2 source entries require explicit review reasons.');
  return current;
}
export async function verifySource(root=process.cwd()){
  const {original,m1}=await verifyProvenance(root);
  const current=await readCurrent(root);
  for(const [file,entry]of Object.entries(current.files)){
    if(!/^[a-f0-9]{64}$/.test(entry.sha256)||sha(await readFile(path.join(root,file)))!==entry.sha256)throw Error(`Unreviewed source change: ${file}`);
  }
  console.log(`PASS: immutable V6 provenance (${original.preserved_unchanged.length} Git blobs), historical M1 (${Object.keys(m1.files).length} Git blobs) and reviewed M2 source (${Object.keys(current.files).length} files).`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await verifySource();
