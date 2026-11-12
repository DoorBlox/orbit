"""BR-01 synthetic browser acceptance: private, viewport-level universal Jump."""
import json
from playwright.sync_api import expect

def run_jump(browser,open_page,focus):
    task = {
        'id':'jump-task-1','title':'Luminous chemistry experiment',
        'projectId':'inbox','description':'Test a private searchable task',
        'criteria':'Finish the lab notes','urgency':2,'status':'ready'
    }
    journal = [{
        'id':'journal-jump-1','date':'2026-11-10','title':'Snowfall Memory',
        'html':'<p>Shared ideas are kept private.</p>',
        'createdAt':'2026-11-10T10:00:00.000Z','updatedAt':'2026-11-10T10:00:00.000Z'
    }]
    results={}
    context,page,errors=open_page(browser,seed={
        'orbit.phase1.tasks.v1':json.dumps([task]),
        'orbit.v5.journal':json.dumps(journal),
    })
    try:
        original=page.evaluate('JSON.stringify(window.orbitDebug.board.getLayout())')
        page.keyboard.press('Control+k')
        expect(page.locator('#orbit-jump-dialog')).to_be_visible()
        field=page.locator('.orbit-jump-input')
        field.fill('luminous')
        expect(page.locator('.orbit-jump-option')).to_have_count(1)
        expect(page.locator('.orbit-jump-option-title')).to_have_text(task['title'])
        page.keyboard.press('Enter')
        expect(page.locator('#orbit-jump-dialog')).not_to_be_visible()
        assert page.evaluate('window.orbitDebug.scene.expandedTaskId')==task['id']
        results['task']='PASS'

        page.keyboard.press('Control+k')
        page.locator('.orbit-jump-input').fill('Unsorted')
        page.keyboard.press('Enter')
        assert page.evaluate('window.orbitDebug.scene.focusedNode')=='inbox'
        results['branch']='PASS'

        page.keyboard.press('Control+k')
        page.locator('.orbit-jump-input').fill('Snowfall')
        page.keyboard.press('Enter')
        expect(page.locator('#journal-entry-title')).to_have_value('Snowfall Memory')
        assert page.evaluate('window.orbitDebug.journal.entries[window.orbitDebug.journal.index].id')==journal[0]['id']
        results['journal']='PASS'

        focus(page,'space')
        page.locator('#new-sticky').click()
        page.keyboard.press('Control+k')
        page.locator('.orbit-jump-input').fill('Untitled note')
        expect(page.locator('.orbit-jump-option')).to_have_count(1)
        page.keyboard.press('Enter')
        expect(page.locator('#orbit-jump-dialog')).not_to_be_visible()
        assert page.evaluate('document.activeElement?.classList.contains("sticky-note")') is True
        results['sticky']='PASS'

        # Live task capture and journal formatting retain existing shortcuts.
        page.locator('#capture-name').focus()
        page.keyboard.press('Control+k')
        expect(page.locator('#orbit-jump-dialog')).not_to_be_visible()
        page.evaluate("document.getElementById('capture-name').blur()")
        page.keyboard.press('Control+k')
        expect(page.locator('#orbit-jump-dialog')).to_be_visible()
        page.keyboard.press('Escape')
        expect(page.locator('#orbit-jump-dialog')).not_to_be_visible()
        results['shortcut-and-escape']='PASS'

        assert page.evaluate('JSON.stringify(window.orbitDebug.board.getLayout())')==original
        assert not errors, errors
        results['unchanged-spatial-layout']='PASS'
    finally:
        context.close()

    for size in [(390,844),(320,700)]:
        context,page,errors=open_page(browser,size=size)
        try:
            expect(page.locator('#orbit-jump-trigger')).to_be_visible()
            page.locator('#orbit-jump-trigger').click()
            expect(page.locator('#orbit-jump-dialog')).to_be_visible()
            box=page.locator('#orbit-jump-dialog').bounding_box()
            assert box and box['x']>=0 and box['x']+box['width']<=size[0]+1,box
            assert box['y']>=0 and box['y']+box['height']<=size[1]+1,box
            assert not errors,errors
            results[f'mobile-{size[0]}']='PASS'
        finally:
            context.close()
    return results
