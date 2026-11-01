"""Optional DOM-load smoke benchmark; not a frame-rate or device power benchmark."""
import json
import shutil
import time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'ORBIT_Offline_Preview.html').read_text(encoding='utf-8')
BRANCHES=json.loads((ROOT/'qa'/'perf-placeholder.json').read_text()) if (ROOT/'qa'/'perf-placeholder.json').exists() else None

def trial(page,qty):
 branches=['electromagnetism','coursework','atlas','writing','administration','class-life','people','play','just-make','communications','chores','wellbeing','inbox']
 tasks=[{'id':f'load-{i}', 'title':f'Action {i+1}: verify one small thing', 'projectId':branches[i%len(branches)],'status':'ready','dueDate':'','urgency':1+i%5,'criteria':'One clear, finished outcome'} for i in range(qty)]
 mock="""(payload)=>{const bag=new Map([['orbit.phase1.tasks.v1',JSON.stringify(payload)]]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return bag.get(k)??null},setItem(k,v){bag.set(k,String(v))},removeItem(k){bag.delete(k)}}})}"""
 page.evaluate(mock,tasks)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 start=time.monotonic();page.set_content(HTML,wait_until='domcontentloaded');page.wait_for_function(f'document.querySelectorAll(".task-row").length==={qty}',timeout=20000)
 elapsed=time.monotonic()-start
 visible=page.locator('.task-row').count()
 assert not errors,errors
 assert visible==qty
 print(f'QUANTITY {qty}: DOM created {visible} rows in {elapsed:.2f}s (headless browser; no device FPS claim)',flush=True)

if __name__=='__main__':
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-sandbox'])
  for count in [100,500,2000]:
   page=b.new_page(viewport={'width':1440,'height':900})
   trial(page,count);page.close()
  b.close()
