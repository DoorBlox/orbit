# ORBIT V6 — architecture

The app intentionally keeps V4's lean native ES-module structure for prototype iteration; no npm runtime deps. **Do not replace the spatial board with a normal responsive dashboard.**

## Architecture

- `index.html`: one `#spatial-viewport` > transformed `#spatial-world` with six `data-widget` draggable children. Ambient color orbs sit *outside* board and remain full-viewport while board moves.
- `src/board.js`: global world transform `translate3d(pan) scale(zoom)`; mouse/touch blank-space pan and touch pinch; ctrl/cmd wheel zoom; individual title bars and grips update world `x/y`; lower-right handles persist `width/height`, with keyboard alternatives; localStorage and mobile-collapsible minimap dots. No grid layout or scroll-to-section.
- `src/constellation.js`: independent graph camera and pointer interactions; graph reads untransformed `offsetWidth` rather than scaled `getBoundingClientRect`; event coordinates are normalized by `hostScale` to prevent double-zoom math errors.
- `src/layout.js`: unconstrained-depth radial branch tree, active terminal task stacks, collision-sparing placement.
- `src/widgets.js`: active/completed lists and timeline are views of the same tasks. Timeline additionally maps journal pages to date markers and reserves dedicated marker lanes.
- `src/journal.js`: rich-text editor using a restricted HTML allowlist; localStorage entries with editable date-only keys, page navigation and opening entries from the timeline, Markdown output. Legacy `execCommand` formatting is a short-term prototype compromise; replace with Tiptap/ProseMirror for production. Never directly render unsanitized backup HTML.
- `src/app.js`: orchestrates current V4 task data, new board positions and journal. Backup version 6 includes widget dimensions in addition to all V5 datasets; V5 backups without dimensions remain importable. Restoration validates task/branch relations and journal content before persistence.

## Security direction

Static Vercel hosting makes the frontend code accessible to visitors; private GitHub does not secure the deployed URL. Local browser storage is not authentication or encryption. Real privacy needs Supabase authentication, row-level security, authorization audit, and export/recovery logic before syncing the diary. No API keys or service role secrets in client code.

## Performance choices

Ambient movement uses CSS transforms on four blurred elements and pauses under reduced-motion. Camera uses a single transform on the board; children use absolute positions. Map graph maintains its own camera. Scene redraws should not be triggered by each ambient animation frame. Mobile chroma/blur values are reduced. Long journal entries scroll inside the paper.
