**10 November 2026 staging safety verification:** Vercel project and historical Production/Preview targets confirmed by connected account; Preview `dpl_9X32FpdZMxPy7puyg2oaXnE2oHF1` READY from exact main `ae8fe6a77534639876325f88495aa165f08ccb82`, protected by Vercel SSO (not Production). GitHub `main` ruleset `26803051` requires 4 status checks and squash PRs, but zero reviewer approvals; protected GitHub deployment-environment reviewer gate remains **unverified**. BP-05 no-secret exact SHA preflight is in source review and intentionally cannot deploy. Release stage/promotion is **NOT** authorized solely by that job.

# ORBIT production operations and recovery

## 10 November 2026 — latest protected Preview and release gates

- GitHub [BP-05 PR #62](https://github.com/DoorBlox/orbit/pull/62), [TOUCH-01 #63](https://github.com/DoorBlox/orbit/pull/63), [PJ-03 brief #64](https://github.com/DoorBlox/orbit/pull/64) all SOURCE MERGED after four exact-head green CI checks each. Source main at `512b4b675c0779915d1642979839556814f865e0` before this docs-only closeout.
- Connected Vercel owner team `doorbloxs-projects`, project `prj_FZH5dyyZvUXfVmTz04HBCMbIrQk5`: [protected Preview](https://orbit-cwjgxy9mi-doorbloxs-projects.vercel.app/) READY deployment `dpl_F3aLWWU2XaiVMNFCcaKsf31yzfgm`, source exactly `512b4b67`, target null (Preview), existing Vercel SSO `prod_deployment_urls_and_all_previews`; **no** Production alias assignment.
- Last verified serving Production remains `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4` from `4e57aca785259192b92010c5d0e1634a4c1efe14`, https://orbit.starscene.com/. Earlier rollback artifact `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4` retained. Do not confuse source PR merge with live application release.
- BP-05 [non-deploying exact-main preflight](../.github/workflows/bp05-release-preflight.yml) holds no deployment secrets, cannot build a live configured artifact or promote. Branch ruleset #26803051 requires four CI checks, but **zero required human code reviews**; a protected release-environment reviewer gate must be separately proven. Signed-in private-media owner/second-account and portable recovery remain unverified; no promotion or hosted data change should be inferred.
- Next release gate: authorized owner signed-in Preview test (journal/sticky images + reload, portable backup restore, Excalidraw and Projects brief, second account isolation), protected staged exact-SHA build, anonymous HTTP/CSP checks, rollback and only then separate explicit custom-domain promotion. Never store signed URLs or diary content in GitHub artifacts.



**10 November 2026 source vs preview:** [PJ-02B PR #55](https://github.com/DoorBlox/orbit/pull/55) merged at `abfea03c743ad01c95f3a5847d574911856b3bd0` (four exact-head checks green), with [protected PJ-02B Preview](https://orbit-ne9qywarm-doorbloxs-projects.vercel.app) READY as `dpl_4oAw8fM18Z2gY9gCvYC3ddsjQHcD` from reviewed feature commit `657d7f3395fc51e7665ef15940defdd17727efaf`. Vercel Authentication still protects previews. **Production canonical alias remains on** `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4`; do not promote or alter user data before signed-in owner verification, privacy check, and rollback gate.

**Migration safety (BP-04):** [source-vs-hosted migration history and safe next-migration gate](SUPABASE_MIGRATION_PARITY_2026-11-09.md). The seven existing SQL bodies matched hosted records, but their historical filename timestamps differed; repository-only normalization is separately tested. Never use hosted db push or repair merely to test a filename change, and never treat this as Production database mutation approval.

**ChatGPT engineering continuity:** [CHATGPT_HANDOFF.md](../CHATGPT_HANDOFF.md) and [connected tools/skills](CHATGPT_TOOL_PLAYBOOK.md). This remains the operational release and rollback runbook; a GitHub merge does not authorize a Production promotion.

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

## 9 Nov 2026 update — latest application source and protected Preview

PR #21 and PR #23 are merged to `main`; their exact-head four-check CI runs passed. The protected Vercel Preview `dpl_Bri19261zEWUzRGoEkx6EfAwDkwr` is READY from source `11421a861b5023d5305c1802b8993bca221dacdd`. This is still not the Production site. Production remains `dpl_9rgHVEreGqspHtNY27WnPyMduFik` from `fc5af5a`, and Vercel Authentication remains enabled for all deployments.

The current 2.1 branch work removes the LOCAL PROTOTYPE header caption without changing the WIB clock and adds collapsible branch navigation. Its view state is stored locally per account/browser and included in manual backups; it is not a server-synced preference. Do not claim cross-device persistence until a future approved schema/API change.

## 8 Nov 2026 update — separate live application and new tenant schema

The **live application** remains Vercel's owner-only 1.0.0 build `fc5af5a` on `dpl_9rgHVEreGqspHtNY27WnPyMduFik`. SSO protection is still enabled for **all** deployments, and both custom domains still route to that build. Do not infer that `main` or the new tenant SQL is deployed client code.

The **hosted database schema** was intentionally advanced to ORBIT 2.0: migration `20261108161935 orbit_tenant_private_workspaces` succeeded. Immediate read-only pre/post checks showed 28 tasks, 23 branches, 1 journal, 1 profile, 6 widget layouts, 1 preferences, 1 workspace revision and zero published items unchanged; original owner retained. The seven private tables now have `orbit_tenant_authenticated` restrictive policies, replacing `orbit_single_owner`; `orbit_workspace_access` exists. This does **not** certify hosted A/B/C bearer isolation, email delivery, public signup readiness or disaster recovery.

GitHub branch protection [Protect main](https://github.com/DoorBlox/orbit/rules/26803051) is Active, requiring PRs and the four existing CI checks. Source 2.0 Auth was merged with [PR #14](https://github.com/DoorBlox/orbit/pull/14) and [PR #15](https://github.com/DoorBlox/orbit/pull/15); the fixed bottom dock/Space control move merged via [PR #18](https://github.com/DoorBlox/orbit/pull/18). Do not remove Vercel Authentication or promote new source until the exact-origin hosted acceptance and backup gates are cleared.


> **Current operational record — 8 November 2026 (Asia/Jakarta).** This is the operational source of truth for ORBIT 1.0.0. Historic pre-launch runbooks are preserved under [decisions](decisions/README.md) but their old "Production NO-GO" statements describe a past checkpoint. Recheck provider state before acting.

## Live service inventory

| Component | Recorded state |
| --- | --- |
| Canonical app | [https://orbit.starscene.com/](https://orbit.starscene.com/) — active Production alias, owner reports successful sign-in and fully working private workspace |
| Secondary custom domain | [https://orbit.allintime.space/](https://orbit.allintime.space/) — Vercel redirect to canonical; owner confirmed browser redirect |
| Vercel project | `orbit`, project `prj_FZH5dyyZvUXfVmTz04HBCMbIrQk5`, team `team_xHRnXQbjaIEx2rNZ94p5QBao` |
| Serving release | READY Production deployment `dpl_9rgHVEreGqspHtNY27WnPyMduFik`, artifact source `fc5af5a8cd2c99d1e104615e72c3cd2b460f60d6` |
| Source repository | [DoorBlox/orbit](https://github.com/DoorBlox/orbit), public, MIT; `main` is **newer than serving artifact** because documentation and workflow commits were subsequently merged |
| Supabase | `ixfgavgtwuzdgucjriec` (`https://ixfgavgtwuzdgucjriec.supabase.co`), ACTIVE_HEALTHY at 8 Nov check |
| Deployment protection | Vercel Authentication `enabled=true`, `deploymentType=all` as read from project; **do not turn off** |
| Application auth | Exact canonical-origin Supabase Auth gate and server-side owner UUID/RLS; password sign-in is the confirmed supported path |
| Public content | Public-read switch disabled; published-content table empty at last controlled SQL postflight |
| Offline recovery | Owner reports a saved complete JSON export; file contents, checksums, encryption at rest and restore were **not** independently verified |
| Older rollback candidate | Prior deployment `dpl_89ozqhgtoJL6FRVSanpZ8gKNknZW` (`orbit-personal-dev`); previously served both domains. **Not certified functionally identical or currently known-good.** |

**Control-plane distinction:** Vercel project metadata has sometimes returned `live=false` even while a verified Production alias served a READY deployment. Trust current alias/deployment records **plus actual HTTP/owner smoke evidence**, not `live` alone.

## Domains, routing and sign-in

`orbit.starscene.com` directly serves the 1.0.0 artifact. `orbit.allintime.space` redirects to that **canonical hostname** instead of serving an independent sign-in origin. This is intentional: `src/auth/controller.js` rejects a `redirectUrl` whose origin differs from the current page origin. The exact production URL `https://orbit.starscene.com/` was owner-confirmed as added to Supabase Auth's redirect allowlist. Do not widen OAuth allowlists or weaken strict-origin checks for convenience.

At last control-plane verification, both custom domains were verified on the same Vercel project. The primary alias had `redirect=null`, and the secondary alias had `redirect=orbit.starscene.com`; both resolved to `dpl_9rgHVEreGqspHtNY27WnPyMduFik`. The owner also directly confirmed that visiting the secondary domain reached the canonical hostname.

Do not confuse **public source code** with public scrapbook contents: the deployed app is gated by Vercel Authentication, the client must pass Supabase Auth and the owner RPC, and private tables have owner-only RLS. Open-sourcing the repository does not open the data.

## Safe everyday operation

- Use the canonical URL for normal use. Sign in using the owner account; do not post private journal text, screenshots of personal data, backup JSON, OTPs, cookies, or tokens in GitHub issues or chats.
- Use **Export backup** after meaningful changes, before risky testing or major releases, and store the JSON securely in owner-controlled encrypted storage. The export file itself is **not encrypted** by ORBIT. Unsaved journal drafts are not automatically protected by a backup.
- A full JSON restore/import is **destructive replacement** of the current cloud snapshot and requires an explicit owner review and consent. Never test restore against Production casually.
- Supabase and Vercel share free-tier usage limits; no paid Supabase branch is required for ordinary verification. Locally disposable Docker/Supabase stacks and public-repository CI are the preferred route.
- Review login anomalies, CI errors and Vercel access protection periodically. No always-on monitoring or automatic backup job is claimed to exist.

## Verification before a future change

1. Read [CHATGPT_HANDOFF.md](../CHATGPT_HANDOFF.md), [AGENTS.md](../AGENTS.md), the actual relevant code, and this document. Confirm the specific repository branch and Git SHA.
2. Confirm the current deployment ID, `target=production`, READY, SHA, aliases, and Vercel Authentication. Check both domain mappings separately.
3. Recheck the approved production site/API origin and public publishable-key **identity without printing its contents**. Never include Supabase service-role or secret keys in browser output.
4. Run syntax/unit/source-integrity/structure checks on Node 22 with `npm ci --ignore-scripts && npm run check`. Run focused Python Playwright regressions for impacted frontend behavior.
5. For RLS/Auth changes, test against a disposable **local** Supabase environment: `supabase start`, `supabase test db`, and `tests/integration/local_http_rls.mjs` using the exact CI setup in [.github/workflows/local-supabase-rls.yml](../.github/workflows/local-supabase-rls.yml). Do **not** repoint that local-only test at the hosted service.
6. Prefer a protected Preview for changes. Compare against the original V6 provenance manifests; never rewrite them simply to make CI pass.
7. Production code changes require an **explicit new release decision**. A passing Preview or `main` CI is not permission to reassign aliases.

### CI evidence that supports 1.0.0

- [Hosted owner / nonowner release tracker](https://github.com/DoorBlox/orbit/issues/2): owner-attested canonical sign-in, redirected secondary domain, hosted nonowner READ/INSERT results and control-plane postflights.
- [Local SQL + bearer HTTP RLS run](https://github.com/DoorBlox/orbit/actions/runs/42326076564): 205 pgTAP assertions, seven local nonowner visibility checks and 14 PATCH + 14 DELETE denied with unchanged synthetic fixtures; **not hosted HTTP PATCH/DELETE**.
- [Production artifact dry run](https://github.com/DoorBlox/orbit/actions/runs/42333016219): source-scoped guarded build, synthetic publishable key.
- [Production staging workflow](https://github.com/DoorBlox/orbit/actions/runs/42334141388): reviewed source SHA `fc5af5a`, Production-scoped build/artifact verifier, `--prebuilt --prod --skip-domain`; completed SUCCESS before alias assignment.
- [Unauthenticated host-check run](https://github.com/DoorBlox/orbit/actions/runs/42334961954): both hosts returned 302 to Vercel Authentication **before** canonical alias promotion. Not a post-auth CSP audit.
- [Post-merge quality run](https://github.com/DoorBlox/orbit/actions/runs/42336158353): SUCCESS at `42448c4`. Newly authored documentation must be checked at its *own* commit before calling it verified.

## Future production releases — careful two-stage process

1. Work on a PR and obtain exact-head CI PASS. Verify and document the next intended **application source SHA** (which may differ from `main` due to documentation-only merges).
2. Take a fresh private offline backup; verify Vercel protection, Supabase private reads, Auth origin, and existing aliases. Capture current serving deployment IDs.
3. **BP-05 safety gate:** the obsolete manually dispatchable 1.0 staging workflow was retired in [merged PR #57](https://github.com/DoorBlox/orbit/pull/57) (4/4 exact-head checks). Do not restore or dispatch it for a new release. A replacement reviewed-SHA, stage-only automation is **NOT IMPLEMENTED**. For any future release, prepare a separately reviewed, approved process with the exact eligible SHA, protected credentials, environment checks, `--skip-domain`, verified rollback and four exact-head PR statuses; this runbook is not a deployment authorization.
4. Stage the exact source using a controlled Vercel Production build followed by `vercel deploy --prebuilt --prod --skip-domain`. This must not assign either custom domain yet.
5. Check READY status, deployment identity, configuration, Vercel Authentication and anonymous protection. ORBIT's strict canonical-origin validation means sign-in on the staged `*.vercel.app` URL is **not** a valid substitute for canonical owner sign-in.
6. With explicit owner authorization, assign **only the intended custom-domain aliases** to that exact deployment. For any alternative hostname, use a redirect to `orbit.starscene.com`, not a second independently authenticated origin.
7. Immediately verify both domain mappings, protection, canonical sign-in and private workspace. Inspect available errors/headers; document what was actually observed. Roll back the affected aliases if something critical fails.

**Do not run project-wide rollback indiscriminately** when aliases have distinct routing semantics. Alias-specific rollback is more precise. The original `orbit-personal-dev` deployment is a historical target, not an independently certified recovery environment. Rolling back code/aliases never restores deleted Supabase data; only an owner-approved backup/restore can do that.

The GitHub repository has an owner-provided `VERCEL_TOKEN` Actions secret for manually staged deployment. **Never read or echo it.** Revoke/rotate a short-lived Vercel token and remove its GitHub secret when no longer needed; recreate it only for authorized releases.

## Open checks and explicit limitations

These items **do not negate the owner-confirmed working Production release**, but they must not be mislabeled as passed:

- Hosted real-nonowner bearer **PATCH/DELETE** fixture tests were not executed; only the isolated local Auth+HTTP coverage and hosted READ/INSERT checks are corroborated.
- Post-Vercel-Authentication **application response headers/CSP** have not been independently inspected on the canonical Production origin (the anonymous redirect response has no app CSP).
- Physical iPhone Safari, Android Chrome, assistive-technology and 120 Hz hardware acceptance not fully documented.
- Google OAuth, Email OTP delivery and provider-outage recovery are not certified; **password owner sign-in** is the tested path.
- Owner backup existence is attested, but independent encrypted storage, hash, restore fidelity and RPO/RTO are not certified.
- Supabase leaked-password protection has a Pro-tier warning; do not require the owner to purchase it. Maintain a strong unique password, restricted sign-ups and defense in depth.
- `main` was reported **not branch-protected**; adding a public-repository branch ruleset with required CI checks, restricted force pushes and deleted-branch protection is a useful free hardening step.

## Emergency routing recovery (no data change)

If canonical Production becomes unusable, verify the failure before acting and obtain the owner's approval to switch back. Reassign `orbit.starscene.com` to a verified suitable previous READY deployment (historical candidate: `dpl_89ozqhgtoJL6FRVSanpZ8gKNknZW`), then verify. Keep `orbit.allintime.space` redirecting to the canonical hostname unless the owner specifically approves changing that redirect. Check Vercel Authentication after rollback. If the old deployment is not demonstrably viable, stop rather than blindly sending traffic to it.

Source-of-truth records: [1.0.0 release note](releases/1.0.0.md), [milestone history](PROJECT_HISTORY.md), [M6 issue #2](https://github.com/DoorBlox/orbit/issues/2), and [the historical prelaunch runbook](decisions/M6-PRODUCTION-STAGING-NO-COST-20261107.md).
