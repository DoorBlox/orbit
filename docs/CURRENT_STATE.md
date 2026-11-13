# ORBIT — current verified state

**W5 verified status snapshot — 13 November 2026:** GitHub source [`1e982a494ab1`](https://github.com/DoorBlox/orbit/commit/1e982a494ab1dda24b8ca19c5b87da5c5a15f942) is **SOURCE ONLY** for post-2.4 changes. Independently verified `orbit.starscene.com` still aliases **ORBIT 2.4** Vercel READY `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4` from Git `4e57aca785259192b92010c5d0e1634a4c1efe14`. No later source code is claimed deployed; signed-in owner/device acceptance remains pending. Requery live state before taking release action.

## Release boundary

- Production 2.4 exact source: [`4e57aca`](https://github.com/DoorBlox/orbit/commit/4e57aca785259192b92010c5d0e1634a4c1efe14), Vercel READY `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4`, alias independently verified 13 November 2026.
- Prior rollback: `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4` from `de2523d` (historical READY, reverify before any action).
- GitHub Releases: zero published records at audit; [2.4 release draft](releases/GITHUB_2_4_RELEASE_DRAFT.md) is **unpublished**.
- GitHub work and local-only MCP cannot be promoted without separately authorized staged tests and owner/device evidence.

## Source work after 2.4 (not live)

| Lane | Implemented source and open gates |
| --- | --- |
| W1 sync/database | Conditional-local RPC prototype [#160](https://github.com/DoorBlox/orbit/pull/160), deferred API [#170](https://github.com/DoorBlox/orbit/pull/170), reentrant export [#178](https://github.com/DoorBlox/orbit/pull/178), bounded save capture [#184](https://github.com/DoorBlox/orbit/pull/184), clean-auth owner-read polling [#190](https://github.com/DoorBlox/orbit/pull/190) **SOURCE MERGED**. W3 bridge [#115](https://github.com/DoorBlox/orbit/issues/115) open; no hosted RPC rollout or signed-in device performance verdict. |
| W2 media | Private gallery [#90](https://github.com/DoorBlox/orbit/pull/90)/[#117](https://github.com/DoorBlox/orbit/pull/117), bounded archive [#154](https://github.com/DoorBlox/orbit/pull/154), read-only usage [#179](https://github.com/DoorBlox/orbit/pull/179), failed-Storage owner-switch Blob lease revocation [#187](https://github.com/DoorBlox/orbit/pull/187), handoff [#192](https://github.com/DoorBlox/orbit/pull/192) **SOURCE MERGED**. Signed-in pixels, A/B actual restore and destructive deletion unverified/gated. |
| W3 product | Private Projects/Excalidraw, optional mobile Focus and Journal safety; clipboard plain-text fallback [#161](https://github.com/DoorBlox/orbit/pull/161) SOURCE MERGED. Optional spatial Focus timer [#176](https://github.com/DoorBlox/orbit/pull/176) **DRAFT**; W3 UI bridge [#115](https://github.com/DoorBlox/orbit/issues/115) not yet activated. Physical touch/assistive acceptance incomplete. |
| W4 platform | Protected stage source [#94](https://github.com/DoorBlox/orbit/pull/94)/[#112](https://github.com/DoorBlox/orbit/pull/112), disposable localhost OAuth grant/PKCE/MCP [#167](https://github.com/DoorBlox/orbit/pull/167)/[#172](https://github.com/DoorBlox/orbit/pull/172)/[#181](https://github.com/DoorBlox/orbit/pull/181) **SOURCE MERGED**. SDK loopback discovery [#191](https://github.com/DoorBlox/orbit/pull/191) DRAFT, W6 independent Chromium CI [#169](https://github.com/DoorBlox/orbit/issues/169) not wired. No public connector/hosted identity or deployed MCP. |
| W5/W6 | Canonical docs [#164](https://github.com/DoorBlox/orbit/pull/164)/[#180](https://github.com/DoorBlox/orbit/pull/180) **SOURCE MERGED**; W6 [#185](https://github.com/DoorBlox/orbit/pull/185) 581/581 Node PASS, [#189](https://github.com/DoorBlox/orbit/pull/189) 585/585 Node PASS and [#193](https://github.com/DoorBlox/orbit/pull/193) closeout merged. Additional W6 [#194](https://github.com/DoorBlox/orbit/pull/194) DRAFT. Standalone Chromium #168 NOT RUN until #169, crash-RED #175 unmerged. Real signed-in, devices and Production acceptance NOT VERIFIED. |

## Unverified acceptance and authorization

Issue [#26](https://github.com/DoorBlox/orbit/issues/26) requires authenticated private Journal/Sticky image pixels and reload; [#29](https://github.com/DoorBlox/orbit/issues/29) media library and permanent deletion are not closed; [#32](https://github.com/DoorBlox/orbit/issues/32) delegated OAuth/MCP is not shipped. Owner and separate-account private backup restore, real Safari/Android, independently executed W6 Chromium runner and current-source protected integrated Preview have no complete release certificate. Issue [#171](https://github.com/DoorBlox/orbit/issues/171) has a synthetic controller-level failing RED test, not a demonstrated browser crash or Production data-loss incident. No hosted data mutation, paid service, public publishing, destructive cleanup, GitHub Release publication or Production promotion authorized by this status refresh.

[Progress](PROGRESS.md) · [One roadmap](../plans/ORBIT_POST_2_4_EXECUTION.md) · [Operations](OPERATIONS.md) · [Release notes](../RELEASE_NOTES.md) · [W5 handoff](handoffs/ORBIT_W5.md).
