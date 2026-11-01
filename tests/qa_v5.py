from pathlib import Path
import shutil, json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'ORBIT_Offline_Preview.html').read_text(encoding='utf-8')
MOCK="""() => { const bag=new Map(); Object.defineProperty(window, 'localStorage', {configurable:true,value:{getItem(k){return bag.get(k)??null},setItem(k,v){bag.set(k,String(v));},removeItem(k){bag.delete(k);}}});window.__orbitBag=bag;}"""

def main():
 (ROOT/'qa').mkdir(exist_ok=True)
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox'],executable_path=shutil.which('chromium'))
  for label,w,h,mobile in [('desktop',1440,900,False),('tablet',900,1100,True),('phone',390,844,True),('small',320,700,True),('landscape',844,390,True)]:
   ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile,accept_downloads=True)
   page=ctx.new_page();page.set_default_timeout(8000);errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
   page.evaluate(MOCK)
   page.set_content(HTML);page.wait_for_timeout(1100)
   data=page.evaluate('window.orbitDebug?.state')
   print('INIT',label,'errors',errors,'state',data,'map?',page.locator('.node-branch').count(),flush=True)
   assert not errors,(label,errors)
   assert data and data['tasks']>=20 and data['journalPages']==1
   assert page.locator('.spatial-world > .spatial-item').count()==6
   assert page.locator('.node-branch').count()>20
   assert page.locator('#journal-editor').get_attribute('contenteditable')=='true'
   assert page.locator('.space-point').count()==6
   assert page.locator('.task-row').count()>=20
   page.screenshot(path=str(ROOT/'qa'/f'v5-{label}-home.png'))
   # Can fly to the journal from a tiny spatial map, without switching pages
   (page.locator('#space-nav-toggle').click() if w<=700 else None);page.locator('.space-point-journal').click()
   page.wait_for_timeout(600)
   page.screenshot(path=str(ROOT/'qa'/f'v5-{label}-journal.png'))
   # editor can be focused and used on all viewports (programmatic DOM input for scaled canvas)
   if label=='desktop':
    # change widget location using drag handle
    page.locator('.space-point-active').click();page.wait_for_timeout(620)
    before=page.locator('#active-widget').evaluate("e=>({left:parseFloat(e.style.left),top:parseFloat(e.style.top)})")
    grip=page.locator('#active-widget .widget-grip');box=grip.bounding_box()
    page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
    page.mouse.down();page.mouse.move(box['x']+box['width']/2+80,box['y']+box['height']/2-32,steps=6);page.mouse.up();page.wait_for_timeout(130)
    after=page.locator('#active-widget').evaluate("e=>({left:parseFloat(e.style.left),top:parseFloat(e.style.top)})")
    print('DRAG',before,after)
    assert after!=before,(before,after)
    # journal autosaves markup. Does not render markdown syntax in normal mode.
    (page.locator('#space-nav-toggle').click() if w<=700 else None);page.locator('.space-point-journal').click();page.wait_for_timeout(620)
    editor=page.locator('#journal-editor');editor.click()
    editor.fill('hello from a peaceful evening')
    page.locator('#journal-entry-title').fill('A little moment')
    page.wait_for_timeout(780)
    assert page.evaluate("JSON.parse(window.__orbitBag.get('orbit.v5.journal'))[0].title")=='A little moment'
    page.locator('#journal-new').click()
    assert page.evaluate('window.orbitDebug.state.journalPages')==2
    page.locator('#journal-prev').click()
    assert page.locator('#journal-entry-title').input_value()=='A little moment'
    with page.expect_download() as dl:page.locator('#journal-export').click()
    path=ROOT/'qa'/'journal-test.md';dl.value.save_as(path)
    assert 'hello from a peaceful evening' in path.read_text();path.unlink()
    with page.expect_download() as dl:page.locator('#backup-json').evaluate('e=>e.click()')
    path=ROOT/'qa'/'backup-test.json';dl.value.save_as(path)
    backup=json.loads(path.read_text());path.unlink()
    assert backup['version']>=5 and len(backup['journalEntries'])==2 and backup['spatialLayout']['active']['x']!=before['left']
    page.locator('#journal-delete').click();assert page.evaluate('window.orbitDebug.state.journalPages')==1
    page.locator('#toast .toast-action').click();assert page.evaluate('window.orbitDebug.state.journalPages')==2
    # completed task leaves constellation and persists in separate widget
    count=page.locator('.task-row').count()
    page.locator('.rail-check').first.evaluate('e=>e.click()');page.wait_for_timeout(150)
    assert page.locator('.task-row').count()==count-1
    # fullscreen is a genuine viewport overlay despite its normal transformed parent
    page.locator('#map-fullscreen').evaluate('e=>e.click()');page.wait_for_timeout(260)
    assert page.evaluate('document.body.classList.contains("map-immersive")')
    assert page.locator('#constellation-widget').evaluate('e=>e.parentElement.id')=='app'
    page.keyboard.press('Escape')
    assert page.locator('#constellation-widget').evaluate('e=>e.parentElement.id')=='spatial-world'
    print('DESKTOP INTERACTION PASS',flush=True)
   if label=='phone':
    # zoomed to journal and usable via its own controls
    editor=page.locator('#journal-editor');editor.fill('this is written on a phone');page.wait_for_timeout(630)
    assert 'this is written on a phone' in page.evaluate("JSON.parse(window.__orbitBag.get('orbit.v5.journal'))[0].html")
    (page.locator('#space-nav-toggle').click() if w<=700 else None);page.locator('.space-point-constellation').click();page.wait_for_timeout(620)
    scale=page.evaluate('window.orbitDebug.state.boardScale');assert scale>.65,scale
    old=page.evaluate('window.orbitDebug.state.camera.scale')
    page.locator('.overview-label[data-branch-id="learning"]').click(force=True);page.wait_for_timeout(530)
    after=page.evaluate('window.orbitDebug.state.camera.scale');assert after>old,(old,after)
    page.screenshot(path=str(ROOT/'qa'/'v5-phone-constellation.png'))
    print('MOBILE INTERACTIONS PASS',flush=True)
   ctx.close();print('PASS',label,flush=True)
  browser.close()

if __name__=='__main__':main()
