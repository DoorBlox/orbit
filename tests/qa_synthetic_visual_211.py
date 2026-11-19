"""#211: reproducible agent-visible UI fixture, WITHOUT logging in or changing Auth/RLS.

Runs only against the locally built ORBIT *unconfigured* distribution on 127.0.0.1.
Every datum comes from this deterministic test script. No user account,
Supabase URL, authentication bypass, live Preview or Production is involved.
Images/traces are disposable, synthetically seeded CI artifacts (7-day TTL).

After npm run build:
 ORBIT_SYNTHETIC_ONLY=1 ORBIT_BROWSER_BUNDLED=1 \
 ORBIT_VISUAL_SOURCE_SHA=<reviewed 40-character SHA> \
 python tests/qa_synthetic_visual_211.py
"""
import json
import os
import re
import shutil
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright
from qa_m1 import BASE, ROOT, server, focus, ensure_journal_edit

OUT = ROOT / "qa" / "synthetic-visual-211"
CORE = ("timeline", "constellation", "active", "completed", "space", "journal")
FAKE = {
    "task_active": "SYNTHETIC 211 - verify navigation",
    "task_done": "SYNTHETIC 211 - finished checklist",
    "journal_title": "SYNTHETIC 211 - a draft page",
    "journal_body": "SYNTHETIC 211 - harmless words for interface review",
    "sticky_title": "SYNTHETIC 211 - sticky note",
    "sticky_body": "SYNTHETIC 211 - visual spacing only",
    "project": "SYNTHETIC 211 - research brief",
    "milestone": "SYNTHETIC 211 - release rehearsal",
}
VIEWPORTS = (
    ("desktop", 1440, 900, False),
    ("phone", 390, 844, True),
)


def _local_only(route):
    """Only static resources from one loopback test origin. No third-party IO."""
    u = urlparse(route.request.url)
    if u.scheme == "http" and u.hostname == "127.0.0.1" and u.port == 4196:
        route.continue_()
    else:
        route.abort(error_code="blockedbyclient")


def _new_context(browser, width, height, mobile):
    context = browser.new_context(
        viewport={"width": width, "height": height},
        locale="en-US", timezone_id="Asia/Jakarta",
        reduced_motion="reduce", is_mobile=mobile, has_touch=mobile,
    )
    context.route("**/*", _local_only)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda exc: errors.append(type(exc).__name__))
    page.goto(BASE, wait_until="domcontentloaded")
    page.locator("#node-layer .graph-node").first.wait_for(state="attached")
    assert page.evaluate(
        """async () => (await import('./src/runtime-config.js')).runtimeConfig === null"""
    ), "NO-GO: fixture refuses a configured/authenticated/cloud distribution"
    assert page.locator("#app").is_visible(), "Local app was not mounted"
    return context, page, errors


def _seed_by_visible_controls(page):
    # A fresh, never-logged-in browser context only. Use the actual app controls.
    focus(page, "constellation")
    for value in (FAKE["task_active"], FAKE["task_done"]):
        capture = page.locator("#capture-name")
        capture.fill(value)
        capture.press("Enter")
        expect(page.locator(".task-row").filter(has_text=value)).to_have_count(1)

    focus(page, "active")
    done = page.locator(".rail-task").filter(has_text=FAKE["task_done"])
    expect(done).to_have_count(1)
    done.locator(".rail-check").click()
    focus(page, "completed")
    expect(page.locator("#completed-widget")).to_contain_text(FAKE["task_done"])

    focus(page, "journal")
    ensure_journal_edit(page)
    page.locator("#journal-entry-title").fill(FAKE["journal_title"])
    page.locator("#journal-editor").fill(FAKE["journal_body"])

    focus(page, "space")
    page.locator("#new-sticky").click()
    note = page.locator(".sticky-note").first
    expect(note).to_be_visible()
    note.get_by_role("button", name="Edit sticky note").click()
    note.locator(".sticky-title").fill(FAKE["sticky_title"])
    note.locator(".sticky-title").dispatch_event("change")
    note.locator(".sticky-body").fill(FAKE["sticky_body"])
    note.get_by_role("button", name="Preview sticky note").click()
    expect(note.locator(".sticky-text-preview")).to_contain_text(FAKE["sticky_body"])

    focus(page, "projects")
    page.get_by_role(
        "combobox", name="Choose a branch for a private project"
    ).select_option("research")
    page.get_by_role("button", name="Add private project").click()
    card = page.locator('.project-card[data-project-id="research"]')
    expect(card).to_be_visible()
    card.get_by_role("button", name="Edit project brief for Research").click()
    card.get_by_role("textbox", name="Description for Research").fill(FAKE["project"])
    card.get_by_role("button", name="Save project brief").click()
    expect(card).to_contain_text(FAKE["project"])

    focus(page, "timeline")
    page.locator("#timeline-add").click()
    page.locator("#milestone-title").fill(FAKE["milestone"])
    page.locator("#milestone-date").fill("2026-11-19")
    page.locator("#milestone-form button[type=submit]").click()
    expect(page.locator(".timeline-milestone")).to_have_count(1)

    # The fixture is actually saved by app code, not just a temporary DOM edit.
    page.wait_for_function(
        """markers => {
          const values=Object.fromEntries(Object.entries(localStorage));
          const text=JSON.stringify(values);
          return markers.every(marker => text.includes(marker));
        }""",
        arg=list(FAKE.values()), timeout=12000,
    )


