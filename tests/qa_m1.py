"""Synthetic real-origin regression suite. Run after npm run build.
Python Playwright + Chromium only; no app credentials or external services.
"""
import json
import os
import shutil
import subprocess
import time
import urllib.request
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa'
BASE = 'http://127.0.0.1:4196'
TASKS = 'orbit.phase1.tasks.v1'
JOURNAL = 'orbit.v5.journal'

@contextmanager
def server():
    proc = subprocess.Popen(['node','scripts/dev-server.mjs','--dist'], cwd=ROOT,
                            env={**os.environ,'PORT':'4196'},stdout=subprocess.DEVNULL)
    try:
        for _ in range(60):
            if proc.poll() is not None: raise RuntimeError('Local server exited')
            try:
                with urllib.request.urlopen(BASE, timeout=1) as response: assert response.status == 200
                break
            except OSError: time.sleep(.1)
        else: raise RuntimeError('Local server did not start')
        yield
    finally:
        proc.terminate()
        proc.wait(timeout=5)


def focus(page, name):
    # Scene positioning is setup only; assertions use live controls on actual origin.
    page.evaluate('(id)=>window.orbitDebug.board.focus(id,{initial:true})', name)


def open_page(browser, size=(1440,900), seed=None, **options):
    context = browser.new_context(viewport={'width':size[0],'height':size[1]},
        reduced_motion='reduce',timezone_id='Asia/Jakarta',accept_downloads=True,**options)
    context.tracing.start(screenshots=True,snapshots=True)
    if seed:
        context.add_init_script('if(!sessionStorage.getItem("m1seed")){'+
            ''.join(f'localStorage.setItem({json.dumps(k)},{json.dumps(v)});' for k,v in seed.items())+
            'sessionStorage.setItem("m1seed","yes");}')
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(BASE)
    page.locator('#node-layer .graph-node').first.wait_for(state='attached')
    return context,page,errors


def reload_page(page):
    # M2 mounts through an asynchronous bootstrap import; navigation completion
    # alone no longer means the spatial app is constructed.
    page.reload()
    page.locator('#node-layer .graph-node').first.wait_for(state='attached')


def saved(page):
    expect(page.locator('#journal-save-state')).to_have_text('saved on this device')


def viewport_flow(browser, label, size):
    context,page,errors=open_page(browser,size,is_mobile=label!='desktop',has_touch=label!='desktop')
    try:
        assert page.locator('.spatial-world > .spatial-item').count()==6
        assert page.locator('.widget-grip').count()==6
        page.screenshot(path=str(OUT/f'm1-{label}-initial.png'))
        focus(page,'journal')
        page.locator('#journal-entry-title').fill('M1 synthetic entry')
        page.locator('#journal-editor').fill('Synthetic M0 diagnostic entry.')
        page.locator('#journal-entry-date').fill('2026-11-18')
        page.locator('#journal-entry-date').dispatch_event('change')
        saved(page)
        assert page.locator('.timeline-journal').count()==1
        page.screenshot(path=str(OUT/f'm1-{label}-journal.png'))
        reload_page(page)
        expect(page.locator('#journal-entry-title')).to_have_value('M1 synthetic entry')
        expect(page.locator('#journal-editor')).to_contain_text('Synthetic M0 diagnostic entry.')
        focus(page,'journal')
        if label=='desktop':page.locator('#journal-new').click()
        else:page.locator('#journal-new').tap()
        # Date-ordered journal: choose a later date for the second synthetic page.
        page.locator('#journal-entry-date').fill('2026-11-19')
        page.locator('#journal-entry-date').dispatch_event('change')
        page.locator('#journal-editor').fill('Second page')
        page.locator('#journal-prev').click()
        expect(page.locator('#journal-entry-title')).to_have_value('M1 synthetic entry')
        page.locator('#journal-next').click()
        page.locator('#journal-delete').click()
        expect(page.locator('#journal-page-label')).to_have_text('Page 1 of 1')
        page.locator('#toast button').click()
        expect(page.locator('#journal-page-label')).to_have_text('Page 2 of 2')
        # Keyboard movement and resizing of each independent widget persist at real origin.
        page.keyboard.press('Tab')
        for name in ['timeline','constellation','active','completed','space','journal']:
            focus(page,name)
            grip=page.locator(f'#{name}-widget .widget-grip')
            before=page.evaluate('(id)=>window.orbitDebug.board.getLayout()[id].x',name)
            grip.focus();grip.press('ArrowRight')
            assert page.evaluate('(id)=>window.orbitDebug.board.getLayout()[id].x',name)==before+24
            resize=page.locator(f'#{name}-widget .widget-resizer')
            width=page.locator(f'#{name}-widget').evaluate('e=>e.offsetWidth')
            resize.focus();resize.press('ArrowRight')
            assert page.locator(f'#{name}-widget').evaluate('e=>e.offsetWidth')>=width
        layout=page.evaluate('window.orbitDebug.board.getLayout()')
        reload_page(page)
        assert page.evaluate('window.orbitDebug.board.getLayout()')==layout
        assert not errors,errors
    except Exception:
        page.screenshot(path=str(OUT/f'm1-{label}-failure.png'))
        context.tracing.stop(path=str(ROOT/'test-results'/f'{label}-trace.zip'))
        raise
    finally: context.close()


