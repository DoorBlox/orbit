# W6 — Owner-urgent independent acceptance register (19 November 2026)

**Owner scope:** [#211–#224](https://github.com/DoorBlox/orbit/issues/211), companion [#210](https://github.com/DoorBlox/orbit/issues/210), and release gate [#225](https://github.com/DoorBlox/orbit/issues/225). The underlying owner issues include before/expected prose and attachment links. This QA pass read the issue wording and inventoried screenshots, but **could not retrieve the attachment pixels in its execution environment**; it has **not** performed a visual-pixel comparison. Do not invent screenshot findings.

**Source anchoring:** W6 browser contract branch `test/orbit-w6-owner-urgent-browser-contract-20261119` was based on GitHub main `4898e7a384de5d095a6a0c8bc90cfce0ed8f0f85`. Any candidate changed by W3/W4 must be tested at **its own exact head**. Existing committed candidate ≠ protected Preview ≠ Production release. Read `source_sha` from the browser status JSON; refuse mismatched `ORBIT_QA_EXPECTED_SHA` and never label a test run of the wrong source as verification.

## Immediate owner hotfix wave: independent acceptance

| Issue | Source-stage acceptance contract | W6 state | Worker |
| --- | --- | --- | --- |
| [#214](https://github.com/DoorBlox/orbit/issues/214) | Actual New note → Edit → Canvas: Excalidraw occupies editable sheet; placeholder not obstructive; tools and note identity survive Preview/reload; compare desktop/phone at reduced motion | **NOT RUN — Chromium** | W3 UI / W6 QA |
| [#216](https://github.com/DoorBlox/orbit/issues/216) | Resize Journal by keyboard with saved width/height and phone view; Canvas edit → + new page creates **exactly one** page, remains editable, reload retains page and drawing references | **NOT RUN — Chromium; source indicates beforePageChange blocking risk** | W3 UI / W6 QA |
| [#217](https://github.com/DoorBlox/orbit/issues/217) | Task-bearing terminal leaf has collapse button, keyboard/touch hide/show, state survives reload; no empty terminal connector | **FAIL — synthetic layout, exact-head CI**; [RED PR #231](https://github.com/DoorBlox/orbit/pull/231) at `ea3452cd138a129468daf94f4f68b2155ba02d9f`; 623 pass / 2 fail in [run 44565719941](https://github.com/DoorBlox/orbit/actions/runs/44565719941). Real browser **NOT RUN**. | W3 layout / W6 QA |
| [#218](https://github.com/DoorBlox/orbit/issues/218) | From unspecialized constellation: visible and accessible **Add task**, keyboard-create once, correct target branch, no duplicate, reload preserved | **NOT RUN — Chromium** | W3 UI / W6 QA |
| [#223](https://github.com/DoorBlox/orbit/issues/223) | All 10 themes token contrast ≥4.5:1 normal text, controls no clipping at 390px, panel actions coherent, keyboard resize/persistence, no misplaced Projects button; screenshot visual check still needed | **NOT RUN — Chromium and pixel audit** | W3 UI / W6 QA / W4 release |
| [#210](https://github.com/DoorBlox/orbit/issues/210) | Ambient OFF vs ON: observable animation, OFF stops, reduced-motion overrides, save/reload, theme contrast, no spatial drag/zoom regression | **NOT RUN — Chromium** | W3 UI / W6 QA |
| [#215](https://github.com/DoorBlox/orbit/issues/215) | No stray sticky action-strip in Preview/Edit across themes, action controls remain keyboard/touch reachable; examine [W3 draft PR #226](https://github.com/DoorBlox/orbit/pull/226) at its actual head | **NOT RUN — active source candidate unverified** | W3/Cmd HQ UI / W6 QA |

**Executable W6 artifacts:** `tests/qa_acceptance_owner_urgent.py` runs seven top-priority browser cases plus #211 local-isolation case, always writing `qa/owner-urgent/owner-urgent-results.json` with exact checkout SHA, per-case PASS/FAIL/NOT RUN, dummy-only screenshots and failure traces. `tests/qa_owner_urgent_browser_contract_syntax.test.mjs` only checks Python AST syntax in ordinary Node CI: **syntax PASS is not browser PASS**. No W6 test logs contain user account data. W4 must wire the standalone browser script into its existing fail-closed Chromium CI step and seven-day synthetic evidence upload under [#169](https://github.com/DoorBlox/orbit/issues/169)/[#211](https://github.com/DoorBlox/orbit/issues/211). No CI invocation existed at this checkpoint.

## Subsequent #211–#224 coverage queue — explicitly NOT RUN

| Issue | Independent evidence required before release | W6 status |
| --- | --- | --- |
| [#211](https://github.com/DoorBlox/orbit/issues/211) | Fake-data agent view on exact-source localhost/isolated protected preview without login bypass or hosted private data; A/B browser-context isolation, screenshot metadata and keyboard review; **does not prove live RLS** | **NOT RUN** (W4 fixture/CI pending) |
| [#212](https://github.com/DoorBlox/orbit/issues/212) | Daily routine regeneration across local-day boundary/DST, mark-complete per occurrence, no duplicates on reload/offline reconnect; CAS and export integrity | **NOT RUN — no verified candidate** |
| [#213](https://github.com/DoorBlox/orbit/issues/213) | Private local-only ledger proposal: input validation, privacy, calculations, export and owner data, no remote finance linkage without scope | **NOT RUN — proposal only** |
| [#219](https://github.com/DoorBlox/orbit/issues/219) | Visible Help entry point, focus-trapped/escapable contextual guidance, real task creation steps, respects reduced motion and mobile view | **NOT RUN — no verified candidate** |
| [#220](https://github.com/DoorBlox/orbit/issues/220) | One HUD quick-action surface: note/task/widget/sort available to keyboard and touch, no duplicate or inaccessible controls, saved preferences | **NOT RUN — no verified candidate** |
| [#221](https://github.com/DoorBlox/orbit/issues/221) | Minimap focus overlay shape/size tracks circle/rect/squircle and viewport zoom; no hidden focus or spatial-coordinate mutation | **NOT RUN — no verified candidate** |
| [#222](https://github.com/DoorBlox/orbit/issues/222) | Minimap and navigation combined semantically, all existing shortcuts work, no overlap in 390px viewport/200% zoom | **NOT RUN — no verified candidate** |
| [#224](https://github.com/DoorBlox/orbit/issues/224) | Sparse/dense timeline marker distance/overlap, prominent milestone band, 100–200% zoom, light/dark and reduced motion, journal data/date preservation | **NOT RUN — no verified candidate** |

## Screenshot/reference inventory (owner issue attachments)

- [#214 canvas empty sheet](https://github.com/user-attachments/assets/74ba6f8f-9aaf-420b-98a8-3d3640e40222)
- [#216 journal 1](https://github.com/user-attachments/assets/aa396224-2c83-4bbb-82b1-d77c3aee19de), [#216 journal 2](https://github.com/user-attachments/assets/70980221-13e3-44b4-96ed-16101463e780)
- [#217 branch collapse 1](https://github.com/user-attachments/assets/37c06398-95f0-48ba-8e06-549d648d184d), [#217 collapse 2](https://github.com/user-attachments/assets/6a3c6bcc-1bb1-4abe-8ae2-7d4e5e060149)
- [#215 sticky action strip](https://github.com/user-attachments/assets/deabeb1f-3cc6-46f0-954c-2283b269d2e4)
- [#223 panel 1](https://github.com/user-attachments/assets/689dc9fb-06cc-475c-a599-468bb8c6dab5), [#223 panel 2](https://github.com/user-attachments/assets/a0e033b3-ec2c-4151-915a-798b8720ef85), [#223 panel 3](https://github.com/user-attachments/assets/fb7ca7e8-ef39-4ec6-86fb-abcfca615030)
- Later wave: [#220 HUD](https://github.com/user-attachments/assets/56a95957-5764-4192-a009-b3f9d13acb25), [#221 minimap](https://github.com/user-attachments/assets/2e23fd36-bb8c-453f-9f9b-65ac0e274ca8), [#222 navigation](https://github.com/user-attachments/assets/95479404-5802-4c51-b9c5-174c3a37a566), [#224 timeline 1](https://github.com/user-attachments/assets/a21da3e8-b27f-426f-a4f0-758b45a96949), [#224 timeline 2](https://github.com/user-attachments/assets/b8a0075d-ee59-4e4b-af44-23f9645cdf23)

## Release tracker #225 — HOLD, not Production

Every candidate needs independent **source head + complete scope diff + 4/4 exact-head CI**, the named W6 browser case(s) actually **executed** and producing safe screenshot evidence, no private/CAS/backup regression, a verified **exact-source protected stage**, rollback identity, and post-promotion Production domain+SHA smoke. Source merge, Preview READY, owner visual approval, and Production release must be recorded separately, never inferred. The current release tracker is a request, **not a release action or broad Auth/SQL/Storage authorization**. Keep issue OPEN until its specified behavior is verified on real Production. Deliberately RED crash-durability [PR #175](https://github.com/DoorBlox/orbit/pull/175) stays unmerged pending owner/HQ security decision.