def _widget_ids(page):
    ids = page.evaluate(
        """() => [...window.orbitDebug.board.widgets.entries()]
          .filter(([,element]) => element && !element.hidden)
          .map(([id]) => id)"""
    )
    assert len(ids) == len(set(ids)), "Duplicate widget IDs"
    assert set(CORE + ("projects",)).issubset(ids), (
        "A required core or Projects widget did not render", ids
    )
    return ids


def _capture_widget(page, name, widget, output):
    print(f"Visual #211: framing {name}/{widget}", flush=True)
    focus(page, widget)
    # ORBIT's native focus prioritizes the camera/layout. A long widget may
    # exceed the viewport; frame its heading with the production camera API
    # instead of requiring the ENTIRE widget rectangle to fit on-screen.
    page.evaluate(
        """id => {
          const board=window.orbitDebug.board;
          const element=board.widgets.get(id);
          if(!element || element.hidden) throw Error('Synthetic widget missing');
          const heading=element.querySelector('.widget-heading');
          if(!heading) throw Error('Synthetic widget has no heading');
          board.ensureVisible(heading);
        }""", widget,
    )
    page.wait_for_function(
        """id => {
          const board=window.orbitDebug.board;
          const element=board.widgets.get(id);
          const heading=element?.querySelector('.widget-heading');
          if(!heading || element.hidden) return false;
          const viewport=board.viewport.getBoundingClientRect();
          const rect=heading.getBoundingClientRect();
          return rect.right>viewport.left && rect.left<viewport.right &&
            rect.bottom>viewport.top && rect.top<viewport.bottom;
        }""",
        arg=widget, timeout=4000,
    )
    location = OUT / f"{name}-{widget}.png"
    page.screenshot(
        path=str(location), animations="disabled", caret="hide",
        mask=[page.locator("#clock")],
    )
    assert location.is_file() and location.stat().st_size > 2000
    output.append(location.name)


def _capture_viewport(browser, name, width, height, mobile):
    context, page, errors = _new_context(browser, width, height, mobile)
    filenames = []
    trace_file = OUT / f"{name}-synthetic-trace.zip"
    try:
        context.tracing.start(screenshots=True, snapshots=True)
        _seed_by_visible_controls(page)
        layout = page.evaluate("() => window.orbitDebug.board.getLayout()")
        ids = _widget_ids(page)
        for widget in ids:
            _capture_widget(page, name, widget, filenames)
        # Captures must not mutate saved positions or destroy the dummy draft.
        assert page.evaluate("() => window.orbitDebug.board.getLayout()") == layout
        page.reload()
        page.locator("#node-layer .graph-node").first.wait_for(state="attached")
        focus(page, "journal")
        expect(page.locator("#journal-entry-title")).to_have_value(
            FAKE["journal_title"]
        )
        ensure_journal_edit(page)
        expect(page.locator("#journal-editor")).to_contain_text(FAKE["journal_body"])
        assert not errors, "Uncaught script errors in synthetic fixture"
        context.tracing.stop(path=str(trace_file))
        return {"viewport": [width, height], "widgets": ids,
                "screenshots": filenames, "trace": trace_file.name,
                "result": "PASS"}
    except Exception:
        try:
            page.screenshot(path=str(OUT / f"{name}-failure.png"),
                            animations="disabled")
            context.tracing.stop(path=str(OUT / f"{name}-failure-trace.zip"))
        finally:
            raise
    finally:
        context.close()


def _assert_fresh_context(browser):
    context, page, errors = _new_context(browser, 1440, 900, False)
    try:
        text = page.evaluate(
            "() => JSON.stringify(Object.fromEntries(Object.entries(localStorage)))"
        )
        rendered = page.locator("#app").inner_text()
        assert all(value not in text and value not in rendered for value in FAKE.values()), (
            "Synthetic data crossed an isolated browser context"
        )
        assert not errors
    finally:
        context.close()


def main():
    if os.environ.get("ORBIT_SYNTHETIC_ONLY") != "1":
        raise SystemExit("NO-GO: explicit synthetic-only opt-in required")
    source = os.environ.get("ORBIT_VISUAL_SOURCE_SHA", "")
    if not re.fullmatch(r"[0-9a-f]{40}", source):
        raise SystemExit("NO-GO: record exact 40-character reviewed source SHA")
    OUT.mkdir(parents=True, exist_ok=True)
    results = {"fixture": "DISPOSABLE_LOCAL_NO_LOGIN",
               "source_sha": source,
               "auth_bypass": False, "cloud_requests": 0,
               "status": "NOT RUN", "viewports": {}}
    # Not a public route, app feature flag, Auth interceptor, RLS change or
    # production snapshot. Browser executable uses already-installed tooling.
    with server(), sync_playwright() as playwright:
        exe = None if os.environ.get("ORBIT_BROWSER_BUNDLED") == "1" else (
            os.environ.get("ORBIT_CHROMIUM") or shutil.which("chromium")
        )
        browser = playwright.chromium.launch(
            headless=True, executable_path=exe, args=["--no-sandbox"]
        )
        try:
            for name, width, height, mobile in VIEWPORTS:
                results["viewports"][name] = _capture_viewport(
                    browser, name, width, height, mobile
                )
            _assert_fresh_context(browser)
            results["isolation"] = "PASS"
            results["status"] = "PASS"
        finally:
            browser.close()
    (OUT / "manifest.json").write_text(
        json.dumps(results, indent=2) + "\n", encoding="utf-8"
    )
    assert all(len(v["screenshots"]) >= 7 for v in results["viewports"].values())
    print("PASS #211: synthetic/no-login visual evidence, desktop+mobile, no cloud")
    print(json.dumps({k: v for k, v in results.items() if k != "viewports"}))


if __name__ == "__main__":
    main()
