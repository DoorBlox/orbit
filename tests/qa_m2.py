"""M2 real-origin wiring checks with a MOCKED Supabase SDK/transport.

Run after npm run build: python tests/qa_m2.py
No live OAuth, database, RLS or provider endpoint is exercised. The production
runtime config/client modules are route-replaced only inside isolated Playwright
contexts. Legacy localStorage is seeded with synthetic private sentinel content;
cloud mode must neither read nor upload it automatically. Python requirements
are shared with tests/qa_m1.py. Browser can use CHROMIUM_PATH.
"""
import argparse
from contextlib import contextmanager
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
import traceback
import urllib.request
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa'
BASE='http://127.0.0.1:4197'
TASK_KEY='orbit.phase1.tasks.v1'
JOURNAL_KEY='orbit.v5.journal'
LOCAL_SECRET='SYNTHETIC LOCAL PRIVATE NEVER UPLOAD'
OWNER_SECRET='SYNTHETIC OWNER PRIVATE CLOUD'
PUBLIC_TEXT='Explicitly published synthetic task'
OWNER_ID='11111111-1111-4111-8111-111111111111'
MEDIA_REF=OWNER_ID+'/22222222-2222-4222-8222-222222222222.png'
MEDIA_DETACHED=OWNER_ID+'/33333333-3333-4333-8333-333333333333.png'
STAMP='2026-11-01T12:00:00Z'
OWNER_SNAPSHOT={
    'branches':[{'id':'inbox','parentId':'root','label':'Unsorted'},{'id':'just-because','parentId':'root','label':'Just Because'}],
    'tasks':[{'id':'cloud-task','projectId':'inbox','title':OWNER_SECRET,'status':'ready','urgency':2}],
    'journalEntries':[{'id':'cloud-journal','title':'Synthetic private page','date':'2026-11-01','html':'<p>Synthetic cloud journal text</p>','createdAt':STAMP,'updatedAt':STAMP}],
    'milestones':[],'spatialLayout':{},'preferences':{'colorMode':'deadline'},'profile':{'displayName':'Synthetic owner'},
}
PUBLIC_ROWS=[
    {'id':'pub-task','kind':'task','title':PUBLIC_TEXT,'excerpt':'Approved excerpt only','published_date':'2026-11-01','updated_at':STAMP,
     'owner_id':OWNER_ID,'body_html':OWNER_SECRET},
    {'id':'pub-journal','kind':'journal','title':'Published synthetic page','excerpt':'Literal <img src=x onerror="window.__m2Xss=1">\nSecond public line','published_date':'2026-11-01','updated_at':STAMP},
]
SDK_MODULE=r'''
export async function createCloudClient(){
  const fixture=window.__m2Fixture;
  const request=(data)=>({
    select(columns){fixture.calls.push({type:'select',columns});return this;},
    order(){return this;},abortSignal(){return this;},
    then(resolve,reject){return Promise.resolve({data,error:null}).then(resolve,reject);}
  });
  const client={
    auth:{
      async getUser(){fixture.calls.push({type:'getUser'});if(fixture.delayAuth)await new Promise(resolve=>setTimeout(resolve,fixture.delayAuth));return {data:{user:fixture.user},error:null};},
      onAuthStateChange(callback){fixture.listener=callback;return {data:{subscription:{unsubscribe(){fixture.unsubscribed=true;}}}};},
      async signInWithPassword(){fixture.calls.push({type:'password-login'});if(fixture.passwordError)return {error:fixture.passwordError};fixture.user={id:'11111111-1111-4111-8111-111111111111'};fixture.listener('SIGNED_IN',{user:fixture.user});return {error:null};},
      async signInWithOtp(options){fixture.calls.push({type:'otp-request',existingOnly:options.options.shouldCreateUser===false});return {error:fixture.otpSendError||null};},
      async verifyOtp(options){fixture.calls.push({type:'otp-verify',emailType:options.type==='email'});if(fixture.otpVerifyError)return {error:fixture.otpVerifyError};fixture.user={id:'11111111-1111-4111-8111-111111111111'};fixture.listener('SIGNED_IN',{user:fixture.user});return {error:null};},
      async signInWithOAuth(options){fixture.calls.push({type:'oauth',options});return {data:{url:'https://mock.invalid'},error:null};},
      async signOut(){fixture.calls.push({type:'logout'});if(fixture.failSignOutOnce){fixture.failSignOutOnce=false;return {error:{message:'synthetic outage'}};}fixture.user=null;fixture.listener('SIGNED_OUT',null);return {error:null};}
    },
    rpc(name,args){
      fixture.calls.push({type:'rpc',name,args});
      if(name==='orbit_owner_access'||name==='orbit_workspace_access')return request(fixture.allowed);
      if(name==='load_owner_snapshot'){
        if(fixture.deferLoad)return new Promise(resolve=>{fixture.resolveLoad=()=>resolve({data:{revision:fixture.revision+1,snapshot:fixture.snapshot},error:null});});
        return request({revision:fixture.revision,snapshot:fixture.snapshot});
      }
      if(name==='save_owner_snapshot'){
        fixture.snapshot=structuredClone(args.p_snapshot);fixture.revision++;
        if(fixture.deferSave){const revision=fixture.revision;return new Promise(resolve=>{fixture.saveResolvers??=[];fixture.saveResolvers.push(()=>resolve({data:{revision},error:null}));});}
        return request({revision:fixture.revision});
      }
      if(name==='publish_content')return request(fixture.publicRows[0]);
      if(name==='unpublish_content')return request(null);
      return Promise.resolve({data:null,error:{code:'42501'}});
    },
    storage:{
      from(bucket){
        fixture.calls.push({type:'storage-bucket',bucket});
        return {
          async list(prefix,{limit,offset}){
            fixture.calls.push({type:'media-list',prefix,limit,offset});
            if(fixture.failMediaList)return {data:null,error:{message:'simulated list outage'}};
            const rows=(fixture.mediaFiles??[]).slice(offset,offset+limit);
            return {data:rows.map(file=>({
              id:file.name,name:file.name,created_at:'2026-11-11T12:00:00Z',
              metadata:{size:77}
            })),error:null};
          },
          async download(path){
            fixture.calls.push({type:'media-download',path});
            if(fixture.failMediaDownload)return {data:null,error:{message:'simulated image outage'}};
            const owner=path.split('/')[0],name=path.split('/')[1];
            if(owner!==fixture.user?.id||!(fixture.mediaFiles??[]).some(file=>file.name===name))
              return {data:null,error:{message:'no owner image'}};
            const encoded='iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGPckhf6n4GBgYGJAQoAJfcCekGmhhoAAAAASUVORK5CYII=';
            return {data:new Blob([Uint8Array.from(atob(encoded),letter=>letter.charCodeAt(0))],
              {type:'image/png'}),error:null};
          },
          async upload(){fixture.calls.push({type:'media-upload'});return {error:{message:'no fixture uploads'}};}
        };
      }
    },
    from(table){fixture.calls.push({type:'from',table});return request(fixture.publicRows);}
  };
  fixture.emit=(event,user)=>{fixture.user=user;fixture.listener(event,user?{user}:null);};
  return client;
}
'''

