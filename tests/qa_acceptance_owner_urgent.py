"""W6 owner-urgent REAL browser acceptance: #210, #214, #216, #217, #218, #223.

Local synthetic fixtures ONLY. Never bypass authentication or use owner data.
Run after npm run build and installing the existing Playwright browser requirements:
    ORBIT_BROWSER_BUNDLED=1 python tests/qa_acceptance_owner_urgent.py

This is independent W6 code. W4 owns CI wiring (#169/#211); until actually
executed, every result is NOT RUN. Test failure yields a nonzero process exit.
"""
import json
import os
import re
import shutil
import subprocess
import traceback
from pathlib import Path

from playwright.sync_api import expect, sync_playwright
from qa_m1 import server, open_page, reload_page, focus, ensure_journal_edit

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa" / "owner-urgent"
CASES = (
    ("214", "sticky_canvas_full_edit_sheet"),
    ("216a", "journal_canvas_add_exactly_one_page"),
    ("216b", "journal_resize_keyboard_reload"),
    ("217", "terminal_branch_collapse_task_and_connectors"),
    ("218", "visible_task_creation_and_keyboard_save"),
    ("223", "panel_theme_contrast_resize_and_mobile"),
    ("210", "ambient_toggle_visible_and_reduced_motion"),
)
MARKER = "W6 SYNTHETIC OWNER URGENT"


def seed_workspace():
    branches = [
        {"id": "inbox", "parentId": "root", "label": "Unsorted", "color": "#6597E6"},
        {"id": "w6-parent", "parentId": "root", "label": "W6 parent", "color": "#6597E6"},
        {"id": "w6-leaf", "parentId": "w6-parent", "label": "W6 leaf", "color": "#6597E6"},
    ]
    tasks = [{"id": "w6-leaf-task", "title": MARKER + " LEAF TASK",
              "projectId": "w6-leaf", "status": "ready", "urgency": 2}]
    return {
        "orbit.phase1.branches.v1": json.dumps(branches),
        "orbit.phase1.tasks.v1": json.dumps(tasks),
    }


def shot(page, name):
    # Only local, disposable app fixtures. NEVER screenshot signed-in owner data.
    page.screenshot(path=str(OUT / (name + ".png")), animations="disabled")


def ensure_appearance(page):
    focus(page, "space")
    details = page.locator(".space-appearance")
    if details.get_attribute("open") is None:
        details.locator("summary").click()
    expect(page.locator("#appearance-controls")).to_be_visible()


def issue_214(page):
    focus(page, "space")
    prior = page.locator(".sticky-note").count()
    page.get_by_role("button", name=re.compile(r"New note", re.I)).click()
    expect(page.locator(".sticky-note")).to_have_count(prior + 1)
    note = page.locator(".sticky-note").last
    note_id = note.get_attribute("data-note-id")
    note.get_by_role("button", name="Edit sticky note").click()
    note = page.locator('.sticky-note[data-note-id="' + note_id + '"]')
    note.locator('.sticky-mode-tab').filter(has_text="Canvas").focus()
    note.locator('.sticky-mode-tab').filter(has_text="Canvas").press("Enter")
    expect(note).to_have_attribute("data-note-mode", "canvas")
    expect(note.locator(".sticky-inline-canvas .excalidraw")).to_be_visible(timeout=18000)
    assert not note.locator(".sticky-canvas-empty").is_visible(), (
        "Canvas placeholder is visible over the live Excalidraw editor"
    )
    dimensions = note.evaluate("""el => {
      const sheet=el.querySelector('.sticky-inline-canvas');
      const editor=sheet?.querySelector('.excalidraw');
      const box=el.getBoundingClientRect(),s=sheet?.getBoundingClientRect();
      const e=editor?.getBoundingClientRect();
      return {noteW:box.width,noteH:box.height,hostW:s?.width||0,
        hostH:s?.height||0,editorW:e?.width||0,editorH:e?.height||0};
    }""")
    assert dimensions["hostW"] >= dimensions["noteW"] * 0.76, dimensions
    assert dimensions["hostH"] >= min(180, dimensions["noteH"] * 0.42), dimensions
    assert dimensions["editorW"] >= dimensions["hostW"] * .95, dimensions
    assert dimensions["editorH"] >= dimensions["hostH"] * .90, dimensions
    shot(page, "214-sticky-canvas-desktop")
    note.get_by_role("button", name="Preview sticky note").click()
    expect(note).to_have_attribute("data-view", "preview")
    reload_page(page)
    note = page.locator('.sticky-note[data-note-id="' + note_id + '"]')
    expect(note).to_have_count(1)
    note.get_by_role("button", name="Edit sticky note").click()
    expect(note.locator(".sticky-inline-canvas .excalidraw")).to_be_visible(timeout=18000)
    assert page.evaluate("""id => {
      const v=JSON.parse(localStorage.getItem('orbit.v8.extensions')||'{}');
      return v.notes?.some(n=>n.id===id && n.mode==='canvas');
    }""", note_id), "Canvas mode did not persist across reload"


