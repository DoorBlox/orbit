"""Static handoff integrity checks only; NOT a SQL parser or security audit.
Run: python scripts/validate_handoff.py
"""
from pathlib import Path
import re, json, hashlib, tomllib, zipfile
from urllib.parse import unquote
ROOT = Path(__file__).resolve().parents[1]
REQUIRED_DOCS=[
 '01-PROJECT-OVERVIEW','02-EXISTING-FEATURE-AUDIT','03-PRD',
 '04-MVP-GAP-ANALYSIS','05-UI-UX-DESIGN-SYSTEM','06-SYSTEM-ARCHITECTURE',
 '07-DATABASE-ERD','08-SUPABASE-INTEGRATION','09-API-CONTRACTS',
 '10-FRONTEND-BACKEND-MAPPING','11-GITHUB-SETUP','12-VERCEL-DEPLOYMENT',
 '13-SECURITY-AND-TESTING','14-CODEX-IMPLEMENTATION-ROADMAP',
 '15-DECISIONS-AND-ASSUMPTIONS'
]
for name in REQUIRED_DOCS:
 p=ROOT/'docs'/f'{name}.md'
 assert p.is_file() and p.stat().st_size>120,f'Missing/incomplete {p}'
for name in ['README.md','AGENTS.md','CODEX_HANDOFF.md','CODEX_FIRST_TASK.md',
             'package-lock.json','vercel.json','.github/workflows/quality.yml',
             'supabase/config.toml','supabase/seed.sql']:
 assert (ROOT/name).is_file(),f'Missing {name}'
for name in ['package.json','package-lock.json','vercel.json',
             'docs/reference/V6_SOURCE_MANIFEST.json']:
 json.loads((ROOT/name).read_text())
tomllib.loads((ROOT/'supabase/config.toml').read_text())
manifest=json.loads((ROOT/'docs/reference/V6_SOURCE_MANIFEST.json').read_text())
for filename in manifest['preserved_unchanged']:
 assert hashlib.sha256((ROOT/filename).read_bytes()).hexdigest()==manifest['hashes'][filename],filename
# Verify clickable relative Markdown paths in root/handoff docs (ignore inline code/wildcards).
missing=[]
for file in [ROOT/'README.md',ROOT/'CODEX_HANDOFF.md',ROOT/'CODEX_FIRST_TASK.md',
             *(ROOT/'docs'/f'{n}.md' for n in REQUIRED_DOCS)]:
 content=file.read_text()
 for href in re.findall(r'(?<!!)\[[^\]]+\]\(([^)]+)\)',content):
  href=href.strip().split(' ',1)[0].strip('"<>')
  if not href or href.startswith(('http:','https:','mailto:','#','data:','javascript:')):continue
  target=unquote(href.split('#',1)[0])
  if not target or ('{' in target or '*' in target):continue
  if not (file.parent/target).exists():missing.append((file.relative_to(ROOT).as_posix(),href))
assert not missing,f'Broken relative links: {missing[:12]}'
# SQL audit is only syntactic presence; local DB execution/owner isolation is a separate gate.
sql=(ROOT/'supabase/migrations/20261101140000_orbit_initial_schema.sql').read_text().lower()
for table in ('profiles','branches','tasks','journal_entries','milestones','widget_layouts','preferences'):
 assert re.search(r'create\s+table\s+public\.'+table+r'\s*\(',sql),table
 assert f'alter table public.{table} enable row level security' in sql,table
 for verb in ('select','insert','update','delete'):
  assert f'"{table}_{verb}_own"' in sql,(table,verb)
assert 'service_role' not in sql
print(f'PASS: {len(REQUIRED_DOCS)} handoff docs, relative Markdown links, 13 original source hashes, JSON/TOML, 7 tables/RLS policy declarations')
print('CAUTION: SQL syntax execution and real RLS/authorization behavior NOT tested by this script.')
