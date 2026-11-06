# M2.5 discovery baseline

Local synthetic observations on the unchanged M2 application source, using the
existing qa_m2 source server and mocked cloud fixture. Desktop 1440×900 and phone
viewport 390×844; Chromium, not a physical phone or hosted preview. Normal motion
was enabled for interruption probes, then reduced motion was toggled at runtime.

- `observations.json`: camera interruption samples, reduced-motion samples,
  zero mock save calls and unchanged layout checks; frame-based spring simulation
  is explicitly mathematical, not hardware performance evidence.
- `desktop-baseline.png`, `phone-baseline.png`: existing appearance with only
  synthetic records. These are baseline views, not proposed/implemented redesigns.
- `reproduce.py`: the executed diagnostic, copied from the workspace helper.
  Run from /workspace/orbit with the retained environment's Node/Python/Chromium
  available and local port 4197 free. It serves source and uses only synthetic
  test contexts. It is not part of the production app or an M2 acceptance rerun.

No application source, dependencies, hosted services or real credentials were
changed. See `docs/decisions/M2_5-MOTION-AUDIT-PROPOSAL.md` for priorities,
limitations and the implementation approval boundary.
