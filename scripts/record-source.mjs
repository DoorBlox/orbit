// Review the source diff first. This records current M2 hashes only, never historical provenance.
import { readFile, writeFile } from 'node:fs/promises';
import { CURRENT_MANIFEST, sha, readCurrent, verifyProvenance } from './verify-source.mjs';
if(!process.argv.includes('--reviewed'))throw Error('Review the source diff, then pass --reviewed explicitly.');
await verifyProvenance();
const manifest=await readCurrent(); // New/deleted paths require an explicit manifest edit and reason.
for(const [name,entry]of Object.entries(manifest.files))entry.sha256=sha(await readFile(name));
await writeFile(CURRENT_MANIFEST,JSON.stringify(manifest,null,2)+'\n');
console.log('Recorded reviewed M2 hashes only. Original V6 and historical M1 manifests remain immutable. Run npm run verify:source.');