def issue_216a(page):
    focus(page, "journal")
    ensure_journal_edit(page)
    page.locator("#journal-entry-title").fill(MARKER + " PAGE ONE")
    page.locator("#journal-editor").fill("W6 disposable text")
    page.locator('.journal-mode-tab[data-journal-mode="canvas"]').click()
    expect(page.locator("#journal-inline-canvas-host .excalidraw")).to_be_visible(timeout=18000)
    before = page.evaluate("window.orbitDebug.journal.entries.length")
    shot(page, "216a-journal-canvas-before-add")
    add = page.get_by_role("button", name=re.compile("new page", re.I))
    expect(add).to_be_visible()
    add.focus()
    add.press("Enter")
    page.wait_for_function(
        "(n)=>window.orbitDebug.journal.entries.length!==n",
        arg=before, timeout=5000,
    )
    assert page.evaluate("window.orbitDebug.journal.entries.length") == before + 1, (
        "New page in canvas edit mode must add exactly one page"
    )
    shot(page, "216a-journal-canvas-after-add")
    reload_page(page)
    assert page.evaluate("window.orbitDebug.journal.entries.length") == before + 1


def issue_216b(page):
    focus(page, "journal")
    grip = page.locator('#journal-widget > .widget-resizer')
    expect(grip).to_be_visible()
    before = page.evaluate("window.orbitDebug.board.getLayout().journal")
    grip.focus()
    grip.press("Shift+ArrowRight")
    grip.press("Shift+ArrowDown")
    after = page.evaluate("window.orbitDebug.board.getLayout().journal")
    assert after["width"] > before.get("width", 0), (before, after)
    assert after["height"] > before.get("height", 0), (before, after)
    shot(page, "216b-journal-resized-desktop")
    reload_page(page)
    saved = page.evaluate("window.orbitDebug.board.getLayout().journal")
    assert saved["width"] == after["width"] and saved["height"] == after["height"], (
        "Journal resize must survive reload", saved, after
    )
    focus(page, "journal")
    page.set_viewport_size({"width": 390, "height": 844})
    page.wait_for_function("""() => {
      const s=window.orbitDebug.board.lastViewportSize;
      return s && s.w===390 && s.h===844;
    }""")
    shot(page, "216b-journal-resized-mobile")
    expect(page.locator("#journal-edit-toggle")).to_be_visible()
    assert page.evaluate("window.orbitDebug.board.getLayout().journal") == saved


def issue_217(page):
    focus(page, "constellation")
    leaf = page.locator('.graph-node[data-id="w6-leaf"]')
    expect(leaf).to_be_attached()
    assert page.locator('.task-stack[data-branch-id="w6-leaf"] .task-row').count() == 1
    shot(page, "217-leaf-expanded")
    toggle = leaf.get_by_role("button", name="Collapse branch")
    expect(toggle).to_be_attached()  # Present for a terminal TASK-bearing branch.
    toggle.focus()
    toggle.press("Enter")
    expect(leaf).to_have_attribute("aria-expanded", "false")
    assert page.locator('.task-stack[data-branch-id="w6-leaf"]').count() == 0, (
        "Collapsed terminal branch still displays its task stack"
    )
    assert page.locator(".terminal-path").count() == 0, (
        "Collapsed terminal leaf left a dangling task connector"
    )
    shot(page, "217-leaf-collapsed")
    reload_page(page)
    leaf = page.locator('.graph-node[data-id="w6-leaf"]')
    expect(leaf).to_have_attribute("aria-expanded", "false")
    leaf.focus()
    leaf.press("ArrowRight")
    expect(leaf).to_have_attribute("aria-expanded", "true")
    assert page.locator('.task-stack[data-branch-id="w6-leaf"] .task-row').count() == 1


