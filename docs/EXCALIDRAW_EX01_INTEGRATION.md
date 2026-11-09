# ORBIT EX-01 — Real official Excalidraw lazy editor island

**9 November 2026. Source work in review, not deployed.** This is an implementation and test record, not evidence of signed-in Production acceptance. [EX-00 scene adapter](EXCALIDRAW_EX00_COMPATIBILITY.md), [ChatGPT handoff](../CHATGPT_HANDOFF.md), [issue #31](https://github.com/DoorBlox/orbit/issues/31).

## Scope and architectural decision

Use the official @excalidraw/excalidraw package **0.18.1**, React **19.3.1** and ReactDOM **19.3.1** as exact pinned npm dependencies with a real registry-resolved npm lockfile. Keep ORBIT's main world, six spatial widgets, existing Supabase private account flow and native scene model **unchanged**; React exists only in the editor island.

The original native Draw/Edit dialog remains accessible for both **Journal and sticky notes** through the shared openSceneEditor method in src/scene.js. A new button explicitly opens the actual official embedded editor. Its JavaScript and CSS are loaded only after the user clicks; no React, remote CDN, iframe, service-role key or external collaboration endpoint is added to default bootstrap/login.

The standalone editor is compiled with esbuild from src/excalidraw-island.entry.mjs into a separate same-origin asset. Its official CSS is emitted as a local file, and package fonts are copied to same-origin assets/excalidraw/fonts. The font base is set before loading the editor. A failed import/style load returns to the native drawing flow with a visible warning.

## Scene and privacy model

- The existing EX-00 adapter creates official initialData from a cloned current v2 scene. An onChange callback buffers drawing elements, appState and files **in memory**; it never sends each high-frequency pointer event to Supabase.
- Explicit **Save drawing** validates and normalizes the latest official scene using the same existing 400-element/180-KB no-image boundary and then uses existing Journal/sticky onSave handling. **Cancel** or closing the dialog leaves the original scene untouched.
- The official image tool and embedded remote media/iframes are disallowed. Files and image elements cannot be persisted until EX-02 extends the private media adapter and portable archive. Unsupported shapes can be saved, but the old lightweight SVG preview does not yet guarantee pixel-identical rendering for every upstream shape such as diamonds or frames; EX-01 review must record any gaps rather than falsely claiming full fidelity.
- A closed dialog unmounts the React root and removes the editor UI. External manual Excalidraw.com interchange is still an explicitly requested separate action; there is no automatic data transfer to that site.

## Testing and acceptance gates

1. Actual official npm dependencies and locked transitive packages must be installed with npm ci in isolated GitHub Actions; no invented lockfile. The lockfile was generated once in temporary read-only Actions run 42644109420, validated for exact versions and npm registry origins; temporary workflow removed before creating this PR.
2. Build produces local official JS, CSS, and web fonts. Release-artifact verifier independently rebuilds the editor and checks generated files, filename allowlist and font bytes against the pinned dependency package; syntax and current-source manifest checks remain enforced.
3. Playwright local synthetic test verifies lazy loading, no editor JS resource before explicit click, official editor visible in the **sticky note** and then the **Journal**, local font path, Save preserving existing scene, and no startup regression. Existing native drawing QA remains.
4. Measure/report actual uncompressed editor JS/CSS sizes from the esbuild metafile. The initial HTML and Supabase SDK bundle must not eagerly include React.
5. GitHub exact-head required checks: static-quality (Node, browser), local-postgres-rls (isolated bearer auth tests), production-artifact-dry-run (strict same-source asset bytes), and unauthenticated-protection.
6. **Still owner-gated:** signed-in Production sticky/journal drawing QA, mobile Safari/touch, screenshot alignment across ten themes, physical keyboard/assistive technology, private embedded image assets, durable scene preview fidelity for all shapes and scoped release authorization.

## Rollback and dependencies

No hosted SQL, Auth, Storage or RLS changes in EX-01. Source merge is not a Vercel deploy. The native editor remains a fallback. If actual official asset compilation, tests or accessibility gates fail, leave PR open or revert source work. EX-02 private embedded images and asset-inclusive backup integration remains separate; do not close issue #31 until agreed full functionality is actually verified.

The user requested the actual embedded Excalidraw experience, not merely a native pen clone. EX-01 must prove the upstream component truly renders and allows editing on synthetic fixtures before being considered SOURCE MERGED.
