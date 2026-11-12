import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateBackup} from '../src/backup.js';
import {createPortableArchive,inspectPortableArchive} from '../src/cloud/portable-backup.js';
import {
  ORBIT_VERSION_IDENTITIES as V,assertPackageLockAgreement,
  isArtifactPackageVersion,assertBackupVersionPair,
} from '../scripts/version-contract.mjs';

const fixture=(version=V.snapshotCurrent)=>({
  format:V.snapshotFormat,version,
  branches:[{id:'inbox',parentId:'root',label:'Unsorted'}],
  tasks:[],preferences:{colorMode:'deadline'},milestones:[],
});
const pkgFiles=async()=>Promise.all(
  ['package.json','package-lock.json'].map(async file=>
    JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'))));

test('BP-00 source/lock identities are deliberately not application or backup versions',async()=>{
  const [pkg,lock]=await pkgFiles();
  assert.deepEqual(assertPackageLockAgreement(pkg,lock),{
    packageName:'orbit-spatial-scrapbook-prototype',artifactVersion:'1.0.0',
  });
  assert.equal(V.appRelease,'2.4');
  assert.equal(V.snapshotCurrent,6);
  assert.deepEqual(V.snapshotAccepted,[5,6]);
  assert.equal(V.portableArchive,1);
  assert.equal(V.productionTargetSchema,1);
  assert.equal(isArtifactPackageVersion('1.0.0'),true);
  assert.equal(isArtifactPackageVersion('2.4'),false);
  assert.equal(isArtifactPackageVersion(6),false);
  assert.equal(isArtifactPackageVersion(1),false);
});

test('BP-00 rejects top-level/root lock drift, accidental package bumps and dependency mismatch',async()=>{
  const [pkg,lock]=await pkgFiles();
  const corrupt=[
    [ {...pkg,version:'2.4'}, lock ],
    [ pkg, {...lock,version:'2.4'} ],
    [ pkg, {...lock,packages:{...lock.packages,'':{
      ...lock.packages[''],version:'2.4',
    }}} ],
    [ pkg, {...lock,packages:{...lock.packages,'':{
      ...lock.packages[''],dependencies:{...lock.packages[''].dependencies,react:'0.0.0'},
    }}} ],
    [ {...pkg,private:false}, lock ],
    [ {...pkg,name:'wrong-package'}, lock ],
    [ pkg, {...lock,lockfileVersion:2} ],
  ];
  for(const [a,b] of corrupt)
    assert.throws(()=>assertPackageLockAgreement(a,b),/BP-00 VERSION NO-GO/);
});

test('BP-00 legacy V5 import remains compatible; new workspace export is V6',()=>{
  for(const version of V.snapshotAccepted){
    const clean=validateBackup(fixture(version));
    assert.equal(clean.version,version);
    assert.equal(clean.format,V.snapshotFormat);
  }
  for(const version of [1,2,4,7,'6']){
    assert.throws(()=>validateBackup(fixture(version)),/Unsupported ORBIT backup version/);
  }
});

test('BP-00 portable archive V1 wraps workspace V6 without confusing them with npm release',async()=>{
  const snapshot=fixture(),ownerId='11111111-1111-4111-8111-111111111111';
  const archive=await createPortableArchive(snapshot,{
    ownerId,download:async()=>{throw Error('No private media should be fetched');},
    sanitizeHtml:s=>s,
  });
  assert.deepEqual(assertBackupVersionPair(snapshot,archive),
    {snapshotVersion:6,portableArchiveVersion:1});
  assert.equal(archive.manifest.assetCount,0);
  const inspection=await inspectPortableArchive(archive,{sanitizeHtml:s=>s});
  assert.equal(inspection.snapshot.version,6);
  assert.equal(inspection.files.length,0);
  for(const mutation of [
    {...archive,version:6},
    {...archive,format:'orbit-backup'},
    {...archive,snapshot:{...archive.snapshot,version:5}},
  ]) assert.throws(()=>assertBackupVersionPair(snapshot,mutation),/BP-00 VERSION NO-GO/);
  await assert.rejects(inspectPortableArchive({...archive,version:6},{sanitizeHtml:s=>s}),
    /Unsupported ORBIT portable backup/);
});
