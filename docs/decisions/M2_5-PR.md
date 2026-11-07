# PR title

Fix interrupted camera motion, reduced-motion handling and touch continuity

# PR description

Wheel input, graph zoom and keyboard pan could be overwritten by a running focus
animation. Manual input now cancels the old flight immediately. Runtime reduced
motion resolves active targets, animation teardown cancels pending work, graph
elasticity settles consistently at simulated 60/120Hz with bounded catch-up, and
pinch continues into one-finger pan without jumping.

Existing visual identity, camera timing/easing, widget persistence and cloud
behavior are preserved. No dependencies, Auth/RLS, database or deployment settings
change. Optional P2 animation/timing changes are deferred for lack of evidence.
Prior accepted M2 evidence is preserved in a separate checkpoint commit; motion
source review starts after `eca7fa3`.

Validation: required checks pass (156 tests, provenance/build/structure), 25 motion
browser cases pass on source and dist across five viewport profiles, existing
five-viewport QA passes, and cloud/close-out browser suites pass 24/24 and 5/5.
The tests use synthetic local contexts; physical-device and inherited hosted
write-authorization gaps remain unverified. See M2_5-IMPLEMENTATION.md and its
linked evidence. No merge or deployment is authorized.
