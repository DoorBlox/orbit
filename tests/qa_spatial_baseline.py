"""BP-06: synthetic spatial layout evidence, never a signed-in account capture.

Called from the existing M1 Playwright runner so no second Chromium or server
is started. PNGs and JSON are seven-day CI artifacts, not committed private data.
"""
import json
import math

CORE_WIDGETS = ('timeline','constellation','active','completed','space','journal')
VIEWPORTS = (
    ('desktop', 1440, 900),
    ('tablet', 768, 1024),
    ('phone', 390, 844),
    ('narrow', 320, 700),
    ('landscape', 844, 390),
)
THEMES = (
    'parchment','garden','frost','celestial','ember',
    'tidepool','sundown','sakura','graphite','linen',
)

def _core_assertions(page):
    board = page.evaluate("() => window.orbitDebug.board.getLayout()")
    for wid in CORE_WIDGETS:
        assert wid in board, f'Missing original widget position: {wid}'
        assert all(math.isfinite(board[wid][key]) for key in ('x','y')), (wid, board[wid])
        assert page.locator(f'[data-widget="{wid}"]').count() == 1, wid
        assert page.locator(f'[data-widget="{wid}"] .widget-grip').count() == 1, wid
        assert page.locator(f'.space-point-{wid}').count() == 1, wid
    # More than six is explicitly allowed. Never reintroduce a hard widget cap.
    assert page.locator('[data-widget]').count() >= len(CORE_WIDGETS)
    return board

def _focus_recovery(page, wid, focus, width, height):
    # Verify the same focus/visibility path used by keyboard navigation, rather
    # than assuming a widget's persisted world coordinates are on screen.
    focus(page, wid)
    grip = page.locator(f'[data-widget="{wid}"] .widget-grip')
    grip.focus()
    page.evaluate("""id => {
      const handle = document.querySelector('[data-widget="' + id + '"] .widget-grip');
      window.orbitDebug.board.ensureVisible(handle);
    }""", wid)
    rect = grip.bounding_box()
    assert rect is not None, f'No recovery target for {wid}'
    assert rect['x'] + rect['width'] > 0 and rect['x'] < width, (wid, rect)
    assert rect['y'] + rect['height'] > 0 and rect['y'] < height, (wid, rect)
    frame = page.evaluate("""() => ({
      scale:window.orbitDebug.board.scale,
      x:window.orbitDebug.board.pan.x,
      y:window.orbitDebug.board.pan.y
    })""")
    assert 0.05 <= frame['scale'] <= 2.21, (wid, frame)
    assert all(math.isfinite(frame[key]) for key in ('x','y')), (wid, frame)
    return {'widget':wid, 'cameraScale':round(frame['scale'],4),
            'gripInViewport':True}

def run_baseline(browser, open_page, focus, reload_page, out):
    """Return limited metadata; screenshots contain only the disposable prototype."""
    results={'kind':'BP-06 synthetic Chromium source baseline',
             'notVerified':['real browser zoom','Safari/iOS','Android Chrome',
                            'owner-signed-in media','screen reader','Production'],
             'coreWidgets':list(CORE_WIDGETS),'viewportCases':[],
             'themeCases':[], 'textScaleSimulations':[]}
    for label, width, height in VIEWPORTS:
        context,page,errors=open_page(browser,(width,height),
            is_mobile=width < 700,has_touch=width < 700)
        try:
            original=_core_assertions(page)
            recovery=[_focus_recovery(page,wid,focus,width,height) for wid in CORE_WIDGETS]
            assert page.evaluate('() => window.orbitDebug.board.getLayout()') == original, (
                label, 'Navigation unexpectedly changed persisted widget positions')
            focus(page,'constellation')
            page.screenshot(path=str(out/f'bp06-{label}-constellation.png'),
                            animations='disabled')
            focus(page,'space')
            page.screenshot(path=str(out/f'bp06-{label}-space.png'),
                            animations='disabled')
            reload_page(page)
            assert _core_assertions(page)==original, (
                label,'Legacy widget coordinates or dimensions changed after reload')
            assert not errors, (label,errors)
            results['viewportCases'].append({'name':label,'width':width,
                'height':height,'recoveredWidgets':len(recovery),
                'legacyLayoutRoundTrip':True,'additionalWidgetsAllowed':True})
        except Exception:
            page.screenshot(path=str(out/f'bp06-{label}-failure.png'),
                            animations='disabled')
            raise
        finally:
            context.close()

    context,page,errors=open_page(browser,(1440,900))
    try:
        original=_core_assertions(page)
        focus(page,'space')
        for name in THEMES:
            page.locator(f'input[name="space-theme"][value="{name}"]').evaluate(
                'element => element.click()')
            assert page.evaluate("document.documentElement.dataset.theme")==name
            assert page.evaluate('() => window.orbitDebug.board.getLayout()')==original
            page.screenshot(path=str(out/f'bp06-theme-{name}.png'),
                            animations='disabled')
            results['themeCases'].append(name)
        assert not errors, errors
    finally:
        context.close()

    context,page,errors=open_page(browser,(390,844),is_mobile=True,has_touch=True)
    try:
        original=_core_assertions(page)
        for percent in (174,200):
            # CSS text enlargement is a controlled stress simulation, not actual
            # browser chrome zoom or page-scale emulation.
            page.add_style_tag(content=(
                'button,input,textarea,[contenteditable]{font-size:'
                f'{percent}%!important;line-height:1.35!important}}'))
            focus(page,'journal')
            grip=page.locator('[data-widget="journal"] .widget-grip')
            grip.focus()
            page.evaluate("""() => window.orbitDebug.board.ensureVisible(
              document.querySelector('[data-widget="journal"] .widget-grip'))""")
            rect=grip.bounding_box()
            assert rect and 0 <= rect['x'] + rect['width'] and rect['x'] < 390
            assert rect['y'] + rect['height'] > 0 and rect['y'] < 844
            page.screenshot(path=str(out/f'bp06-text-{percent}.png'),
                            animations='disabled')
            assert page.evaluate('() => window.orbitDebug.board.getLayout()') == original
            results['textScaleSimulations'].append(percent)
        assert not errors, errors
    finally:
        context.close()
    (out/'bp06-results.json').write_text(json.dumps(results,indent=2)+'\n')
    return {'viewportCases':len(results['viewportCases']),
            'themes':len(results['themeCases']),
            'textStressCases':len(results['textScaleSimulations']),
            'syntheticOnly':True}