def normal_flows(browser):
    context,page,errors=open_page(browser)
    focus(page,'constellation')
    page.locator('#capture-name').fill('M1 captured task')
    page.locator('#capture-name').press('Enter')
    task=page.locator('.task-row').filter(has_text='M1 captured task')
    assert task.count()==1
    task_id=task.get_attribute('data-task-id')
    task.focus();task.press('Enter')
    task.get_by_role('button',name='Edit',exact=True).press('Enter')
    task.locator('[name=title]').fill('M1 edited task')
    task.locator('[name=criteria]').fill('Synthetic done criteria')
    task.locator('[name=dueDate]').fill('2026-11-18')
    task.get_by_role('button',name='Save changes').press('Enter')
    assert page.locator('.task-row').filter(has_text='M1 edited task').count()==1
    focus(page,'active')
    rail=page.locator('.rail-task').filter(has_text='M1 edited task')
    rail.locator('.rail-check').focus();rail.locator('.rail-check').press('Enter')
    assert page.locator(f'.task-row[data-task-id="{task_id}"]').count()==0
    focus(page,'completed')
    page.get_by_role('button',name='Reopen').last.focus()
    page.get_by_role('button',name='Reopen').last.press('Enter')
    reload_page(page)
    assert page.locator(f'.task-row[data-task-id="{task_id}"]').count()==1
    focus(page,'constellation')
    page.locator('#color-mode').click()
    assert page.locator('#mode-label').inner_text()=='urgency'
    page.keyboard.press('Control+f')
    page.locator('#capture-name').fill('M1 edited task')
    expect(page.locator('#capture-target')).to_have_text('1 found')
    page.locator('#capture-name').press('Escape')
    # Dynamic branch form has a semantic label and restores focus after save/cancel.
    node=page.locator('.graph-node[data-id="inbox"]')
    node.focus();node.press('Insert')
    page.get_by_role('textbox',name='New branch name').fill('M1 deep branch')
    page.get_by_role('textbox',name='New branch name').press('Enter')
    branch=page.locator('.graph-node').filter(has_text='M1 deep branch').first
    branch.focus();branch.press('F2')
    page.get_by_role('textbox',name='Branch name').fill('M1 renamed branch')
    page.get_by_role('textbox',name='Branch name').press('Enter')
    assert page.locator('.node-label').filter(has_text='M1 renamed branch').count()==1
    renamed=page.locator('.graph-node').filter(has_text='M1 renamed branch').first
    branch_id=renamed.get_attribute('data-id')
    # Descendant candidates are absent when moving their ancestor; arbitrary reparenting persists.
    inbox=page.locator('.graph-node[data-id="inbox"]')
    inbox.focus();inbox.get_by_role('button',name='Move branch to another parent').press('Enter')
    assert page.get_by_role('combobox',name='Parent branch').locator(f'option[value="{branch_id}"]').count()==0
    page.get_by_role('combobox',name='Parent branch').press('Escape')
    renamed.focus();renamed.get_by_role('button',name='Move branch to another parent').press('Enter')
    page.get_by_role('combobox',name='Parent branch').select_option('just-because')
    page.get_by_role('combobox',name='Parent branch').press('Enter')
    assert page.evaluate('(id)=>JSON.parse(localStorage.getItem("orbit.phase1.branches.v1")).find(b=>b.id===id).parentId',branch_id)=='just-because'
    # Milestones use explicit Remove, then Undo, with persisted state.
    focus(page,'timeline')
    page.locator('#timeline-add').click()
    page.locator('#milestone-title').fill('M1 marker')
    page.locator('#milestone-date').fill('2026-11-18')
    page.locator('#milestone-form button[type=submit]').click()
    marker=page.locator('.timeline-milestone')
    marker.focus();marker.press('Enter')
    expect(page.locator('#toast button')).to_have_text('Remove')
    page.locator('#toast button').press('Enter')
    expect(page.locator('.timeline-milestone')).to_have_count(0)
    expect(page.locator('#toast button')).to_have_text('Undo')
    page.locator('#toast button').press('Enter')
    reload_page(page)
    expect(page.locator('.timeline-milestone')).to_have_count(1)
    # Export/restore UI path, including V6 dimensions and dated journal.
    with page.expect_download() as download: page.locator('#backup-json').evaluate('e=>e.click()')
    path=OUT/'m1-synthetic-backup.json'; download.value.save_as(path)
    backup=json.loads(path.read_text());assert backup['version']==6
    before=page.evaluate('window.orbitDebug.state.tasks')
    page.locator('#csv-file').set_input_files({'name':'tasks.csv','mimeType':'text/csv','buffer':b'title\nM1 imported CSV\n'})
    expect(page.locator('#toast')).to_contain_text('Imported 1')
    page.locator('#csv-file').set_input_files({'name':'branches.csv','mimeType':'text/csv','buffer':b'id,parent_id,label,color\\nnew-work,root,Work stream,#6597E6\\nnew-class,new-work,Class notes,\\n'})
    expect(page.locator('#toast')).to_contain_text('Import 2 branches')
    page.locator('#toast button').click()
    expect(page.locator('#toast')).to_contain_text('Imported 2 branches')
    assert page.evaluate("JSON.parse(localStorage.getItem('orbit.phase1.branches.v1')).some(b=>b.id==='new-class'&&b.parentId==='new-work')")
    page.locator('#export-kind').select_option('branches')
    with page.expect_download() as branch_export:page.locator('#export-csv').evaluate('e=>e.click()')
    assert b'new-class' in Path(branch_export.value.path()).read_bytes()
    page.locator('#csv-file').set_input_files(str(path))
    page.locator('#toast button').click()
    assert page.evaluate('window.orbitDebug.state.tasks')==before
    bad={**backup,'version':999}
    page.locator('#csv-file').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':json.dumps(bad).encode()})
    page.locator('#toast button').click()
    expect(page.locator('#toast')).to_contain_text('Unsupported')
    assert page.evaluate('window.orbitDebug.state.tasks')==before
    path.unlink()
    focus(page,'journal')
    pages=page.evaluate('window.orbitDebug.state.journalPages')
    page.locator('#journal-delete').click();page.locator('#toast button').click()
    assert page.evaluate('window.orbitDebug.state.journalPages')==pages
    assert not errors,errors
    context.close()


