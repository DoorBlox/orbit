# ORBIT — current verified state

**W5 reconciliation (12 November 2026):** Live Production remains **ORBIT 2.4**, independently verified canonical Vercel alias `orbit.starscene.com` → READY deployment `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4`, source `4e57aca785259192b92010c5d0e1634a4c1efe14`. Latest W5 observed GitHub main `6c2f1c3465a959faaf96b6db9260e168b3063bd6` is newer **SOURCE ONLY**. Source merges, CI and localhost MCP **are not Production**, and owner/device acceptance remains pending. Requery all state before release.

## Release boundary

- Production 2.4 exact source: [`4e57aca`](https://github.com/DoorBlox/orbit/commit/4e57aca785259192b92010c5d0e1634a4c1efe14), Vercel READY `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4`, alias independently verified 12 November 2026.
- Prior rollback: `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4` from `de2523d` (historical READY, reverify before any action).
- GitHub Releases: zero published records at audit; [2.4 release draft](releases/GITHUB_2_4_RELEASE_DRAFT.md) is **unpublished**.
- GitHub work and local-only MCP cannot be promoted without separately authorized staged tests and owner/device evidence.

## Source work after 2.4 (not live)

| Lane | Implemented source and open gates |
| --- | --- |
| W1 sync/database | Reconnect reliability [#136](https://github.com/DoorBlox/orbit/pull/136), [#143](https://github.com/DoorBlox/orbit/pull/143); default-off revision client [#155](https://github.com/DoorBlox/orbit/pull/155); locally tested conditional RPC/MVCC prototype [#160](https://github.com/DoorBlox/orbit/pull/160) **SOURCE MERGED**; W1 handoff [#166](https://github.com/DoorBlox/orbit/pull/166) merged. Hosted RPC requires separate approval. |
| W2 media | Reference-safe library [#90](https://github.com/DoorBlox/orbit/pull/90), gallery [#117](https://github.com/DoorBlox/orbit/pull/117), verified upload ACK [#150](https://github.com/DoorBlox/orbit/pull/150), malformed response guard [#153](https://github.com/DoorBlox/orbit/pull/153); [#154](https://github.com/DoorBlox/orbit/pull/154) **SOURCE MERGED** object-input archive byte quota. Signed-in restored bytes and actual deletion remain gated. |
| W3 product | Private Projects, Excalidraw/scene assets, mobile Focus, Journal undo/date fixes [#157](https://github.com/DoorBlox/orbit/pull/157); [#161](https://github.com/DoorBlox/orbit/pull/161) open review (not merged at this audit). Real physical touch/assistive acceptance incomplete. |
| W4 platform | Reviewed stage workflow source [#94](https://github.com/DoorBlox/orbit/pull/94)/[#112](https://github.com/DoorBlox/orbit/pull/112); localhost MCP [#156](https://github.com/DoorBlox/orbit/pull/156) and official SDK conformance [#159](https://github.com/DoorBlox/orbit/pull/159), and disposable PKCE S256/consent/refresh prototype [#162](https://github.com/DoorBlox/orbit/pull/162). No hosted or live delegated OAuth server. |
| W5/W6 | W5 canonical docs/release/branch audit; W6 synthetic cross-feature CAS/media/Projects/restore suite [#165](https://github.com/DoorBlox/orbit/pull/165) **SOURCE MERGED**, real owner/device acceptance **NOT RUN**. |

## Unverified acceptance and authorization

Issue [#26](https://github.com/DoorBlox/orbit/issues/26) requires authenticated private Journal/Sticky image pixels and reload; [#29](https://github.com/DoorBlox/orbit/issues/29) media library and permanent deletion are not closed; [#32](https://github.com/DoorBlox/orbit/issues/32) delegated OAuth/MCP is not shipped. Owner and separate-account private backup restore, real Safari/Android, and protected integrated Preview have no complete release certificate. No hosted data mutation, paid service, public publishing, destructive cleanup, GitHub Release publication or Production promotion authorized by this status refresh.

[Progress](PROGRESS.md) · [One roadmap](../plans/ORBIT_POST_2_4_EXECUTION.md) · [Operations](OPERATIONS.md) · [Release notes](../RELEASE_NOTES.md) · [W5 handoff](handoffs/ORBIT_W5.md).
