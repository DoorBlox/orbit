"""BP-16 real-origin keyboard / focus / combobox accessibility regressions.

Uses the existing synthetic, offline ORBIT browser harness. No live auth,
private account, external endpoint, or downloaded workspace data is involved.
Run after npm run build: python tests/qa_bp16_accessibility.py
"""
import json
import os
import shutil
from pathlib import Path

from playwright.sync_api import expect, sync_playwright
import qa_m1 as qa

RESULTS = qa.OUT / 'bp16-accessibility-results.json'


def assert_modal_accessibility(page):
    dialog = page.get_by_role('dialog', name='Go anywhere')
    expect(dialog).to_be_visible()
    assert dialog.evaluate('e => e.matches(":modal")'), 'Jump must be a native modal'
    assert dialog.evaluate('e => e.getAttribute("aria-labelledby") === "orbit-jump-title"')
    field = page.get_by_role('combobox', name='Search your private space')
    expect(field).to_be_focused()
    expect(field).to_have_attribute('aria-controls', 'orbit-jump-results')
    expect(field).to_have_attribute('aria-describedby', 'orbit-jump-hint')
    expect(field).to_have_attribute('aria-expanded', 'true')
    expect(page.get_by_role('listbox')).to_be_visible()
    expect(page.get_by_role('button', name='Close spatial search')).to_be_visible()
    assert field.evaluate('''e => {
      const s = getComputedStyle(e);
      return e.matches(':focus-visible') && s.outlineStyle !== 'none' &&
        parseFloat(s.outlineWidth) >= 2;
    }'''), 'Focused search needs a visible focus indicator'
    return dialog, field


def assert_tab_stays_modal(page, dialog):
    # Real keyboard Tab/Shift+Tab must not reach the spatial canvas behind modal.
    for key in ['Tab'] * 8 + ['Shift+Tab'] * 8:
        page.keyboard.press(key)
        assert page.evaluate('''() => {
          const dialog = document.querySelector('#orbit-jump-dialog');
          return dialog.open && dialog.contains(document.activeElement);
        }'''), f'Modal focus escaped into background after {key}'
    # Restore input without invoking a non-keyboard activation.
    page.get_by_role('combobox', name='Search your private space').focus()
    expect(dialog).to_be_visible()


def assert_option_relationships(page, field):
    options = page.locator('#orbit-jump-results [role="option"]')
    assert options.count() >= 2, 'Initial private spatial index should be keyboard-searchable'
    expect(field).to_have_attribute('aria-activedescendant', 'orbit-jump-option-0')
    assert page.evaluate('''() => {
      const list = [...document.querySelectorAll('#orbit-jump-results [role="option"]')];
      const input = document.querySelector('.orbit-jump-input');
      const chosen = document.getElementById(input.getAttribute('aria-activedescendant'));
      return chosen && chosen.getAttribute('aria-selected') === 'true' &&
        chosen.closest('[role="listbox"]')?.id === input.getAttribute('aria-controls') &&
        list.filter(node => node.getAttribute('aria-selected') === 'true').length === 1;
    }'''), 'One selected option must match the combobox active descendant'
    field.press('ArrowDown')
    expect(field).to_have_attribute('aria-activedescendant', 'orbit-jump-option-1')
    expect(page.locator('#orbit-jump-option-1')).to_have_attribute('aria-selected', 'true')
    expect(page.locator('#orbit-jump-option-0')).to_have_attribute('aria-selected', 'false')
    field.press('ArrowUp')
    expect(field).to_have_attribute('aria-activedescendant', 'orbit-jump-option-0')
    field.fill('zzzz-unique-no-results-987')
    expect(page.locator('.orbit-jump-empty')).to_contain_text('Nothing found')
    assert field.get_attribute('aria-activedescendant') is None, (
        'No-results state must remove a stale aria-activedescendant'
    )
    expect(field).to_be_focused()


def desktop(browser):
    ctx, page, errors = qa.open_page(browser, size=(1440, 900))
    try:
        trigger = page.get_by_role(
            'button', name='Jump to a task, branch, note, journal page or window'
        )
        expect(trigger).to_be_visible()
        trigger.focus()
        trigger.press('Enter')
        dialog, field = assert_modal_accessibility(page)
        assert_tab_stays_modal(page, dialog)
        assert_option_relationships(page, field)
        field.press('Escape')
        expect(dialog).not_to_be_visible()
        expect(trigger).to_be_focused()

        # Keyboard reopening and repeated close must keep focus on the owner,
        # not inside a now-hidden stale native dialog.
        trigger.press('Space')
        dialog, field = assert_modal_accessibility(page)
        field.press('Escape')
        expect(dialog).not_to_be_visible()
        expect(trigger).to_be_focused()

        # Existing capture input owns Ctrl+K: do not hijack edit-field shortcuts.
        capture = page.locator('#capture-name')
        capture.focus()
        capture.press('Control+k')
        expect(dialog).not_to_be_visible()
        expect(capture).to_be_focused()

        # Spatial widget keyboard operations retain a visible focus ring,
        # accessible labels, and deterministic movement rather than dragging.
        grip = page.locator('#space-widget .widget-grip')
        expect(grip).to_have_attribute('aria-label', 'Move Your space widget. Arrow keys move it.')
        qa.focus(page, 'space')
        grip.focus()
        before = page.evaluate('window.orbitDebug.board.getLayout().space.x')
        grip.press('ArrowRight')
        after = page.evaluate('window.orbitDebug.board.getLayout().space.x')
        assert after == before + 24, f'Keyboard move expected +24, got {before} -> {after}'
        assert grip.evaluate('''e => {
          const style = getComputedStyle(e);
          return e === document.activeElement && e.matches(':focus-visible') &&
            style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2;
        }'''), 'Keyboard-focused spatial grip requires a visible focus ring'
        assert not errors, errors
        return {'native_modal': 'PASS', 'focus_trap': 'PASS',
                'combobox_aria': 'PASS', 'focus_restoration': 'PASS',
                'keyboard_spatial': 'PASS'}
    finally:
        ctx.close()


def mobile(browser):
    ctx, page, errors = qa.open_page(browser, size=(390, 844), is_mobile=True, has_touch=True)
    try:
        trigger = page.locator('#orbit-jump-trigger')
        expect(trigger).to_be_visible()
        trigger.focus()
        trigger.press('Enter')
        dialog, field = assert_modal_accessibility(page)
        bbox = dialog.bounding_box()
        assert bbox and bbox['x'] >= -1 and bbox['y'] >= -1
        assert bbox['x'] + bbox['width'] <= 391, bbox
        assert bbox['y'] + bbox['height'] <= 845, bbox
        assert_tab_stays_modal(page, dialog)
        field.press('Escape')
        expect(dialog).not_to_be_visible()
        expect(trigger).to_be_focused()
        assert not errors, errors
        return {'mobile_keyboard_modal': 'PASS', 'mobile_focus_restoration': 'PASS'}
    finally:
        ctx.close()


def main():
    qa.OUT.mkdir(exist_ok=True)
    with qa.server(), sync_playwright() as playwright:
        executable = None if os.environ.get('ORBIT_BROWSER_BUNDLED') else (
            os.environ.get('ORBIT_CHROMIUM') or shutil.which('chromium')
        )
        browser = playwright.chromium.launch(
            headless=True, executable_path=executable, args=['--no-sandbox']
        )
        try:
            result = {'desktop': desktop(browser), 'mobile': mobile(browser)}
        finally:
            browser.close()
    RESULTS.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2), flush=True)


if __name__ == '__main__':
    main()