def ensure_journal_edit(page):
    if page.locator('#journal-widget').get_attribute('data-journal-view') != 'edit':
        page.locator('#journal-edit-toggle').click()
    expect(page.locator('#journal-editor')).to_have_attribute('contenteditable','true')

@contextmanager
def server(source=False):
    with (OUT/'m2-server.log').open('w') as log:
        proc=subprocess.Popen(['node','scripts/dev-server.mjs']+([] if source else ['--dist']),cwd=ROOT,
            env={**os.environ,'PORT':'4197'},stdout=log,stderr=log)
        try:
            for _ in range(60):
                if proc.poll() is not None:raise RuntimeError('M2 local server exited; see qa/m2-server.log')
                try:
                    with urllib.request.urlopen(BASE,timeout=1) as response:assert response.status==200
                    break
                except OSError:time.sleep(.1)
            else:raise RuntimeError('M2 local server unavailable')
            yield
        finally:
            proc.terminate()
            try:proc.wait(timeout=5)
            except subprocess.TimeoutExpired:proc.kill();proc.wait()


def cloud_context(browser,size,mode,public=False,source=False,snapshot=None,legacy_seed=None):
    ctx=browser.new_context(viewport={'width':size[0],'height':size[1]},reduced_motion='reduce',timezone_id='Asia/Jakarta',accept_downloads=True)
    ctx.tracing.start(screenshots=True,snapshots=True)
    config={'supabaseUrl':'https://synthetic.supabase.co','publishableKey':'sb_publishable_synthetic_fixture','siteUrl':BASE+'/', 'publicRelease':public}
    ctx.route('**/src/runtime-config.js',lambda route:route.fulfill(status=200,content_type='text/javascript',body='export const runtimeConfig='+json.dumps(config)+';'))
    ctx.route('**/src/cloud/client.js',lambda route:route.fulfill(status=200,content_type='text/javascript',body=SDK_MODULE))
    if source:
        # Diagnostic source mode predates build entry rewriting; final evidence uses dist.
        def index(route):
            response=route.fetch();body=response.text().replace('src="./src/app.js"','src="./src/bootstrap.js"')
            route.fulfill(response=response,body=body)
        ctx.route(BASE+'/',index)
    fixture={'user':None if mode=='signed-out' else {'id':OWNER_ID if mode=='owner' else '22222222-2222-4222-8222-222222222222'},
        'allowed':mode=='owner','snapshot':OWNER_SNAPSHOT if snapshot is None else snapshot,'publicRows':PUBLIC_ROWS,'revision':1,'calls':[],'delayAuth':100}
    initial={'orbit.phase1.branches.v1':json.dumps([{'id':'inbox','parentId':'root','label':'Synthetic local inbox'},{'id':'just-because','parentId':'root','label':'Just Because'}]),TASK_KEY:json.dumps([{'id':'private-local','title':LOCAL_SECRET,'projectId':'inbox'}]),
        JOURNAL_KEY:json.dumps([{'id':'local-j','title':LOCAL_SECRET,'date':'2026-11-01','html':'<p>SYNTHETIC UNPUBLISHED LOCAL JOURNAL BODY</p>'}])}
    initial.update(legacy_seed or {})
    ctx.add_init_script('''(() => {
      window.__m2Fixture=%s;
      window.__m2InitialUserId=window.__m2Fixture.user?.id ?? null;
      for(const [key,value] of Object.entries(%s))localStorage.setItem(key,value);
      window.__m2LocalAccess=[];
      for(const name of ['getItem','setItem','removeItem']){
        const original=Storage.prototype[name];
        Storage.prototype[name]=function(...args){
          if(this===window.localStorage)window.__m2LocalAccess.push({method:name,key:args[0],userId:window.__m2Fixture.user?.id ?? null});
          return original.apply(this,args);
        };
      }
    })()''' % (json.dumps(fixture),json.dumps(initial)))
    page=ctx.new_page();page.set_default_timeout(8000)
    errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(BASE,wait_until='domcontentloaded')
    return ctx,page,errors


