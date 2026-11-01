"""HTTP delivery/security smoke for local dist server (no browser dependency)."""
import os,subprocess,time,urllib.error,urllib.request
from pathlib import Path
p=Path(__file__).resolve().parents[1]
port='4184'
base=f'http://127.0.0.1:{port}'
proc=subprocess.Popen(['node','scripts/dev-server.mjs','--dist'],cwd=p,env={**os.environ,'PORT':port},stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
try:
 for _ in range(50):
  try:
   with urllib.request.urlopen(base+'/',timeout=1) as res:assert res.status==200;break
  except (urllib.error.URLError,TimeoutError):time.sleep(.1)
 else:raise RuntimeError('HTTP server did not start')
 for path, expected_content in [('/',b'spatial-viewport'),('/src/app.js',b'journal'),('/src/styles.css',b'glass'),('/assets/orbit.svg',b'svg')]:
  with urllib.request.urlopen(base+path,timeout=2) as res:
   assert res.status==200
   assert expected_content in res.read(),path
 for path in ['/.env.example','/supabase/seed.sql','/docs/03-PRD.md','/package.json','/CODEX_HANDOFF.md']:
  try:urllib.request.urlopen(base+path,timeout=2)
  except urllib.error.HTTPError as err:assert err.code==404,(path,err.code)
  else:raise AssertionError(f'Unexpectedly exposed repository file: {path}')
 print('PASS: static dist HTTP response, JS/CSS/icon delivery, and repo path denylist')
finally:
 proc.terminate()
 try:proc.wait(timeout=5)
 except subprocess.TimeoutExpired:proc.kill()
 if proc.stdout:proc.stdout.close()
