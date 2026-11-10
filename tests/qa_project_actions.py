"""PJ-02A synthetic real-origin branch-to-project interaction and privacy QA.

Run through the existing ORBIT Chromium suite; only local synthetic workspace data.
"""
import json
import re
from playwright.sync_api import expect

EXTENSIONS='orbit.v8.extensions'
TASKS='orbit.phase1.tasks.v1'
BRANCHES='orbit.phase1.branches.v1'


def snapshot(page):
    return page.evaluate("""() => ({
      branches: JSON.parse(localStorage.getItem('orbit.phase1.branches.v1')),
      tasks: JSON.parse(localStorage.getItem('orbit.phase1.tasks.v1')),
      layout: window.orbitDebug.board.getLayout()
    })""")


def projects(page):
    return page.evaluate("""() => JSON.parse(
      localStorage.getItem('orbit.v8.extensions')||'{}').projects||{}""")


def run_project_actions(browser,open_page,reload_page,out):
    result={'realOrigin':True,'pointerMenu':False,'keyboardMenu':False,
            'privateOnly':False,'reload':False,'reversible':False,'phone':False}
    context,page,errors=open_page(browser,(1440,900))
    try:
        first=snapshot(page)
        page.evaluate("() => window.orbitDebug.scene.focusNode('research',{instant:true})")
        research=page.locator('.graph-node[data-id="research"]')
        research.click(button='right',force=True)
        menu=page.get_by_role('menu',name='Actions for Research')
        expect(menu).to_be_visible()
        menu.get_by_role('menuitem',name='Turn into project').focus()
        menu.get_by_role('menuitem',name='Turn into project').press('ArrowDown')
        expect(menu.get_by_role('menuitem',name='Add child branch')).to_be_focused()
        page.screenshot(path=str(out/'pj02a-menu-desktop.png'),animations='disabled')
        menu.get_by_role('menuitem',name='Turn into project').click()
        expect(page.locator('.graph-node[data-id="research"]')).to_have_class(re.compile('is-project'))
        assert projects(page)['research']=={'description':'','status':'active','links':[]}
        assert snapshot(page)==first, 'Project marking must not mutate tasks/branches/layout'
        result['pointerMenu']=True
        result['privateOnly']=True

        research=page.locator('.graph-node[data-id="research"]')
        research.get_by_role('button',name='More actions for Research').focus()
        research.get_by_role('button',name='More actions for Research').press('Enter')
        menu=page.get_by_role('menu',name='Actions for Research')
        expect(menu.get_by_role('menuitem',name='Remove project status')).to_be_visible()
        menu.press('Escape')
        expect(menu).to_have_count(0)
        expect(page.locator('.graph-node[data-id="research"] .node-more')).to_be_focused()
        research=page.locator('.graph-node[data-id="research"]')
        research.get_by_role('button',name='More actions for Research').click()
        page.get_by_role('menu',name='Actions for Research').get_by_role('menuitem',
            name='Remove project status').click()
        assert 'research' not in projects(page)
        expect(page.locator('.graph-node[data-id="research"]')).not_to_have_class(re.compile('is-project'))
        assert snapshot(page)==first
        result['reversible']=True

        page.evaluate("() => window.orbitDebug.scene.focusNode('researcher',{instant:true})")
        nested=page.locator('.graph-node[data-id="researcher"]')
        nested.focus()
        nested.press('Shift+F10')
        menu=page.get_by_role('menu',name='Actions for Research practice')
        expect(menu).to_be_visible()
        menu.get_by_role('menuitem',name='Turn into project').click()
        assert 'researcher' in projects(page)
        assert snapshot(page)==first
        result['keyboardMenu']=True
        reload_page(page)
        assert 'researcher' in projects(page)
        expect(page.locator('.graph-node[data-id="researcher"]')).to_have_class(re.compile('is-project'))
        assert snapshot(page)==first
        result['reload']=True
        assert not errors,errors
    except Exception:
        page.screenshot(path=str(out/'pj02a-failure.png'),animations='disabled')
        raise
    finally:
        context.close()

    context,page,errors=open_page(browser,(390,844),is_mobile=True,has_touch=True)
    try:
        page.evaluate("() => window.orbitDebug.scene.focusNode('research',{instant:true})")
        node=page.locator('.graph-node[data-id="research"]')
        node.focus()
        node.get_by_role('button',name='More actions for Research').press('Enter')
        menu=page.get_by_role('menu',name='Actions for Research')
        expect(menu).to_be_visible()
        bounds=menu.bounding_box()
        assert bounds and bounds['x']>=0 and bounds['y']>=0
        assert bounds['x']+bounds['width']<=395
        assert bounds['y']+bounds['height']<=849
        page.screenshot(path=str(out/'pj02a-menu-phone.png'),animations='disabled')
        menu.get_by_role('menuitem',name='Turn into project').click()
        assert 'research' in projects(page)
        result['phone']=True
        assert not errors,errors
    except Exception:
        page.screenshot(path=str(out/'pj02a-phone-failure.png'),animations='disabled')
        raise
    finally:
        context.close()
    (out/'pj02a-results.json').write_text(json.dumps(result,indent=2)+'\n')
    return result
