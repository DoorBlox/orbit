"""PJ-02B real seventh private Projects window: real-origin Chromium synthetic QA."""
import json
from playwright.sync_api import expect

def run_projects_shelf(browser,open_page,reload_page,out):
    result={'seventhProductWindow':False,'addAndEdit':False,'nestedCounts':False,
            'privateState':False,'hideReopenReload':False,'mobile':False}
    context,page,errors=open_page(browser,(1440,900))
    try:
        original=page.evaluate('() => window.orbitDebug.board.getLayout()')
        assert len(original)==6
        assert page.locator('[data-widget="projects"]').count()==1
        assert page.evaluate('() => window.orbitDebug.board.widgets.size')==7
        page.evaluate("() => window.orbitDebug.board.focus('projects',{initial:true})")
        expect(page.get_by_role('heading',name='Projects.')).to_be_visible()
        expect(page.locator('#projects-empty')).to_be_visible()
        assert page.locator('.project-card').count()==0
        assert len(page.locator('.space-point-projects').all())==1
        result['seventhProductWindow']=True

        selector=page.get_by_role('combobox',name='Choose a branch for a private project')
        selector.select_option('research')
        page.get_by_role('button',name='Add private project').click()
        card=page.locator('.project-card[data-project-id="research"]')
        expect(card).to_be_visible()
        assert page.locator('.project-card').count()==1
        assert 'research' in page.evaluate("""() => JSON.parse(
          localStorage.getItem('orbit.v8.extensions')).projects""")
        card.get_by_role('combobox',name='Status for Research').select_option('paused')
        card.get_by_role('button',name='Edit description for Research').click()
        card.get_by_role('textbox',name='Description for Research').fill(
            'A private plan; not a published portfolio item.')
        card.get_by_role('button',name='Save description').click()
        data=page.evaluate("""() => JSON.parse(localStorage.getItem(
          'orbit.v8.extensions')).projects.research""")
        assert data['status']=='paused'
        assert 'private plan' in data['description']
        result['addAndEdit']=True
        result['privateState']=True

        # A nested project references the same work, without copying tasks.
        page.get_by_role('combobox',name='Choose a branch for a private project').select_option('researcher')
        page.get_by_role('button',name='Add private project').click()
        expect(page.locator('.project-card')).to_have_count(2)
        assert page.locator('.project-card[data-project-id="researcher"]').count()==1
        summary=page.locator('#projects-summary').inner_text()
        assert '2 projects' in summary,summary
        # The application model remains the source of truth, never the UI count.
        totals=page.evaluate("""() => ({
           branchIds:window.orbitDebug.scene.branches.map(b=>b.id),
           taskIds:window.orbitDebug.scene.tasks.map(t=>t.id),
           legacy:window.orbitDebug.board.getLayout()
        })""")
        assert totals['legacy']==original
        assert len(totals['branchIds'])>2 and len(totals['taskIds'])>2
        result['nestedCounts']=True

        page.locator('.project-card[data-project-id="researcher"]').get_by_role(
            'button',name='Open Research practice branch').click()
        assert page.evaluate("() => window.orbitDebug.scene.focusedNode")=='researcher'
        page.evaluate("() => window.orbitDebug.board.focus('projects',{initial:true})")
        page.locator('[data-widget="projects"] .widget-hide').click()
        expect(page.locator('[data-widget="projects"]')).to_be_hidden()
        expect(page.locator('.space-point-projects')).to_have_attribute(
            'aria-label','Reopen projects widget')
        page.locator('.space-point-projects').evaluate('element=>element.click()')
        expect(page.locator('[data-widget="projects"]')).to_be_visible()
        page.locator('[data-widget="projects"] .widget-hide').click()
        reload_page(page)
        expect(page.locator('[data-widget="projects"]')).to_be_hidden()
        assert page.evaluate("""() => JSON.parse(localStorage.getItem(
          'orbit.v8.extensions')).projects.research.status""")=='paused'
        assert page.evaluate('() => window.orbitDebug.board.getLayout()')==original
        page.locator('.space-point-projects').evaluate('element=>element.click()')
        expect(page.locator('.project-card')).to_have_count(2)
        page.evaluate("() => window.orbitDebug.board.focus('projects',{initial:true})")
        page.screenshot(path=str(out/'pj02b-desktop-projects.png'),animations='disabled')
        result['hideReopenReload']=True
        assert not errors,errors
    except Exception:
        page.screenshot(path=str(out/'pj02b-desktop-failure.png'),animations='disabled')
        raise
    finally:
        context.close()

    context,page,errors=open_page(browser,(390,844),is_mobile=True,has_touch=True)
    try:
        page.evaluate("() => window.orbitDebug.board.focus('projects',{initial:true})")
        expect(page.locator('[data-widget="projects"]')).to_be_visible()
        assert page.locator('[data-widget="projects"]').evaluate(
            'el=>[el.offsetWidth,el.offsetHeight]')[0]>=350
        page.get_by_role('combobox',name='Choose a branch for a private project').select_option('writing')
        page.get_by_role('button',name='Add private project').click()
        expect(page.locator('.project-card[data-project-id="writing"]')).to_be_visible()
        page.screenshot(path=str(out/'pj02b-phone-projects.png'),animations='disabled')
        result['mobile']=True
        assert not errors,errors
    except Exception:
        page.screenshot(path=str(out/'pj02b-phone-failure.png'),animations='disabled')
        raise
    finally:
        context.close()
    (out/'pj02b-results.json').write_text(json.dumps(result,indent=2)+'\n')
    return result