def close_context(ctx,page):
    if sys.exc_info()[0] is not None:
        label=f'm2-failure-{sys._getframe(1).f_code.co_name}-{page.viewport_size["width"]}'
        try:
            page.screenshot(path=str(OUT/f'{label}.png'))
            traces=ROOT/'test-results';traces.mkdir(exist_ok=True)
            ctx.tracing.stop(path=str(traces/f'{label}.zip'))
        except Exception:
            # Preserve the original assertion if the browser already closed.
            pass
    ctx.close()


def wait_until(page,expression,timeout=8000):
    # Poll through CDP evaluate; Playwright wait_for_function uses eval and would
    # require weakening the product CSP. Keep the real security header intact.
    deadline=time.monotonic()+timeout/1000
    while time.monotonic()<deadline:
        if page.evaluate(expression):return
        page.wait_for_timeout(30)
    raise AssertionError('Timed out waiting for synthetic browser condition')


def assert_pointer_reachable(page,selector):
    reachable=page.locator(selector).evaluate("""element => {
      const rect=element.getBoundingClientRect(),x=rect.x+rect.width/2,y=rect.y+rect.height/2;
      const hit=document.elementFromPoint(x,y);
      return {reachable:x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&Boolean(hit&&(hit===element||element.contains(hit))),rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},hit:hit?.id||hit?.className||null};
    }""")
    assert reachable['reachable'],f'{selector} is obscured or outside the viewport: {reachable}'


def assert_no_local_leak(page):
    # Cloud content must never use legacy local keys. A signed-in user's
    # non-content branch disclosure preference is the sole allowed exception.
    accesses=page.evaluate('window.__m2LocalAccess')
    # Attribute each access to its user at the time: signup/logout can change identity.
    allowed_key=f'orbit.v7.collapsed-branches.{OWNER_ID}'
    unexpected=[a for a in accesses if a.get('userId')!=OWNER_ID or a.get('key')!=allowed_key or a.get('method') not in ('getItem','setItem')]
    assert not unexpected,f'Unexpected local-storage access: {unexpected}'
    calls=page.evaluate('window.__m2Fixture.calls')
    assert LOCAL_SECRET not in json.dumps(calls),'Local private content reached mocked SDK'
    assert LOCAL_SECRET not in page.locator('body').inner_text()


def gate_case(browser,size,mode,source):
    ctx,page,errors=cloud_context(browser,size,mode,source=source)
    try:
        expect(page.locator('#app')).to_be_hidden()
        expect(page.locator('.cloud-gate')).to_be_visible()
        message='Sign in to open' if mode=='signed-out' else 'cannot open the private space'
        expect(page.locator('.cloud-gate-message')).to_contain_text(message)
        assert page.locator('#app').inner_text()==''
        assert page.evaluate('Boolean(window.orbitDebug)') is False
        calls=page.evaluate('window.__m2Fixture.calls')
        assert not any(call.get('name') in ['load_owner_snapshot','save_owner_snapshot'] for call in calls)
        assert_no_local_leak(page)
        screenshot=OUT/f'm2-{mode}-{size[0]}.png';page.screenshot(path=str(screenshot))
        expect(page.get_by_role('button',name='Continue with Google',exact=True)).to_be_enabled()
        page.get_by_label('Email address',exact=True).fill('synthetic@example.invalid')
        page.get_by_label('Password',exact=True).fill('synthetic-password')
        page.get_by_role('button',name='Sign in with password',exact=True).click()
        expect(page.locator('.cloud-gate-message')).to_contain_text('cannot open the private space')
        assert page.locator('#app').inner_text()==''
        assert page.get_by_label('Password',exact=True).input_value()==''
        assert page.evaluate("window.__m2Fixture.calls.some(call=>call.type==='password-login')")
        assert not errors,errors
    finally:close_context(ctx,page)


