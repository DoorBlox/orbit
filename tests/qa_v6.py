from pathlib import Path
from playwright.sync_api import sync_playwright
import shutil, json
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'ORBIT_Offline_Preview.html').read_text(encoding='utf-8')
MOCK='''() => {const bag=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return bag.get(k)??null},setItem(k,v){bag.set(k,String(v));},removeItem(k){bag.delete(k);}}});window.__orbitBag=bag;}'''
def within(el,par):
 return el['y']>=par['y']-1 and el['y']+el['height']<=par['y']+par['height']+1

def main():
 (ROOT/'qa').mkdir(exist_ok=True)
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox'],executable_path=shutil.which('chromium'))
  for label,w,h,mobile in [('desktop',1440,900,False),('tablet',900,1100,True),('phone',390,844,True),('small',320,700,True),('landscape',844,390,True)]:
   ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile,accept_downloads=True)
   page=ctx.new_page();page.set_default_timeout(10000);errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
   page.evaluate(MOCK);page.set_content(HTML);page.wait_for_timeout(650)
   print('START',label,page.evaluate('window.orbitDebug?.state'),'errors',errors,flush=True)
   assert not errors,errors
   assert page.locator('.widget-resizer').count()==6
   assert page.locator('#journal-entry-date').input_value()
   # Inspect the timeline in view without World scale distortion.
   page.evaluate("window.orbitDebug.board.focus('timeline',{initial:true})")
   page.wait_for_timeout(140)
   if label=='desktop':
    page.locator('#timeline-add').click()
    page.locator('#milestone-title').fill('A meaningful milestone')
    page.locator('#milestone-date').fill('2026-11-14')
    page.locator('#milestone-form button[type=submit]').click()
    milestone=page.locator('.timeline-milestone').first
    assert milestone.count()>0,'Expected demo milestones'
    outer=page.locator('#timeline-scroll').bounding_box();rect=milestone.bounding_box();
    print('MILESTONE',rect,outer,'visible',within(rect,outer),flush=True)
    assert within(rect,outer),'Milestone clipped vertically'
    # Drag the empty title (not the grip), like a normal window.
    heading=page.locator('#timeline-widget .widget-heading');r=heading.bounding_box();before=page.locator('#timeline-widget').evaluate('e=>({x:parseFloat(e.style.left),y:parseFloat(e.style.top)})')
    startx=r['x']+220;starty=r['y']+14
    page.mouse.move(startx,starty);page.mouse.down();page.mouse.move(startx+85,starty+42,steps=6);page.mouse.up();page.wait_for_timeout(100)
    after=page.locator('#timeline-widget').evaluate('e=>({x:parseFloat(e.style.left),y:parseFloat(e.style.top)})');print('HEADER DRAG',before,after,flush=True)
    assert after!=before
    # Resize via pointer and ensure the persisted backup contains new dimensions.
    grip=page.locator('#timeline-widget .widget-resizer');r=grip.bounding_box()
    initial=page.locator('#timeline-widget').evaluate('e=>({w:e.offsetWidth,h:e.offsetHeight})')
    page.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);page.mouse.down()
    page.mouse.move(r['x']+r['width']/2+145,r['y']+r['height']/2+100,steps=8);page.mouse.up()
    final=page.locator('#timeline-widget').evaluate('e=>({w:e.offsetWidth,h:e.offsetHeight})');print('RESIZE',initial,final,flush=True)
    assert final['w']>initial['w']+30 and final['h']>initial['h']+30
    grip.focus();page.keyboard.press('ArrowRight');page.keyboard.press('ArrowDown')
    after_kb=page.locator('#timeline-widget').evaluate('e=>({w:e.offsetWidth,h:e.offsetHeight})')
    assert after_kb['w']>final['w'] and after_kb['h']>final['h']
    # A second widget is independently resizable; changes must not affect the timeline.
    page.evaluate("window.orbitDebug.board.focus('active',{initial:true})")
    active_grip=page.locator('#active-widget .widget-resizer')
    active_grip.focus();before_active=page.locator('#active-widget').evaluate('e=>e.offsetWidth')
    page.keyboard.press('ArrowRight')
    assert page.locator('#active-widget').evaluate('e=>e.offsetWidth')>before_active
    page.evaluate("window.orbitDebug.board.focus('timeline',{initial:true})")
    # Add two journal entries on different dates and ensure the markers are both visible.
    page.evaluate('''()=>window.orbitDebug.journal.replaceEntries([
      {id:'spring',date:'2026-11-05',title:'A Thursday to remember',html:'<p>Sunlight on paper.</p>'},
      {id:'winter',date:'2026-11-16',title:'Another day',html:'<p>More thoughts.</p>'}])''')
    assert page.locator('.timeline-journal').count()==2
    for btn in page.locator('.timeline-journal').all():
      rect=btn.bounding_box();outer=page.locator('#timeline-scroll').bounding_box();assert within(rect,outer),(rect,outer)
    # Input date change updates marker date without affecting the body.
    page.evaluate("window.orbitDebug.board.focus('journal',{initial:true})");page.wait_for_timeout(120)
    date_input=page.locator('#journal-entry-date');assert date_input.input_value()=='2026-11-16'
    date_input.fill('2026-11-18');date_input.dispatch_event('change');page.wait_for_timeout(150)
    assert page.evaluate("window.orbitDebug.journal.entries[1].date")=='2026-11-18'
    assert 'More thoughts.' in page.locator('#journal-editor').inner_text()
    assert page.locator('.timeline-journal').count()==2
    assert any('2026-11-18' in el.get_attribute('aria-label') for el in page.locator('.timeline-journal').all())
    # Timeline marker opens correct journal page and flies to its widget.
    page.evaluate("window.orbitDebug.board.focus('timeline',{initial:true})")
    target=page.locator('.timeline-journal[aria-label*="2026-11-05"]');target.click()
    assert page.locator('#journal-entry-title').input_value()=='A Thursday to remember'
    with page.expect_download() as dl:page.locator('#backup-json').evaluate('el=>el.click()')
    dest=ROOT/'qa'/'temp-v6-backup.json';dl.value.save_as(dest);backup=json.loads(dest.read_text())
    assert backup['version']==6 and len(backup['journalEntries'])==2
    assert backup['spatialLayout']['timeline']['width']>initial['w']
    assert backup['spatialLayout']['timeline']['height']>initial['h']
    assert backup['spatialLayout']['active']['width']>386
    assert backup['journalEntries'][1]['date']=='2026-11-18'
    # Restore old/default layout first, then import to verify actual dimension restore.
    page.evaluate('''()=>{const layout=window.orbitDebug.board.getLayout();delete layout.timeline.width;delete layout.timeline.height;window.orbitDebug.board.setLayout(layout);}''')
    page.evaluate("window.orbitDebug.journal.replaceEntries([{id:'temporary',date:'2026-11-25',title:'Temporary',html:'<p>changed</p>'}])")
    page.locator('#csv-file').set_input_files(str(dest))
    page.wait_for_timeout(80);page.locator('#toast .toast-action').click()
    assert page.evaluate("window.orbitDebug.journal.entries[1].date")=='2026-11-18'
    assert page.locator('#timeline-widget').evaluate('e=>e.offsetWidth')>initial['w']
    assert page.locator('#timeline-widget').evaluate('e=>e.offsetHeight')>initial['h']
    dest.unlink()
    # Dates are based on Asia/Jakarta civil days, including V5 ISO timestamps.
    page.evaluate("window.orbitDebug.journal.replaceEntries([{id:'iso',date:'2026-11-01T20:30:00.000Z',title:'Migrated',html:'<p>Old entry</p>'}])")
    assert page.locator('#journal-entry-date').input_value()=='2026-11-02'
    page.evaluate('''()=>window.orbitDebug.journal.replaceEntries([
      {id:'same1',date:'2026-11-12',title:'First page',html:'<p>One</p>'},
      {id:'same2',date:'2026-11-12',title:'Second page',html:'<p>Two</p>'}])''')
    assert page.locator('.timeline-journal').count()==1
    assert '2 pages' in page.locator('.timeline-journal').first.get_attribute('aria-label')
    # Return demonstration state to show distinct dates in final timeline screenshot.
    page.evaluate('''()=>window.orbitDebug.journal.replaceEntries([
      {id:'spring',date:'2026-11-05',title:'A Thursday to remember',html:'<p>Sunlight on paper.</p>'},
      {id:'winter',date:'2026-11-18',title:'Another day',html:'<p>More thoughts.</p>'}])''')
    page.evaluate("window.orbitDebug.board.focus('timeline',{initial:true})")
    page.wait_for_timeout(200);page.screenshot(path=str(ROOT/'qa'/'v6-timeline-with-pages.png'))
    page.evaluate("window.orbitDebug.board.focus('journal',{initial:true})")
    page.wait_for_timeout(200);page.screenshot(path=str(ROOT/'qa'/'v6-journal-date.png'))
    print('DESKTOP INTERACTION PASS',flush=True)
   if label=='phone':
    assert not page.locator('#space-nav-map').is_visible()
    page.locator('#space-nav-toggle').click()
    assert page.locator('#space-nav-map').is_visible()
    page.locator('#space-nav-toggle').click()
    assert not page.locator('#space-nav-map').is_visible()
    assert page.locator('.timeline-journal').count()==0 # blank page is not a dated memory
    page.evaluate("window.orbitDebug.board.focus('journal',{initial:true})");page.wait_for_timeout(100)
    page.locator('#journal-entry-date').fill('2026-11-11')
    page.locator('#journal-entry-date').dispatch_event('change')
    page.locator('#journal-editor').fill('Today I explored a spatial scrapbook')
    page.wait_for_timeout(700)
    assert page.locator('.timeline-journal').count()==1
    page.evaluate("window.orbitDebug.board.focus('timeline',{initial:true})")
    page.wait_for_timeout(150)
    journalbutton=page.locator('.timeline-journal').first
    assert within(journalbutton.bounding_box(),page.locator('#timeline-scroll').bounding_box())
    journalbutton.click()
    page.wait_for_timeout(650)
    assert page.locator('#journal-entry-date').input_value()=='2026-11-11'
    page.screenshot(path=str(ROOT/'qa'/'v6-phone-journal.png'))
    print('PHONE FLOW PASS',flush=True)
   if label in ['desktop','phone']:
    page.evaluate('window.orbitDebug.board.fitAll()');page.wait_for_timeout(600)
    page.screenshot(path=str(ROOT/'qa'/f'v6-{label}-world.png'))
   assert not errors,(label,errors)
   ctx.close();print('PASS',label,flush=True)
  browser.close()
if __name__=='__main__':main()
