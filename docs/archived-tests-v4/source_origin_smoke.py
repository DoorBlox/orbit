"""HTTP-origin check for modular source (no mocked storage or bundled preview)."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil,threading
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox'],**({'executable_path':shutil.which('chromium')} if shutil.which('chromium') else {}))
  ctx=browser.new_context(viewport={'width':1280,'height':800})
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  resp=page.goto(url,wait_until='networkidle')
  assert resp.status==200 and page.locator('.task-row').count()>=20
  page.locator('#capture-name').fill('Persistence reload test')
  page.locator('#capture-form').press('Enter')
  assert 'Persistence reload test' in page.evaluate('localStorage.getItem("orbit.phase1.tasks.v1")')
  page.reload(wait_until='networkidle')
  assert page.locator('.task-row').filter(has_text='Persistence reload test').count()==1
  with page.expect_download() as download_info:
   page.locator('#export-csv').click()
  download=download_info.value
  assert download.suggested_filename.startswith('orbit-tasks-')
  assert not errors,errors
  print('PASS actual HTTP origin, ES modules, persistent localStorage, CSV export')
  ctx.close();browser.close()
finally: server.shutdown();server.server_close()
