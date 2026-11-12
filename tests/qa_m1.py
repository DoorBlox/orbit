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


def ensure_journal_edit(page):
    if page.locator('#journal-widget').get_attribute('data-journal-view') != 'edit':
        page.locator('#journal-edit-toggle').click()
    expect(page.locator('#journal-editor')).to_have_attribute('contenteditable','true')


def saved(page):
    expect(page.locator('#journal-save-state')).to_have_text('saved on this device')


def bp08_viewport_rotation_recovery(browser):
    """Synthetic portrait/short-landscape resize without moving saved spatial geometry."""
    context,page,errors=open_page(browser,(320,700),is_mobile=True,has_touch=True)
    try:
        def camera():
            return page.evaluate("""() => {
              const b=window.orbitDebug.board,{w,h}=b.viewportSize();
              return {w,h,centerX:(w/2-b.pan.x)/b.scale,
                centerY:(h/2-b.pan.y)/b.scale,scale:b.scale,layout:b.getLayout()};
            }""")

        def resized(width,height):
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_function("""({w,h}) => {
              const size=window.orbitDebug.board.lastViewportSize;
              return size && size.w===w && size.h===h;
            }""",arg={'w':width,'h':height})

        def same_world_center(left,right):
            assert abs(left['centerX']-right['centerX'])<0.001, (left,right)
            assert abs(left['centerY']-right['centerY'])<0.001, (left,right)
            assert left['layout']==right['layout'], 'Viewport changed saved geometry'

        focus(page,'journal')
        first=camera()
        resized(844,390)
        second=camera()
        same_world_center(first,second)
        assert first['scale']==second['scale']
        resized(390,844)
        third=camera()
        same_world_center(first,third)

        focus(page,'space')
        bookmark=camera()
        page.locator('.space-manage > summary').click()
        page.locator('#bp08-focus-picker').select_option('journal')
        expect(page.locator('#bp08-focus-exit')).to_be_visible()
        resized(844,390)
        assert page.evaluate("""() => {
          const b=window.orbitDebug.board,el=b.widgets.get('journal');
          const r=el.querySelector('.widget-heading').getBoundingClientRect();
          const v=b.viewport.getBoundingClientRect();
          return b.focusReturn?.id==='journal' && b.widgets.get('space').inert &&
            r.right>v.left && r.left<v.right && r.bottom>v.top && r.top<v.bottom;
        }"""), 'Selected Focus widget heading is offscreen after landscape rotation'
        page.screenshot(path=str(OUT/'m1-bp08-landscape-focus.png'))
        page.locator('#bp08-focus-exit').click()
        assert page.evaluate('window.orbitDebug.board.focusReturn===null')
        same_world_center(bookmark,camera())
        resized(390,844)
        same_world_center(bookmark,camera())
        page.screenshot(path=str(OUT/'m1-bp08-portrait-return.png'))
        assert not errors,errors
    finally:
        context.tracing.stop()
        context.close()




def bp11_paste_sanitized_empty_html_falls_back_to_text(browser):
    """Rejected HTML must never swallow clipboard plain text or remove a selected draft."""
    context,page,errors=open_page(browser)
    try:
        focus(page,'journal')
        ensure_journal_edit(page)
        editor=page.locator('#journal-editor')
        editor.fill('Keep REPLACE tail')
        page.evaluate("window.__bp11RejectedPasteXss=0")

        def paste_over(selected,html,plain):
            editor.evaluate("""(el,args) => {
              el.focus();
              const node=el.firstChild;
              if(!node || node.nodeType!==Node.TEXT_NODE)
                throw Error('Synthetic selected text is not a native editor text node');
              const start=node.textContent.indexOf(args.selected);
              if(start<0)throw Error('Expected selection text is missing');
              const range=document.createRange();
              range.setStart(node,start);
              range.setEnd(node,start+args.selected.length);
              const selection=window.getSelection();
              selection.removeAllRanges();
              selection.addRange(range);
              const data=new DataTransfer();
              if(args.html)data.setData('text/html',args.html);
              if(args.plain)data.setData('text/plain',args.plain);
              const paste=new ClipboardEvent('paste',{
                bubbles:true,cancelable:true,clipboardData:data
              });
              el.dispatchEvent(paste);
              if(!paste.defaultPrevented)
                throw Error('Untrusted clipboard paste was not intercepted');
            }""",{'selected':selected,'html':html,'plain':plain})

        rejected='<img src=x onerror="window.__bp11RejectedPasteXss=1">'
        paste_over('REPLACE',rejected,'安全な文字')
        expect(editor).to_have_text('Keep 安全な文字 tail'), \
            'All-rejected HTML must use the available plain-text clipboard payload'
        assert editor.locator('img').count()==0, 'Rejected image must never enter the editor'
        assert page.evaluate("window.__bp11RejectedPasteXss")==0, 'Rejected paste ran an event handler'
        editor.press('Control+z')
        expect(editor).to_have_text('Keep REPLACE tail'), \
            'Fallback must be one native undoable paste over the selected text'
        editor.press('Control+Shift+z')
        expect(editor).to_have_text('Keep 安全な文字 tail'), \
            'Native redo must restore sanitized plain-text fallback'

        paste_over('安全な文字',rejected,'')
        expect(editor).to_have_text('Keep 安全な文字 tail'), \
            'All-rejected HTML without plain text must not erase selected writing'

        paste_over('安全な文字','<strong>強調</strong>'+rejected,'untrusted formatting')
        expect(editor).to_have_text('Keep 強調 tail')
        assert editor.locator('strong').count()==1, 'Safe rich-text formatting must survive'
        assert editor.locator('img').count()==0
        assert page.evaluate("window.__bp11RejectedPasteXss")==0
        editor.press('Control+z')
        expect(editor).to_have_text('Keep 安全な文字 tail'), \
            'Normal sanitized rich-text paste must remain natively undoable'
        editor.press('Control+Shift+z')
        expect(editor).to_have_text('Keep 強調 tail')
        assert not errors,errors
    finally:
        context.tracing.stop()
        context.close()