def failure_security_flows(browser):
    orphan=json.dumps([{'id':'orphan','title':'Recover assignment','projectId':'missing'}])
    invalid_page=json.dumps([{'id':'page','title':'Retain date','html':'<p>Keep</p>','date':'invalid'}])
    context,page,errors=open_page(browser,seed={TASKS:orphan,JOURNAL:invalid_page})
    focus(page,'constellation');page.locator('#capture-name').fill('Session only');page.locator('#capture-name').press('Enter')
    assert page.evaluate('(k)=>localStorage.getItem(k)',TASKS)==orphan
    focus(page,'journal');page.locator('#journal-new').click()
    assert page.evaluate('(k)=>localStorage.getItem(k)',JOURNAL)==invalid_page
    assert not errors,errors;context.close()
    raw=json.dumps([{'id':'keep','title':'Keep valid task','projectId':'inbox'},{'id':'bad','title':''}])
    context,page,errors=open_page(browser,seed={TASKS:raw,JOURNAL:'{broken'})
    assert page.evaluate('(k)=>localStorage.getItem(k)',TASKS)==raw
    assert page.locator('.task-row').count()==1
    focus(page,'journal');page.locator('#journal-editor').fill('Recovery draft')
    page.locator('#journal-new').click()
    expect(page.locator('#journal-save-state')).to_contain_text('not saved')
    assert page.evaluate('(k)=>localStorage.getItem(k)',JOURNAL)=='{broken'
    with page.expect_download() as download: page.locator('#backup-json').evaluate('e=>e.click()')
    path=OUT/'m1-recovery.json';download.value.save_as(path)
    recovery=json.loads(path.read_text())['recoveryData'];assert recovery[TASKS]==raw and recovery[JOURNAL]=='{broken'
    path.unlink();assert not errors,errors;context.close()
    context,page,errors=open_page(browser)
    page.evaluate("() => {Storage.prototype.setItem=function(){throw new DOMException('Synthetic quota','QuotaExceededError')};}")
    focus(page,'journal');page.locator('#journal-editor').fill('Unsaved synthetic draft')
    page.locator('#journal-new').click()
    expect(page.locator('#journal-save-state')).to_contain_text('not saved')
    page.locator('#journal-prev').click()
    expect(page.locator('#journal-editor')).to_contain_text('Unsaved synthetic draft')
    focus(page,'constellation');page.locator('#capture-name').fill('Unsaved task');page.locator('#capture-name').press('Enter')
    expect(page.locator('#toast')).to_contain_text('not saved')
    assert not errors,errors;context.close()
    # Paste is cancelled and sanitized BEFORE insertion, not a later animation frame.
    context,page,errors=open_page(browser)
    focus(page,'journal');page.locator('#journal-editor').click()
    result=page.evaluate('''() => {
      window.__xss=0;const clipboard=new DataTransfer();
      clipboard.setData('text/html','<p onclick="window.__xss=1">Safe<strong>bold</strong></p><img src=x onerror="window.__xss=1"><svg onload="window.__xss=1"></svg><a href="javascript:window.__xss=1">bad</a>');
      const event=new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:clipboard});
      document.getElementById('journal-editor').dispatchEvent(event);
      return {cancelled:event.defaultPrevented,html:document.getElementById('journal-editor').innerHTML};
    }''')
    assert result['cancelled'] and '<strong>bold</strong>' in result['html']
    assert not any(x in result['html'] for x in ['onclick','onerror','javascript:','<svg','<img'])
    saved(page);assert page.evaluate('window.__xss')==0;reload_page(page);assert page.evaluate('window.__xss||0')==0
    assert not errors,errors;context.close()
    # Inject a mid-restore write failure through the real UI; memory and disk remain prior.
    context,page,errors=open_page(browser)
    before=page.evaluate('window.orbitDebug.state.tasks')
    raw_before=page.evaluate('(k)=>localStorage.getItem(k)',TASKS)
    page.evaluate("""() => {const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){if(key==='orbit.phase1.preferences.v1')throw Error('Synthetic write failure');return original.call(this,key,value);};}""")
    fixture={'format':'orbit-backup','version':6,'branches':[{'id':'inbox','parentId':'root','label':'Inbox'}],
             'tasks':[{'id':'replacement','title':'Should not replace','projectId':'inbox'}]}
    page.locator('#csv-file').set_input_files({'name':'rollback.json','mimeType':'application/json','buffer':json.dumps(fixture).encode()})
    page.locator('#toast button').click()
    expect(page.locator('#toast')).to_contain_text('original data retained')
    assert page.evaluate('window.orbitDebug.state.tasks')==before
    assert page.evaluate('(k)=>localStorage.getItem(k)',TASKS)==raw_before
    assert page.evaluate("localStorage.getItem('orbit.v6.restore-recovery')") is None
    assert not errors,errors;context.close()


