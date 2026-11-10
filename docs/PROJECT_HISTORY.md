## 10 November 2026 — PJ-02B functional Projects MVP, source and protected Preview

- [PJ-02B PR #55](https://github.com/DoorBlox/orbit/pull/55) merged at `abfea03c743ad01c95f3a5847d574911856b3bd0` after all four required checks green at exact head `657d7f3395fc51e7665ef15940defdd17727efaf` ([CI run](https://github.com/DoorBlox/orbit/actions/runs/42733314320)). Real seventh private Projects spatial widget includes mark-from-branch, status/description edit, deduplicated nested task progress, branch focus, hide/reopen and phone affordances. Original six legacy V6 root widget IDs/data remain unchanged. The existing synthetic seventh fixture was moved to an eighth scratch test widget. M2 test's exact-six assertion was updated without weakening legacy baseline preservation.
- [protected PJ-02B Preview](https://orbit-ne9qywarm-doorbloxs-projects.vercel.app) is READY (`dpl_4oAw8fM18Z2gY9gCvYC3ddsjQHcD`) built from reviewed PR head `657d7f3395fc51e7665ef15940defdd17727efaf`; Vercel preview SSO stays enabled. Synthetic desktop and phone screenshots were visually inspected and default placement/phone width refined before final CI. **No Production promotion**, domain/hosted database change, paid provider or public content publication. Next gate: actual signed-in owner usability and privacy check if Production considered.
## 10 November 2026 — PJ-02A accessible private-project action, source merged

- [PR #53](https://github.com/DoorBlox/orbit/pull/53) adds a real branch context menu with right-click, keyboard Shift+F10/ContextMenu, More actions, viewport-scale readable layout and private project mark/unmark. Uses PJ-01 `extensions.projects` without task/branch hierarchy or legacy layout mutation. Source squash `0b2df5d6709014adef78c8348d98ecc5ca241186`. Four required checks green at exact PR head `c9dd92493697cf8ad280a0e80dbb6e21983c7f4e`, including synthetic Chromium nested/mobile interaction; [CI evidence](https://github.com/DoorBlox/orbit/actions/runs/42730342760). One initial QA fixture assumed unsaved branches/tasks were in localStorage; corrected to inspect live scene data, preserving production code.
- Owner feedback recorded in [10 Nov projects and UX backlog](../plans/ORBIT_PROJECT_EXPERIENCE_BACKLOG_2026_11_10.md): future curated portfolio publish with explicit approval/versioning, better project details and milestones, nested collapse affordances and empty-tail cleanup, touch mini-map drag smoothing, original mascot sign-in. Live Production not promoted because an actual Projects management window (PJ-02B) is not yet released. No hosted mutations or public publishing.
## 9 November 2026 — SP-01B and PJ-01 source closeout

- [PR #50](https://github.com/DoorBlox/orbit/pull/50) added first-party dynamic seventh-widget mounting, keyboard move/resize and hidden Places-map reopening with owner-private optional-layout state; V6 legacy root layout unchanged. Two test failures were addressed before final four exact-head checks passed. Squash `0a8e1a92bf91f0e9af79b076a2158cb7c18bb8fe`. No user-facing Projects panel.
- [PR #51](https://github.com/DoorBlox/orbit/pull/51) introduced private validated project metadata keyed by existing branch IDs, strict backup validation and branch delete/Undo recovery. The first test expectations were corrected, then all four exact-head required checks passed. Squash `50d8a6fe88645588eb37bc3fb0e6dcc35b3c24e3`. No right-click conversion UI or publication.
- Both source-only: no Vercel Production promotion, hosted SQL/RLS/Auth/Storage changes, paid provider, public posting or private-data deletion.
## 9 November 2026 — BP-06 source baseline and extensible registry

- [PR #47](https://github.com/DoorBlox/orbit/pull/47) added privacy-safe five-viewport / ten-theme Chromium screenshots and layout/keyboard regression tests that require the six legacy IDs **without a fixed total-window limit**. Merged `78830dcf251da19a516ad276d068d84c5ae3ffea`, 4/4 exact-head checks green. Evidence: run [42653091662](https://github.com/DoorBlox/orbit/actions/runs/42653091662), seven-day synthetic artifact.
- [PR #48](https://github.com/DoorBlox/orbit/pull/48) extracted `src/widget-registry.js`, made `SpatialBoard` use validated definitions and aligned legacy backup ID validation. A seventh descriptor passes unit tests; no seventh UI, persistence migration or new published data. Merged `f422de6bbbafb4e352edde604ce9315a193e7680`, 4/4 checks green.
- Both are **source-only**. No live site release, hosted SQL/RLS/Auth/Storage, private user data, public portfolio/blog or paid service changed. Next: SP-01B mounted widget + layout and backup compatibility.

## 9 November 2026 — owner clarification and BP-03 synthetic benchmark

- [PR #44](https://github.com/DoorBlox/orbit/pull/44) fixed a mistaken permanent "six windows" product restriction in active contributor rules; added an expandable-widget, branch Projects, opt-in public portfolio/blog and Pomodoro blueprint. Squash source `33d5f2598952fa88457e1bc05b2dd6547b26c1b0`, all four exact-head checks green. No live product count or content changed.
- [PR #45](https://github.com/DoorBlox/orbit/pull/45) implemented deterministic nonprivate synthetic BP-03 full-snapshot traffic measurement, without a new RPC or Production monitoring. Squash source `4b603b2c58e4ebef9fd66eebf33534cef2a7ace3`, four green checks. Browser default timer/CAS, tenant isolation and hosted infrastructure unchanged.
- Separate source and Production: no data publication, hosted SQL/Storage/Auth edits, new domain, paid services or deployment as part of these PRs.

## 9 November 2026 — clarification of product direction (planning only)

The owner clarified that six movable windows were an **observed initial layout**, not a requested permanent numerical restriction. Future project labeling of branches and a private Projects place, an optional Pomodoro widget, and a curated portfolio/blog site with explicit Journal-to-blog publication are in scope for exploration. Current source/release layout and historical descriptions remain factual, but active design rules now allow additional widgets. [Dedicated plan](../plans/ORBIT_EXPANDABLE_SPACE_PROJECTS_BLOG_FOCUS.md). No hosted/private/public data or Production changes from this clarification.

## 9 November 2026 — source-only EX-01 and BP-03

- [PR #41](https://github.com/DoorBlox/orbit/pull/41) added actual upstream Excalidraw React editor as a lazy same-origin island for Journal/stickies, with native fallback and explicit Save/Cancel; merged `cbb6d4053a60ec7c002272ae17a370457e7411cd` after four passing exact-head checks. Not Production released; embedded image files still excluded.
- [PR #42](https://github.com/DoorBlox/orbit/pull/42) reduced unnecessary hidden-tab owner snapshot polling, preserved CAS conflict handling and added regression tests; merged `7440ebe0420a71ce4f96e463d3502c208bea5efb` after four passing checks. Foreground polling and real multidevice measurement remain.
- Neither source PR changed hosted SQL, Auth, Storage, Production alias, user data or paid services.

# ORBIT implementation history and evidence ledger

## 9 Nov 2026 — EX-00 source closeout and EX-01 actual official editor source work

- [PR #40](https://github.com/DoorBlox/orbit/pull/40) squash-merged 6a9c7c6fae1ad6f1b698294c2ede9be09ab73f28 with four green exact-head checks, pure official Excalidraw scene/initialData/onChange adapter, no React runtime and no Production mutation.
- EX-01 source branch feat/ex01-official-excalidraw-react-island-20261109: pinned real @excalidraw/excalidraw 0.18.1 and React/ReactDOM 19.3.1 with a genuine npm lock generated and reviewed through temporary read-only GitHub Actions; temporary workflow removed. Adds separate lazy official editor JS/CSS/fonts, shared journal/sticky load button, explicit Save/Cancel, strict release artifact checks, and synthetic Playwright integration. **Not yet merged or deployed; evidence pending exact-head CI.** See [EX-01 integration](EXCALIDRAW_EX01_INTEGRATION.md).


## 9 Nov 2026 — BP-02 source merge and EX-00 first adapter

- [PR #39](https://github.com/DoorBlox/orbit/pull/39) squash-merged `d6064f0743b2544422cbd099e9468e6ab20d9533` after four green exact-head checks. Adds private image-inclusive portable `.orbit` backup/inspected staged restore, auth-scoped image downloads, source manifest and regression tests. **SOURCE MERGED, NOT Production deployed or owner-account tested.** No hosted Supabase writes, media deletions, provider/billing changes or live alias changes.
- User-priority Excalidraw #31: EX-00 branch `feat/ex00-excalidraw-scene-adapter-20261109` adds a framework-neutral pure scene adapter and synthetic tests; no official React/Excalidraw package installed and no claim of finished editor. See [EX-00 compatibility](EXCALIDRAW_EX00_COMPATIBILITY.md).


## 9 Nov 2026 — ChatGPT handoff and repository migration parity closeout

- [PR #37](https://github.com/DoorBlox/orbit/pull/37) merged as 6c17b79a9ce04d3f160dec78fba88fce0daabe6b, four green checks: canonical CHATGPT_HANDOFF.md and tool/skill playbook; original CODEX-named file archived verbatim; verified docs-only CI fast path. No Production change.
- [PR #38](https://github.com/DoorBlox/orbit/pull/38) merged as e5de8b32720f1ec26637bb48ea3db26942faaa45, four green checks: source-only rename of seven migration filenames to hosted timestamp IDs, unchanged Git SQL blob SHAs, updated checks, local RLS/HTTP PASS. **No hosted Supabase SQL/history changes.**
- BP-02 source branch feat/bp02-portable-private-media-backup-20261109 adds a separate portable .orbit private-media format; it is NOT live or SOURCE MERGED unless exact PR/CI confirm. See [portable format contract](PORTABLE_BACKUP_V1.md).

## 9 Nov 2026 — source and CI foundation after 2.4 deployment

- [PR #35](https://github.com/DoorBlox/orbit/pull/35) merged as f899923ba098d21bc2f75b87d7bdcd3189f4e857 after all four required exact-head checks: canonical verified state, documentation protocol, BP-00–16 execution blueprint and Excalidraw EX-00/01/02 path. Documentation-only.
- [PR #36](https://github.com/DoorBlox/orbit/pull/36) merged as 821b1a51de1817703f14d42bd7b2a00618492425 after all four required exact-head checks: fail-closed Markdown-only fast CI path, current 2.4 raw deployment protection, legacy staging warning and measured Actions review. No deployment or hosted Supabase changes.
- The owner clarified that **ChatGPT with GitHub/Vercel/Supabase connections** is the ongoing source-code engineer, auditor, PR maintainer and handoff author; Codex-only instructions are deprecated. The active [ChatGPT handoff](../CHATGPT_HANDOFF.md) and [tool/skill playbook](CHATGPT_TOOL_PLAYBOOK.md) replace the historical Codex-named entrypoint while keeping its old text archived.


## 9 Nov 2026 — ORBIT 2.4 LIVE Production (latest authoritative release checkpoint)

- **GitHub:** PR [#33](https://github.com/DoorBlox/orbit/pull/33) squash-merged to `main` commit **`4e57aca785259192b92010c5d0e1634a4c1efe14`** after all four exact-head checks passed (`static-quality`, `local-postgres-rls`, `production-artifact-dry-run`, `unauthenticated-protection`). Initial PR browser regression failed solely because the test attempted to select an option inside the intentionally collapsed “More tools” panel; revised test exercised the disclosure, then all four checks passed at head `33053acd46db3fd1a4865759b420ad4f865db69d`. Historical V6/M1 manifests unchanged and reviewed M2 source manifest updated.
- **Production:** canonical **https://orbit.starscene.com/** now aliases Vercel READY **`dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4`**, git SHA `4e57aca`, `target=production`, raw URL `https://orbit-684anrkjf-doorbloxs-projects.vercel.app/`. The alias was reassigned explicitly after staging, not during build; first confirmed old alias still served `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4`. Vercel Auth still protects raw deployment/preview URLs with `deploymentType=prod_deployment_urls_and_all_previews`; public custom domain still presents Supabase Google Auth sign-in. Secondary `orbit.allintime.space` still redirects to canonical. **No Supabase SQL migration, Auth policy, Storage object manipulation, paid service or provider switch.**
- **Live checks completed:** exact canonical alias maps to new READY Production deployment; canonical GET HTTP 200; CSP remains narrowly scoped `img-src 'self' data: blob: https://ixfgavgtwuzdgucjriec.supabase.co`, `connect-src 'self' https://ixfgavgtwuzdgucjriec.supabase.co`, strict `object-src`, `base-uri`, `frame-ancestors`; initial anonymous HTML response contains no private journal text. `src/runtime-config.js` has reviewed Supabase URL, `siteUrl=https://orbit.starscene.com/`, `publicRelease=false`, only publishable key (not privileged service-role key). Deployed CSS contains 10 theme selectors; deployed app/board source contains checklist and mini-map interactions. This is **not** proof that signed-in image loading works: **#26 stays open** until actual user verification on Production.
- **Shipped UX 2.4:** ten curated themes `parchment,garden,frost,celestial,ember,tidepool,sundown,sakura,graphite,linen`; theme-aware functional chrome/clock/paper, standalone opt-in animated environmental background and existing reduced-motion option; Space widget remains freely resizable/scrollable with frequent controls visible and infrequent Backup/Import/Export/Remove samples under “More tools”; navigator now has sticky-note markers, click/drag map travel and keyboard controls; journal rich-text extension (numbered lists/quotes/underline/strike/validated links), sticky Markdown buttons + safe preview, task checklists in tenant-private extensions (no schema migration). Entire pan/zoom spatial world, six independent draggable/resizable widgets, existing task links, journals, notes, original coordinates and private bucket preserved. No heavy new frontend dependencies.
- **Not shipped:** user-requested fully embedded React Excalidraw for journals/stickies is **#31** (native pen + `.excalidraw` interchange still exists); scoped OAuth/remote MCP ChatGPT connector is **#32**; private reusable media library and safe permanent deletion are **#29**; production image-rendering verification **#26**; other blueprint N01/G01/calendar/reminders unimplemented. Never represent a placeholder as a working integration.
- **Rollback:** prior READY Vercel Production deployment **`dpl_AxaB85krmkJfDUj1T6ipqw8rodH4`** (Git `de2523dcea497c7ee41547ca94c14f48c72688f1`). If a privacy/auth failure is detected, immediately set project Vercel Authentication to `deploymentType=all` before reverting canonical alias to that deployment. For ordinary visual regression, reassign `orbit.starscene.com` to the prior deployment; confirm secondary redirect and owner content. Avoid database restores or deletions without explicit separate authorization.
- **Open QA:** verify the signed-in owner and second account, saved task checklist updates, 10 themes across devices, Space scroll at small sizes and 174% zoom, live media attachments and on-image error state; #26 remains open; do not remove protected-preview guardrail. Preserve CI budget by batching code in focused PRs.


## 9 Nov 2026 — ORBIT 2.4 cohesive spatial refinement (BRANCH; RELEASE GATED)

**Source of truth at branch start:** GitHub main `da89b7b` (PR #30 merged, 4/4 exact-head checks passed); Vercel-protected 2.3 Preview `dpl_76ScEW3Ke7zr8yX5M5SXLSyrhr9k`, https://orbit-cqcgb4whw-doorbloxs-projects.vercel.app/ READY with narrow CSP. Public Production alias `orbit.starscene.com` still serves earlier `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4` built from `de2523d`; raw deployments and previews remain Vercel-Auth protected. User explicitly authorized an **expedited, gated Production deployment** in the 9 Nov 2026 request—authorization does not waive data-integrity, RLS, CSRF or rollback verification.

**2.4 development branch:** `feat/2.4-theme-navigation-controls-20261109`, based on `da89b7b`. Keep the original large pannable/zoomable world, SIX freely movable/resizable widgets, radial constellation and sticky-note layer; **do not convert to fixed dashboard**.

- **Ten curated account-scoped themes:** Parchment, Night Garden, Frost, Celestial Blue, Ember, Tidepool, Sundown, Sakura, Graphite and Linen. Theme now applies to floating controls, clock, panels, maps and paper; `theme` is validated in `src/scene.js`, saved in existing private `extensions.appearance` (no hosted schema migration). Existing themes and legacy missing appearance retain their IDs/defaults. Distinct `ambient:boolean` opt-in toggle controls animated environmental gradients independently of `motion:'system'|'off'`. Reduced-motion and reduced-transparency system settings override effects.
- **Usability:** repair unreadable clock contrast, group infrequently used backup/import/export/sample tools under `<details>` within Space without changing handler IDs. Space, theme picker and resizable widgets remain scrollable; no clip of access controls. Navigator now supports sticky-note markers, pointer drag/click on map background, keyboard arrows/Home, note focus and world-space bounds; no user-coordinate migration or increased browser permissions.
- **Writing:** journal tools for underline, strikethrough, numbered lists, quote and safe HTTP(S) links; sanitizer continues restricting HTML. Sticky notes preserve existing 6000-char plain text but allow Markdown B/I/bullets/checklists/code/link insertion and a **safe preview built with DOM text nodes**, not unsafe HTML injection. Drawings still use the native pen editor, now with theme-matched paper surface.
- **Extra task context:** up to 30 per-task checkboxes, edit in constellation and toggle from detail view, stored as `extensions.taskChecklists`; native tasks SQL schema unchanged. Supporting links/description/criteria stay supported. Export/import keeps checklists in the full extensions snapshot; older clients may ignore them. Test reset, undo, and account sync.
- **Deferred, tracked—not falsely marked shipped:** actual embedded upstream React Excalidraw island [#31](https://github.com/DoorBlox/orbit/issues/31); private reusable media library, reference-safe permanent delete and optional R2 [#29](https://github.com/DoorBlox/orbit/issues/29); user-delegated OAuth/MCP ChatGPT connector [#32](https://github.com/DoorBlox/orbit/issues/32); calendar/notifications/remaining blueprint work. Private image real-account display issue [#26](https://github.com/DoorBlox/orbit/issues/26) is still open. Do not use public imgur/CDNs as a substitute for private media.
- **Release safety:** source review and M2 manifest hashes (immutable V6/M1 untouched), lint/unit/built artifact/browser a11y and regression checks, isolated local RLS, canonical anonymous sign-in test, protected Preview then staged Production deployment from the exact reviewed main commit. Confirm Auth redirect settings, TLS/CSP, no private content on anonymous response, original owner content retained. Assign canonical alias only after READY checks. Rollback checkpoint: Vercel deployment `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4`; if privacy is at risk first restore Vercel Auth to `deploymentType=all`, then alias rollback. No SQL/Storage migration, account deletion or domain protection relaxation authorized.


## 9 Nov 2026 — ORBIT 2.3 working branch: media recovery, navigation and appearance (NOT RELEASED)

- **Actual branch** `feat/2.3-media-appearance-navigation-20261109` based on reviewed main `4c303a4`. Source work is in progress; do not call this Production or an authenticated image-rendering verification. Prior 2.2.1 PR #28 is merged in main and protected Preview `dpl_E2ZND9zsAJYQAQu42UzhEMG8bst4` exists, but live Production remains the approved 2.2 beta `de2523d`. See open media bug #26 and media architecture issue #29.
- Preserve the **same spatial world** and six movable/resizable widgets; no dashboard replacement. This slice adds Parchment, Night Garden and Frost choices inside the Space widget. Account-scoped appearance travels in the existing private `extensions` snapshot; legacy data defaults to Parchment and system motion. Navigator focus marker is clamped within the mini-map and its caption receives a separate row.
- Private media previews now use authenticated Supabase Storage `download` to create temporary `blob:` object URLs; `img-src` extends the strict CSP with `blob:` without new third-party origins. URLs are revoked on logout/disposal, reused while the account is mounted, and never written to workspace data or backups. This is a **source-level mitigation pending real signed-in browser checks**, not an assertion that image issue #26 is resolved. Signed URL compatibility remains for rollback.
- Journal and sticky-note **Detach image** remove only the reference (with Undo) while keeping underlying private object for the planned Media Library. Duplicated notes continue sharing one media path. **No Storage DELETE policy, permanent deletion, R2 migration, new billing, schema migration, or Production changes.** Issue #29 separately tracks safe permanent deletion and gallery.
- Excalidraw in source remains the lightweight native pen + `.excalidraw` interchange. Official upstream React Excalidraw island is a larger separately verified work unit; do not label current drawing modal real embedded Excalidraw. All other blueprint work units remain open.
- Required completion gate: review source-manifest hashes, tests, GitHub protected PR checks, protected Preview (including signed-in journal+sticky images, 174% navigator, responsive views), then obtain explicit Production release authorization. Do not trigger Actions manually after every small commit.


## 9 Nov 2026 — 2.2.1 private media CSP and sticky duplication (SOURCE ONLY)

- Branch `fix/2.2-private-images-sticky-duplicate-20261109` is a **not-yet-merged/released** patch based on Production-closeout `main` `da5f9d3`. Current LIVE Production remains `de2523d` on `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4`; canonical `orbit.starscene.com` is the public Google sign-in shell, with all raw deployments and Previews Vercel-auth protected. **No new hosted SQL, secrets, Auth configuration or Production alias edits.**
- Fix for [image issue #26](https://github.com/DoorBlox/orbit/issues/26): `vercel.json` CSP adds only the exact Supabase origin to `img-src`, matching existing allowed `connect-src`. Keep the Storage bucket PRIVATE and user-scoped. `scripts/production-guard.mjs` and regression tests require the exact source, reject wildcards and other hosts. Production image rendering remains unverified until a fresh approved deployment and user browser check.
- Small feature: **Duplicate sticky note** copies note text/color/validated drawing and private image **reference** to an independent card offset by 48 world units; edits are independent, 80-note cap and read-only checks remain. Never duplicate or delete actual Storage objects just to copy a note. Note action bar wraps on narrow cards.
- TDD branch tests: `tests/stickies.test.mjs` for copy, isolation, cap, bounds; existing synthetic Playwright `tests/qa_m1.py` verifies editing copy and reload; production CSP release fixture and strict-target regression cases updated. Current M2 source hashes updated **only** for `src/stickies.js` and `src/styles.css`. Do **not** revise immutable V6/M1 manifest.
- Cost discipline: one batched pull request after source/tests/docs; rely on protected exact-head four checks, no manual Actions dispatch. If they pass, merge then stage a new protected Preview; **do not automatically replace the live custom Production alias without an explicit release decision**. Keep issue #26 open until actual image rendering verified.


## 9 Nov 2026 — ORBIT 2.2 beta LIVE on Production (latest source of truth)

- **Serving Production:** canonical `https://orbit.starscene.com/` now maps to Vercel READY Production deployment `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4`, exact reviewed source `de2523dcea497c7ee41547ca94c14f48c72688f1` (merged [PR #25](https://github.com/DoorBlox/orbit/pull/25), all four exact-head checks passed). Server-side production build completed with Supabase cloud config; unauthenticated GET returns HTTP 200 and no private journal text. The name `2.2 beta` describes the app feature release; package.json's legacy version value has not yet been revised.
- **Protection and domains:** Vercel Authentication changed from `deploymentType=all` to `prod_deployment_urls_and_all_previews`; **custom Production domain is public only for the Supabase Auth sign-in shell**, Preview and raw deployment URLs remain Vercel-protected. Secondary `orbit.allintime.space` remains a redirect to `orbit.starscene.com`. Vercel automatic custom-domain assignment was disabled during staging; custom canonical alias was reassigned explicitly, not automatically.
- **Rollback checkpoint:** prior READY owner-only 1.0.0 deployment `dpl_9rgHVEreGqspHtNY27WnPyMduFik`, source `fc5af5a8cd2c99d1e104615e72c3cd2b460f60d6`. If an Auth or privacy failure is detected, first restore Vercel SSO `deploymentType=all`, then reassign canonical `orbit.starscene.com` to that old deployment; verify secondary redirect and owner content. Do not overwrite/restore database without a separate instruction.
- **Supabase:** owner-approved hosted migrations `orbit_private_extensions` and `orbit_private_media` were applied; Google Auth verified on two distinct controlled accounts; first account retains 23 branches, 29 tasks and one journal. Second account started empty. Authenticated-role hosted DB tests validated private extensions and per-user Storage SELECT/INSERT isolation; temporary test fixtures were rolled back. One live second-account beta workspace now has test notes/images (three Storage objects observed).
- **Known beta defect:** [#26](https://github.com/DoorBlox/orbit/issues/26) — attached note and journal image references persist but images **do not render**. Production's exact CSP has `img-src 'self' data:`, blocking signed image URLs from `https://ixfgavgtwuzdgucjriec.supabase.co`. Keep the Storage bucket private; fix via a narrowly reviewed CSP allowlist patch and matching production-guard/tests. The owner explicitly accepted launch with this known bug. Drawings in both journals and notes persist and display; scene editor is a lightweight pen and `.excalidraw` file interchange, **not** full embedded Excalidraw.
- **Operational follow-up:** source of truth for release is this current checkpoint; older sections below are historical even where they say "not deployed". Track remaining beta gates and issue #26; verify live user sign-in and media display after its patch. Respect budget: batch future changes, avoid repeated Actions/workflow dispatch.


## 9 Nov 2026 — 2.2 Google-first creative beta (SOURCE ONLY)

PR #24 (collapsible branches, browser-local view state) is merged at `bc910fbc`. New branch `feat/2.2-google-oauth-notes-20261109` adds **Continue with Google** UI, labeled task URLs, floating sticky notes with text/color/drag/resize, journal AND sticky drawings through the same native `.excalidraw` import/export bridge, plus private image attachments. The editor is an interoperable native pen editor, **not full embedded Excalidraw React**. Both source migrations (`20261109015000_orbit_private_extensions`, `20261109020000_orbit_private_media`) remain **UNAPPLIED** to hosted Supabase; no hosted Google Auth provider, Production domain, or protection changed. Current Production is still `fc5af5a` at `dpl_9rgHVEreGqspHtNY27WnPyMduFik`, Vercel Authentication on all deployments. Source feature branch not yet CI-reviewed/deployed. See [owner setup + rollout](OAUTH_2_2_ROLLOUT.md). Owner must configure Google OAuth credentials directly in Google/Supabase (never chat), verify offline backup and A/B tenant/media isolation before hosted migration or Production switch. JSON backups include image paths, NOT image file bytes. Batch code/doc changes before a single protected PR run; no repetitive Actions.

## 9 Nov 2026 extension after the original M6 release

- [PR #21](https://github.com/DoorBlox/orbit/pull/21) — preserves personalized Space names through full JSON backup/restore and local reload; four exact-head checks passed.
- [PR #23](https://github.com/DoorBlox/orbit/pull/23) — universal import for task CSV, branch CSV, journal JSON and full backups; selective exports; branch CSV hierarchy validation; four exact-head checks passed.
- Protected Vercel Preview `dpl_Bri19261zEWUzRGoEkx6EfAwDkwr` built source `11421a8` and reached READY; Production aliases were not changed.
- Current branch work removes the LOCAL PROTOTYPE caption without changing the WIB clock and adds branch collapse/expand. This view preference is per-account/browser and exported in manual backups, not cloud-synced.

## 8 Nov 2026 extension after the original M6 release

- [PR #12](https://github.com/DoorBlox/orbit/pull/12) — 1.1 foundation source: generic user center, safe branch removal with undo, dated journals and fullscreen fitting.
- [PR #13](https://github.com/DoorBlox/orbit/pull/13) — dependency-ordered 2.x blueprint covering accounts, controls, Excalidraw, private assets, sticky notes, notifications, MCP and integrations.
- [PR #14](https://github.com/DoorBlox/orbit/pull/14), stacked [#15](https://github.com/DoorBlox/orbit/pull/15) — 2.0 tenant-isolated database and Supabase Auth signup source; the merged implementation passed all four CI checks.
- Hosted Supabase migration `20261108161935 orbit_tenant_private_workspaces` applied successfully; exact original owner's data row counts unchanged in immediate before/after read-only checks.
- GitHub [Protect main](https://github.com/DoorBlox/orbit/rules/26803051) branch ruleset became active; [issue #17](https://github.com/DoorBlox/orbit/issues/17) closed.
- [PR #18](https://github.com/DoorBlox/orbit/pull/18) — cloud controls moved to the movable Space widget, removing the signed-in bottom dock. Exact-head CI passed.
- **Not a 2.0 Production release:** the owner-confirmed live Vercel application is still source `fc5af5a`, with Vercel Authentication on all deployments. Public multi-user login and hosted browser isolation have not yet been accepted.


> **Consolidated 8 November 2026.** This ledger explains *how* ORBIT progressed from V6 to a working owner-only Production release. Earlier per-milestone docs remain in `docs/decisions/` as dated evidence; they may correctly say "not released" **at their historical checkpoint**. For what is live now, use [OPERATIONS.md](OPERATIONS.md).

## Product and design invariants

ORBIT is a single-owner **spatial scrapbook**, not a tabbed/dashboard productivity app. Preserve one pan/zoom coordinate plane and six glass-like, independently draggable/resizable windows: **Constellation**, **Continuum/timeline**, **Things to do**, **Already done**, **Your space** and **Journal**. Keep the arbitrary-depth radial task branches, task urgency/deadline cues, milestones, dated paper-like diary with timeline markers, background ambience, touch and reduced-motion behavior, and spatial navigator. Original V6 source evidence is retained in `docs/reference/V6_SOURCE_MANIFEST.json`; M1/M2 reviewed manifests are separately maintained. Do not rebaseline immutable original manifests.

The default user experience is native HTML, CSS and JavaScript modules with a small esbuild boundary only for the pinned Supabase SDK. No React/Next.js rewrite was undertaken.

## Milestone map — preserve original names

| Stage | Main outcome and qualification |
| --- | --- |
| **M0** | Original V6 source, contracts and integrity baselined; visual identity retained |
| **M1** | Frontend recovery, actual-origin browser QA, accessibility/civil-date/backup hardening; [implementation record](decisions/M1-IMPLEMENTATION.md) |
| **M2** | Supabase password owner Auth, UUID allowlist + restrictive RLS, owner snapshots, revision conflict handling, signed-out cleanup and backups; conditional private acceptance and [close-out](decisions/M2-HOSTED-CLOSEOUT.md) |
| **M2.5** | Motion polish: interruption, elapsed-time elasticity, reduced-motion, pinch-to-pan; [results](decisions/M2_5-IMPLEMENTATION.md) |
| **M3** | Cloud integration and release-security work expanded across earlier milestones. Source-level Production guards, least-privilege privileges, SQL migration and hosted verification; [security audit](decisions/M3-SECURITY-AUDIT.md) |
| **M4** | Security/recovery/performance testing, local and real hosted HTTP isolation with explicit scope. No blanket independent penetration-test certificate |
| **M5** | Public MIT repository by owner decision, GitHub CI, protected Vercel Preview, controlled release configuration |
| **M6** | Production-environment build staged without domains, 1.0.0 canonical alias switched on owner approval, owner sign-in confirmed, secondary domain redirected and owner-confirmed |

These are outcomes, not a claim that every originally planned optional feature or physical-device test is fully complete. Historical issue/branch labels like "M3 release readiness" are **not** a renumbering of M0–M6.

## Key integration/change history

| Date | Evidence | What happened |
| --- | --- | --- |
| 1–6 Nov 2026 | [M1](decisions/M1-IMPLEMENTATION.md), [M2](decisions/M2-HOSTED-CLOSEOUT.md) | V6 preservation, private Auth and cloud persistence, backup/recovery and browser acceptance |
| 6–7 Nov | [PR #1](https://github.com/DoorBlox/orbit/pull/1) | M2.5 motion changes integrated; no redesign of six-window world |
| 7 Nov | [PR #3](https://github.com/DoorBlox/orbit/pull/3), [main CI](https://github.com/DoorBlox/orbit/actions/runs/42321550113) | 1.0.0 release guards, recovery UX, reviewed SQL least privilege and security preparation merged |
| 7 Nov | [M6 issue #2](https://github.com/DoorBlox/orbit/issues/2) | Owner-confirmed offline JSON export, Supabase exact Production redirect, protected owner Preview sign-in; actual hosted nonowner HTTP HEAD seven zero-row and POST seven 403/42501; gateway logs + zero-row SQL independently corroborated |
| 7 Nov | [PR #5](https://github.com/DoorBlox/orbit/pull/5), [CI](https://github.com/DoorBlox/orbit/actions/runs/42324183053) | Guarded Production-target artifact dry-run with synthetic publishable key and retained hash-only report |
| 7 Nov | [PR #6](https://github.com/DoorBlox/orbit/pull/6) | Repository deliberately public; MIT License (copyright 2026 DoorBlox) and public-source/privacy explanation |
| 7 Nov | [PR #7](https://github.com/DoorBlox/orbit/pull/7), [local RLS CI](https://github.com/DoorBlox/orbit/actions/runs/42326076564) | Free disposable Supabase: **205 pgTAP**, local bearer HTTP **7 read**, **14 PATCH**, **14 DELETE** checks; synthetic fixtures unchanged, zero hosted requests |
| 7 Nov | [PR #8](https://github.com/DoorBlox/orbit/pull/8) | No-cost guarded Production staging and rollback plan, initially NO-GO until live release verified |
| 7 Nov | [PR #9](https://github.com/DoorBlox/orbit/pull/9), [staging CI](https://github.com/DoorBlox/orbit/actions/runs/42334141388) | Manual `VERCEL_TOKEN` staging with fixed tested source, real Production config, `--prebuilt --prod --skip-domain`; READY deployment `dpl_9rgHVEreGqspHtNY27WnPyMduFik` |
| 7 Nov | [PR #10](https://github.com/DoorBlox/orbit/pull/10), [anonymous HTTP CI](https://github.com/DoorBlox/orbit/actions/runs/42334961954) | Pre-switch staged and canonical origin each returned HTTP 302 to Vercel Authentication from an unauthenticated runner |
| 7 Nov | [issue #2 final release record](https://github.com/DoorBlox/orbit/issues/2) | Explicit owner approval: `orbit.starscene.com` reassigned to staged deployment, Vercel Authentication maintained; owner confirmed actual canonical sign-in/workspace |
| 7 Nov | [issue #2 domain update](https://github.com/DoorBlox/orbit/issues/2) | Owner approved consolidating domains: `orbit.allintime.space` redirects to `orbit.starscene.com`; owner independently confirmed browser redirect |

## Deployment identity — distinguish source from repository head

1. **Serving app code**: `fc5af5a8cd2c99d1e104615e72c3cd2b460f60d6`. This is the reviewed and owner-tested source used to build Production, not a bug or stale release.
2. **Serving Vercel deployment**: `dpl_9rgHVEreGqspHtNY27WnPyMduFik`, READY, `target=production`.
3. **Repository head before this documentation PR**: `42448c41d2e87f408d5f424c3ff7a60b5311b583`. Subsequent PRs added CI/documentation; they **did not redeploy app code**. After this docs PR, the head will advance again; always re-read it.
4. **Domain routing**: canonical Production alias and secondary redirect point to the same target deployment. Vercel Authentication applies to all deployments; Supabase private owner tables remain RLS-guarded.
5. **Original legacy site**: `dpl_89ozqhgtoJL6FRVSanpZ8gKNknZW`, no custom-domain aliases after consolidation; history retained, not an automatic known-good restore.

## Security/test evidence — correct interpretation

- Hosted Auth owner login and private workspace: **owner-observed** in Preview at tested source and after canonical Production alias switch.
- Hosted nonowner direct API: seven count-zero HEAD requests and seven INSERT rejections `403 / 42501`. Read-only Supabase gateway aggregation and postflight corroborated HTTP responses and unchanged nonowner counts.
- Actual nonowner PATCH/DELETE: **14 + 14 authenticated HTTP cases in isolated local Docker Supabase**, not the hosted environment; local fixtures and snapshots unchanged. The 205 pgTAP assertions provide additional SQL-level policy evidence.
- Vercel hosted anonymous access: before primary alias promotion, staged and old canonical host HTTP GET both returned **302 redirects to Vercel Authentication**. The Vercel all-deploy protection setting remained enabled after both alias changes. **Not an independent post-switch HTTP header/CSP proof.**
- Source/build checks: pinned SDK and esbuild, exact Production site/API allowlist, immutable source manifests, static distribution file/hash verification, fake-key offline CI and real-key configured stage.
- Backup: offline JSON saved **by owner attestation**; private contents and restore were never sent to CI or Git.
- Out-of-scope: independent full penetration test, hosted nonowner PATCH/DELETE fixture test, authenticated Production CSP/header capture, Google OAuth/OTP delivery, full physical-device coverage and backup-restore drill.

## Follow-up priorities

1. Protect public repo `main` with a free ruleset requiring relevant CI checks, disable force push and branch deletion (owner-admin controls). Check exact workflow job names before adding rules.
2. Capture real post-auth canonical security headers/CSP and post-release anonymous denial safely, **without cookies in public logs**.
3. Test on actual iPhone Safari and Android Chrome; focus touch navigation, reduced motion, diary editing and recovery.
4. Decide if additional **hosted** nonowner PATCH/DELETE tests are worth the fixture/destructive risk; the current free local suite covers these operations.
5. Strengthen backup routine (owner-controlled encrypted storage, restoration rehearsal only on disposable infrastructure).
6. Future features remain separate issues and require deliberate scope: e.g. structured editor, reminders, collision helpers; don't replace the visual world or weaken Auth for secondary domains.
7. Revoke/rotate temporary Vercel deployment token once it is no longer needed; do not publish credentials.

See [the working handoff](../CHATGPT_HANDOFF.md), [operations](OPERATIONS.md), and [the current README](../README.md). This ledger is not an instruction to change live state without authorization.
