# ORBIT V6 — agent instructions

**Read `docs/HANDOFF.md` first**, then `docs/PRODUCT_SPEC.md` and `docs/ARCHITECTURE.md`. The latest approved version is a pastel, light-glass, never-ending-feeling spatial scrapbook with no fixed section grid. Preserve the source app’s zero-runtime-dependency modular ES modules.

**Hard requirements:** all six widgets share one world; title bar as well as grip is draggable; lower-right resize for each window, with persisted sizes and mobile touch support; timeline milestones are never clipped; journal date is editable and each written date appears as a clickable paper marker beneath the timeline; completed tasks stay off the constellation; mobile navigator must collapse so it never blocks writing. The constellation remains arbitrarily deep with unboxed terminal task text and independent zoom. The journal remains paper-like and shows WYSIWYG text, never Markdown syntax. The Just Because branch is permanent.

**Privacy:** localStorage only in this prototype. No sign-in, synced cloud journal, or encryption. Do not claim otherwise; do not expose sensitive backups or private journal data online. Private GitHub repo does not automatically protect Vercel URL. Auth/RLS must be in place before real private content is sent to the web. Do not copy Spicy Lyrics AGPL rendering code.

**Verification:** Run `npm test`, `python scripts_build_preview.py`, `python tests/qa_v6.py`, `python tests/qa_v5.py`, and `python tests/extra_v5_checks.py` when Chromium/Playwright are available. Visually inspect desktop and mobile screenshots. Keep dates, sizes, layout, journal pages in JSON backup. Update HANDOFF and CHANGELOG whenever design decisions change.

**Next phase after user's review:** deploy a protected preview via private GitHub + Vercel, then implement Supabase Auth and owner-only RLS for private multi-device diary sync.