def issue_218(page):
    focus(page, "constellation")
    # Start without selecting a branch: the control must be discoverable.
    add = page.get_by_role("button", name="Add task")
    expect(add).to_be_visible()
    entry = page.get_by_role("textbox", name="Name of task")
    entry.fill(MARKER + " CAPTURE")
    add.focus()
    add.press("Enter")
    page.wait_for_function("""name => {
      const v=JSON.parse(localStorage.getItem('orbit.phase1.tasks.v1')||'[]');
      return v.some(x=>x.title===name);
    }""", arg=MARKER + " CAPTURE")
    tasks = page.evaluate("""name => JSON.parse(
      localStorage.getItem('orbit.phase1.tasks.v1')||'[]'
    ).filter(x=>x.title===name)""", MARKER + " CAPTURE")
    assert len(tasks) == 1, "One action must add exactly one task"
    assert tasks[0]["projectId"] == "inbox", "New task target must be visible and correct"
    shot(page, "218-task-capture-desktop")
    # Strong discoverability criterion from owner: not only an icon with aria-label.
    assert "task" in add.inner_text().lower(), (
        "Add task exists for screen readers but lacks a visible action label"
    )
    reload_page(page)
    assert page.locator(".task-row").filter(has_text=MARKER + " CAPTURE").count() == 1


def _rgb(value):
    value = value.strip()
    if re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        return [int(value[i:i + 2], 16) for i in (1, 3, 5)]
    raise AssertionError("Theme color token is not an opaque hex color")


def _contrast(a, b):
    def lum(rgb):
        components = [channel / 255 for channel in rgb]
        linear = [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4
                  for x in components]
        return sum(x * y for x, y in zip(linear, (.2126, .7152, .0722)))
    l1, l2 = sorted((lum(a), lum(b)), reverse=True)
    return (l1 + .05) / (l2 + .05)


def issue_223(page):
    ensure_appearance(page)
    themes = ["parchment", "garden", "frost", "celestial", "ember",
              "tidepool", "sundown", "sakura", "graphite", "linen"]
    for theme in themes:
        page.locator('input[name="space-theme"][value="' + theme + '"]').check(force=True)
        assert page.evaluate("document.documentElement.dataset.theme") == theme
        colors = page.evaluate("""() => {
          const s=getComputedStyle(document.documentElement);
          return ['--orbit-widget-ink','--orbit-widget-surface',
                  '--orbit-chrome-ink','--orbit-chrome',
                  '--orbit-paper-ink','--orbit-paper']
            .map(name=>s.getPropertyValue(name).trim());
        }""")
        for i in (0, 2, 4):
            ratio = _contrast(_rgb(colors[i]), _rgb(colors[i + 1]))
            assert ratio >= 4.5, (theme, i, "WCAG normal-text token contrast", ratio)
        if theme in ("parchment", "garden", "graphite"):
            shot(page, "223-panel-" + theme)
    panel = page.locator("#space-widget")
    assert panel.get_by_role("button", name=re.compile("Open Projects", re.I)).count() == 0, (
        "Project navigation should belong in the Projects widget, not the control panel"
    )
    assert page.locator("#appearance-ambient").count() == 1
    page.set_viewport_size({"width": 390, "height": 844})
    focus(page, "space")
    shot(page, "223-panel-mobile")
    assert page.locator("#appearance-controls").evaluate(
        "el=>el.scrollWidth<=el.clientWidth+2"
    ), "Appearance controls overflow narrow control panel"
    reload_page(page)
    assert page.evaluate("document.documentElement.dataset.theme") == "linen", (
        "Chosen theme did not persist"
    )


