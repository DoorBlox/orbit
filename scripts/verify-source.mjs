import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const manifest=JSON.parse(await readFile('docs/reference/V6_SOURCE_MANIFEST.json','utf8'));
const original=manifest.preserved_unchanged;
if(!Array.isArray(original)||original.length<10)throw new Error('Source manifest is incomplete');
for(const file of original){
  const bytes=await readFile(file);
  const digest=createHash('sha256').update(bytes).digest('hex');
  if(digest!==manifest.hashes[file])throw new Error(`Original V6 source hash changed: ${file}`);
}
console.log(`Original V6 preserved source hashes verified: ${original.length} files.`);
