import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, symlink, writeFile, appendFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('integrity gate accepts reviewed bytes and rejects changed, extra and provenance files',async()=>{
  const root=process.cwd(),folder=await mkdtemp(path.join(tmpdir(),'orbit-integrity-'));
  const check=()=>execFileSync(process.execPath,[path.join(root,'scripts/verify-source.mjs')],{cwd:folder,stdio:'pipe'});
  try{
    await mkdir(path.join(folder,'docs/reference'),{recursive:true});
    for(const file of ['index.html','src','assets','docs/reference/V6_SOURCE_MANIFEST.json','docs/reference/M1_SOURCE_MANIFEST.json'])
      await cp(path.join(root,file),path.join(folder,file),{recursive:true});
    await symlink(path.join(root,'.git'),path.join(folder,'.git'));
    assert.match(check().toString(),/immutable V6 provenance/);
    await appendFile(path.join(folder,'src/app.js'),'\n// unreviewed change\n');
    assert.throws(check,/Unreviewed source change/);
    await cp(path.join(root,'src/app.js'),path.join(folder,'src/app.js'));
    await writeFile(path.join(folder,'src/unexpected.js'),'export const unexpected=true;');
    assert.throws(check,/inventory differs/);
    await rm(path.join(folder,'src/unexpected.js'));
    await appendFile(path.join(folder,'docs/reference/V6_SOURCE_MANIFEST.json'),'\n');
    assert.throws(check,/Original V6 manifest changed/);
  }finally{await rm(folder,{recursive:true,force:true});}
});
