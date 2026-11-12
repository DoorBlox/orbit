"""W6 cross-widget real-origin Chromium acceptance, using only disposable local fixtures.

Independent runner, deliberately NOT a production or authenticated cloud test.
After npm run build and installing Playwright + Chromium:
  ORBIT_BROWSER_BUNDLED=1 python tests/qa_acceptance_cross_widget.py

W4 owns any quality-workflow wiring; this module does not edit their workflow.
"""
import json
import os
import shutil
from pathlib import Path

from playwright.sync_api import expect, sync_playwright
from qa_m1 import server, open_page, reload_page, focus, ensure_journal_edit

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa" / "acceptance"
JOURNAL_TITLE = "W6 synthetic integration journal"
JOURNAL_BODY = "W6 private synthetic journal paragraph"
STICKY_TITLE = "W6 synthetic integration sticky"
STICKY_BODY = "W6 private synthetic sticky paragraph"
PROJECT_BODY = "W6 private synthetic project brief"


def _local_saved(page):
    """Use app persistence, not sleeps or the mere presence of a DOM edit."""
    page.wait_for_function(
        """([title,sticky,project]) => {
          try {
            const journal = JSON.parse(localStorage.getItem('orbit.v5.journal') || '[]');
            const ext = JSON.parse(localStorage.getItem('orbit.v8.extensions') || '{}');
            return journal.some(row => row.title === title &&
              row.html.includes('W6 private synthetic journal paragraph')) &&
              ext.notes?.some(note => note.title === sticky &&
                note.text.includes('W6 private synthetic sticky paragraph')) &&
              ext.projects?.research?.description === project;
          } catch { return false; }
        }""",
        arg=[JOURNAL_TITLE, STICKY_TITLE, PROJECT_BODY],
        timeout=12000,
    )


def _check_all_visible(page):
    focus(page, "journal")
    expect(page.locator("#journal-entry-title")).to_have_value(JOURNAL_TITLE)
    ensure_journal_edit(page)
    expect(page.locator("#journal-editor")).to_contain_text(JOURNAL_BODY)

    note = page.locator(".sticky-note").filter(
        has=page.locator(".sticky-title[value='" + STICKY_TITLE + "']")
    )
    # Input value is a live property, not always an HTML attribute after editing.
    if note.count() != 1:
        note = page.locator(".sticky-note").first
    expect(page.locator(".sticky-note")).to_have_count(1)
    expect(note.locator(".sticky-title")).to_have_value(STICKY_TITLE)
    expect(note.locator(".sticky-text-preview")).to_contain_text(STICKY_BODY)

    focus(page, "projects")
    card = page.locator('.project-card[data-project-id="research"]')
    expect(card).to_be_visible()
    expect(card).to_contain_text(PROJECT_BODY)


