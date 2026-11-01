from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'ORBIT_Offline_Preview.html').read_text(encoding='utf-8')
mock='''() => {const bag=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return bag.get(k)??null},setItem(k,v){bag.set(k,String(v));},removeItem(k){bag.delete(k);}}});window.__bag=bag;}'''
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox'],executable_path=shutil.which('chromium'))
 ctx=b.new_context(viewport={'width':1440,'height':900})
 page=ctx.new_page();page.evaluate(mock);page.set_content(html);page.wait_for_timeout(550)
 page.evaluate('''()=>window.orbitDebug.journal.replaceEntries([
    {id:'demo-page-1',date:'2026-11-03',title:'The little things',html:'<p>A quiet afternoon. Some thoughts worth remembering.</p>'},
    {id:'demo-page-2',date:'2026-11-18',title:'Another chapter',html:'<p>Today was about noticing the things that matter.</p>'}
  ])''')
 page.locator('#timeline-add').evaluate('e=>e.click()')
 page.locator('#milestone-title').fill('A meaningful milestone')
 page.locator('#milestone-date').fill('2026-11-14')
 page.locator('#milestone-form button[type=submit]').evaluate('e=>e.click()')
 page.evaluate("window.orbitDebug.board.focus('timeline',{initial:true})")
 page.wait_for_timeout(160)
 page.evaluate("document.getElementById('toast').classList.remove('show')")
 page.screenshot(path=str(root/'qa'/'v6-clean-timeline.png'))
 page.evaluate("window.orbitDebug.board.focus('journal',{initial:true})")
 page.wait_for_timeout(150)
 page.screenshot(path=str(root/'qa'/'v6-clean-journal.png'))
 page.evaluate('window.orbitDebug.board.fitAll()');page.wait_for_timeout(680)
 page.screenshot(path=str(root/'qa'/'v6-clean-overview.png'))
 ctx.close();b.close()
