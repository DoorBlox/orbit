# ORBIT — current verified state

**W5 verified status snapshot — 13 November 2026:** GitHub source [`2fb868d7d4b7`](https://github.com/DoorBlox/orbit/commit/2fb868d7d4b7439472f462205e5ca28509e8ee40) includes post-2.4 merges, **not** a new Production release. Independently rechecked `orbit.starscene.com` still points to **ORBIT 2.4**, Vercel READY `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4` built from Git `4e57aca785259192b92010c5d0e1634a4c1efe14`. Signed-in owner/device acceptance of newer source remains pending; requery GitHub before acting.

## Release boundary

- Production 2.4 exact source: [`4e57aca`](https://github.com/DoorBlox/orbit/commit/4e57aca785259192b92010c5d0e1634a4c1efe14), Vercel READY `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4`, alias independently verified 13 November 2026.
- Prior rollback: `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4` from `de2523d` (historical READY, reverify before any action).
- GitHub Releases: zero published records at audit; [2.4 release draft](releases/GITHUB_2_4_RELEASE_DRAFT.md) is **unpublished**.
- GitHub work and local-only MCP cannot be promoted without separately authorized staged tests and owner/device evidence.

## Source work after 2.4 (not live)

| Lane | Implemented source and open gates |
| --- | --- |
| W1 sync/database | Reconnect reliability [#136](https://github.com/DoorBlox/orbit/pull/136), [#143](https://github.com/DoorBlox/orbit/pull/143); default-off revision client [#155](https://github.com/DoorBlox/orbit/pull/155); locally tested conditional RPC/MVCC prototype [#160](https://github.com/DoorBlox/orbit/pull/160) **SOURCE MERGED**; W1 handoff [#166](https://github.com/DoorBlox/orbit/pull/166) merged; opt-in deferred-owned snapshot factory [#170](https://github.com/DoorBlox/orbit/pull/170) and handoff [#174](https://github.com/DoorBlox/orbit/pull/174) **SOURCE MERGED**. UI bridge [#115](https://github.com/DoorBlox/orbit/issues/115) remains W3-owned; hosted RPC separately gated. |
| W2 media | Reference-safe library [#90](https://github.com/DoorBlox/orbit/pull/90), gallery [#117](https://github.com/DoorBlox/orbit/pull/117), verified upload ACK [#150](https://github.com/DoorBlox/orbit/pull/150), malformed response guard [#153](https://github.com/DoorBlox/orbit/pull/153); [#154](https://github.com/DoorBlox/orbit/pull/154) **SOURCE MERGED** object-input archive byte quota. Signed-in restored bytes and actual deletion remain gated. |
| W3 product | Private Projects, Excalidraw/scene assets, mobile Focus, Journal undo/date fixes [#157](https://github.com/DoorBlox/orbit/pull/157); [#161](https://github.com/DoorBlox/orbit/pull/161) **SOURCE MERGED** safe plain-text clipboard fallback. Real physical touch/assistive acceptance incomplete. |
| W4 platform | Reviewed stage workflow source [#94](https://github.com/DoorBlox/orbit/pull/94)/[#112](https://github.com/DoorBlox/orbit/pull/112); localhost MCP [#156](https://github.com/DoorBlox/orbit/pull/156) and official SDK conformance [#159](https://github.com/DoorBlox/orbit/pull/159), and disposable PKCE S256/consent/refresh prototype [#162](https://github.com/DoorBlox/orbit/pull/162), durable local grant ledger [#167](https://github.com/DoorBlox/orbit/pull/167) and persisted ledger-to-local-MCP [#172](https://github.com/DoorBlox/orbit/pull/172). All are **SOURCE MERGED local/synthetic only**; no hosted or live delegated OAuth server. |
| W5/W6 | W5 canonical docs/release/branch audit [#164](https://github.com/DoorBlox/orbit/pull/164) **SOURCE MERGED**; W6 synthetic CAS/media/Projects/restore [#165](https://github.com/DoorBlox/orbit/pull/165) PASS; Chromium script [#168](https://github.com/DoorBlox/orbit/pull/168) merged **NOT RUN** ([#169](https://github.com/DoorBlox/orbit/issues/169)); RED synthetic abrupt-recovery proposal [#175](https://github.com/DoorBlox/orbit/pull/175) **UNMERGED**, risk tracking [#171](https://github.com/DoorBlox/orbit/issues/171). Real owner/device acceptance **NOT RUN**. |

## Unverified acceptance and authorization

Issue [#26](https://github.com/DoorBlox/orbit/issues/26) requires authenticated private Journal/Sticky image pixels and reload; [#29](https://github.com/DoorBlox/orbit/issues/29) media library and permanent deletion are not closed; [#32](https://github.com/DoorBlox/orbit/issues/32) delegated OAuth/MCP is not shipped. Owner and separate-account private backup restore, real Safari/Android, independently executed W6 Chromium runner and current-source protected integrated Preview have no complete release certificate. Issue [#171](https://github.com/DoorBlox/orbit/issues/171) has a synthetic controller-level failing RED test, not a demonstrated browser crash or Production data-loss incident. No hosted data mutation, paid service, public publishing, destructive cleanup, GitHub Release publication or Production promotion authorized by this status refresh.

[Progress](PROGRESS.md) · [One roadmap](../plans/ORBIT_POST_2_4_EXECUTION.md) · [Operations](OPERATIONS.md) · [Release notes](../RELEASE_NOTES.md) · [W5 handoff](handoffs/ORBIT_W5.md).
