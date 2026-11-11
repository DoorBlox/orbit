"""Local M2 close-out browser regressions; synthetic mocked SDK, never hosted.

Reuses qa_m2's real-origin server, browser fixtures and failure traces. The saved
mock snapshot is transported to a fresh context for serialization/hydration checks;
this is not database/RLS evidence. Run after npm run build.
"""
import copy
import json
import os
import shutil
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright, expect
import qa_m2 as qa


def cloud_context(browser, size, mode, **options):
    return qa.cloud_context(browser, size, mode, legacy_seed={
        'orbit.phase1.preferences.v1': '{ "colorMode": "urgency" }',
        'orbit-v4-milestones': '[{"id":"legacy-mark","title":"Keep legacy marker","date":"2026-11-01"}]',
        'orbit.v5.spatial-layout': '{"journal":{"x":111,"y":222}}',
        'orbit.v6.spatial-sizes': '{"journal":{"w":500,"h":800}}',
        'orbit.v5.spatial-camera': '{"x":21,"y":34,"scale":0.9}',
        'unrelated.synthetic.backup': 'Keep this exact unrelated value',
    }, **options)


def focus(page, widget):
    page.evaluate('(id)=>window.orbitDebug.board.focus(id,{initial:true})', widget)


def saved(page):
    expect(page.locator('.cloud-sync-state')).to_have_text('Saved to your cloud')


def legacy(page):
    # Enumerate exact bytes without invoking the fixture's instrumented getItem.
    return page.evaluate('Object.fromEntries(Object.entries(localStorage))')


def backup(page):
    page.evaluate("window.orbitDebug.board.focus('space',{initial:true})")
    with page.expect_download() as download:
        page.locator('.cloud-toolbar').get_by_role('button', name='Export backup', exact=True).click()
    return json.loads(Path(download.value.path()).read_text())


def assert_preserved(page, original):
    assert legacy(page) == original, 'Legacy storage bytes changed'
    qa.assert_no_local_leak(page)


def mobile_flow(browser, width):
    ctx, page, errors = cloud_context(browser, (width, 844), 'signed-out')
    try:
        original = legacy(page)
        expect(page.locator('.cloud-gate-message')).to_contain_text('Sign in to open')
        page.evaluate('window.__m2Fixture.allowed=true')
        page.get_by_label('Email address', exact=True).fill('owner@example.invalid')
        page.get_by_label('Password', exact=True).fill('synthetic-password')
        page.get_by_role('button', name='Sign in with password', exact=True).click()
        expect(page.locator('.cloud-mode')).to_have_text('Private workspace')
        focus(page, 'constellation')
        qa.assert_pointer_reachable(page, '#capture-name')
        page.locator('#capture-name').fill(f'Closeout mobile {width}')
        page.locator('#capture-name').press('Enter')
        saved(page)
        focus(page, 'journal')
        qa.assert_pointer_reachable(page, '#journal-entry-title')
        page.locator('#journal-entry-title').fill(f'Closeout journal {width}')
        page.locator('#journal-editor').fill(f'Synthetic mobile body {width}')
        page.locator('#journal-entry-date').fill('2026-11-06')
        page.locator('#journal-entry-date').dispatch_event('change')
        saved(page)
        stored = page.evaluate('window.__m2Fixture.snapshot')
        assert any(t['title'] == f'Closeout mobile {width}' for t in stored['tasks'])
        assert stored['journalEntries'][0]['date'] == '2026-11-06'
        assert_preserved(page, original)
        page.screenshot(path=str(qa.OUT / f'm2-closeout-mobile-{width}.png'))
        page.evaluate("window.orbitDebug.board.focus('space',{initial:true})")
        page.locator('.cloud-account-details').evaluate('details => { details.open = true; }')
        page.locator('.cloud-toolbar').get_by_role('button', name='Sign out', exact=True).click()
        expect(page.locator('#app')).to_be_hidden()
        assert page.locator('#app').inner_text() == ''
        assert_preserved(page, original)
        assert not errors, errors
    finally:
        qa.close_context(ctx, page)
    # A fresh context loads only the saved mock transport snapshot, not local data.
    fresh, page, errors = cloud_context(browser, (width, 844), 'owner', snapshot=stored)
    try:
        expect(page.locator('.cloud-mode')).to_have_text('Private workspace')
        expect(page.locator('#journal-entry-title')).to_have_value(f'Closeout journal {width}')
        expect(page.locator('#journal-editor')).to_contain_text(f'Synthetic mobile body {width}')
        expect(page.locator('#journal-entry-date')).to_have_value('2026-11-06')
        assert page.locator('.task-row').filter(has_text=f'Closeout mobile {width}').count() == 1
        assert not errors, errors
    finally:
        qa.close_context(fresh, page)