def bp11_paste_native_undo(browser):
    """Synthetic clipboard paste must participate in native contenteditable undo/redo."""
    context,page,errors=open_page(browser)
    try:
        focus(page,'journal')
        ensure_journal_edit(page)
        editor=page.locator('#journal-editor')
        editor.fill('Draft')
        def paste(html,plain):
            editor.evaluate("""(el,clip) => {
              el.focus();
              const selection=window.getSelection(),range=document.createRange();
              range.selectNodeContents(el);range.collapse(false);
              selection.removeAllRanges();selection.addRange(range);
              const data=new DataTransfer();
              if(clip.html)data.setData('text/html',clip.html);
              data.setData('text/plain',clip.plain);
              const event=new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data});
              el.dispatchEvent(event);
              if(!event.defaultPrevented)throw Error('Journal did not own paste sanitization');
            }""",{'html':html,'plain':plain})

        page.evaluate("window.__bp11PasteXss=0")
        paste('<strong>続き</strong><img src=x onerror="window.__bp11PasteXss=1">','続き')
        expect(editor).to_have_text('Draft続き')
        assert editor.locator('img').count()==0,'Pasted HTML must remain sanitized'
        assert page.evaluate('window.__bp11PasteXss')==0
        editor.press('Control+z')
        expect(editor).to_have_text('Draft'), \
            'Undo must remove ONLY the last sanitized paste, not prior typed text'
        editor.press('Control+Shift+z')
        expect(editor).to_have_text('Draft続き'), \
            'Redo must restore the last sanitized paste'

        paste('',' plain')
        expect(editor).to_have_text('Draft続き plain')
        editor.press('Control+z')
        expect(editor).to_have_text('Draft続き'), \
            'Plain-text paste must also be a native undo transaction'
        editor.press('Control+Shift+z')
        expect(editor).to_have_text('Draft続き plain'), \
            'Plain-text redo must restore the inserted text'
        assert not errors,errors
    finally:
        context.tracing.stop()
        context.close()



