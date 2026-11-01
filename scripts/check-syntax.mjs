import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const roots = ['src', 'scripts', 'tests'];
const all = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes:true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (/\.(m?js)$/.test(entry.name)) all.push(absolute);
  }
}
for (const root of roots) await walk(root);
for (const file of all) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding:'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || `Syntax check failed: ${file}\n`);
    process.exit(result.status || 1);
  }
}
console.log(`JavaScript syntax verified: ${all.length} files (not a full semantic linter).`);