def crud_undo(browser):
    ctx, page, errors = cloud_context(browser, (1440, 900), 'owner')
    try:
        expect(page.locator('.cloud-mode')).to_have_text('Private workspace')
        original = legacy(page)
        focus(page, 'constellation')
        page.locator('#capture-name').fill('Closeout CRUD task')
        page.locator('#capture-name').press('Enter')
        saved(page)
        row = page.locator('.task-row').filter(has_text='Closeout CRUD task')
        task_id = row.get_attribute('data-task-id')
        row.focus(); row.press('Enter')
        row.get_by_role('button', name='Edit', exact=True).press('Enter')
        inspector = page.locator('.orbit-task-dialog')
        expect(inspector).to_be_visible()
        inspector.locator('[name=title]').fill('Closeout edited task')
        inspector.locator('[name=criteria]').fill('Preserve exact criteria')
        inspector.get_by_role('button', name='Save changes', exact=True).press('Enter')
        expect(inspector).to_have_count(0)
        saved(page)
        focus(page, 'active')
        rail = page.locator('.rail-task').filter(has_text='Closeout edited task')
        rail.locator('.rail-check').focus(); rail.locator('.rail-check').press('Enter')
        saved(page)
        task = page.evaluate('(id)=>window.__m2Fixture.snapshot.tasks.find(t=>t.id===id)', task_id)
        assert task['status'] == 'completed'
        focus(page, 'completed')
        reopen = page.get_by_role('button', name='Reopen').last
        reopen.focus(); reopen.press('Enter')
        saved(page)
        before = page.evaluate('window.__m2Fixture.snapshot')
        assert next(t for t in before['tasks'] if t['id'] == task_id)['status'] == 'ready'
        focus(page, 'constellation')
        row = page.locator(f'.task-row[data-task-id="{task_id}"]')
        row.focus(); row.press('Enter')
        row.get_by_role('button', name='Remove', exact=True).press('Enter')
        saved(page)
        assert not page.evaluate('(id)=>window.__m2Fixture.snapshot.tasks.some(t=>t.id===id)', task_id)
        page.locator('#toast button').press('Enter')
        saved(page)
        assert page.evaluate('window.__m2Fixture.snapshot.tasks') == before['tasks']
        focus(page, 'journal')
        page.locator('#journal-new').click()
        page.locator('#journal-entry-title').fill('Closeout undo page')
        page.locator('#journal-editor').fill('Synthetic undo body')
        saved(page)
        before_pages = page.evaluate('window.__m2Fixture.snapshot.journalEntries')
        page.locator('#journal-delete').click()
        saved(page)
        assert len(page.evaluate('window.__m2Fixture.snapshot.journalEntries')) == len(before_pages) - 1
        page.locator('#toast button').click()
        saved(page)
        assert page.evaluate('window.__m2Fixture.snapshot.journalEntries') == before_pages
        assert_preserved(page, original)
        assert not errors, errors
    finally:
        qa.close_context(ctx, page)


def offline_recovery(browser):
    ctx, page, errors = cloud_context(browser, (390, 844), 'owner')
    try:
        expect(page.locator('.cloud-mode')).to_have_text('Private workspace')
        original = legacy(page)
        initial = page.evaluate('window.__m2Fixture.snapshot')
        ctx.set_offline(True)
        assert page.evaluate('navigator.onLine') is False
        focus(page, 'journal')
        page.locator('#journal-editor').fill('Closeout unsaved offline draft')
        expect(page.locator('.cloud-sync-state')).to_contain_text('Offline')
        draft = backup(page)
        assert 'Closeout unsaved offline draft' in json.dumps(draft['journalEntries'])
        assert page.evaluate('window.__m2Fixture.snapshot') == initial
        assert not page.evaluate('window.__m2Fixture.calls.some(c=>c.name==="save_owner_snapshot")')
        ctx.set_offline(False)
        saved(page)
        assert 'Closeout unsaved offline draft' in json.dumps(page.evaluate('window.__m2Fixture.snapshot.journalEntries'))
        ctx.set_offline(True)
        page.locator('#journal-editor').fill('Closeout discard after private export')
        expect(page.locator('.cloud-sync-state')).to_contain_text('Offline')
        dialogs = []
        def cancel(dialog):
            dialogs.append(dialog.message)
            dialog.dismiss()
        page.on('dialog', cancel)
        page.evaluate("window.orbitDebug.board.focus('space',{initial:true})")
        page.locator('.cloud-account-details').evaluate('details => { details.open = true; }')
        signout = page.locator('.cloud-toolbar').get_by_role('button', name='Sign out', exact=True)
        signout.click()
        assert dialogs and 'not saved' in dialogs[0]
        expect(page.locator('#app')).to_be_visible()
        assert 'Closeout discard after private export' in json.dumps(backup(page)['journalEntries'])
        writes = page.evaluate('window.__m2Fixture.calls.filter(c=>c.name==="save_owner_snapshot").length')
        page.remove_listener('dialog', cancel)
        page.once('dialog', lambda dialog: dialog.accept())
        signout.click()
        expect(page.locator('#app')).to_be_hidden()
        ctx.set_offline(False)
        page.wait_for_timeout(650)  # Past the 500ms save debounce after disposal.
        assert page.evaluate('window.__m2Fixture.calls.filter(c=>c.name==="save_owner_snapshot").length') == writes
        assert 'Closeout discard after private export' not in json.dumps(page.evaluate('window.__m2Fixture.snapshot'))
        assert_preserved(page, original)
        assert not errors, errors
    finally:
        qa.close_context(ctx, page)