def bp11_date_reorder_preserves_native_undo(browser):
    """Changing a journal date may change page order, but must not remount the active rich-text editor."""
    context,page,errors=open_page(browser)
    try:
        focus(page,'journal')
        ensure_journal_edit(page)
        page.evaluate("""() => {
          const j=window.orbitDebug.journal;
          j.replaceEntries([
            {id:'bp11-first',date:'2026-11-01',title:'First synthetic page',
             html:'<p>Earlier</p>',createdAt:'2026-11-01T10:00:00.000Z'},
            {id:'bp11-second',date:'2026-11-15',title:'Active synthetic page',
             html:'',createdAt:'2026-11-15T10:00:00.000Z'}
          ],{persist:false});
          j.index=1;j.render();
          window.__bp11DateEvents=[];
          j.onEntriesChange=entries=>window.__bp11DateEvents.push(
            entries.map(e=>({id:e.id,date:e.date,html:e.html})));
        }""")
        editor=page.locator('#journal-editor')
        editor.fill('Existing writing')
        editor.press('End')
        editor.type('!')
        expect(editor).to_have_text('Existing writing!')
        page.evaluate("""() => {
          const el=document.querySelector('#journal-editor');
          window.__bp11ActiveEditorChild=el.firstChild;
          window.__bp11BeforeMoveHtml=el.innerHTML;
        }""")
        assert page.evaluate("window.orbitDebug.journal.entries[window.orbitDebug.journal.index].id")== 'bp11-second'
        page.locator('#journal-entry-date').fill('2026-10-31')
        page.locator('#journal-entry-date').dispatch_event('change')
        assert page.evaluate("""() => {
          const j=window.orbitDebug.journal;
          return j.index===0 && j.entries[0].id==='bp11-second' &&
            j.entries[0].date==='2026-10-31' && j.entries[1].id==='bp11-first';
        }"""), 'Edited date must reorder page metadata while preserving active page identity'
        expect(page.locator('#journal-page-label')).to_have_text('Page 1 of 2')
        assert page.evaluate("""() => {
          const el=document.querySelector('#journal-editor');
          return el.firstChild===window.__bp11ActiveEditorChild &&
            el.innerHTML===window.__bp11BeforeMoveHtml;
        }"""), 'Changing only the page date replaced the live editor DOM and discarded native undo history'
        editor.focus()
        editor.press('Control+z')
        expect(editor).to_have_text('Existing writing')
        assert page.evaluate("""() => {
          const j=window.orbitDebug.journal;
          return j.entries[j.index].id==='bp11-second';
        }""")
        assert not errors, errors
    finally:
        context.tracing.stop()
        context.close()


def bp11_ime_composition(browser):
    """Synthetic CJK composition events through the actual journal UI and cloud callback."""
    context,page,errors=open_page(browser)
    try:
        focus(page,'journal')
        ensure_journal_edit(page)
        # Replace only the synthetic page's callback; no cloud account or hosted data.
        page.evaluate("""() => {
          const j=window.orbitDebug.journal;
          window.__bp11Publications=[];
          j.persistLocally=false;
          j.onEntriesChange=entries=>window.__bp11Publications.push({
            title:entries[j.index].title,html:entries[j.index].html
          });
        }""")
        page.locator('#journal-editor').evaluate("""el => {
          el.focus();
          el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'日'}));
          el.innerHTML='<p>日</p>';
          el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,
            inputType:'insertCompositionText',data:'日'}));
        }""")
        expect(page.locator('#journal-save-state')).to_have_text('writing…')
        assert page.evaluate('window.__bp11Publications.length')==0, \
            'Partial CJK input was published before compositionend'
        page.locator('#journal-editor').evaluate("""el => {
          el.innerHTML='<p>日本語の文章</p>';
          const node=el.querySelector('p').firstChild,range=document.createRange();
          range.setStart(node,node.length);range.collapse(true);
          const selection=window.getSelection();
          selection.removeAllRanges();selection.addRange(range);
          el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,
            inputType:'insertCompositionText',data:'日本語の文章'}));
          el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'日本語の文章'}));
          el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:false,
            inputType:'insertText',data:'日本語の文章'}));
        }""")
        assert page.evaluate('window.__bp11Publications.length')==1, \
            'Final composition caused a missing or duplicate cloud publication'
        assert page.evaluate("window.__bp11Publications[0].html.includes('日本語の文章')")
        assert page.evaluate("""() => {
          const s=window.getSelection(),el=document.querySelector('#journal-editor');
          return s.rangeCount===1 && el.contains(s.anchorNode) &&
            s.anchorOffset===s.anchorNode.textContent.length;
        }"""), 'Composition completion disturbed the caret'

        page.locator('#journal-entry-title').evaluate("""el => {
          el.focus();
          el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'途'}));
          el.value='途';
          el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,
            inputType:'insertCompositionText',data:'途'}));
        }""")
        assert page.evaluate('window.__bp11Publications.length')==1, \
            'Partial IME title was published before compositionend'
        page.locator('#journal-entry-title').evaluate("""el => {
          el.value='途中の文';
          el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,
            inputType:'insertCompositionText',data:'途中の文'}));
          el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'途中の文'}));
        }""")
        assert page.evaluate('window.__bp11Publications.length')==2
        assert page.evaluate("window.__bp11Publications.at(-1).title==='途中の文'")

        # An interrupted composition must still be captured on explicit pagehide.
        page.locator('#journal-entry-title').evaluate("""el => {
          el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'帰'}));
          el.value='帰宅前の下書き';
          el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,
            inputType:'insertCompositionText',data:'帰'}));
        }""")
        assert page.evaluate('window.__bp11Publications.length')==2
        page.evaluate("window.dispatchEvent(new Event('pagehide'))")
        assert page.evaluate('window.__bp11Publications.length')==3
        assert page.evaluate("window.__bp11Publications.at(-1).title==='帰宅前の下書き'")
        page.locator('#journal-entry-title').dispatch_event('compositionend')
        assert page.evaluate('window.__bp11Publications.length')==3, \
            'Compositionend after a forced lifecycle flush double-published an unchanged draft'
        assert not errors,errors
    finally:
        context.tracing.stop()
        context.close()