def preferences_and_dates(browser):
    context,page,errors=open_page(browser,(844,390))
    focus(page,'journal')
    # Small saved-state text must meet 4.5:1 against the opaque paper base.
    color=page.locator('#journal-save-state').evaluate('e=>getComputedStyle(e).color')
    import re
    rgb=[int(x)/255 for x in re.findall(r'\d+',color)[:3]]
    def luminance(values):
        return sum((v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4)*w for v,w in zip(values,[.2126,.7152,.0722]))
    background=luminance([248/255,241/255,221/255]);foreground=luminance(rgb)
    ratio=(max(background,foreground)+.05)/(min(background,foreground)+.05)
    assert ratio>=4.5,('journal saved-state contrast',ratio)
    page.keyboard.press('Tab');page.locator('#journal-export').focus()
    rect=page.locator('#journal-export').bounding_box()
    assert rect['y']>=80 and rect['y']+rect['height']<=390-23,rect
    page.locator('#journal-editor').focus()
    assert page.locator('#journal-editor').evaluate('e=>getComputedStyle(e).outlineStyle')!='none'
    assert page.locator('.ambient-orb').first.evaluate('e=>getComputedStyle(e).animationName')=='none'
    page.emulate_media(contrast='more')
    assert page.evaluate("matchMedia('(prefers-contrast: more)').matches")
    # Stress text-only enlargement without redesigning the spatial canvas.
    page.add_style_tag(content='input,button,.journal-editor{font-size:200%!important}')
    page.locator('#journal-new').focus();page.locator('#journal-new').press('Enter')
    assert page.evaluate('window.orbitDebug.state.journalPages')==2
    assert not errors,errors;context.close()
    context=browser.new_context(timezone_id='America/Los_Angeles',reduced_motion='reduce')
    page=context.new_page();page.clock.install(time=datetime(2026,11,1,20,30,tzinfo=timezone.utc))
    page.goto(BASE);page.locator('#node-layer .graph-node').first.wait_for(state='attached')
    focus(page,'timeline');page.locator('#timeline-add').click()
    assert page.locator('#milestone-date').input_value()=='2026-11-02'
    assert page.locator('#journal-entry-date').input_value()=='2026-11-02'
    context.close()


