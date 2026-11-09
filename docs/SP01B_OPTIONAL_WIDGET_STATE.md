# SP-01B — seventh mounted window and private optional layout

**Status:** source implementation on a feature branch; accept only after four exact-head checks. Not a released Projects or Pomodoro feature.

## Scope and behavior

- `SpatialBoard.registerWidget(descriptor, element)` mounts a vetted first-party DOM element at runtime. Registration validates the descriptor, binds the existing keyboard move/resize and pointer handlers, and adds a Places-map marker. Nothing is generated from saved snapshot HTML or plugin code.
- Registered optional windows get a Hide control. Hidden windows remain discoverable as dashed **Reopen** markers in the Places map; activating the marker restores the same element and focuses its world position. `fitAll()` excludes hidden windows.
- The current six widgets remain the default and cannot be hidden by this additional-widget API. Normal ORBIT startup still mounts six; the seventh `projects` widget is a synthetic fixture created only in Chromium tests.

## Owner-scoped persistence, backups and rollback

- Optional widget coordinates, explicit width/height when resized, and hidden state are stored as `extensions.spatialWidgets` in the existing local/cloud owner snapshot and V6 backup extensions. `normalizeExtensions` applies a maximum of 32 IDs, strict widget IDs, bounded finite positions/sizes, and boolean visibility. Unknown optional IDs stay inert data until first-party code registers the widget.
- The root V6 `spatialLayout`, `orbit.v5.spatial-layout`, and `orbit.v6.spatial-sizes` remain **limited to the original six IDs**. The V6 backup validator continues rejecting unknown root widget IDs. The new optional state therefore never contaminates the legacy layout keys.
- The existing CAS-protected owner snapshot path and atomic backup/restore retain the extension field. No new hosted SQL, public endpoint, RLS policy or Storage bucket. Old ORBIT builds without this extension field may ignore it during re-export, so downgrade/forward compatibility is not promised.
- To roll back this source change, revert the source PR; original six layouts remain unchanged. Optional layout metadata is inert under older code and must never be used to synthesize untrusted widgets.

## Tests

- Unit tests validate seventh descriptor extension, malicious/duplicate IDs, bound failures, owner-extension normalization, strict legacy V6 root rejection, and atomic backup restoration.
- `tests/qa_spatial_extra.py` injects one synthetic seventh DOM window into the existing locally hosted app. Chromium checks keyboard move/resize, private storage, hide/reopen via the real Places map, and reload/re-registration without losing position or hidden state.
- CI screenshot evidence `qa/sp01b-*.png` and `qa/sp01b-results.json` is synthetic and retained for seven days. Production, physical Safari/Android, signed-in real accounts and assistive technologies are not verified by this test.

## Next

PJ-01 private branch-to-project metadata, followed by a genuinely useful Projects panel (PJ-02); FO-01 Pomodoro can use the same first-party registry and private layout channel. Add owner-visible registration/creation controls only alongside a real feature, not a synthetic placeholder.