def owner_case(browser,size,source):
    ctx,page,errors=cloud_context(browser,size,'owner',source=source)
    try:
        expect(page.locator('.cloud-mode')).to_have_text('Private workspace')
        expect(page.locator('#app')).to_be_visible()
        assert page.locator('#space-widget > .cloud-toolbar').count()==1
        assert not page.evaluate("document.body.classList.contains('cloud-connected')"), 'No viewport height is reserved for the removed dock'
        expect(page.locator('#active-task-list')).to_contain_text(OWNER_SECRET)
        assert page.evaluate('window.orbitDebug.state.tasks')==1
        assert_pointer_reachable(page,'#board-zoom-in')
        assert_no_local_leak(page)
        calls=page.evaluate('window.__m2Fixture.calls')
        assert not any(call.get('name')=='save_owner_snapshot' for call in calls),'Hydration must not auto-upload local/demo state'
        page.evaluate("window.orbitDebug.board.focus('constellation',{initial:true})")
        assert_pointer_reachable(page,'#capture-name')
        page.locator('#capture-name').fill('Synthetic owner added task')
        page.locator('#capture-name').press('Enter')
        wait_until(page,"window.__m2Fixture.calls.some(call=>call.name==='save_owner_snapshot')")
        expect(page.locator('.cloud-sync-state')).to_have_text('Saved to your cloud')
        saved=page.evaluate("window.__m2Fixture.calls.filter(call=>call.name==='save_owner_snapshot').at(-1).args.p_snapshot")
        assert any(task['title']=='Synthetic owner added task' for task in saved['tasks'])
        assert LOCAL_SECRET not in json.dumps(saved)
        assert_no_local_leak(page)
        page.evaluate("window.orbitDebug.board.focus('space',{initial:true})")
        # Rename is deliberately a secondary action: reveal the keyboard-accessible
        # Manage space disclosure as an actual user would, instead of bypassing it.
        expect(page.locator('.space-manage')).not_to_have_attribute('open', '')
        page.locator('.space-manage > summary').click()
        expect(page.locator('#rename-space')).to_be_visible()
        page.locator('#rename-space').click()
        page.locator('#space-name-input').fill('My Starfield')
        page.locator('#space-name-form').get_by_role('button',name='Save name').click()
        expect(page.locator('.root-name')).to_have_text('My Starfield')
        wait_until(page,"window.__m2Fixture.calls.some(c=>c.name==='save_owner_snapshot' && c.args.p_snapshot.profile.displayName==='My Starfield')")
        expect(page.locator('.cloud-sync-state')).to_have_text('Saved to your cloud')
        page.screenshot(path=str(OUT/f'm2-owner-{size[0]}.png'))
        page.evaluate("window.orbitDebug.board.focus('space',{initial:true})")
        page.locator('.cloud-account-details').evaluate('details => { details.open = true; }')
        page.locator('.cloud-toolbar').get_by_role('button',name='Sign out',exact=True).click()
        expect(page.locator('#app')).to_be_hidden()
        expect(page.locator('.cloud-gate-message')).to_contain_text('Sign in to open')
        assert page.locator('#app').inner_text()==''
        assert OWNER_SECRET not in page.locator('body').inner_text()
        assert page.evaluate('Boolean(window.orbitDebug)') is False
        assert_no_local_leak(page)
        assert not errors,errors
    finally:close_context(ctx,page)


def visitor_case(browser,size,source):
    ctx,page,errors=cloud_context(browser,size,'signed-out',public=True,source=source)
    try:
        expect(page.locator('.cloud-mode')).to_have_text('Published space · read only')
        expect(page.locator('#app')).to_be_visible()
        expect(page.locator('#active-task-list')).to_contain_text(PUBLIC_TEXT)
        assert OWNER_SECRET not in page.locator('#app').inner_text()
        assert page.evaluate('window.orbitDebug.state.tasks')==1
        expect(page.locator('#capture-name')).to_be_disabled()
        expect(page.locator('#journal-editor')).to_have_attribute('contenteditable','false')
        for selector in ['.node-actions button','.task-actions button','.rail-check','.widget-resizer','.widget-grip']:
            assert page.locator(selector).evaluate_all('(elements)=>elements.every(el=>el.disabled)'),selector
        calls=page.evaluate('window.__m2Fixture.calls')
        assert [c['table'] for c in calls if c['type']=='from']==['published_content']
        assert not any(c.get('name') in ['load_owner_snapshot','save_owner_snapshot'] for c in calls)
        selected=[c['columns'] for c in calls if c['type']=='select']
        assert selected==['id,kind,title,excerpt,published_date,updated_at']
        page.evaluate("window.orbitDebug.board.focus('journal',{initial:true})")
        expect(page.locator('#journal-editor')).to_contain_text('Literal <img src=x')
        assert page.locator('#journal-editor img,#journal-editor script,#journal-editor [onerror]').count()==0
        assert page.evaluate('window.__m2Xss||null') is None
        assert_no_local_leak(page)
        page.screenshot(path=str(OUT/f'm2-visitor-{size[0]}.png'))
        assert not errors,errors
    finally:close_context(ctx,page)


def owner_lifecycle_case(browser,source):
    empty={'branches':[],'tasks':[],'journalEntries':[],'milestones':[],'spatialLayout':{},'preferences':{'colorMode':'deadline'}}
    ctx,page,errors=cloud_context(browser,(390,844),'owner',source=source,snapshot=empty)
    try:
        expect(page.locator('.cloud-mode')).to_have_text('Private workspace')
        assert page.evaluate('window.orbitDebug.state.tasks')==0
        expect(page.locator('#active-count')).to_have_text('0')
        assert not any(call.get('name')=='save_owner_snapshot' for call in page.evaluate('window.__m2Fixture.calls'))
        assert_no_local_leak(page)
        page.evaluate("window.__m2Fixture.emit('SIGNED_OUT',null)")
        expect(page.locator('.cloud-gate-message')).to_contain_text('session ended')
        expect(page.locator('#app')).to_be_hidden()
        assert page.locator('#app').inner_text()==''
        assert page.evaluate('Boolean(window.orbitDebug)') is False
        assert not errors,errors
    finally:close_context(ctx,page)


