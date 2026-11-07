import sys,json,math
from pathlib import Path
sys.path.insert(0,'/workspace/orbit/tests')
import qa_m2 as qa
from playwright.sync_api import sync_playwright,expect
out=Path('/workspace/orbit/docs/evidence/m2_5/discovery')
out.mkdir(parents=True,exist_ok=True)
results={}
with qa.server(source=True),sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for label,size in [('desktop',(1440,900)),('phone',(390,844))]:
  ctx,page,errors=qa.cloud_context(browser,size,'owner',source=True)
  try:
   expect(page.locator('.cloud-mode')).to_have_text('Private owner space')
   page.emulate_media(reduced_motion='no-preference')
   page.evaluate("window.orbitDebug.board.focus('constellation',{initial:true})")
   page.screenshot(path=str(out/f'{label}-baseline.png'))
   results[label]={}
   results[label]['board_wheel_during_navigation']=page.evaluate('''async()=>{
    const b=window.orbitDebug.board; const layout=JSON.stringify(b.getLayout());
    b.focus('journal');await new Promise(r=>setTimeout(r,100));
    const before={...b.pan};
    b.viewport.dispatchEvent(new WheelEvent('wheel',{deltaY:120,bubbles:true,cancelable:true}));
    const afterInput={...b.pan};await new Promise(r=>setTimeout(r,650));
    const afterSettle={...b.pan};
    // Independently calculate the no-input destination by requesting same focus instantly.
    b.focus('journal',{initial:true});const originalTarget={...b.pan};
    return {before,afterInput,afterSettle,originalTarget,
     manualDelta:afterInput.y-before.y,
     residualManualDelta:afterSettle.y-originalTarget.y,
     layoutUnchanged:JSON.stringify(b.getLayout())===layout};
   }''')
   results[label]['graph_zoom_during_navigation']=page.evaluate('''async()=>{
    const s=window.orbitDebug.scene;s.focusNode('inbox');await new Promise(r=>setTimeout(r,100));
    const before=s.getCamera();document.getElementById('zoom-in').click();
    const afterInput=s.getCamera();await new Promise(r=>setTimeout(r,600));
    const afterSettle=s.getCamera();s.focusNode('inbox',{instant:true});
    return {before,afterInput,afterSettle,originalTarget:s.getCamera()};
   }''')
   page.evaluate("window.orbitDebug.board.focus('constellation',{initial:true});window.orbitDebug.board.focus('journal')")
   page.wait_for_timeout(80)
   page.emulate_media(reduced_motion='reduce')
   results[label]['runtime_reduced_motion']=page.evaluate('''async()=>{
    const b=window.orbitDebug.board;const before={...b.pan};
    await new Promise(r=>setTimeout(r,90));
    const later={...b.pan};
    return {preference:matchMedia('(prefers-reduced-motion:reduce)').matches,
     before,later,continuedDistance:Math.hypot(later.x-before.x,later.y-before.y),
     ambientAnimation:getComputedStyle(document.querySelector('.ambient-orb')).animationName};
   }''')
   page.wait_for_timeout(600)
   results[label]['existing_reduced_navigation']=page.evaluate('''()=>{
    const b=window.orbitDebug.board;b.focus('active');const first={...b.pan};
    return {pan:first,ambientAnimation:getComputedStyle(document.querySelector('.ambient-orb')).animationName,
     mapFloatAnimation:getComputedStyle(document.querySelector('.map-float')).animationName};
   }''')
   results[label]['runtime_errors']=errors
   results[label]['mock_save_calls']=page.evaluate('window.__m2Fixture.calls.filter(c=>c.name==="save_owner_snapshot").length')
  finally:qa.close_context(ctx,page)
 browser.close()
x=100.0;v=0.0;n=0
while abs(x)+abs(v)>=.1 and n<1000:
 v=(v-x*.088)*.77;x+=v;n+=1
results['spring_source_equation_simulation']={'initialDisplacement':100,'framesToThreshold':n,'at60HzMs':n/60*1000,'at120HzMs':n/120*1000,'note':'Mathematical evaluation of existing per-frame recurrence, not physical-device measurement'}
(out/'observations.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
