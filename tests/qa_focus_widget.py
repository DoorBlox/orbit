"""FO-01: first-party private Focus timer, real-origin synthetic Chromium acceptance."""
from playwright.sync_api import expect


def run_focus_widget(browser,open_page,reload_page,out):
    report={'widgetMounted':False,'legacyLayout':False,'clockRecovery':False,
            'noTickWrites':False,'hideReopen':False,'keyboard':False,'mobile':False}
    context,page,errors=open_page(browser,(1280,850))
    try:
        baseline=page.evaluate('() => window.orbitDebug.board.getLayout()')
        assert len(baseline)==6, 'The V6 six-widget root geometry must stay intact'
        assert page.locator('[data-widget="focus-timer"]').count()==1
        assert page.evaluate('() => window.orbitDebug.board.widgets.size')==8
        assert page.locator('.space-point-focus-timer').count()==1
        page.evaluate("() => window.orbitDebug.board.focus('focus-timer',{initial:true})")
        expect(page.get_by_role('heading',name='Focus.')).to_be_visible()
        expect(page.locator('#fo01-time')).to_have_text('25:00')
        expect(page.locator('#fo01-start')).to_be_enabled()
        report['widgetMounted']=True

        work=page.get_by_role('spinbutton',name='Focus · min')
        rest=page.get_by_role('spinbutton',name='Break · min')
        work.fill('1');work.press('Tab')
        rest.fill('1');rest.press('Tab')
        expect(page.locator('#fo01-time')).to_have_text('01:00')
        initial_extensions=page.evaluate("() => localStorage.getItem('orbit.v8.extensions')")
        start=page.get_by_role('button',name='Start',exact=True)
        start.focus();start.press('Enter')
        assert page.evaluate("() => window.orbitDebug.focusTimer.getState().status")=='running'
        assert page.locator('#fo01-status').inner_text()=='Focus session running.'
        assert page.evaluate("() => JSON.parse(sessionStorage.getItem('orbit.fo01.v1.local')).status")=='running'
        assert page.evaluate("() => localStorage.getItem('orbit.v8.extensions')")==initial_extensions, \
            'Starting the timer must not write the private cloud workspace'
        report['keyboard']=True

        page.locator('[data-widget="focus-timer"] .widget-hide').click()
        assert page.locator('[data-widget="focus-timer"]').is_hidden()
        assert page.evaluate("() => window.orbitDebug.focusTimer.getState().status")=='running'
        page.evaluate("() => window.orbitDebug.board.focus('space',{initial:true})")
        page.locator('#open-focus-timer').click()
        assert page.locator('[data-widget="focus-timer"]').is_visible()
        assert page.evaluate("""() => (
          window.orbitDebug.board.getOptionalWidgetLayout()['focus-timer'].hidden === false
        )""")
        assert page.evaluate('() => window.orbitDebug.board.getLayout()')==baseline
        report['hideReopen']=True
        report['legacyLayout']=True

        reload_page(page)
        assert page.evaluate("() => window.orbitDebug.focusTimer.getState().status")=='running'
        assert page.evaluate("() => window.orbitDebug.focusTimer.getState().workMinutes")==1
        seconds=page.evaluate("() => window.orbitDebug.focusTimer.getState().remainingMs")
        assert 0<seconds<=60_000,seconds
        page.evaluate("() => window.orbitDebug.board.focus('focus-timer',{initial:true})")
        pause=page.get_by_role('button',name='Pause',exact=True)
        pause.focus();pause.press('Enter')
        assert page.evaluate("() => window.orbitDebug.focusTimer.getState().status")=='paused'
        paused=page.evaluate("() => window.orbitDebug.focusTimer.getState().remainingMs")
        page.wait_for_timeout(1100)
        assert page.evaluate("() => window.orbitDebug.focusTimer.getState().remainingMs")==paused
        snapshot=page.evaluate("() => localStorage.getItem('orbit.v8.extensions')")
        page.locator('#fo01-reset').click()
        expect(page.locator('#fo01-time')).to_have_text('01:00')
        page.locator('#fo01-next').click()
        expect(page.locator('.focus-timer-phase')).to_have_text('BREAK INTERVAL')
        assert page.evaluate("() => localStorage.getItem('orbit.v8.extensions')")==snapshot
        assert page.evaluate("() => window.orbitDebug.board.getLayout()") == baseline
        report['clockRecovery']=True
        report['noTickWrites']=True
        assert not errors,errors
    finally:
        context.tracing.stop()
        context.close()

    mobile,page,errors=open_page(browser,(390,844),is_mobile=True,has_touch=True)
    try:
        page.evaluate("() => window.orbitDebug.board.focus('focus-timer',{initial:true})")
        expect(page.locator('#fo01-start')).to_be_visible()
        expect(page.locator('#fo01-time')).to_have_text('25:00')
        assert page.locator('.focus-timer-progress-fill').evaluate(
            "e => getComputedStyle(e).transitionDuration")=='0s'
        assert page.evaluate("() => window.orbitDebug.board.widgets.size")==8
        assert len(page.evaluate('() => window.orbitDebug.board.getLayout()'))==6
        assert not errors,errors
        report['mobile']=True
    finally:
        mobile.tracing.stop()
        mobile.close()
    return report
