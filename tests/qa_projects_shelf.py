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
        card.get_by_role('button',name='Edit project brief for Research').click()
        card.get_by_role('textbox',name='Description for Research').fill(
            'A private plan; not a published portfolio item.')
        card.get_by_role('textbox',name='Goal or outcome for Research').fill(
            'Prepare a validated model')
        card.get_by_role('textbox',name='Next action for Research').fill(
            'Verify synthetic test fixtures')
        card.get_by_role('textbox',name='Blockers or decisions for Research').fill(
            'Await lab approval')
        card.get_by_label('Target date for Research').fill('2027-03-15')
        card.get_by_role('button',name='Save project brief').click()
        data=page.evaluate("""() => JSON.parse(localStorage.getItem(
          'orbit.v8.extensions')).projects.research""")
        assert data['status']=='paused'
        assert 'private plan' in data['description']
        assert data['goal']=='Prepare a validated model'
        assert data['nextAction']=='Verify synthetic test fixtures'
        assert data['blockers']=='Await lab approval'
        assert data['targetDate']=='2027-03-15'
        assert 'Prepare a validated model' in card.inner_text()
        assert 'Verify synthetic test fixtures' in card.inner_text()
        result['addAndEdit']=True
        # PJ-03 resource links: add/edit/delete through the private Projects UI,
        # reject unsafe schemes, then confirm reload and no public exposure.
        card.get_by_role('button',name='Edit resource links for Research').click()
        card.get_by_role('button',name='Add resource link').click()
        card.get_by_label('Resource label 1 for Research').fill('Lab protocol')
        card.get_by_label('Resource URL 1 for Research').fill('https://example.org/private/lab')
        card.get_by_role('button',name='Save resource links').click()
        expect(card.get_by_role('link',name='Lab protocol')).to_have_attribute(
            'href','https://example.org/private/lab')
        stored=page.evaluate("""() => JSON.parse(localStorage.getItem(
          'orbit.v8.extensions')).projects.research.links""")
        assert stored==[{'label':'Lab protocol','url':'https://example.org/private/lab'}],stored
        card.get_by_role('button',name='Edit resource links for Research').click()
        card.get_by_label('Resource URL 1 for Research').fill('javascript:alert(1)')
        card.get_by_role('button',name='Save resource links').click()
        expect(card.get_by_role('button',name='Save resource links')).to_be_visible()
        assert page.evaluate("""() => JSON.parse(localStorage.getItem(
          'orbit.v8.extensions')).projects.research.links[0].url""")=='https://example.org/private/lab'
        card.get_by_label('Resource URL 1 for Research').fill('https://example.org/revised')
        card.get_by_role('button',name='Save resource links').click()
        expect(card.get_by_role('link',name='Lab protocol')).to_have_attribute(
            'href','https://example.org/revised')
        card.get_by_role('button',name='Edit resource links for Research').click()
        card.get_by_role('button',name='Remove resource 1').click()
        card.get_by_role('button',name='Save resource links').click()
        assert page.evaluate("""() => JSON.parse(localStorage.getItem(
          'orbit.v8.extensions')).projects.research.links""")==[]
        result['privateState']=True

        # PJ-03 milestones are a private project checklist, distinct from
        # both the global calendar milestone store and task completion.
        progress_before=card.locator('.project-progress').inner_text()
        card.get_by_role('button',name='Edit milestones for Research').click()
        card.get_by_role('button',name='Add milestone').click()
        card.get_by_label('Milestone 1 title for Research').fill('Prototype verified')
        card.get_by_label('Milestone 1 target date for Research').fill('2027-04-25')
        card.get_by_role('button',name='Save milestones').click()
        expect(card.locator('.project-milestone-item')).to_have_count(1)
        expect(card.locator('.project-milestone-item')).to_contain_text('Prototype verified')
        assert '2027-04-25' in card.locator('.project-milestone-item').inner_text()
        assert card.locator('.project-progress').inner_text()==progress_before
        card.get_by_role('button',name='Edit milestones for Research').click()
        card.get_by_label('Milestone 1 title for Research').fill('Unsaved edit')
        card.get_by_role('button',name='Cancel milestone edits').click()
        assert 'Prototype verified' in card.locator('.project-milestone-item').inner_text()
        card.get_by_role('button',name='Edit milestones for Research').click()
        card.get_by_label('Milestone 1 completed for Research').check()
        card.get_by_role('button',name='Save milestones').click()
        expect(card.locator('.project-milestone-status')).to_have_text('Done')
        stored_milestones=page.evaluate("""() => JSON.parse(localStorage.getItem(
          'orbit.v8.extensions')).projects.research.milestones""")
        assert len(stored_milestones)==1 and stored_milestones[0]['done'] is True
        assert stored_milestones[0]['title']=='Prototype verified'
        assert stored_milestones[0]['targetDate']=='2027-04-25'
        assert card.locator('.project-progress').inner_text()==progress_before
        result['projectMilestones']=True

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

        # PJ-03: owner-selected health is not inferred from task progress.
        research=page.locator('.project-card[data-project-id="research"]')
        researcher=page.locator('.project-card[data-project-id="researcher"]')
        research.get_by_role('combobox',name='Health for Research').select_option('needs-attention')
        assert page.evaluate("""() => JSON.parse(localStorage.getItem(
          'orbit.v8.extensions')).projects.research.health""")=='needs-attention'
        assert research.locator('.project-progress').inner_text()==progress_before

        status_filter=page.get_by_role('combobox',name='Filter projects by status')
        finder=page.get_by_role('searchbox',name='Search private projects')
        status_filter.select_option('paused')
        expect(research).to_be_visible()
        expect(researcher).to_be_hidden()
        assert 'Showing 1 of 2' in page.locator('.projects-filter-count').inner_text()
        finder.fill('no such project')
        expect(page.locator('.projects-no-matches')).to_be_visible()
        finder.fill('')
        status_filter.select_option('all')
        expect(researcher).to_be_visible()
        finder.fill('prepare a validated model')
        expect(research).to_be_visible()
        expect(researcher).to_be_hidden()
        finder.fill('')
        expect(researcher).to_be_visible()
        # Transient filter switches hide DOM cards instead of rebuilding them;
        # unfinished project edits must still be there when the filter clears.
        research.get_by_role('button',name='Edit milestones for Research').click()
        research.get_by_label('Milestone 1 title for Research').fill('Not yet saved')
        finder.fill('no match here')
        expect(research).to_be_hidden()
        finder.fill('')
        expect(research).to_be_visible()
        expect(research.get_by_label('Milestone 1 title for Research')).to_have_value('Not yet saved')
        research.get_by_role('button',name='Cancel milestone edits').click()
        assert 'Prototype verified' in research.locator('.project-milestone-item').inner_text()
        assert page.evaluate('() => window.orbitDebug.board.getLayout()')==original
        result['finderHealth']=True

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
        assert page.evaluate("""() => JSON.parse(localStorage.getItem(
          'orbit.v8.extensions')).projects.research.targetDate""")=='2027-03-15'
        restored_milestones=page.evaluate("""() => JSON.parse(localStorage.getItem(
          'orbit.v8.extensions')).projects.research.milestones""")
        assert restored_milestones==stored_milestones
        assert page.evaluate("""() => JSON.parse(localStorage.getItem(
          'orbit.v8.extensions')).projects.research.health""")=='needs-attention'
        assert 'Await lab approval' in page.locator(
            '.project-card[data-project-id="research"]').inner_text()
        assert page.evaluate('() => window.orbitDebug.board.getLayout()')==original
        page.locator('.space-point-projects').evaluate('element=>element.click()')
        expect(page.locator('.project-card')).to_have_count(2)
        page.evaluate("() => window.orbitDebug.board.focus('projects',{initial:true})")
        page.screenshot(path=str(out/'pj02b-desktop-projects.png'),animations='disabled')
        # Removing a project milestone is scoped to the project metadata only.
        restored=page.locator('.project-card[data-project-id="research"]')
        restored.get_by_role('button',name='Edit milestones for Research').click()
        restored.get_by_role('button',name='Remove milestone 1').click()
        restored.get_by_role('button',name='Save milestones').click()
        expect(restored.locator('.project-milestone-item')).to_have_count(0)
        assert page.evaluate("""() => JSON.parse(localStorage.getItem(
          'orbit.v8.extensions')).projects.research.milestones""")==[]
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
