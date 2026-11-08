# ORBIT 1.0.0 — current architecture

**8 November 2026.** ORBIT is a protected private, cloud-backed **single-owner** static web app. Earlier architectural prototypes under `docs/06-SYSTEM-ARCHITECTURE.md` and Git history are reference material, not proof the cloud remains unwired.

## Browser architecture

- **Rendering:** `index.html` and `src/styles.css` establish the glass/pastel space. `src/board.js` drives the 2D world camera, independent widget dragging/resizing, keyboard alternatives and minimap. There is **one canvas-like coordinate plane**; do not substitute separate pages or a regular card dashboard.
- **Views:** `src/constellation.js`, `src/layout.js` and `src/widgets.js` present the arbitrary-depth branch graph, active/completed task views, timeline markers, milestones and dated journal links. The radial constellation has its own nested camera distinct from the world camera.
- **Owner state:** `src/app.js`, `src/model.js`, `src/data.js`, `src/dates.js`, `src/journal.js` and `src/backup.js` connect task/journal models, civil date handling, sanitization, exports, import safety and recovery.
- **Local fallback:** `src/storage.js` supports the local prototype without cloud variables. It is **not** an alternative way to access private Production records.
- **Boot/auth:** `src/bootstrap.js` selects the mode and mounts private UI only after `src/auth/controller.js` verifies `getUser()` and owner authority. `src/auth/shell.js` renders sign-in/sign-out and failure states. Exact URL origin equality is intentional.
- **Cloud boundary:** `src/cloud/client.js` is the pinned Supabase SDK bundle. `src/cloud/client-config.js`, `repository.js`, `sync.js`, `mappers.js` and `owner-tools.js` manage owner snapshots, RLS-compatible CRUD, revision conflict/recovery and owner-controlled export/import.
- **Build:** `scripts/build.mjs` outputs only allowlisted static browser code/assets plus generated public-only runtime config; `scripts/production-guard.mjs` rejects unsafe Production targets and CSP; `scripts/verify-release.mjs` checks clean source, exact bundle and artifact hashes. Native ES modules are retained; esbuild bundles the Supabase SDK boundary only.

## Hosted layers (independent protections)

1. **Vercel:** Static distribution from protected project `orbit`, Deployment Protection set to **all deployments**. Canonical `https://orbit.starscene.com/`; `https://orbit.allintime.space/` is an explicit redirect to canonical, not a parallel Auth origin.
2. **Supabase Auth:** Owner signs in using the accepted password path. The AuthController requires the configured redirect's **origin to equal** current origin. Email/Google alternatives are not a certified release path.
3. **Supabase PostgreSQL:** Seven private workspace tables—`profiles`, `branches`, `tasks`, `journal_entries`, `milestones`, `widget_layouts`, `preferences`—have server owner-only RLS and least-privilege grants. The owner RPC relies on server-maintained `auth.uid()`/allowlist, not browser email/metadata.
4. **Persistence and conflict:** Repository snapshot operations use revisions and explicit recovery paths; there is no unconsented legacy-data upload. Public projection is disabled in the deployed single-owner configuration.
5. **External backups:** Complete JSON exports remain owner-controlled and unencrypted by the app. Backups do not replace RLS, and code/alias rollback never restores deleted user data.

## Deployment and test infrastructure

- Public MIT GitHub source: `DoorBlox/orbit`. `package.json.private=true` prevents npm registry publication, not GitHub visibility.
- Automated CI: syntax/unit/source integrity, browser mock/actual-origin suites, disposable local pgTAP + bearer HTTP, static Production dry run, anonymous Vercel access smoke. SQL/local Auth tests do not equal hosted HTTP mutation certification.
- Git automation is intentionally **disabled** in `vercel.json`. Manual staging uses Production configuration and `--prebuilt --prod --skip-domain` before explicitly approved alias assignment. Current stage workflow pins the already-released app source `fc5af5a`.
- Deployment serving source SHA differs from newer documentation/CI commits on main. Consult [OPERATIONS.md](OPERATIONS.md) before switching traffic.

## Non-negotiable constraints

Preserve the six-window user experience, V6 provenance, direct-owner RLS, exact Auth origin, private deployment protection, locked dependencies and safe-import behavior. No service-role secrets or owner data in browser bundles, CI artifacts or Git history. For precise current service IDs and rollback caveats see [OPERATIONS.md](OPERATIONS.md); for evidence and unresolved tests see [PROJECT_HISTORY.md](PROJECT_HISTORY.md).
