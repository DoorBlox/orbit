# ORBIT — current verified state

**W5 verified status snapshot — 13 November 2026:** GitHub source [`71eae629e308`](https://github.com/DoorBlox/orbit/commit/71eae629e308174cd0ea36bc4fa2d2f29bf230d9) is **SOURCE ONLY** for post-2.4 changes. Independently verified `orbit.starscene.com` still aliases **ORBIT 2.4** Vercel READY `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4` from Git `4e57aca785259192b92010c5d0e1634a4c1efe14`. No later source code is claimed deployed; signed-in owner/device acceptance remains pending. Requery live state before taking release action.

## Release boundary

- Production 2.4 exact source: [`4e57aca`](https://github.com/DoorBlox/orbit/commit/4e57aca785259192b92010c5d0e1634a4c1efe14), Vercel READY `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4`, alias independently verified 13 November 2026.
- Prior rollback: `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4` from `de2523d` (historical READY, reverify before any action).
- GitHub Releases: zero published records at audit; [2.4 release draft](releases/GITHUB_2_4_RELEASE_DRAFT.md) is **unpublished**.
- GitHub work and local-only MCP cannot be promoted without separately authorized staged tests and owner/device evidence.

## Source work after 2.4 (not live)

| Lane | Implemented source and open gates |
| --- | --- |
| W1 sync/database | Reconnect and conditional-local RPC source [#136](https://github.com/DoorBlox/orbit/pull/136)/[#143](https://github.com/DoorBlox/orbit/pull/143)/[#160](https://github.com/DoorBlox/orbit/pull/160); opt-in deferred-owned snapshot [#170](https://github.com/DoorBlox/orbit/pull/170), **reentrant explicit-export recovery** [#178](https://github.com/DoorBlox/orbit/pull/178), handoff [#182](https://github.com/DoorBlox/orbit/pull/182) SOURCE MERGED. W3 bridge [#115](https://github.com/DoorBlox/orbit/issues/115) pending, W1 save-boundary [#184](https://github.com/DoorBlox/orbit/pull/184) DRAFT. Hosted RPC gated, no real device performance verdict. |
| W2 media | Reference-safe private gallery [#90](https://github.com/DoorBlox/orbit/pull/90)/[#117](https://github.com/DoorBlox/orbit/pull/117), malformed Storage guard [#153](https://github.com/DoorBlox/orbit/pull/153), archive quota [#154](https://github.com/DoorBlox/orbit/pull/154), **read-only bounded private usage summary** [#179](https://github.com/DoorBlox/orbit/pull/179), handoff [#183](https://github.com/DoorBlox/orbit/pull/183) SOURCE MERGED. Actual owner signed-in image pixels, restore and object delete remain unverified/gated. |
| W3 product | Private Projects/Excalidraw, optional mobile Focus and Journal safety; clipboard plain-text fallback [#161](https://github.com/DoorBlox/orbit/pull/161) SOURCE MERGED. Optional spatial Focus timer [#176](https://github.com/DoorBlox/orbit/pull/176) **DRAFT**; W3 UI bridge [#115](https://github.com/DoorBlox/orbit/issues/115) not yet activated. Physical touch/assistive acceptance incomplete. |
| W4 platform | Protected stage source [#94](https://github.com/DoorBlox/orbit/pull/94)/[#112](https://github.com/DoorBlox/orbit/pull/112); disposable local persisted grant/PKCE-to-MCP [#167](https://github.com/DoorBlox/orbit/pull/167)/[#172](https://github.com/DoorBlox/orbit/pull/172) and **localhost-only HTTP OAuth consent/refresh/revoke** [#181](https://github.com/DoorBlox/orbit/pull/181) SOURCE MERGED. W6 Chromium CI wiring [#169](https://github.com/DoorBlox/orbit/issues/169) still open. No hosted delegated OAuth/public connector. |
| W5/W6 | Canonical release/source audit [#164](https://github.com/DoorBlox/orbit/pull/164) merged, follow-up W5 status [#180](https://github.com/DoorBlox/orbit/pull/180) **IN REVIEW**; W6 cross-feature synthetic [#165](https://github.com/DoorBlox/orbit/pull/165) PASS, standalone Chromium [#168](https://github.com/DoorBlox/orbit/pull/168) SOURCE MERGED **NOT RUN** [#169](https://github.com/DoorBlox/orbit/issues/169), RED controller teardown [#175](https://github.com/DoorBlox/orbit/pull/175) unmerged, W6 integration [#185](https://github.com/DoorBlox/orbit/pull/185) DRAFT. Real signed-in/device acceptance NOT RUN. |

## Unverified acceptance and authorization

Issue [#26](https://github.com/DoorBlox/orbit/issues/26) requires authenticated private Journal/Sticky image pixels and reload; [#29](https://github.com/DoorBlox/orbit/issues/29) media library and permanent deletion are not closed; [#32](https://github.com/DoorBlox/orbit/issues/32) delegated OAuth/MCP is not shipped. Owner and separate-account private backup restore, real Safari/Android, independently executed W6 Chromium runner and current-source protected integrated Preview have no complete release certificate. Issue [#171](https://github.com/DoorBlox/orbit/issues/171) has a synthetic controller-level failing RED test, not a demonstrated browser crash or Production data-loss incident. No hosted data mutation, paid service, public publishing, destructive cleanup, GitHub Release publication or Production promotion authorized by this status refresh.

[Progress](PROGRESS.md) · [One roadmap](../plans/ORBIT_POST_2_4_EXECUTION.md) · [Operations](OPERATIONS.md) · [Release notes](../RELEASE_NOTES.md) · [W5 handoff](handoffs/ORBIT_W5.md).
