"""M2.5 real-origin motion regressions with synthetic cloud transport only."""
import argparse
import json
import os
import shutil
import time
import traceback

from playwright.sync_api import sync_playwright, expect
import qa_m2 as qa


def interruption(page):
    result = page.evaluate('''async()=>{
      const {board:b,scene:s}=window.orbitDebug;
      const layout=JSON.stringify(b.getLayout());
      b.focus('journal');await new Promise(r=>setTimeout(r,100));
      b.viewport.dispatchEvent(new WheelEvent('wheel',{deltaY:120,bubbles:true,cancelable:true}));
      const pan={...b.pan},scale=b.scale;
      await new Promise(r=>setTimeout(r,600));
      if(JSON.stringify(b.pan)!==JSON.stringify(pan)||b.scale!==scale)throw Error('Board overwrote wheel pan');
      s.focusNode('inbox');await new Promise(r=>setTimeout(r,100));
      document.getElementById('zoom-in').click();const camera=s.getCamera();
      await new Promise(r=>setTimeout(r,600));
      if(JSON.stringify(s.getCamera())!==JSON.stringify(camera))throw Error('Graph overwrote zoom command');
      return {layoutUnchanged:layout===JSON.stringify(b.getLayout()),pan,camera};
    }''')
    assert result['layoutUnchanged'], result


def reduced_motion(page):
    page.evaluate('''()=>{
      const {board:b,scene:s}=window.orbitDebug;
      b.animate({x:40,y:-30,scale:.8},500);
      s.animateCamera({x:70,y:-20,scale:1.1},500);
      s.offsets.set('inbox',{x:100,y:20,vx:0,vy:0});s.startSpring();
    }''')
    page.wait_for_timeout(80)
    page.emulate_media(reduced_motion='reduce')
    qa.wait_until(page, '''(()=>{
      const {board:b,scene:s}=window.orbitDebug;
      return b.pan.x===40&&b.pan.y===-30&&b.scale===.8&&b.raf===0&&
        s.camera.x===70&&s.camera.y===-20&&s.camera.scale===1.1&&
        s.cameraAnimation===0&&s.springAnimation===0&&s.offsets.size===0;
    })()''')
    assert page.locator('.ambient-orb').first.evaluate('e=>getComputedStyle(e).animationName') == 'none'
    page.emulate_media(reduced_motion='no-preference')


def spring_settling(page):
    before = page.evaluate('''()=>{
      const s=window.orbitDebug.scene;
      const baseline={node:s.domNodes.get('inbox').style.transform,edges:s.edgeEntries.map(e=>e.path.getAttribute('d'))};
      s.offsets.set('inbox',{x:100,y:40,vx:0,vy:0});s.applyOffsets();s.startSpring();
      return baseline;
    }''')
    qa.wait_until(page, 'window.orbitDebug.scene.offsets.size===0&&window.orbitDebug.scene.springAnimation===0')
    after = page.evaluate('''()=>{
      const s=window.orbitDebug.scene;
      return {node:s.domNodes.get('inbox').style.transform,edges:s.edgeEntries.map(e=>e.path.getAttribute('d'))};
    }''')
    assert before == after, 'Nodes and connected edges did not return to their original geometry'


def touch_continuity(page):
    page.emulate_media(reduced_motion='reduce')
    points = page.evaluate('''()=>{
      const {board:b,scene:s}=window.orbitDebug;
      b.focus('constellation',{initial:true});s.fitAll();
      const r=s.viewport.getBoundingClientRect();
      const x=(Math.max(25,r.left+25)+Math.min(innerWidth-25,r.right-25))/2;
      const y=Math.max(110,r.top+35);
      return {x,y,hostScale:s.hostScale(),initialScale:s.camera.scale};
    }''')
    cdp = page.context.new_cdp_session(page)
    cdp.send('Emulation.setTouchEmulationEnabled', {'enabled':True,'maxTouchPoints':5})
    x, y = points['x'], points['y']
    one = {'id':1,'x':x-35,'y':y}
    two = {'id':2,'x':x+35,'y':y}
    touch_active = False
    try:
        cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[one,two]})
        touch_active = True
        qa.wait_until(page, 'window.orbitDebug.scene.pointerPositions.size===2')
        two = {**two,'x':x+60}
        cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[one,two]})
        qa.wait_until(page, f'window.orbitDebug.scene.camera.scale!=={points["initialScale"]}')
        before = page.evaluate('window.orbitDebug.scene.getCamera()')
        # CDP touchEnd names the released points, not the remaining points.
        cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[two]})
        qa.wait_until(page, 'window.orbitDebug.scene.pointerPositions.size===1&&window.orbitDebug.scene.gesture?.type==="pan"')
        lifted = page.evaluate('window.orbitDebug.scene.getCamera()')
        assert lifted == before, 'Finger lift jumped the camera'
        assert page.evaluate('window.orbitDebug.scene.gesture.type') == 'pan'
        one = {**one,'x':one['x']+24,'y':one['y']+12}
        cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[one]})
        # Chromium may coalesce touchMove until the next rendering opportunity.
        qa.wait_until(page, f'Math.abs(window.orbitDebug.scene.camera.x-({before["x"]}))>2')
        after = page.evaluate('window.orbitDebug.scene.getCamera()')
        assert abs(after['x']-before['x']-24/points['hostScale']) < 1, (before,after)
        assert abs(after['y']-before['y']-12/points['hostScale']) < 1, (before,after)
        assert after['scale'] == before['scale']
        cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
        touch_active = False
        assert page.evaluate('window.orbitDebug.scene.pointerPositions.size') == 0
        assert page.evaluate('window.orbitDebug.scene.gesture') is None
    finally:
        if touch_active:
            cdp.send('Input.dispatchTouchEvent', {'type':'touchCancel','touchPoints':[]})
        cdp.detach()
        page.emulate_media(reduced_motion='no-preference')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', action='store_true')
    args = parser.parse_args()
    qa.OUT.mkdir(exist_ok=True)
    results = []
    with qa.server(source=args.source), sync_playwright() as p:
        executable = None if os.environ.get('ORBIT_BROWSER_BUNDLED') else shutil.which('chromium')
        browser = p.chromium.launch(headless=True, executable_path=executable, args=['--no-sandbox'])
        for label, size in [('desktop',(1440,900)),('phone',(390,844))]:
            ctx, page, errors = qa.cloud_context(browser, size, 'owner', source=args.source)
            try:
                expect(page.locator('.cloud-mode')).to_have_text('Private owner space')
                page.emulate_media(reduced_motion='no-preference')
                for name, run in [('interruption',interruption),('reduced-motion',reduced_motion),('spring-settling',spring_settling),('touch-continuity',touch_continuity)]:
                    started = time.monotonic()
                    try:
                        run(page)
                        qa.assert_no_local_leak(page)
                        assert not page.evaluate('window.__m2Fixture.calls.some(c=>c.name==="save_owner_snapshot")')
                        assert not errors, errors
                        result = {'case':f'{name}-{label}','status':'PASS'}
                    except Exception:
                        result = {'case':f'{name}-{label}','status':'FAIL','traceback':traceback.format_exc()}
                    result['seconds'] = round(time.monotonic()-started,2)
                    results.append(result)
                    print(json.dumps(result), flush=True)
            finally:
                qa.close_context(ctx, page)
        browser.close()
    (qa.OUT/'m25-results.json').write_text(json.dumps(results,indent=2)+'\n')
    raise SystemExit(1 if any(r['status']=='FAIL' for r in results) else 0)


if __name__ == '__main__':
    main()
