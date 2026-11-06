from pathlib import Path
import shutil,json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'ORBIT_Offline_Preview.html').read_text()
mock="""() => {const bag=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return bag.get(k)??null},setItem(k,v){bag.set(k,String(v))},removeItem(k){bag.delete(k)}}});window.__bag=bag;}"""
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'],executable_path=shutil.which('chromium'))
 context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
 page=context.new_page();page.evaluate(mock);page.set_content(html);page.wait_for_timeout(700)
 page.evaluate('window.orbitDebug.board.fitAll()');page.wait_for_timeout(700)
 page.screenshot(path=str(ROOT/'qa'/'v5-whole-world.png'))
 # check default widget overlap in WORLD coordinates; layout remains individually editable
 recs=page.evaluate('''()=>[...document.querySelectorAll('.spatial-world > .spatial-item')].map(e=>({id:e.id,x:parseFloat(e.style.left),y:parseFloat(e.style.top),w:e.offsetWidth,h:e.offsetHeight}))''')
 pairs=[]
 for i,a in enumerate(recs):
  for b in recs[i+1:]:
   if min(a['x']+a['w'],b['x']+b['w'])>max(a['x'],b['x']) and min(a['y']+a['h'],b['y']+b['h'])>max(a['y'],b['y']):pairs.append((a['id'],b['id']))
 print('world widgets',recs,'overlaps',pairs)
 assert not pairs,pairs
 # Save complex journal, backup, then restore using actual file input and action
 page.evaluate("window.orbitDebug.journal.replaceEntries([{id:'one',date:new Date().toISOString(),title:'Original title',html:'<p><strong>Saved text</strong></p>'}])")
 with page.expect_download() as dl:page.locator('#backup-json').evaluate('e=>e.click()')
 backup_path=ROOT/'qa'/'temp-backup.json';dl.value.save_as(backup_path)
 data=json.loads(backup_path.read_text());assert data['journalEntries'][0]['title']=='Original title'
 page.evaluate("window.orbitDebug.journal.replaceEntries([{id:'two',date:new Date().toISOString(),title:'Different title',html:'<p>Changed</p>'}])")
 page.locator('#csv-file').set_input_files(str(backup_path))
 page.wait_for_timeout(70)
 assert page.locator('.toast-action').inner_text()=='Restore'
 page.locator('.toast-action').click()
 assert page.evaluate('window.orbitDebug.journal.entries[0].title')=='Original title'
 assert 'Saved text' in page.locator('#journal-editor').inner_text()
 # Verify sanitized restore strips active payloads
 page.evaluate('''()=>window.orbitDebug.journal.replaceEntries([{id:'unsafe',date:new Date().toISOString(),title:'test',html:'<p onclick="alert(1)">Safe</p><img src=x onerror="alert(2)"><script>alert(3)</script>'}])''')
 restored=page.locator('#journal-editor').inner_html().lower();assert 'onclick' not in restored and 'img' not in restored and 'script' not in restored
 backup_path.unlink()
 print('RESTORE + SANITIZATION PASS')
 context.close();browser.close()
