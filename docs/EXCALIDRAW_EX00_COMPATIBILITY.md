# EX-00 — Real Excalidraw integration feasibility and scene adapter

**9 November 2026. Status: EX-00 source work in review.** This is a first executable compatibility slice, **not** the full upstream React editor. The owner explicitly prioritizes the actual official component for **both** Journal and sticky notes.

## Decision

Keep the six-window native HTML/CSS/JS ORBIT spatial world. The existing Journal and sticky-note Draw/Edit controls both call **src/scene.js:openSceneEditor(initial, {title, onSave, notify})**. Preserve that common seam. When the library is installed and the bundle verified, offer a **lazy, self-hosted React island** for drawing only, unmounting it on Save/Cancel/logout. Do NOT introduce React for the rest of the app or a remote Excalidraw iframe/CDN.

The package @excalidraw/excalidraw currently has stable version **0.18.1** with MIT license and official React/ReactDOM peers. At integration time pin exact compatible versions in package.json **and package-lock.json**, review dependencies/security and license, and measure the initial route's JavaScript separately from the on-demand editor chunk. The official package exposes **initialData** and **onChange(elements, appState, files)**. Its CSS must be bundled locally. The official installation notes require copying **dist/prod/fonts** to same-origin static assets and setting EXCALIDRAW_ASSET_PATH BEFORE mount. The current ORBIT build copies native modules and bundles only the Supabase SDK; it needs a narrowly scoped separate Excalidraw ESM entry chunk for EX-01.

## What EX-00 implemented (source under PR review)

- **src/excalidraw-adapter.js** is a pure framework-neutral adapter between ORBIT's existing version-2 .excalidraw scenes and the official component API. It creates separate initialData objects, converts onChange output into an explicit-save, durable scene, drops ephemeral editor state (including collaborators and selections), honors stored six-digit paper background color, rejects duplicate IDs and unsafe links, and uses existing **normalizeScene** bounds (400 elements, 180 KiB).
- **embed options** turn off the image tool and the upstream independent scene import/remote export actions until integration has a safe media route; image/iframe/embeddable elements and binary files are rejected rather than silently stripped. A future separate EX-02 revision will handle private image assets through authenticated Storage and portable backup.
- **theme adapter** uses light editor canvas for normal themes, dark for Night Garden and Graphite. The future host needs a measured responsive dialog with a nonzero canvas height, keyboard/focus and reduced-motion support.
- **tests/excalidraw_adapter.test.mjs** specifies round-trip scene integrity, no mutation, bounded geometry, empty-scene handling, privacy rejection and no transient state persistence. This module does not install Excalidraw or make network requests on page load.
- **scripts/build.mjs** allowlists the adapter so an EX-01 import can use native modules; current source manifest registers the new file's SHA-256 with a review reason, preserving immutable V6/M1 provenance.

## Deployment and security invariants

- No external runtime CDN, iframe, telemetry, collaboration endpoint, service-role key, user media exposure or new hosted database schema.
- Do not send private scene or journal data to excalidraw.com implicitly. Current explicit external file interchange button is a **legacy manual user choice**, not embedded editing.
- Do not claim that the current SVG preview fully renders all Excalidraw shapes, especially diamonds, frames and advanced arrows. EX-01 must verify preview fidelity or render from the upstream scene without adding expensive UI to idle widget views.
- The app currently rejects Excalidraw inline binary assets, and BP-02 backup only archives **attached sticky/journal media paths**, not files stored in Excalidraw scenes. Test EX-02 as separate work with per-owner asset remapping and updated portable archive version.
- Avoid saving every high-frequency onChange callback to Supabase; buffer locally in the opened editor and commit only through ORBIT's explicit onSave, using the existing CAS sync pipeline.

## EX-01 acceptance checklist — full official editor, not just a native pen clone

1. Exact pinned @excalidraw/excalidraw, react and react-dom dependencies plus reviewed npm lockfile. Build with local esbuild and packaged CSS/fonts; initial sign-in bundle size unchanged except a small adapter/entry loader, with a measured lazy chunk budget.
2. Both Journal and sticky controls invoke the **same** lazily loaded real official Excalidraw component with shape/pen/text/arrow, undo/redo and color/background options. Ensure no dev-only missing module, upstream API mismatch or CSS collisions. The existing native editor remains as a safe fallback until QA passes.
3. Save/Cancel restores the correct prior drawing, preserves older 2.4 scenes/legacy backups, creates no unsolicited files, and leaves private content unmodified on failed validation. No onChange-driven cloud flood. Close the dialog and React root on logout; do not leak resize/window listeners.
4. The editor works with keyboard, pen/touch, mobile and ten themes, respects reduced motion and correctly layers focus. Verify with synthetic assets, Playwright and real Safari/Android where available.
5. Source PR passes all four required exact-head CI statuses; a Production release is **separate authorization** after staged protected preview and signed-in owner acceptance. Issue #31 stays open until EX-01/02 acceptance is actually complete.

## Dependency and environment limitation

The currently connected source tooling can read/write the GitHub repo, run GitHub Actions, and edit documentation. The assistant container was unable to resolve the npm registry, and @excalidraw/excalidraw was not cached locally. Consequently **no actual React/Excalidraw module build, npm lockfile generation, font bundling or official canvas render was completed in EX-00**. Do not fake a lockfile or claim a component was embedded. EX-01 must generate and review the lockfile in a network-enabled isolated build environment, ideally once, without bypassing CI or package-integrity checks.

## Official upstream evidence (verify exact versions at EX-01 implementation time)

- https://www.npmjs.com/package/@excalidraw/excalidraw
- https://github.com/excalidraw/excalidraw/blob/master/dev-docs/docs/%40excalidraw/excalidraw/installation.mdx
- https://github.com/excalidraw/excalidraw/blob/master/dev-docs/docs/%40excalidraw/excalidraw/api/props/props.mdx
- https://github.com/excalidraw/excalidraw/blob/master/dev-docs/docs/%40excalidraw/excalidraw/api/props/ui-options.mdx

**Next implementation:** EX-01 pinned dependency and lazy editor build prototype (synthetic scenes only), or BP-03 verified 15-second sync request reduction while build tooling availability is resolved.