def private_gallery_case(browser,source,width=390):
    snapshot={**OWNER_SNAPSHOT,'extensions':{'journalImages':{'cloud-journal':MEDIA_REF}}}
    ctx,page,errors=cloud_context(browser,(width,844 if width<500 else 900),'owner',
        source=source,snapshot=snapshot)
    try:
        expect(page.locator('.cloud-mode')).to_have_text('Private workspace')
        page.evaluate("""() => {window.__m2Fixture.mediaFiles=[
          {name:'22222222-2222-4222-8222-222222222222.png'},
          {name:'33333333-3333-4333-8333-333333333333.png'}
        ];}""")
        page.locator('.cloud-account-details').evaluate('details => { details.open = true; }')
        page.locator('.cloud-owner-panel summary').click()
        page.get_by_text('Private image library',exact=True).click()
        cards=page.locator('.private-gallery-card')
        expect(cards).to_have_count(2)
        expect(cards.first.locator('.private-gallery-reference-count')).to_contain_text('1 saved reference')
        expect(cards.last.locator('.private-gallery-reference-count')).to_contain_text('Detached')
        expect(cards.first.get_by_role('checkbox')).to_have_count(0)
        detached=cards.last.get_by_role('checkbox',name='Include detached image 2 in backup')
        expect(detached).not_to_be_checked()
        assert page.get_by_role('button',name='Delete physical file').count()==0
        assert not page.evaluate('window.__m2Fixture.calls.some(c => c.type==="media-upload")')
        with page.expect_download() as normal:
            page.get_by_role('button',name='Download full backup (with images)',exact=True).click()
        normal_path=normal.value.path()
        normal_archive=json.loads(Path(normal_path).read_text())
        assert normal_archive['manifest']['assetCount']==1
        assert 'libraryOnlyPaths' not in normal_archive['manifest']
        assert normal_archive['assets'][0]['path']==MEDIA_REF
        expect(cards.first.get_by_role('button',name='View image 1')).to_be_enabled()
        cards.first.get_by_role('button',name='View image 1').click()
        expect(page.locator('.private-gallery-dialog')).to_be_visible()
        page.get_by_role('button',name='Close preview').click()
        expect(page.locator('.private-gallery-dialog')).not_to_be_visible()
        detached.check()
        expect(page.get_by_role('button',name='Download backup with selected detached images')).to_be_enabled()
        with page.expect_download() as selected:
            page.get_by_role('button',name='Download backup with selected detached images').click()
        selected_archive=json.loads(Path(selected.value.path()).read_text())
        assert selected_archive['manifest']['assetCount']==2
        assert selected_archive['manifest']['libraryOnlyPaths']==[MEDIA_DETACHED]
        assert {asset['path'] for asset in selected_archive['assets']}=={MEDIA_REF,MEDIA_DETACHED}
        # The browser never uploads, publishes or deletes while listing/exporting.
        calls=page.evaluate('window.__m2Fixture.calls')
        assert all(call['prefix']==OWNER_ID for call in calls if call['type']=='media-list')
        assert not any(call['type'] in ('media-upload','media-delete') for call in calls)
        page.get_by_text('Private image library',exact=True).click()
        expect(page.locator('.private-gallery-card')).to_have_count(0)
        assert not errors,errors
    finally:close_context(ctx,page)


def private_gallery_failure_case(browser,source):
    ctx,page,errors=cloud_context(browser,(320,700),'owner',source=source)
    try:
        expect(page.locator('.cloud-mode')).to_have_text('Private workspace')
        page.evaluate("""() => {window.__m2Fixture.mediaFiles=[
          {name:'33333333-3333-4333-8333-333333333333.png'}
        ];window.__m2Fixture.failMediaList=true;}""")
        page.locator('.cloud-account-details').evaluate('details => { details.open = true; }')
        page.locator('.cloud-owner-panel summary').click()
        page.get_by_text('Private image library',exact=True).click()
        expect(page.locator('.private-gallery-error')).to_contain_text('Could not load')
        expect(page.locator('.private-gallery-card')).to_have_count(0)
        page.evaluate('window.__m2Fixture.failMediaList=false')
        page.get_by_role('button',name='Refresh library').click()
        expect(page.locator('.private-gallery-card')).to_have_count(1)
        page.evaluate("""() => {
          window.__m2Fixture.failMediaDownload=true;
          window.__m2Fixture.mediaFiles=[
            {name:'44444444-4444-4444-8444-444444444444.png'}];
        }""")
        # Failure cannot expose a stale private preview from a different account.
        page.get_by_role('button',name='Refresh library').click()
        expect(page.locator('.private-gallery-preview-status')).to_contain_text('Preview unavailable')
        page.evaluate("""() => {window.__m2Fixture.user={
          id:'22222222-2222-4222-8222-222222222222'};}""")
        page.get_by_role('button',name='Refresh library').click()
        expect(page.locator('.private-gallery-error')).to_contain_text('Could not load')
        expect(page.locator('.private-gallery-card')).to_have_count(0)
        assert not errors,errors
    finally:close_context(ctx,page)


