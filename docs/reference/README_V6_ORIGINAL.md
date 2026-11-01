# ORBIT V6 — The Spatial Scrapbook

A working, dependency-free **local prototype** of a personal spatial scrapbook, not a fixed dashboard. The constellation, continuum timeline, to-do list, completed-task list, backup widget and paper journal occupy **one pannable, zoomable two-dimensional world**. On phones, the places map collapses to a small glass button to avoid obscuring the content.

## Try it

Open `ORBIT_Offline_Preview.html` in a modern browser. It contains all CSS and JavaScript, so it works without a build process. It saves tasks, widget positions/sizes and journal pages in `localStorage` where the browser permits it. This is **not private cloud storage**. Export full JSON backups frequently; browser cleanup can delete local data.

For the modular version, from the repository root:

```sh
python -m http.server 4173
```

Then visit http://localhost:4173. The modular static site is suitable for Vercel after access restrictions are configured. Do not place diary entries or secrets in GitHub.

## Interactions

- **Move through the world:** drag blank space; scroll/trackpad pans; Ctrl/Cmd+wheel zooms; on touch, pan or pinch. Upper-right world controls zoom/fit the whole scrapbook.
- **Move a window:** drag its **empty title bar or title text**, or its six-dot handle. Buttons and fields inside a title bar remain clickable. On a focused handle, arrow keys move a widget; Shift+arrow makes a larger move.
- **Resize a widget:** drag the **subtle diagonal corner** at its bottom right. Focus this handle and use arrow keys to resize in 24px increments; Shift+arrow uses 100px. Each widget has limits to prevent unusable dimensions. Width and height persist, and full JSON backups include them.
- **Find a widget:** use the spatial navigator. On phones, tap the small glass compass button to expand the navigator, choose a destination, and it closes again.
- **Constellation:** free-depth radial branches and colored, free-floating active task text. Click a branch to focus; click/tap a task to read criteria inline. Completed tasks leave the active map and remain in history.
- **Continuum:** scroll horizontally through time. +/− changes time scale; Today returns to the present. Deadlines are above the axis, milestones **below** it, and dated journal pages appear as tiny paper markers **below the milestones**. Click a page marker to fly to and open its journal page. Two or more pages on a date share one marker with a count.
- **Milestone:** use `+ milestone` and enter a title and date. This prototype keeps the existing click-twice-to-remove behavior.
- **Journal:** type directly on warm paper, apply rich formatting, navigate pages, add/delete with Undo, export Markdown. Click the **date field** at the top of the paper to change the date of the current page. Once a page contains a title or text, its date appears under the timeline. Blank pages don't create timeline clutter. Every page retains its own date.
- **Backup:** full JSON export/restore includes tasks, branches, preferences, milestones, widget coordinates/sizes and all journal pages. CSV import/export remains for task data.

## What is and isn't production-ready

The prototype uses native browser modules, an allowlisted rich-text HTML editor and localStorage. Journal entries are **not authenticated, end-to-end encrypted, or cross-device synced**. A private GitHub repository alone **does not** make the Vercel deployment private. Protect the deployed preview, then implement Supabase Auth + owner-specific Row Level Security before entering private diary content online. The journal editor uses deprecated `execCommand` formatting in this prototype; a structured editor is recommended for production.

## Project structure

- `index.html` — six spatial widgets, timeline, journal date input, and compact mobile navigator.
- `src/board.js` — global pan/pinch camera, window title dragging, 2D resize, persisted positions and sizes, navigation.
- `src/widgets.js` — task lists and expandable timeline with milestones and clickable journal-date markers.
- `src/journal.js` — dated rich-text pages, formatting, sanitization, autosave, Markdown export.
- `src/app.js` — synchronization, capture, full JSON backup/restore, cross-widget journal opening.
- `src/constellation.js`, `src/layout.js` — independently zoomable elastic radial task map.
- `src/styles.css` — animated atmosphere, translucent glass, paper styling and adaptive interactions.
- `docs/HANDOFF.md` — authoritative context for a new chat or coding agent.

## Checks

```sh
npm test
python scripts_build_preview.py
python tests/qa_v6.py
python tests/qa_v5.py
python tests/extra_v5_checks.py
```

The browser scripts require Playwright and Chromium; they run with mocked localStorage. They cover desktop, tablet, small and regular phone, and landscape, but **physical iPhone/Android, screen-reader, production HTTPS, and persistent real-origin storage have not been tested**.
