from pathlib import Path
import shutil, json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'ORBIT_Offline_Preview.html').read_text(encoding='utf8')
MOCK="""() => {const bag=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return bag.get(k)??null},setItem(k,v){bag.set(k,String(v))},removeItem(k){bag.delete(k)}}})} """

def main():
 (ROOT/'qa').mkdir(exist_ok=True)
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox'],executable_path=shutil.which('chromium'))
  for label,w,h,mobile in [('desktop',1440,900,False),('tablet',768,1024,True),('phone',390,844,True),('small',320,700,True),('landscape',844,390,True)]:
   ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile,accept_downloads=True)
   page=ctx.new_page();page.set_default_timeout(6500);errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
   page.evaluate(MOCK);page.set_content(HTML);page.wait_for_timeout(900)
   print('INIT',label,'errors',errors,'branches',page.locator('.node-branch').count(),'tasks',page.locator('.task-row').count(),'scrollH',page.evaluate('document.body.scrollHeight'),'scrollY',page.evaluate('window.scrollY'),flush=True)
   assert not errors,(label,errors)
   assert page.locator('.node-branch').count()>20
   assert page.locator('.task-row').count()>=20
   assert page.locator('#timeline-task-list').count()==0
   assert page.locator('.timeline-task').count()>10
   assert page.locator('.rail-task').count()>=20
   assert page.evaluate('document.body.scrollHeight')>h+350
   assert page.locator('.map-bottom-left').count()==0
   assert page.locator('.interaction-note').count()==0
   assert page.locator('.map-veil-label').count()==0
   assert page.evaluate('Math.abs(document.documentElement.scrollWidth-innerWidth)')<2
   page.screenshot(path=str(ROOT/'qa'/f'v4-{label}.png'))
   if label=='desktop':
    print('desktop tests... ',flush=True)
    assert page.locator('#timeline-widget').bounding_box()['y']<page.locator('#constellation-widget').bounding_box()['y']
    assert page.locator('#active-widget').bounding_box()['x']>page.locator('#constellation-widget').bounding_box()['x']
    # task completion removes the task from the map but keeps it in completed widget
    initial=page.locator('.task-row').count();page.locator('.rail-check').first.click();page.wait_for_timeout(200)
    assert page.locator('.task-row').count()==initial-1
    assert page.locator('#completed-count').inner_text()=='1'
    page.locator('.reopen-button').first.click();page.wait_for_timeout(200)
    assert page.locator('.task-row').count()==initial
    # timeline has adjustable zoom and milestones
    old=page.locator('#timeline-surface').evaluate('e=>e.clientWidth');page.locator('#timeline-zoom-in').click()
    assert page.locator('#timeline-surface').evaluate('e=>e.clientWidth')>old
    page.locator('#timeline-add').click();page.locator('#milestone-title').fill('Personal milestone');page.locator('#milestone-date').fill('2026-11-10');page.locator('#milestone-form button[type="submit"]').click()
    assert page.locator('.timeline-milestone').count()==1
    # Fullscreen mode is a distinct space and can close by Escape
    page.locator('#map-fullscreen').click();assert page.locator('body').evaluate('e=>e.classList.contains("map-immersive")')
    page.keyboard.press('Escape');assert not page.locator('body').evaluate('e=>e.classList.contains("map-immersive")')
    # export includes new milestones
    with page.expect_download() as dl:page.locator('#backup-json').click()
    path=ROOT/'qa'/'backup-test.json';dl.value.save_as(path);data=json.loads(path.read_text());path.unlink()
    assert data['version']==4 and data['milestones'][0]['title']=='Personal milestone'
    # task card expands in place after focus
    n=page.locator('.graph-node[data-id="administration"]');n.focus();n.press('Enter');page.wait_for_timeout(600)
    row=page.locator('.task-row').filter(has_text='Review a template');row.hover();page.wait_for_timeout(280)
    assert row.locator('.task-reveal').evaluate('e=>e.getBoundingClientRect().height')>20
    page.screenshot(path=str(ROOT/'qa'/'v4-desktop-focused.png'))
    print('DESKTOP INTERACTIONS PASS',flush=True)
   if label=='phone':
    # Fullscreen phone mode and capture remain accessible
    page.locator('#map-fullscreen').click()
    assert page.locator('#capture-form').is_visible()
    page.screenshot(path=str(ROOT/'qa'/'v4-phone-fullscreen.png'))
    page.locator('#map-fullscreen').click()
    initialScale=page.evaluate('window.orbitDebug.state.camera.scale')
    page.locator('.overview-label[data-branch-id="learning"]').click()
    page.wait_for_timeout(570)
    assert page.evaluate('window.orbitDebug.state.camera.scale')>initialScale
    n=page.locator('.graph-node[data-id="administration"]');n.focus();n.press('Enter');page.wait_for_timeout(570)
    row=page.locator('.task-row').filter(has_text='Review a template');row.click(force=True);page.wait_for_timeout(270)
    assert row.get_attribute('aria-expanded')=='true'
    page.screenshot(path=str(ROOT/'qa'/'v4-phone-focused.png'))
   ctx.close();print('PASS',label,flush=True)
  browser.close()

if __name__=='__main__':main()