def owner_tools_case(browser,source):
    ctx,page,errors=cloud_context(browser,(1440,900),'owner',source=source)
    try:
        expect(page.locator('.cloud-mode')).to_have_text('Private workspace')
        assert_no_local_leak(page)
        page.locator('.cloud-account-details').evaluate('details => { details.open = true; }')
        page.locator('.cloud-owner-panel summary').click()
        page.get_by_role('button',name='Review local import',exact=True).click()
        expect(page.locator('.cloud-tool-status')).to_contain_text('Nothing has been uploaded')
        assert not any(call.get('name')=='save_owner_snapshot' for call in page.evaluate('window.__m2Fixture.calls'))
        dialogs=[]
        def cancel(dialog):dialogs.append(dialog.message);dialog.dismiss()
        page.on('dialog',cancel)
        page.get_by_role('button',name='Import reviewed data as private',exact=True).click()
        assert dialogs and 'personal journal pages' in dialogs[-1]
        assert not any(call.get('name')=='save_owner_snapshot' for call in page.evaluate('window.__m2Fixture.calls'))
        page.remove_listener('dialog',cancel)
        page.once('dialog',lambda dialog:dialog.accept())
        page.get_by_role('button',name='Import reviewed data as private',exact=True).click()
        expect(page.locator('.cloud-tool-status')).to_contain_text('Private import saved')
        calls=page.evaluate('window.__m2Fixture.calls')
        imports=[call['args']['p_snapshot'] for call in calls if call.get('name')=='save_owner_snapshot']
        assert len(imports)==1 and LOCAL_SECRET in json.dumps(imports[0])
        assert page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))[0].title',TASK_KEY)==LOCAL_SECRET
        # Select a journal source; only reviewed plain-text fields enter the RPC.
        page.get_by_label(re.compile('^Content type')).select_option('journal')
        page.get_by_label('Public excerpt (optional, plain text)',exact=True).fill('Approved plain excerpt')
        page.get_by_label('Public date (optional)',exact=True).fill('2026-11-12')
        page.on('dialog',cancel)
        page.get_by_role('button',name='Publish reviewed fields',exact=True).click()
        assert 'Approved plain excerpt' in dialogs[-1] and '2026-11-12' in dialogs[-1]
        assert not any(call.get('name')=='publish_content' for call in page.evaluate('window.__m2Fixture.calls'))
        page.remove_listener('dialog',cancel)
        page.once('dialog',lambda dialog:dialog.accept())
        page.get_by_role('button',name='Publish reviewed fields',exact=True).click()
        expect(page.locator('.cloud-tool-status')).to_contain_text('Reviewed publication saved')
        publication=next(call['args'] for call in page.evaluate('window.__m2Fixture.calls') if call.get('name')=='publish_content')
        assert set(publication)=={'p_kind','p_source_id','p_excerpt','p_publication_date','p_expected_title'}
        assert publication['p_kind']=='journal' and publication['p_excerpt']=='Approved plain excerpt'
        assert publication['p_publication_date']=='2026-11-12'
        assert publication['p_expected_title']==LOCAL_SECRET
        assert 'SYNTHETIC UNPUBLISHED LOCAL JOURNAL BODY' not in json.dumps(publication),'Unreviewed journal body must not enter publication fields'
        page.once('dialog',lambda dialog:dialog.accept())
        page.get_by_role('button',name='Make source private',exact=True).click()
        expect(page.locator('.cloud-tool-status')).to_contain_text('Publication removed')
        removal=next(call['args'] for call in page.evaluate('window.__m2Fixture.calls') if call.get('name')=='unpublish_content')
        assert removal=={'p_kind':'journal','p_source_id':publication['p_source_id']}
        assert not errors,errors
    finally:close_context(ctx,page)


def journal_races(browser,source):
    ctx,page,errors=cloud_context(browser,(1440,900),'owner',source=source)
    try:
        expect(page.locator('.cloud-mode')).to_have_text('Private workspace')
        page.evaluate("window.orbitDebug.board.focus('journal',{initial:true});window.__m2Fixture.deferLoad=true;window.__m2Fixture.deferSave=true;window.dispatchEvent(new Event('focus'))")
        wait_until(page,'Boolean(window.__m2Fixture.resolveLoad)')
        ensure_journal_edit(page)
        page.locator('#journal-editor').fill('Synthetic typing newer than remote refresh')
        page.evaluate('window.__m2Fixture.resolveLoad()')
        expect(page.locator('#journal-editor')).to_contain_text('Synthetic typing newer than remote refresh')
        wait_until(page,'window.__m2Fixture.saveResolvers?.length===1')
        ensure_journal_edit(page)
        page.locator('#journal-editor').fill('Synthetic second typing newer than save ACK')
        page.evaluate('window.__m2Fixture.saveResolvers.shift()()')
        wait_until(page,'window.__m2Fixture.saveResolvers?.length===1')
        assert page.locator('.cloud-sync-state').inner_text()!='Saved to your cloud'
        assert page.locator('#journal-save-state').inner_text()!='saved to cloud'
        page.evaluate('window.__m2Fixture.saveResolvers.shift()()')
        expect(page.locator('.cloud-sync-state')).to_have_text('Saved to your cloud')
        expect(page.locator('#journal-editor')).to_contain_text('Synthetic second typing newer than save ACK')
        assert not errors,errors
        assert_no_local_leak(page)
    finally:close_context(ctx,page)


