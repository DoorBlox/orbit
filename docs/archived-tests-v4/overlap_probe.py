from pathlib import Path
from playwright.sync_api import sync_playwright
import shutil
html=(Path(__file__).parents[1]/'ORBIT_Offline_Preview.html').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-sandbox']);page=b.new_page(viewport={'width':1440,'height':900})
 page.set_content(html);page.wait_for_timeout(700)
 data=page.evaluate('''()=>{const out=[];for(const s of document.querySelectorAll('.task-stack')){const p=document.querySelector('.graph-node[data-id="'+s.dataset.branchId+'"]');if(!p)continue;const a=s.getBoundingClientRect(),b=p.getBoundingClientRect();let area=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));if(area>0)out.push({id:s.dataset.branchId,area:+area.toFixed(2)});}return out;}''')
 print('Task stack vs parent screen intersections',data)
 b.close()
