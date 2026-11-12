import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {assertNativeModuleClosure,browserModules} from '../scripts/build.mjs';

test('BR-01: the public source allowlist retains the private Jump module',()=>{
  assert.ok(browserModules.includes('quick-jump.js'),'Native browser entry cannot import an unshipped module');
});

test('BP-16: release graph validation fails closed on absent native imports',async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'orbit-native-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const src=path.join(dir,'src');
  await mkdir(src);
  const entry=path.join(src,'bootstrap.js');
  await writeFile(entry,"import './missing.js'; export const ok=true;\n");
  await assert.rejects(assertNativeModuleClosure(dir),/Incomplete native browser distribution.*missing\.js/s);
  await writeFile(path.join(src,'missing.js'),'export const bundled=true;\n');
  await assert.doesNotReject(assertNativeModuleClosure(dir));
});