def failed_logout_recovery(browser,source):
    ctx,page,errors=cloud_context(browser,(390,844),'owner',source=source)
    try:
        expect(page.locator('.cloud-mode')).to_have_text('Private workspace')
        page.evaluate('window.__m2Fixture.failSignOutOnce=true')
        page.evaluate("window.orbitDebug.board.focus('space',{initial:true})")
        page.locator('.cloud-account-details').evaluate('details => { details.open = true; }')
        page.locator('.cloud-toolbar').get_by_role('button',name='Sign out',exact=True).click()
        expect(page.locator('.cloud-gate-message')).to_contain_text('session may still be active')
        expect(page.locator('.cloud-gate').get_by_role('button',name='Retry sign-out')).to_be_visible()
        expect(page.locator('#app')).to_be_hidden()
        assert page.locator('#app').inner_text()==''
        assert OWNER_SECRET not in page.locator('body').inner_text()
        assert len([call for call in page.evaluate('window.__m2Fixture.calls') if call.get('type')=='logout'])==1
        page.locator('.cloud-gate').get_by_role('button',name='Retry sign-out').click()
        expect(page.locator('.cloud-gate-message')).to_contain_text('Sign in to open')
        expect(page.locator('.cloud-gate').get_by_role('button',name='Retry sign-out')).to_be_hidden()
        assert len([call for call in page.evaluate('window.__m2Fixture.calls') if call.get('type')=='logout'])==2
        assert not errors,errors
    finally:close_context(ctx,page)


def immediate_logout_draft(browser,source):
    ctx,page,errors=cloud_context(browser,(390,844),'owner',source=source)
    try:
        expect(page.locator('.cloud-mode')).to_have_text('Private workspace')
        page.evaluate("window.orbitDebug.board.focus('journal',{initial:true});window.__m2Fixture.deferSave=true")
        dialogs=[]
        def cancel(dialog):dialogs.append(dialog.message);dialog.dismiss()
        page.on('dialog',cancel)
        ensure_journal_edit(page)
        # One browser task: type and request logout before the old 500ms autosave.
        page.evaluate("""() => {
          const editor=document.getElementById('journal-editor');
          editor.textContent='Synthetic immediate logout draft';
          editor.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));
          [...document.querySelectorAll('.cloud-toolbar button')].find(button=>button.textContent==='Sign out').click();
        }""")
        assert dialogs and 'not saved' in dialogs[0]
        expect(page.locator('#app')).to_be_visible()
        assert not any(call['type']=='logout' for call in page.evaluate('window.__m2Fixture.calls'))
        with page.expect_download() as download:
            page.evaluate("window.orbitDebug.board.focus('space',{initial:true})")
            page.locator('.cloud-toolbar').get_by_role('button',name='Export backup',exact=True).click()
        backup=json.loads(Path(download.value.path()).read_text())
        assert 'Synthetic immediate logout draft' in json.dumps(backup['journalEntries'])
        assert_no_local_leak(page)
        assert not errors,errors
    finally:close_context(ctx,page)


def local_compatibility(browser,source):
    ctx=browser.new_context(viewport={'width':1280,'height':840},reduced_motion='reduce')
    ctx.tracing.start(screenshots=True,snapshots=True)
    if source:
        ctx.route(BASE+'/',lambda route:route.fulfill(response=route.fetch(),body=(ROOT/'index.html').read_text().replace('src="./src/app.js"','src="./src/bootstrap.js"')))
    page=ctx.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    try:
        page.goto(BASE);wait_until(page,'Boolean(window.orbitDebug)')
        assert page.locator('#cloud-shell').count()==0
        # Preserve the six legacy widget identities, not a hard-coded widget cap.
        core=('timeline','constellation','active','completed','space','journal')
        assert all(page.locator(f'.spatial-world > [data-widget="{wid}"]').count()==1 for wid in core)
        assert page.locator('.spatial-world > [data-widget="projects"]').count()==1
        assert page.locator('.spatial-world > .spatial-item').count()>=7
        page.evaluate("window.orbitDebug.board.focus('journal',{initial:true})")
        ensure_journal_edit(page)
        page.locator('#journal-editor').fill('Synthetic M2 compatibility text')
        expect(page.locator('#journal-save-state')).to_have_text('saved on this device')
        page.reload();expect(page.locator('#journal-editor')).to_contain_text('Synthetic M2 compatibility text')
        assert not errors,errors
    finally:close_context(ctx,page)


def otp_flow_case(browser,source):
    ctx,page,errors=cloud_context(browser,(390,844),'signed-out',source=source)
    try:
        page.get_by_text('Email code (requires configured email delivery)',exact=True).click()
        expect(page.get_by_role('button',name='Send login code',exact=True)).to_be_enabled()
        page.get_by_label('Email address for email code',exact=True).fill('synthetic@example.invalid')
        page.get_by_role('button',name='Send login code',exact=True).click()
        expect(page.locator('#login-feedback')).to_contain_text('If this address is eligible')
        expect(page.get_by_label('Six-digit login code',exact=True)).to_be_focused()
        page.evaluate("window.__m2Fixture.otpVerifyError={code:'otp_expired'}")
        page.get_by_label('Six-digit login code',exact=True).fill('000000')
        page.get_by_role('button',name='Verify and sign in',exact=True).click()
        expect(page.locator('#login-feedback')).to_contain_text('invalid or expired')
        assert page.locator('#app').inner_text()==''
        page.evaluate("window.__m2Fixture.otpVerifyError=null;window.__m2Fixture.allowed=true")
        page.get_by_label('Six-digit login code',exact=True).fill('123456')
        page.get_by_role('button',name='Verify and sign in',exact=True).click()
        expect(page.locator('.cloud-mode')).to_have_text('Private workspace')
        assert page.locator('#login-code').input_value()==''
        page.evaluate("window.orbitDebug.board.focus('space',{initial:true})")
        page.locator('.cloud-account-details').evaluate('details => { details.open = true; }')
        page.locator('.cloud-toolbar').get_by_role('button',name='Sign out',exact=True).click()
        expect(page.locator('#app')).to_be_hidden()
        assert page.get_by_label('Email address for email code',exact=True).input_value()==''
        page.screenshot(path=str(OUT/'m2-email-otp-390.png'))
        assert not errors,errors
    finally:close_context(ctx,page)