def density(browser):
    timings={}
    for count in [100,500,2000]:
        records=[{'id':f'load-{i}','title':f'Synthetic task {i}','projectId':'inbox'} for i in range(count)]
        start=time.monotonic()
        context,page,errors=open_page(browser,seed={TASKS:json.dumps(records)})
        assert page.locator('.task-row').count()==count
        assert not errors,errors
        timings[str(count)]=round((time.monotonic()-start)*1000)
        context.close()
    return timings


def main():
    OUT.mkdir(exist_ok=True);(ROOT/'test-results').mkdir(exist_ok=True)
    results={}
    with server(),sync_playwright() as playwright:
        executable=None if os.environ.get('ORBIT_BROWSER_BUNDLED') else os.environ.get('ORBIT_CHROMIUM') or shutil.which('chromium')
        browser=playwright.chromium.launch(headless=True,executable_path=executable,args=['--no-sandbox'])
        for label,size in [('desktop',(1440,900)),('tablet',(900,1100)),('phone',(390,844)),('small',(320,700)),('landscape',(844,390))]:
            viewport_flow(browser,label,size);results[label]='PASS';print('PASS',label,flush=True)
        for name,fn in [('core flows',normal_flows),('failure and security',failure_security_flows),('preferences and dates',preferences_and_dates)]:
            fn(browser);results[name]='PASS';print('PASS',name,flush=True)
        results['density_load_ms']=density(browser)
        browser.close()
    (OUT/'m1-results.json').write_text(json.dumps(results,indent=2)+'\n')
    print(json.dumps(results,indent=2))

if __name__=='__main__': main()