def run(browser):
    results = {
        "same_workspace_edit_reload": "NOT RUN",
        "touch_capable_mobile_seed_focus": "NOT RUN",
        "fresh_context_isolation": "NOT RUN",
    }
    seed = None
    context, page, errors = open_page(browser, (1440, 900))
    try:
        # Use actual controls for three independent widgets in ONE session.
        focus(page, "journal")
        ensure_journal_edit(page)
        page.locator("#journal-entry-title").fill(JOURNAL_TITLE)
        page.locator("#journal-editor").fill(JOURNAL_BODY)

        focus(page, "space")
        page.locator("#new-sticky").click()
        expect(page.locator(".sticky-note")).to_have_count(1)
        note = page.locator(".sticky-note").first
        note.get_by_role("button", name="Edit sticky note").click()
        note.locator(".sticky-title").fill(STICKY_TITLE)
        note.locator(".sticky-title").dispatch_event("change")
        note.locator(".sticky-body").fill(STICKY_BODY)
        note.get_by_role("button", name="Preview sticky note").click()
        expect(note.locator(".sticky-text-preview")).to_contain_text(STICKY_BODY)

        focus(page, "projects")
        page.get_by_role(
            "combobox", name="Choose a branch for a private project"
        ).select_option("research")
        page.get_by_role("button", name="Add private project").click()
        card = page.locator('.project-card[data-project-id="research"]')
        expect(card).to_be_visible()
        card.get_by_role("button", name="Edit project brief for Research").click()
        card.get_by_role("textbox", name="Description for Research").fill(PROJECT_BODY)
        card.get_by_role("button", name="Save project brief").click()
        expect(card).to_contain_text(PROJECT_BODY)
        _local_saved(page)

        layout_before = page.evaluate("() => window.orbitDebug.board.getLayout()")
        reload_page(page)
        _check_all_visible(page)
        assert page.evaluate("() => window.orbitDebug.board.getLayout()") == layout_before, \
            "Journal/Sticky/Projects reload changed world widget positions"
        _local_saved(page)
        seed = page.evaluate("() => Object.fromEntries(Object.entries(localStorage))")
        assert not errors, errors
        results["same_workspace_edit_reload"] = "PASS"
    except Exception:
        page.screenshot(path=str(OUT / "w6-desktop-failure.png"), animations="disabled")
        context.tracing.stop(path=str(OUT / "w6-desktop-failure-trace.zip"))
        raise
    finally:
        context.close()

    # Synthetic phone emulation is a distinct browser context seeded with only
    # the disposable local workspace, not a physical phone or hosted account.
    context, page, errors = open_page(
        browser, (390, 844), seed=seed, is_mobile=True, has_touch=True
    )
    try:
        _check_all_visible(page)
        layout_before = page.evaluate("() => window.orbitDebug.board.getLayout()")
        focus(page, "space")
        page.locator(".space-manage > summary").click()
        page.locator("#bp08-focus-picker").select_option("projects")
        expect(page.locator("#bp08-focus-exit")).to_be_visible()
        assert page.evaluate("""() => window.orbitDebug.board.widgets
          .get('space').inert === true"""), "Focus did not isolate the chosen widget"
        page.set_viewport_size({"width": 844, "height": 390})
        page.wait_for_function("""() => {
          const s = window.orbitDebug.board.lastViewportSize;
          return s && s.w === 844 && s.h === 390;
        }""")
        expect(page.locator("#bp08-focus-exit")).to_be_visible()
        page.locator("#bp08-focus-exit").click()
        assert page.evaluate("() => window.orbitDebug.board.focusReturn === null")
        assert page.evaluate("() => window.orbitDebug.board.getLayout()") == layout_before, \
            "Rotating the emulated phone corrupted saved widget geometry"
        _local_saved(page)
        assert not errors, errors
        results["touch_capable_mobile_seed_focus"] = "PASS"
    except Exception:
        page.screenshot(path=str(OUT / "w6-mobile-failure.png"), animations="disabled")
        context.tracing.stop(path=str(OUT / "w6-mobile-failure-trace.zip"))
        raise
    finally:
        context.close()

    # A brand-new local browser context must not inherit another context's
    # localStorage. This is NOT proof of hosted RLS or two-account Auth.
    context, page, errors = open_page(browser, (1440, 900))
    try:
        private_markers = [JOURNAL_TITLE, JOURNAL_BODY, STICKY_TITLE,
                           STICKY_BODY, PROJECT_BODY]
        local_json = page.evaluate(
            "() => JSON.stringify(Object.fromEntries(Object.entries(localStorage)))"
        )
        assert all(marker not in local_json for marker in private_markers), \
            "A fresh browser context inherited synthetic private workspace data"
        assert all(marker not in page.locator("#app").inner_text()
                   for marker in private_markers), \
            "Synthetic private content leaked into a fresh context's rendered app"
        assert not errors, errors
        results["fresh_context_isolation"] = "PASS"
    except Exception:
        page.screenshot(path=str(OUT / "w6-fresh-context-failure.png"),
                        animations="disabled")
        context.tracing.stop(path=str(OUT / "w6-fresh-context-failure-trace.zip"))
        raise
    finally:
        context.close()

    return results


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    results = None
    with server(), sync_playwright() as playwright:
        executable = (None if os.environ.get("ORBIT_BROWSER_BUNDLED")
                      else os.environ.get("ORBIT_CHROMIUM") or shutil.which("chromium"))
        browser = playwright.chromium.launch(
            headless=True, executable_path=executable, args=["--no-sandbox"]
        )
        try:
            results = run(browser)
        finally:
            browser.close()
    (OUT / "w6-cross-widget-results.json").write_text(
        json.dumps(results, indent=2) + "\n", encoding="utf-8"
    )
    print("PASS W6 real-origin, same-workspace multi-widget/phone-context acceptance")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