def otp_failure_case(browser,source):
    for error,message in [({'code':'email_address_not_authorized'},'could not be completed'),({'status':429},'Too many attempts'),({'code':'email_provider_disabled'},'could not be completed')]:
        ctx,page,errors=cloud_context(browser,(320,700),'signed-out',source=source)
        try:
            page.get_by_text('Email code (requires configured email delivery)',exact=True).click()
            expect(page.get_by_role('button',name='Send login code',exact=True)).to_be_enabled()
            page.evaluate('(error)=>{window.__m2Fixture.otpSendError=error}',error)
            page.get_by_label('Email address for email code',exact=True).fill('synthetic@example.invalid')
            page.get_by_role('button',name='Send login code',exact=True).click()
            expect(page.locator('#login-feedback')).to_contain_text(message)
            expect(page.get_by_role('button',name='Verify and sign in')).to_be_disabled()
            assert page.locator('#app').inner_text()==''
            assert not errors,errors
        finally:close_context(ctx,page)


def password_case(browser,source):
    for failure in [None,{'code':'invalid_credentials'},{'status':429}]:
        ctx,page,errors=cloud_context(browser,(320,700),'signed-out',source=source)
        try:
            expect(page.get_by_role('button',name='Sign in with password',exact=True)).to_be_enabled()
            page.evaluate('(error)=>{window.__m2Fixture.passwordError=error;window.__m2Fixture.allowed=true}',failure)
            page.get_by_label('Email address',exact=True).fill('synthetic@example.invalid')
            page.get_by_label('Password',exact=True).fill('synthetic-password')
            page.get_by_role('button',name='Sign in with password',exact=True).click()
            if failure:
                expect(page.locator('.cloud-gate-message')).to_contain_text('Too many' if failure.get('status')==429 else 'Sign-in failed')
                assert page.locator('#app').inner_text()==''
            else:
                expect(page.locator('.cloud-mode')).to_have_text('Private workspace')
                page.evaluate("window.orbitDebug.board.focus('space',{initial:true})")
                page.locator('.cloud-account-details').evaluate('details => { details.open = true; }')
                page.locator('.cloud-toolbar').get_by_role('button',name='Sign out',exact=True).click()
                expect(page.locator('#app')).to_be_hidden()
            assert page.get_by_label('Password',exact=True).input_value()==''
            assert not errors,errors
        finally:close_context(ctx,page)


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--source',action='store_true');parser.add_argument('--only',default='');args=parser.parse_args()
    OUT.mkdir(exist_ok=True);results=[]
    with server(args.source),sync_playwright() as p:
        executable=None if os.environ.get('ORBIT_BROWSER_BUNDLED') else os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
        browser=p.chromium.launch(headless=True,executable_path=executable,args=['--no-sandbox'])
        cases=[('password-flow',lambda:password_case(browser,args.source)),('otp-flow',lambda:otp_flow_case(browser,args.source)),('otp-failures',lambda:otp_failure_case(browser,args.source)),('local-compatibility',lambda:local_compatibility(browser,args.source)),('journal-refresh-save-races',lambda:journal_races(browser,args.source)),('immediate-logout-draft',lambda:immediate_logout_draft(browser,args.source)),('failed-logout-recovery',lambda:failed_logout_recovery(browser,args.source)),('owner-opt-in-tools',lambda:owner_tools_case(browser,args.source)),
          ('private-gallery',lambda:private_gallery_case(browser,args.source,390)),
          ('private-gallery-fail-closed',lambda:private_gallery_failure_case(browser,args.source)),('owner-empty-expiry',lambda:owner_lifecycle_case(browser,args.source))]
        for label,size in [('desktop',(1440,900)),('tablet',(900,1100)),('phone',(390,844)),('small',(320,700))]:
            for mode in ['signed-out','nonowner']:
                cases.append((f'{mode}-{label}',lambda s=size,m=mode:gate_case(browser,s,m,args.source)))
            cases.append((f'owner-{label}',lambda s=size:owner_case(browser,s,args.source)))
            cases.append((f'visitor-{label}',lambda s=size:visitor_case(browser,s,args.source)))
        for name,case in cases:
            if args.only and name not in args.only.split(','):continue
            started=time.monotonic()
            try:
                case();result={'test':name,'status':'PASS','seconds':round(time.monotonic()-started,2),'transport':'local-runtime' if name=='local-compatibility' else 'mocked-sdk'}
            except Exception as exc:
                result={'test':name,'status':'FAIL','seconds':round(time.monotonic()-started,2),'error':str(exc),'traceback':traceback.format_exc(),'transport':'local-runtime' if name=='local-compatibility' else 'mocked-sdk'}
            results.append(result);print(json.dumps(result),flush=True)
        browser.close()
    (OUT/'m2-results.json').write_text(json.dumps(results,indent=2)+'\n')
    failures=sum(result['status']=='FAIL' for result in results)
    print(f'M2 real-origin wiring: {len(results)-failures} passed, {failures} failed. MOCKED SDK only; no OAuth/RLS certification.')
    raise SystemExit(1 if failures else 0)

if __name__=='__main__':main()
