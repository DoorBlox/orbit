"""SP-01B synthetic seventh-widget browser integration.

Exercises a real mounted DOM window using first-party board APIs. The widget
is intentionally a disposable test fixture, not shipped product UI.
"""
import json
from playwright.sync_api import expect

ADD_WIDGET = """() => {
  const board=window.orbitDebug.board;
  const element=document.createElement('section');
  element.id='sp01b-projects-fixture';
  element.className='glass-widget spatial-item';
  element.dataset.widget='projects';
  element.style.width='410px';
  element.style.height='280px';
  element.innerHTML= '<header class="widget-heading">' +
    '<button type="button" class="widget-grip" aria-label="Move Projects window">Move</button>' +
    '<h2>Projects fixture</h2></header><p>Private synthetic test fixture</p>';
  return board.registerWidget({
    id:'projects',position:{x:2250,y:250},
    limits:{minW:340,minH:230,maxW:1500,maxH:1800},icon:'◆'
  },element);
}"""

def run_extra_widget(browser, open_page, reload_page, out):
    context,page,errors=open_page(browser,(1280,800))
    result={'browser':'Chromium','syntheticOnly':True,'seventhMounted':False,
            'legacyLayoutUnchanged':False,'privateExtensionRoundTrip':False,
            'hiddenReopened':False,'reloadRestored':False}
    try:
        original=page.evaluate('() => window.orbitDebug.board.getLayout()')
        assert len(original)==6, 'Original V6 layout still has six known IDs'
        page.evaluate(ADD_WIDGET)
        assert page.locator('[data-widget="projects"]').count()==1
        assert page.locator('.spatial-item[data-widget]').count()>=7
        assert page.locator('.space-point-projects').count()==1
        assert page.evaluate('() => window.orbitDebug.board.widgets.size')==7
        assert page.evaluate('() => window.orbitDebug.board.getLayout()')==original
        dimensions=page.locator('[data-widget="projects"]').evaluate(
            'element => [element.offsetWidth,element.offsetHeight]')
        assert dimensions[0]>=410 and dimensions[1]>=280, dimensions
        result['seventhMounted']=True
        grip=page.locator('[data-widget="projects"] .widget-grip')
        grip.focus()
        grip.press('ArrowRight')
        handle=page.locator('[data-widget="projects"] .widget-resizer')
        handle.focus()
        handle.press('ArrowDown')
        state=page.evaluate('() => window.orbitDebug.board.getOptionalWidgetLayout().projects')
        assert state['x']==2274, state
        assert state['height']>=304, state
        assert state['hidden'] is False
        persist=page.evaluate("""() => JSON.parse(
          localStorage.getItem('orbit.v8.extensions')).spatialWidgets.projects""")
        assert persist==state, (persist,state)
        root=page.evaluate("""() => JSON.parse(
          localStorage.getItem('orbit.v5.spatial-layout')||'{}')""")
        assert 'projects' not in root
        assert page.evaluate('() => window.orbitDebug.board.getLayout()')==original
        result['legacyLayoutUnchanged']=True
        result['privateExtensionRoundTrip']=True

        page.locator('[data-widget="projects"] .widget-hide').click()
        expect(page.locator('[data-widget="projects"]')).to_be_hidden()
        expect(page.locator('.space-point-projects')).to_have_attribute(
            'aria-label','Reopen projects widget')
        assert page.evaluate('() => window.orbitDebug.board.getOptionalWidgetLayout().projects.hidden')
        page.screenshot(path=str(out/'sp01b-hidden.png'),animations='disabled')
        # A hidden widget remains discoverable from the actual Places map.
        page.locator('.space-point-projects').evaluate('element=>element.click()')
        expect(page.locator('[data-widget="projects"]')).to_be_visible()
        assert page.evaluate('() => window.orbitDebug.board.getOptionalWidgetLayout().projects.hidden') is False
        result['hiddenReopened']=True

        page.locator('[data-widget="projects"] .widget-hide').click()
        reload_page(page)
        assert page.evaluate('() => window.orbitDebug.board.getLayout()')==original
        restored=page.evaluate("""() => JSON.parse(
          localStorage.getItem('orbit.v8.extensions')).spatialWidgets.projects""")
        assert restored['hidden'] and restored['x']==2274
        page.evaluate(ADD_WIDGET)
        assert page.evaluate('() => window.orbitDebug.board.getOptionalWidgetLayout().projects')==restored
        expect(page.locator('[data-widget="projects"]')).to_be_hidden()
        page.locator('.space-point-projects').evaluate('element=>element.click()')
        expect(page.locator('[data-widget="projects"]')).to_be_visible()
        result['reloadRestored']=True
        page.screenshot(path=str(out/'sp01b-reopened.png'),animations='disabled')
        assert not errors,errors
    except Exception:
        page.screenshot(path=str(out/'sp01b-failure.png'),animations='disabled')
        raise
    finally:
        context.close()
    (out/'sp01b-results.json').write_text(json.dumps(result,indent=2)+'\n')
    return result