def viewport_flow(browser, label, size):
    context,page,errors=open_page(browser,size,is_mobile=label!='desktop',has_touch=label!='desktop')
    try:
        # The six original widgets must exist, but they are NOT a lifetime cap.
        core=('timeline','constellation','active','completed','space','journal')
        assert all(page.locator(f'[data-widget="{wid}"]').count()==1 for wid in core)
        assert all(page.locator(f'[data-widget="{wid}"] .widget-grip').count()==1 for wid in core)
        page.screenshot(path=str(OUT/f'm1-{label}-initial.png'))

        # BP-08: optional focus is camera-only, reversible and accessible.
        focus(page,'space')
        before=page.evaluate('''() => ({camera:{scale:window.orbitDebug.board.scale,
          pan:{...window.orbitDebug.board.pan}},layout:window.orbitDebug.board.getLayout()})''')
        page.locator('.space-manage > summary').click()
        page.locator('#bp08-focus-picker').select_option('journal')
        expect(page.locator('#bp08-focus-exit')).to_be_visible()
        assert page.evaluate('''() => window.orbitDebug.board.widgets.get('space').inert === true''')
        page.locator('#bp08-focus-exit').click()
        expect(page.locator('#bp08-focus-exit')).to_be_hidden()
        after=page.evaluate('''() => ({camera:{scale:window.orbitDebug.board.scale,
          pan:{...window.orbitDebug.board.pan}},layout:window.orbitDebug.board.getLayout()})''')
        assert before==after, 'BP-08 focus changed the camera bookmark or saved layout'

        focus(page,'journal')
        ensure_journal_edit(page);page.locator('#journal-entry-title').fill('M1 synthetic entry')
        ensure_journal_edit(page);page.locator('#journal-editor').fill('Synthetic M0 diagnostic entry.')
        ensure_journal_edit(page);page.locator('#journal-entry-date').fill('2026-11-18')
        page.locator('#journal-entry-date').dispatch_event('change')
        saved(page)
        assert page.locator('.timeline-journal').count()==1
        page.screenshot(path=str(OUT/f'm1-{label}-journal.png'))
        reload_page(page)
        expect(page.locator('#journal-entry-title')).to_have_value('M1 synthetic entry')
        expect(page.locator('#journal-editor')).to_contain_text('Synthetic M0 diagnostic entry.')
        focus(page,'journal')
        if label=='desktop':ensure_journal_edit(page);page.locator('#journal-new').click()
        else:ensure_journal_edit(page);page.locator('#journal-new').tap()
        # Date-ordered journal: choose a later date for the second synthetic page.
        ensure_journal_edit(page);page.locator('#journal-entry-date').fill('2026-11-19')
        page.locator('#journal-entry-date').dispatch_event('change')
        ensure_journal_edit(page);page.locator('#journal-editor').fill('Second page')
        page.locator('#journal-prev').click()
        expect(page.locator('#journal-entry-title')).to_have_value('M1 synthetic entry')
        page.locator('#journal-next').click()
        ensure_journal_edit(page);page.locator('.journal-more > summary').click();page.locator('#journal-delete').click()
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
    assert page.locator('.private-caption').count()==0, 'Prototype caption must be removed'
    assert page.locator('#clock').count()==1 and page.locator('#clock').inner_text().strip(), 'Clock remains visible'
    focus(page,'constellation')
    page.locator('#capture-name').fill('M1 captured task')
    page.locator('#capture-name').press('Enter')
    task=page.locator('.task-row').filter(has_text='M1 captured task')
    assert task.count()==1
    task_id=task.get_attribute('data-task-id')
    task.focus();task.press('Enter')
    task.get_by_role('button',name='Edit',exact=True).press('Enter')
    inspector=page.locator('.orbit-task-dialog')
    expect(inspector).to_be_visible()
    # The editor lives in the viewport's top layer, not in a scaled task node.
    assert inspector.evaluate("""element=>{
      const r=element.getBoundingClientRect();
      return r.left>=0 && r.top>=0 && r.right<=innerWidth+1 &&
        r.bottom<=innerHeight+1 && r.width>=260;
    }""")
    assert task.locator('.task-editor').count()==0
    inspector.locator('[name=title]').fill('   ')
    inspector.get_by_role('button',name='Save changes').click()
    expect(inspector).to_be_visible()
    inspector.locator('[name=title]').fill('M1 edited task')
    inspector.locator('[name=criteria]').fill('Synthetic done criteria')
    inspector.locator('[name=dueDate]').fill('2026-11-18')
    inspector.locator('.task-editor-more summary').click()
    inspector.locator('[name=checklistText]').fill('- [ ] Read the chapters\n- [x] Plan the review')
    inspector.get_by_role('button',name='Save changes').press('Enter')
    expect(page.locator('.orbit-task-dialog')).to_have_count(0)
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
    # Nested branches collapse/expand by button and keyboard, then persist after reload.
    renamed.focus();renamed.press('Insert')
    page.get_by_role('textbox',name='New branch name').fill('M1 nested branch')
    page.get_by_role('textbox',name='New branch name').press('Enter')
    nested=page.locator('.graph-node').filter(has_text='M1 nested branch').first
    nested_id=nested.get_attribute('data-id')
    expect(renamed).to_have_attribute('aria-expanded','true')
    # BR-02: an expanded, genuinely empty terminal leaf still offers an add affordance.
    assert page.locator(f'.task-stack[data-branch-id="{nested_id}"] .task-empty').count()==1
    renamed.get_by_role('button',name='Collapse branch').press('Enter')
    expect(renamed).to_have_attribute('aria-expanded','false')
    assert page.locator(f'.graph-node[data-id="{nested_id}"]').count()==0
    # BR-02: collapsed ancestor hides descendants, so it must not claim "add something here".
    assert page.locator(f'.task-stack[data-branch-id="{branch_id}"] .task-empty').count()==0
    assert page.evaluate("(id)=>JSON.parse(localStorage.getItem('orbit.v7.collapsed-branches.local')).includes(id)",branch_id)
    reload_page(page)
    renamed=page.locator(f'.graph-node[data-id="{branch_id}"]')
    expect(renamed).to_have_attribute('aria-expanded','false')
    assert page.locator(f'.graph-node[data-id="{nested_id}"]').count()==0
    assert page.locator(f'.task-stack[data-branch-id="{branch_id}"] .task-empty').count()==0
    renamed.focus();renamed.press('ArrowRight')
    expect(renamed).to_have_attribute('aria-expanded','true')
    assert page.locator(f'.graph-node[data-id="{nested_id}"]').count()==1
    assert page.locator(f'.task-stack[data-branch-id="{nested_id}"] .task-empty').count()==1
    renamed.focus();renamed.press('ArrowLeft')
    expect(renamed).to_have_attribute('aria-expanded','false')
    focus(page,'space');page.locator('.space-manage summary').click()
    page.locator('#expand-all-branches').click()
    expect(renamed).to_have_attribute('aria-expanded','true')
    page.locator('#collapse-all-branches').click()
    # A collapsed ancestor deliberately removes this descendant from the graph.
    expect(renamed).to_have_count(0)
    assert page.locator('.graph-node[data-depth="1"][aria-expanded="false"]').count()>0
    page.locator('#expand-all-branches').click()
    expect(renamed).to_have_attribute('aria-expanded','true')
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
    # ORBIT 2.4: all ten themes, independent ambient animation and progressive disclosure.
    assert page.locator('input[name="space-theme"]').count()==10
    # Appearance stays available but no longer fills the Space panel by default.
    expect(page.locator('.space-appearance')).not_to_have_attribute('open','')
    page.locator('.space-appearance summary').click()
    page.locator('input[name="space-theme"][value="garden"]').check()
    assert page.evaluate('document.documentElement.dataset.theme') == 'garden'
    page.locator('#appearance-ambient').check()
    assert page.evaluate('document.documentElement.dataset.ambient') == 'on'
    reload_page(page)
    assert page.evaluate('document.documentElement.dataset.theme') == 'garden'
    assert page.evaluate('document.documentElement.dataset.ambient') == 'on'
    focus(page,'space')
    page.locator('.space-appearance summary').click()
    page.locator('input[name="space-theme"][value="parchment"]').check()
    page.locator('#appearance-ambient').uncheck()
    page.locator('.space-more-tools summary').click()
    expect(page.locator('#import-csv')).to_be_visible()
    # ORBIT 2.2: both a sticky and a dated journal page carry safe drawing scenes.
    focus(page,'space')
    page.locator('#new-sticky').click()
    expect(page.locator('.sticky-note')).to_have_count(1)
    expect(page.locator('.space-point-sticky')).to_have_count(1)
    # The minimap is the same world: dragging its viewport changes the board camera.
    pan_before=page.evaluate('window.orbitDebug.board.pan.x')
    page.locator('#space-nav-map').evaluate("""element=>{
      const r=element.getBoundingClientRect(),id=444;
      const base={bubbles:true,pointerId:id,pointerType:'mouse',button:0};
      element.dispatchEvent(new PointerEvent('pointerdown',{...base,clientX:r.left+r.width*.25,clientY:r.top+r.height*.5}));
      element.dispatchEvent(new PointerEvent('pointermove',{...base,clientX:r.left+r.width*.70,clientY:r.top+r.height*.5}));
      element.dispatchEvent(new PointerEvent('pointerup',{...base,clientX:r.left+r.width*.70,clientY:r.top+r.height*.5}));
    }""")
    assert page.evaluate('window.orbitDebug.board.pan.x') != pan_before
    # Reading is uncluttered. Edit toggles are at the bottom of each note.
    assert page.locator('.sticky-note').first.get_attribute('data-view') == 'preview'
    page.locator('.sticky-note').first.get_by_role('button',name='Edit sticky note').click()
    page.locator('.sticky-title').fill('M1 visual note')
    page.locator('.sticky-title').dispatch_event('change')
    page.locator('.sticky-body').fill('Private note in the same world')
    page.locator('.sticky-note').first.get_by_role('button',name='Preview sticky note').click()
    expect(page.locator('.sticky-formatbar')).to_be_hidden()
    page.locator('.sticky-note').first.get_by_role('button',name='Edit sticky note').click()
    page.locator('.sticky-note').first.get_by_role('button',name='Canvas',exact=True).click()
    expect(page.locator('.sticky-inline-canvas .excalidraw')).to_be_visible(timeout=25000)
    assert page.locator('.orbit-scene-dialog').count()==0
    assert page.evaluate("window.EXCALIDRAW_ASSET_PATH.startsWith(location.origin)")
    page.locator('.sticky-note').first.get_by_role('button',name='Preview sticky note').click()
    assert page.evaluate("JSON.parse(localStorage.getItem('orbit.v8.extensions')).notes[0].scene.type") == 'excalidraw'
    page.locator('.sticky-note').first.get_by_role('button',name='Edit sticky note').click()
    page.locator('.sticky-note').first.locator('.sticky-more-menu > summary').click()
    page.locator('.sticky-note').first.get_by_role('button',name='Duplicate sticky note').click()
    expect(page.locator('.sticky-note')).to_have_count(2)
    notes=page.evaluate("JSON.parse(localStorage.getItem('orbit.v8.extensions')).notes")
    assert notes[0]['id'] != notes[1]['id']
    assert notes[0]['scene'] == notes[1]['scene']
    assert notes[0]['color'] == notes[1]['color']
    assert notes[1]['title'] == 'Copy of M1 visual note'
    page.locator('.sticky-note').first.get_by_role('button',name='Preview sticky note').click()
    page.locator('.sticky-note').last.get_by_role('button',name='Edit sticky note').click()
    page.locator('.sticky-note').last.get_by_role('button',name='Write',exact=True).click()
    page.locator('.sticky-note').last.locator('.sticky-body').fill('Independent copy')
    page.locator('.sticky-note').last.get_by_role('button',name='Preview sticky note').click()
    assert page.evaluate("JSON.parse(localStorage.getItem('orbit.v8.extensions')).notes[0].text") == 'Private note in the same world'
    reload_page(page)
    expect(page.locator('.sticky-note')).to_have_count(2)
    expect(page.locator('.sticky-note').last.locator('.sticky-title')).to_have_value('Copy of M1 visual note')
    assert page.evaluate("JSON.parse(localStorage.getItem('orbit.v8.extensions')).notes[0].mode") == 'canvas'
    assert page.evaluate("""() => !Object.hasOwn(
      JSON.parse(localStorage.getItem('orbit.v8.extensions')).notes[1],'mode')""")
    width_before=page.evaluate("JSON.parse(localStorage.getItem('orbit.v8.extensions')).notes[0].width")
    page.locator('.sticky-note').first.locator('.sticky-resizer').evaluate("""handle=>{
      const r=handle.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
      const opts={bubbles:true,cancelable:true,pointerId:991,pointerType:'touch',button:0};
      handle.dispatchEvent(new PointerEvent('pointerdown',{...opts,clientX:x,clientY:y}));
      window.dispatchEvent(new PointerEvent('pointermove',{...opts,clientX:x+150,clientY:y+115}));
      window.dispatchEvent(new PointerEvent('pointerup',{...opts,clientX:x+150,clientY:y+115}));
    }""")
    assert page.evaluate("JSON.parse(localStorage.getItem('orbit.v8.extensions')).notes[0].width") > width_before
    assert page.locator('.sticky-note').first.locator('.sticky-drawing').evaluate(
      'e => e.getBoundingClientRect().height >= 100')
    focus(page,'journal')
    ensure_journal_edit(page)
    page.locator('#journal-editor').fill('Journal writing remains separate from canvas art.')
    page.locator('.journal-mode-tab[data-journal-mode="canvas"]').click()
    expect(page.locator('#journal-inline-canvas-host .excalidraw')).to_be_visible(timeout=25000)
    assert page.locator('.orbit-scene-dialog').count()==0
    page.locator('#journal-edit-toggle').click()
    assert page.evaluate("Object.keys(JSON.parse(localStorage.getItem('orbit.v8.extensions')).journalScenes).length") == 1
    assert page.evaluate("Object.values(JSON.parse(localStorage.getItem('orbit.v8.extensions')).journalModes).includes('canvas')")
    expect(page.locator('#journal-editor')).to_be_hidden()
    expect(page.locator('#journal-canvas-view')).to_be_visible()
    page.locator('#journal-edit-toggle').click()
    page.locator('.journal-mode-tab[data-journal-mode="write"]').click()
    expect(page.locator('#journal-editor')).to_be_visible()
    assert 'Journal writing remains separate' in page.locator('#journal-editor').inner_text()
    page.locator('.journal-mode-tab[data-journal-mode="canvas"]').click()
    expect(page.locator('#journal-inline-canvas-host .excalidraw')).to_be_visible(timeout=25000)
    page.locator('#journal-edit-toggle').click()
    assert page.evaluate("Object.keys(JSON.parse(localStorage.getItem('orbit.v8.extensions')).journalScenes).length") == 1
    # Export/restore UI path, including V6 dimensions and dated journal.
    with page.expect_download() as download: page.locator('#backup-json').evaluate('e=>e.click()')
    path=OUT/'m1-synthetic-backup.json'; download.value.save_as(path)
    backup=json.loads(path.read_text());assert backup['version']==6
    before=page.evaluate('window.orbitDebug.state.tasks')
    page.locator('#csv-file').set_input_files({'name':'tasks.csv','mimeType':'text/csv','buffer':b'title\nM1 imported CSV\n'})
    expect(page.locator('#toast')).to_contain_text('Imported 1')
    page.locator('#csv-file').set_input_files({'name':'branches.csv','mimeType':'text/csv','buffer':b'id,parent_id,label,color\nnew-work,root,Work stream,#6597E6\nnew-class,new-work,Class notes,\n'})
    expect(page.locator('#toast')).to_contain_text('Import 2 branches')
    page.locator('#toast button').click()
    expect(page.locator('#toast')).to_contain_text('Imported 2 branches')
    assert page.evaluate("JSON.parse(localStorage.getItem('orbit.phase1.branches.v1')).some(b=>b.id==='new-class'&&b.parentId==='new-work')")
    focus(page,'space')
    # Rare tools are intentionally collapsed; open the disclosure after reload.
    page.locator('.space-more-tools summary').evaluate('element=>element.click()')
    expect(page.locator('#export-kind')).to_be_visible()
    page.locator('#export-kind').select_option('branches')
    with page.expect_download() as branch_export:page.locator('#export-csv').evaluate('e=>e.click()')
    assert b'new-class' in Path(branch_export.value.path()).read_bytes()
    page.locator('#csv-file').set_input_files(str(path))
    page.locator('#toast button').click()
    assert page.evaluate('window.orbitDebug.state.tasks')==before
    bad={**backup,'version':999}
    page.locator('#csv-file').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':json.dumps(bad).encode()})
    # Invalid files are rejected before showing any destructive Restore action.
    expect(page.locator('#toast button')).to_have_count(0)
    expect(page.locator('#toast')).to_contain_text('Unsupported')
    assert page.evaluate('window.orbitDebug.state.tasks')==before
    path.unlink()
    focus(page,'journal')
    pages=page.evaluate('window.orbitDebug.state.journalPages')
    ensure_journal_edit(page)
    page.locator('.journal-mode-tab[data-journal-mode="write"]').click()
    expect(page.locator('#journal-editor')).to_be_visible()
    page.locator('.journal-more > summary').click()
    page.locator('#journal-delete').click()
    expect(page.locator('#toast button')).to_be_visible()
    page.locator('#toast button').click()
    assert page.evaluate('window.orbitDebug.state.journalPages')==pages
    assert not errors,errors
    context.close()