def issue_210(page):
    ensure_appearance(page)
    page.emulate_media(reduced_motion="no-preference")
    reduce = page.locator("#appearance-reduce-motion")
    if reduce.is_checked():
        reduce.uncheck()
    ambient = page.locator("#appearance-ambient")
    ambient.uncheck()
    assert page.evaluate("document.documentElement.dataset.ambient") == "off"
    orbs = page.locator(".ambient-orb")
    expect(orbs.first).to_be_attached()
    stopped = orbs.first.evaluate("e=>getComputedStyle(e).animationName")
    shot(page, "210-ambient-off")
    ambient.check()
    assert page.evaluate("document.documentElement.dataset.ambient") == "on"
    moving = orbs.first.evaluate("e=>getComputedStyle(e).animationName")
    assert moving != "none", ("Ambient toggle changes state but has no animation", stopped, moving)
    first = orbs.first.evaluate("e=>getComputedStyle(e).transform")
    page.wait_for_timeout(750)  # Motion evidence: compare *computed transform*, not just checkbox.
    second = orbs.first.evaluate("e=>getComputedStyle(e).transform")
    assert first != second, "Background has an animation declaration but no observable movement"
    shot(page, "210-ambient-on")
    page.emulate_media(reduced_motion="reduce")
    assert orbs.first.evaluate("e=>getComputedStyle(e).animationName") == "none", (
        "Reduced motion must suppress ambient movement even when ambient setting is ON"
    )
    ambient.uncheck()
    assert orbs.first.evaluate("e=>getComputedStyle(e).animationName") == "none"
    reload_page(page)
    expect(page.locator("#appearance-ambient")).not_to_be_checked()


def execute(browser, case_id, name, fn, report):
    context = page = None
    errors = []
    result = {"issue": case_id, "case": name, "status": "NOT RUN"}
    report["cases"].append(result)
    try:
        context, page, errors = open_page(
            browser, (1440, 900), seed=seed_workspace()
        )
        fn(page)
        assert not errors, "Unexpected browser page error count: " + str(len(errors))
        result["status"] = "PASS"
    except Exception as exc:
        result["status"] = "FAIL"
        result["error_type"] = type(exc).__name__
        # Only synthetic assertions and selector errors. Do NOT upload page text,
        # signed URLs, console/session dumps or arbitrary user data.
        result["summary"] = str(exc).splitlines()[0][:180]
        if page is not None:
            try:
                shot(page, case_id + "-failure")
                context.tracing.stop(
                    path=str(OUT / (case_id + "-failure-trace.zip"))
                )
            except Exception:
                pass
    finally:
        if context:
            try:
                context.tracing.stop()
            except Exception:
                pass
            context.close()
        (OUT / "owner-urgent-results.json").write_text(
            json.dumps(report, indent=2) + "\n", encoding="utf-8"
        )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    try:
        source = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip()
    except Exception:
        source = "UNKNOWN - TEST ENVIRONMENT ERROR"
    expected = os.getenv("ORBIT_QA_EXPECTED_SHA")
    if expected and source != expected:
        raise SystemExit("W6 source-SHA mismatch; refusal to misattribute acceptance")
    report = {
        "source_sha": source,
        "fixture": "local-synthetic-only",
        "browser": "Playwright Chromium",
        "hosted_auth_or_rls_verified": False,
        "physical_device_verified": False,
        "production_released": False,
        "cases": [],
    }
    checks = {
        "214": issue_214, "216a": issue_216a,
        "216b": issue_216b, "217": issue_217,
        "218": issue_218, "223": issue_223, "210": issue_210
    }
    with server(), sync_playwright() as playwright:
        executable = (None if os.environ.get("ORBIT_BROWSER_BUNDLED")
                      else os.environ.get("ORBIT_CHROMIUM") or shutil.which("chromium"))
        browser = playwright.chromium.launch(
            headless=True, executable_path=executable, args=["--no-sandbox"]
        )
        try:
            for issue, name in CASES:
                execute(browser, issue, name, checks[issue], report)
        finally:
            browser.close()
    print(json.dumps(report, indent=2))
    if any(c["status"] != "PASS" for c in report["cases"]):
        raise SystemExit("W6 owner-urgent browser acceptance FAIL; see dummy-only artifacts")
    print("PASS W6 owner-urgent local synthetic browser acceptance")


if __name__ == "__main__":
    main()
