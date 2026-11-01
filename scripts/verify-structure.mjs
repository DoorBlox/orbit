import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
const required = [
  'index.html', 'src/app.js', 'src/styles.css', 'src/board.js', 'src/journal.js',
  'src/constellation.js', 'src/model.js', 'src/data.js', 'src/storage.js',
  'src/cloud/mappers.js', 'src/cloud/client-config.js', 'package-lock.json',
  'README.md', 'AGENTS.md', 'CODEX_HANDOFF.md', 'CODEX_FIRST_TASK.md',
  'supabase/migrations/20261101140000_orbit_initial_schema.sql',
  'supabase/seed.sql', 'supabase/config.toml', 'dist/index.html',
  ...Array.from({ length:15 }, (_,i) => `docs/${String(i+1).padStart(2,'0')}-${[
    'PROJECT-OVERVIEW','EXISTING-FEATURE-AUDIT','PRD','MVP-GAP-ANALYSIS','UI-UX-DESIGN-SYSTEM',
    'SYSTEM-ARCHITECTURE','DATABASE-ERD','SUPABASE-INTEGRATION','API-CONTRACTS',
    'FRONTEND-BACKEND-MAPPING','GITHUB-SETUP','VERCEL-DEPLOYMENT',
    'SECURITY-AND-TESTING','CODEX-IMPLEMENTATION-ROADMAP','DECISIONS-AND-ASSUMPTIONS'
  ][i]}.md`)
];
for (const file of required) await access(path.resolve(file));
const envExample = await readFile('.env.example','utf8');
if (/^.*(?:SERVICE_ROLE|SECRET_KEY|DB_PASSWORD)=\S+/m.test(envExample)) throw new Error('Unexpected populated sensitive key in env example');
const distIndex=await readFile('dist/index.html','utf8');
if (!distIndex.includes('spatial-world') || !distIndex.includes('journal-editor')) throw new Error('Dist missing original prototype structure');
console.log(`Handoff structure verified: ${required.length} essential files.`);
