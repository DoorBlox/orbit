from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright
p=Path(__file__).parents[1]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-sandbox'])
 for w,h,lab in [(1440,900,'desktop'),(390,844,'phone')]:
  page=b.new_page(viewport={'width':w,'height':h});page.set_content((p/'ORBIT_Offline_Preview.html').read_text());page.wait_for_timeout(600);page.evaluate('window.scrollTo({top:0,behavior:"instant"})');page.wait_for_timeout(100)
  page.screenshot(path=str(p/'qa'/f'v4-{lab}-timeline.png'))
 b.close()