def failure_security_flows(browser):
    orphan=json.dumps([{'id':'orphan','title':'Recover assignment','projectId':'missing'}])
    invalid_page=json.dumps([{'id':'page','title':'Retain date','html':'<p>Keep</p>','date':'invalid'}])
    context,page,errors=open_page(browser,seed={TASKS:orphan,JOURNAL:invalid_page})
    focus(page,'constellation');page.locator('#capture-name').fill('Session only');page.locator('#capture-name').press('Enter')
    assert page.evaluate('(k)=>localStorage.getItem(k)',TASKS)==orphan
    focus(page,'journal');ensure_journal_edit(page);page.locator('#journal-new').click()
    assert page.evaluate('(k)=>localStorage.getItem(k)',JOURNAL)==invalid_page
    assert not errors,errors;context.close()
    raw=json.dumps([{'id':'keep','title':'Keep valid task','projectId':'inbox'},{'id':'bad','title':''}])
    context,page,errors=open_page(browser,seed={TASKS:raw,JOURNAL:'{broken'})
    assert page.evaluate('(k)=>localStorage.getItem(k)',TASKS)==raw
    assert page.locator('.task-row').count()==1
    focus(page,'journal');ensure_journal_edit(page);page.locator('#journal-editor').fill('Recovery draft')
    ensure_journal_edit(page);page.locator('#journal-new').click()
    expect(page.locator('#journal-save-state')).to_contain_text('not saved')
    assert page.evaluate('(k)=>localStorage.getItem(k)',JOURNAL)=='{broken'
    with page.expect_download() as download: page.locator('#backup-json').evaluate('e=>e.click()')
    path=OUT/'m1-recovery.json';download.value.save_as(path)
    recovery=json.loads(path.read_text())['recoveryData'];assert recovery[TASKS]==raw and recovery[JOURNAL]=='{broken'
    path.unlink();assert not errors,errors;context.close()
    context,page,errors=open_page(browser)
    page.evaluate("() => {Storage.prototype.setItem=function(){throw new DOMException('Synthetic quota','QuotaExceededError')};}")
    focus(page,'journal');ensure_journal_edit(page);page.locator('#journal-editor').fill('Unsaved synthetic draft')
    ensure_journal_edit(page);page.locator('#journal-new').click()
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
    page.keyboard.press('Tab');page.locator('#journal-edit-toggle').focus()
    rect=page.locator('#journal-edit-toggle').bounding_box()
    assert rect['y']>=80 and rect['y']+rect['height']<=390-23,rect
    ensure_journal_edit(page)
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
        bp08_viewport_rotation_recovery(browser)
        results['bp08_viewport_rotation_recovery']='PASS';print('PASS BP-08 viewport rotation recovery',flush=True)
        bp11_ime_composition(browser)
        results['bp11_ime_composition']='PASS';print('PASS BP-11 IME cloud publish recovery',flush=True)
        bp11_paste_native_undo(browser)
        results['bp11_paste_native_undo']='PASS';print('PASS BP-11 native paste undo/redo',flush=True)
        bp11_paste_sanitized_empty_html_falls_back_to_text(browser)
        results['bp11_paste_sanitized_empty_html']='PASS';print('PASS BP-11 empty-sanitized HTML fallback and undo',flush=True)
        bp11_date_reorder_preserves_native_undo(browser)
        results['bp11_date_reorder']='PASS';print('PASS BP-11 date reorder preserves editor undo',flush=True)
        for name,fn in [('core flows',normal_flows),('failure and security',failure_security_flows),('preferences and dates',preferences_and_dates)]:
            fn(browser);results[name]='PASS';print('PASS',name,flush=True)
        results['density_load_ms']=density(browser)
        from qa_spatial_baseline import run_baseline
        results['bp06_spatial_baseline']=run_baseline(browser,open_page,focus,reload_page,OUT)
        from qa_spatial_extra import run_extra_widget
        results['sp01b_extra_widget']=run_extra_widget(browser,open_page,reload_page,OUT)
        from qa_project_actions import run_project_actions
        results['pj02a_project_actions']=run_project_actions(browser,open_page,reload_page,OUT)
        from qa_projects_shelf import run_projects_shelf
        results['pj02b_projects_shelf']=run_projects_shelf(browser,open_page,reload_page,OUT)
        from qa_jump import run_jump
        results['br01_spatial_jump']=run_jump(browser,open_page,focus)
        browser.close()
    (OUT/'m1-results.json').write_text(json.dumps(results,indent=2)+'\n')
    print(json.dumps(results,indent=2))

if __name__=='__main__': main()
