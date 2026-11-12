# ORBIT — progress at a glance

**W5 reconciliation (12 November 2026):** Live Production remains **ORBIT 2.4**, independently verified canonical Vercel alias `orbit.starscene.com` → READY deployment `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4`, source `4e57aca785259192b92010c5d0e1634a4c1efe14`. Latest W5 observed GitHub main `a3b5203ef755e10a3976cb8e722c89ab7d5a0d00` is later **SOURCE ONLY**. Source merges, CI and localhost MCP **are not Production**, and owner/device acceptance remains pending. Requery all state before release.


**Owner-facing status index; not a second roadmap.** Baseline audited 12 November 2026 after source main `a42a6deffe93f567d689d012407cd72a0b6338e1`. GitHub may advance while this document is read. **W5 must recheck live main, open PRs, deployments and worker handoffs before updating the table.** The [single canonical task/dependency roadmap](../plans/ORBIT_POST_2_4_EXECUTION.md) is the implementation queue; this page is a short, timestamped digest.

**First check:** [GitHub open PRs](https://github.com/DoorBlox/orbit/pulls) · [open issues](https://github.com/DoorBlox/orbit/issues) · [GitHub Actions](https://github.com/DoorBlox/orbit/actions) · [Releases](https://github.com/DoorBlox/orbit/releases) · [Command HQ handoff](handoffs/ORBIT_COMMAND_HQ.md). The Releases page was empty at audit time; do **not** infer no Production deployment from that. The independently last documented Production release is ORBIT **2.4**, source `4e57aca`, Vercel `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4` at orbit.starscene.com. This Production alias **was independently reverified on 12 November 2026**. Numerous subsequent changes are merged source-only and NOT necessarily deployed.

## How to read statuses

- **SOURCE MERGED** = implementation exists in GitHub `main` after reviewed CI; does **not** prove release or real-device acceptance.
- **PARTIAL / IN PROGRESS** = some useful slices implemented; remaining code or behavior acceptance is open.
- **RELEASED** = actual Production deployment confirmed against exact source; **VERIFIED** requires the stated live user/device/security evidence too.
- **OWNER ACCEPTANCE PENDING** = real signed-in or physical-device steps still needed; workers should ask when ready and continue independent safe work.
- **GATED** = separately authorized hosted security, data destruction, public publishing, paid service or Production action; no silent approvals.

## BP status matrix — evidence-based initial digest

| BP | Source status | Remaining proof / next gate | Lead |
| --- | --- | --- | --- |
| **BP-00** Version and release identities | SOURCE MERGED version contract; distinct app/npm/backup identities | Reconcile release docs/tag/Production identity; no silent version bump | W4 technical / W5 documentation |
| **BP-01** Private images | PARTIAL SOURCE MERGED; private media APIs and guard fixes | [#26](https://github.com/DoorBlox/orbit/issues/26): signed-in visible pixels/reload, second-account denial, physical behavior | W2 + W6 |
| **BP-02** Portable private recovery | SOURCE MERGED multiple archive/restore safeguards, [#95](https://github.com/DoorBlox/orbit/pull/95), [#111](https://github.com/DoorBlox/orbit/pull/111) | Actual signed-in restore, media byte parity, rollback and two-account owner acceptance | W2 + W6 |
| **BP-03** Synchronization / polling | PARTIAL SOURCE MERGED, including [#136](https://github.com/DoorBlox/orbit/pull/136) and [#143](https://github.com/DoorBlox/orbit/pull/143) | Real two-device/network measurements; conditional owner RPC [#104](https://github.com/DoorBlox/orbit/pull/104) **design-only**, hosted approval separate | W1 |
| **BP-04** DB parity | PARTIAL: read-only hosted function/trigger/RLS catalog comparisons | Local concurrent MVCC, complete object/Storage parity and real two-account verification; hosted edits approval-gated | W1 + W6 |
| **BP-05** Protected stage/release | SOURCE MERGED staged-release security pipeline, e.g. [#94](https://github.com/DoorBlox/orbit/pull/94) | Real independent reviewer/environment, protected staging, rollback and Production gates; no automatic release | W4 + W6 |
| **BP-06** Spatial/visual baseline | PARTIAL SOURCE MERGED synthetic viewport QA | Physical Safari/Android, keyboard/assistive tech, zoom and signed-in UI | W3 + W6 |
| **BP-07** Theme and editor polish | PARTIAL SOURCE MERGED | Theme/contrast/accessibility owner/device acceptance and remaining consistency | W3 |
| **BP-08** Mobile Focus/offscreen recovery | SOURCE MERGED incl. [#133](https://github.com/DoorBlox/orbit/pull/133) | Physical mobile, rotation, focus/camera recovery acceptance | W3 + W6 |
| **BP-09** Clone/normalization performance | PARTIAL SOURCE MERGED, [#81](https://github.com/DoorBlox/orbit/pull/81), [#101](https://github.com/DoorBlox/orbit/pull/101) | Measured real workload/traffic; local conditional RPC proof, separately gated hosted feature | W1 |
| **BP-10** Drawing/media performance | PARTIAL SOURCE MERGED, [#83](https://github.com/DoorBlox/orbit/pull/83), [#85](https://github.com/DoorBlox/orbit/pull/85) | Real input frame budget and visible image lease/cleanup acceptance | W2 + W6 |
| **BP-11** Journal editing reliability | PARTIAL SOURCE MERGED [#144](https://github.com/DoorBlox/orbit/pull/144), [#151](https://github.com/DoorBlox/orbit/pull/151), [#157](https://github.com/DoorBlox/orbit/pull/157); [#161](https://github.com/DoorBlox/orbit/pull/161) DRAFT | IME composition, paste/undo, edit persistence, mobile/accessibility across real browsers | W3 + W6 |
| **BP-12** Private library/gallery | PARTIAL SOURCE MERGED, [#90](https://github.com/DoorBlox/orbit/pull/90), [#95](https://github.com/DoorBlox/orbit/pull/95) | Gallery/reuse selection real-user check; physical file deletion is separately **GATED** | W2 API + W3 UI + W6 |
| **BP-13** Embedded Excalidraw | PARTIAL SOURCE MERGED, official lazy editor and private image transport | Signed-in and real-device Excalidraw image import/export and backup integrity | W3 + W2 + W6 |
| **BP-14** Client-side calendar | SOURCE MERGED [#76](https://github.com/DoorBlox/orbit/pull/76) | Actual client calendar import/timezone acceptance | W6 |
| **BP-15** Scoped OAuth/MCP | PARTIAL SOURCE MERGED, security layers through [#159](https://github.com/DoorBlox/orbit/pull/159), **localhost SDK-only** | Real OAuth PKCE/consent and delegated DB RLS, two-account hosted tests; local runnable MCP demonstrated, **no live connector** | W4 / W1 data / W3 UX |
| **BP-16** Quality/accessibility | PARTIAL SOURCE MERGED static semantic + runtime synthetic checks, [#102](https://github.com/DoorBlox/orbit/pull/102) | Real assistive-tech/screen-reader/mobile and release quality evidence | W4 + W6 |

**Integrated workstream detail:**

| ID | GitHub source status | Remaining acceptance/authorization | Worker |
| --- | --- | --- | --- |
| EX-00 / EX-01 | SOURCE MERGED [#40](https://github.com/DoorBlox/orbit/pull/40), [#41](https://github.com/DoorBlox/orbit/pull/41) | Integrated editor preview, owner save/reload | W3/W6 |
| EX-02 | PARTIAL SOURCE MERGED [#71](https://github.com/DoorBlox/orbit/pull/71) | Real private image bytes, restore, interchange | W2/W3/W6 |
| SP-00/01A/01B | SOURCE MERGED [#44](https://github.com/DoorBlox/orbit/pull/44), [#48](https://github.com/DoorBlox/orbit/pull/48), [#50](https://github.com/DoorBlox/orbit/pull/50) | Seventh widget and legacy layout on physical devices | W3/W6 |
| PJ-01/02A/02B | SOURCE MERGED [#51](https://github.com/DoorBlox/orbit/pull/51), [#53](https://github.com/DoorBlox/orbit/pull/53), [#55](https://github.com/DoorBlox/orbit/pull/55) | Protected Preview and owner-private reload/backup | W3/W6 |
| PJ-03 | PARTIAL SOURCE MERGED [#64](https://github.com/DoorBlox/orbit/pull/64), [#88](https://github.com/DoorBlox/orbit/pull/88), [#93](https://github.com/DoorBlox/orbit/pull/93), [#97](https://github.com/DoorBlox/orbit/pull/97) | Real milestone/link/finder/health save and nested consistency | W3/W6 |
| BR-01 / BR-02 | SOURCE MERGED [#86](https://github.com/DoorBlox/orbit/pull/86), [#60](https://github.com/DoorBlox/orbit/pull/60) | Deep nested branch keyboard/mobile checks | W3/W6 |
| TOUCH-01 | SOURCE MERGED [#63](https://github.com/DoorBlox/orbit/pull/63) | Owner-reported physical finger drag regression still open | W3/W6 |
| FO-01 | PROPOSED | Optional Pomodoro; distinct from BP-08 Focus view | W3 |
| AUTH-MASCOT | PROPOSED | Original accessible brand concept; no Auth mutation | W3 |
| PUB-00/01/02 | PROPOSED / HOSTED-GATED | Threat model, approved public copies, signed-off hosting/publishing | W4/W3 |

## Who is doing what

| Chat | Owner / file lane | Handoff |
| --- | --- | --- |
| W1 Core Engine | Cloud sync, CAS, database parity | [W1](handoffs/ORBIT_W1.md) |
| W2 Private Media | Storage isolation and portable media recovery | [W2](handoffs/ORBIT_W2.md) |
| W3 Product Experience | Spatial UI, Journal, Projects, private gallery | [W3](handoffs/ORBIT_W3.md) |
| W4 Platform, Security & Release | MCP/OAuth, CI, release-security code | [W4](handoffs/ORBIT_W4.md) |
| **W5 Documentation & Releases** | This digest, changelog, release records, safe branch audit | [W5](handoffs/ORBIT_W5.md) |
| **W6 Acceptance & Integration QA** | Cross-feature browser evidence, owner/device QA preparation | [W6](handoffs/ORBIT_W6.md) |
| **Command HQ** | Coordination, priority arbitration and release gates | [HQ](handoffs/ORBIT_COMMAND_HQ.md) |

**How to get a reliable answer:** ask “What is source merged, on protected Preview, actually released, and signed-in verified?” Link the exact HEAD, tests, deployed Vercel target and owner evidence in each update. W5 maintains this index; W6 maintains detailed acceptance evidence. Do not wait on one optional real-user test while independent safe source work remains READY.

## Immediate active work at 12 November 2026 snapshot

- **W1:** [#160](https://github.com/DoorBlox/orbit/pull/160) draft; local conditional RPC tenant/MVCC proof, no hosted authorization.
- **W2:** [#154](https://github.com/DoorBlox/orbit/pull/154) draft with prior RED evidence; complete checksum/byte-quota tests, do not merge failing head.
- **W3:** [#161](https://github.com/DoorBlox/orbit/pull/161) draft; Journal clipboard fallback and native undo regressions.
- **W4:** localhost MCP official SDK v2 [#159](https://github.com/DoorBlox/orbit/pull/159) merged, hosted PKCE/RLS still gated.
- **W5:** refresh docs, branch inventory and reviewable GitHub Release draft, no publication/deletion. **W6:** independent integration/real-device acceptance gate.

GitHub active PR state changes frequently; [recheck it](https://github.com/DoorBlox/orbit/pulls). This digest does not imply any later source merge is deployed.
