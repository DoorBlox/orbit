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
                started = time.monotonic()
                try:
                    interruption(page)
                    qa.assert_no_local_leak(page)
                    assert not page.evaluate('window.__m2Fixture.calls.some(c=>c.name==="save_owner_snapshot")')
                    assert not errors, errors
                    result = {'case':f'interruption-{label}','status':'PASS'}
                except Exception:
                    result = {'case':f'interruption-{label}','status':'FAIL','traceback':traceback.format_exc()}
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
