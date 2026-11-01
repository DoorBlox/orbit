// Update current hashes only after reviewing the diff. New paths/reasons require an explicit manifest edit.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
if(!process.argv.includes('--reviewed'))throw Error('Review the source diff, then pass --reviewed explicitly.');
const file='docs/reference/M1_SOURCE_MANIFEST.json';
const manifest=JSON.parse(await readFile(file,'utf8'));
for(const [name,entry] of Object.entries(manifest.files)){
  if(!entry.reason)throw Error(`Missing reviewed reason: ${name}`);
  entry.sha256=createHash('sha256').update(await readFile(name)).digest('hex');
}
await writeFile(file,JSON.stringify(manifest,null,2)+'\n');
console.log('Updated reviewed current hashes only. Run npm run verify:source; original V6 manifest remains immutable.');
