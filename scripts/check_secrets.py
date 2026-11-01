"""Conservative static scan for common credential tokens (NOT a complete secret audit)."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
paths=[root/'index.html',root/'vercel.json',root/'.env.example',
       *(root/'src').rglob('*.js'),*(root/'scripts').glob('*.mjs'),
       *(root/'.github').rglob('*.yml')]
patterns=[
 ('Supabase service role JWT',r'eyJ[a-zA-Z0-9_-]{150,}\.eyJ[a-zA-Z0-9_-]{40,}\.[a-zA-Z0-9_-]{40,}'),
 ('OpenAI API key',r'sk-(?:proj-)?[A-Za-z0-9_-]{25,}'),
 ('GitHub token',r'gh[pousr]_[a-zA-Z0-9]{30,}'),
 ('AWS access key',r'AKIA[0-9A-Z]{16}'),
 ('Supabase secret key',r'sb_secret_[A-Za-z0-9_-]{12,}'),
]
found=[]
for p in paths:
 s=p.read_text(errors='replace')
 for title,expr in patterns:
  if re.search(expr,s):found.append((p.relative_to(root).as_posix(),title))
if found:
 for file,pattern in found:print(f'POTENTIAL SECRET {file}: {pattern} (value withheld)')
 raise SystemExit(1)
print(f'PASS: No signatures of common credentials in {len(paths)} reviewed browser/build/CI files. Not a substitute for human review.')
