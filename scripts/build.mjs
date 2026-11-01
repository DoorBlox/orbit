import { cp, mkdir, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const dist = path.join(root, 'dist');
const originalModules = [
  'app.js','board.js','constellation.js','csv.js','data.js','journal.js',
  'layout.js','model.js','storage.js','widgets.js','styles.css'
];
await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist,'src'), { recursive: true });
await cp(path.join(root,'index.html'), path.join(dist,'index.html'));
await cp(path.join(root,'assets'), path.join(dist,'assets'), { recursive:true });
for(const file of originalModules) await cp(path.join(root,'src',file),path.join(dist,'src',file));
const index = await readFile(path.join(dist, 'index.html'), 'utf8');
for (const ref of ['./src/app.js', './src/styles.css']) {
  if (!index.includes(ref)) throw new Error(`Build missing original browser asset: ${ref}`);
}
console.log(`Build complete: original V6 index, ${originalModules.length} browser sources and assets only (cloud adapters excluded).`);