def snapshot_integrity(browser):
    fixture = copy.deepcopy(qa.OWNER_SNAPSHOT)
    fixture['milestones'] = [{'id':'closeout-mark','title':'Synthetic milestone','date':'2026-11-06'}]
    fixture['preferences'] = {'colorMode':'urgency','timezone':'Asia/Jakarta'}
    fixture['spatialLayout'] = {'journal':{'x':900,'y':1700,'width':446,'height':800}}
    fixture['journalEntries'][0]['html'] = '<p>Synthetic <strong>formatted</strong> journal.</p>'
    ctx, page, errors = cloud_context(browser, (1440, 900), 'owner', snapshot=fixture)
    try:
        expect(page.locator('.cloud-mode')).to_have_text('Private workspace')
        original = legacy(page)
        focus(page, 'journal')
        page.locator('#journal-entry-title').fill('Closeout full snapshot')
        saved(page)
        stored = page.evaluate('window.__m2Fixture.snapshot')
        before = backup(page)
        assert '<strong>formatted</strong>' in before['journalEntries'][0]['html']
        assert_preserved(page, original)
        assert not errors, errors
    finally:
        qa.close_context(ctx, page)
    ctx, page, errors = cloud_context(browser, (1440, 900), 'owner', snapshot=stored)
    try:
        expect(page.locator('.cloud-mode')).to_have_text('Private workspace')
        after = backup(page)
        for key in ['branches','tasks','journalEntries','milestones','spatialLayout','preferences','profile']:
            assert after[key] == before[key], f'Round-trip changed {key}'
        for key in ['branches','tasks','journalEntries','milestones']:
            ids = [row['id'] for row in after[key]]
            assert len(ids) == len(set(ids)), f'Duplicate IDs in {key}'
        assert not errors, errors
    finally:
        qa.close_context(ctx, page)


def main():
    qa.OUT.mkdir(exist_ok=True)
    results = []
    with qa.server(), sync_playwright() as p:
        executable = None if os.environ.get('ORBIT_BROWSER_BUNDLED') else shutil.which('chromium')
        browser = p.chromium.launch(headless=True, executable_path=executable, args=['--no-sandbox'])
        cases = [('mobile-320', lambda: mobile_flow(browser, 320)),
                 ('mobile-390', lambda: mobile_flow(browser, 390)),
                 ('cloud-crud-undo', lambda: crud_undo(browser)),
                 ('offline-export-retry-logout', lambda: offline_recovery(browser)),
                 ('all-entity-snapshot-integrity', lambda: snapshot_integrity(browser))]
        for name, run in cases:
            start = time.monotonic()
            try:
                run()
                result = {'case':name,'status':'PASS'}
            except Exception:
                result = {'case':name,'status':'FAIL','traceback':traceback.format_exc()}
            result.update(seconds=round(time.monotonic()-start,2), transport='mocked SDK; local HTTP origin')
            results.append(result)
            print(json.dumps(result), flush=True)
        browser.close()
    report = {'timestamp':datetime.now(timezone.utc).isoformat(),'results':results}
    (qa.OUT / 'm2-closeout-results.json').write_text(json.dumps(report, indent=2)+'\n')
    raise SystemExit(1 if any(r['status']=='FAIL' for r in results) else 0)


if __name__ == '__main__':
    main()
