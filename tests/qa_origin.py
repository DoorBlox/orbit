"""ORBIT handoff HTTP-origin smoke (local development server; optional Playwright).
Run from project root after `npm run build`: python tests/qa_origin.py
This is NOT an Auth/cloud or physical device test.
"""
import os
import subprocess
import time
import urllib.error
import urllib.request
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PORT = '4183'
BASE = f'http://127.0.0.1:{PORT}'

@contextmanager
def server():
    env = dict(os.environ, PORT=PORT)
    proc = subprocess.Popen(['node', 'scripts/dev-server.mjs', '--dist'], cwd=ROOT,
                            env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    try:
        for _ in range(50):
            if proc.poll() is not None:
                raise RuntimeError(f'Dev server exited with code {proc.returncode}')
            try:
                with urllib.request.urlopen(BASE + '/', timeout=1) as response:
                    assert response.status == 200
                    break
            except (urllib.error.URLError, TimeoutError):
                time.sleep(.15)
        else:
            raise RuntimeError('Dev server did not start on local port')
        yield
    finally:
        proc.terminate()
        try: proc.wait(timeout=5)
        except subprocess.TimeoutExpired: proc.kill()
        if proc.stdout: proc.stdout.close()


def main():
    from playwright.sync_api import sync_playwright
    with server():
        for denied in ['/.env.example', '/supabase/seed.sql', '/docs/03-PRD.md', '/package.json']:
            try:
                urllib.request.urlopen(BASE + denied, timeout=2)
            except urllib.error.HTTPError as e:
                assert e.code in (403, 404), (denied, e.code)
            else:
                raise AssertionError(f'Dev server exposed private repository path: {denied}')
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            page = browser.new_page(viewport={'width': 1280, 'height': 840})
            errors = []
            page.on('pageerror', lambda exc: errors.append(str(exc)))
            try:
                response = page.goto(BASE + '/', wait_until='domcontentloaded', timeout=20000)
            except Exception as exc:
                if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(exc):
                    raise RuntimeError('BLOCKED: environment policy prevents Chromium navigation to localhost; rerun on a normal Codex/local machine') from exc
                raise
            assert response.status == 200, response.status
            page.locator('#constellation-widget').wait_for(timeout=12000)
            page.locator('#journal-editor').wait_for(timeout=12000)
            page.wait_for_timeout(500)
            assert len(errors) == 0, errors
            # Use the actual journal autosave path, then reload with the same origin.
            page.locator('#journal-editor').fill('Origin-local persistence test. Synthetic only.')
            page.locator('#journal-entry-title').fill('Origin smoke entry')
            page.wait_for_timeout(950)
            key = page.evaluate('Object.keys(localStorage).find(k => k.includes("journal"))')
            assert key, 'Expected journal key in origin localStorage'
            saved = page.evaluate('(k)=>localStorage.getItem(k)', key)
            assert 'Origin smoke entry' in saved
            page.reload(wait_until='domcontentloaded')
            page.locator('#journal-editor').wait_for(timeout=12000)
            assert page.locator('#journal-entry-title').input_value() == 'Origin smoke entry'
            assert 'Origin-local persistence test.' in page.locator('#journal-editor').inner_text()
            assert len(errors) == 0, errors
            # Mobile width: actual HTTP origin and semantic control presence.
            page.set_viewport_size({'width': 390, 'height': 844})
            page.wait_for_timeout(350)
            assert page.locator('#journal-entry-date').count() == 1
            assert page.locator('#map-viewport').count() == 1
            browser.close()
    print('PASS: real local HTTP origin loads V6, saves and reloads synthetic journal entry,')
    print('      keeps main mobile controls, and blocks private repository files.')

if __name__ == '__main__':
    main()
