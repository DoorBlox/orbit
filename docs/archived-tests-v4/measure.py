from playwright.sync_api import sync_playwright
import shutil
from pathlib import Path
s=(Path(__file__).parents[1]/'ORBIT_Offline_Preview.html').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-sandbox'])
 for w,h in [(1440,900),(390,844)]:
  pg=b.new_page(viewport={'width':w,'height':h});pg.set_content(s);pg.wait_for_timeout(500)
  print(w,pg.evaluate('''() => {let v=document.getElementById('map-viewport').getBoundingClientRect(), nodes=[...document.querySelectorAll('.graph-node,.task-stack')].map(e=>{const r=e.getBoundingClientRect();return {id:e.dataset.id||e.dataset.branchId, x:r.x,y:r.y,w:r.width,h:r.height}});return {camera:window.orbitDebug.state.camera,v:{x:v.x,y:v.y,w:v.width,h:v.height}, minx:Math.min(...nodes.map(n=>n.x)), maxx:Math.max(...nodes.map(n=>n.x+n.w)),miny:Math.min(...nodes.map(n=>n.y)),maxy:Math.max(...nodes.map(n=>n.y+n.h)),first:nodes.slice(0,2)}}'''))
 b.close()
