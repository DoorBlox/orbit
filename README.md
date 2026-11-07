# ORBIT — The Spatial Scrapbook

ORBIT preserves one pannable spatial scrapbook with six independently movable,
resizable windows: constellation, timeline, active tasks, completed tasks, personal
space and dated paper-like journal. The app remains native HTML/CSS/JavaScript ES
modules; the Supabase SDK is the only isolated browser bundle.

Version **1.0.0 release candidate**; Production is not yet published.

## Current state (7 November 2026)

- **Source repository:** public and [MIT-licensed](LICENSE), with copyright (c) 2026
  DoorBlox. This license applies to ORBIT's repository code and documentation.
  Third-party dependencies keep their own licenses.
- **Canonical roadmap:** M0 → M1 → M2 → M2.5 → M3 → M4 → M5 → M6.
  M2.5 and 1.0.0 release-readiness changes are merged into `main`.
- **Release:** 1.0.0 remains a **release candidate**, not a published Production app.
  The last successful exact-head Production artifact dry run uses a synthetic
  publishable key and deploys nothing. The protected Vercel Preview has passed
  an owner sign-in and private workspace smoke test.
- **Security evidence:** real nonowner bearer-session HTTP READ and INSERT checks
  passed for seven private tables, corroborated by Supabase gateway logs and a
  zero-nonowner-row SQL postflight. Real authenticated HTTP UPDATE/DELETE
  remains unverified; SQL role simulations and mocked browser tests are separate.
- **Remaining release gates:** authenticated nonowner UPDATE/DELETE evidence,
  Production hosted authentication/headers, a rollback decision, and any accepted
  physical-device testing limitations. See [M6 issue #2](https://github.com/DoorBlox/orbit/issues/2)
  and the [release runbook](docs/decisions/M3-LAUNCH-RUNBOOK.md).

**Public source is not public workspace access.** Do not commit private journal
entries, exports, credentials, auth tokens, or private user data. The ORBIT
workspace database remains guarded by Supabase owner-only RLS; deployed access
is separately protected by Vercel Authentication. Published source does not
give anyone permission to view the owner's live content.

## Development and validation

Use Node 22 and npm 10+. The lockfile pins the Supabase SDK and esbuild. The
published development environment is already prepared; do not repeat onboarding.
For a fresh external checkout only, `npm ci --ignore-scripts` restores dependencies.

```sh
npm run dev              # loopback source server; local prototype mode
npm run check            # syntax, unit tests, provenance, build and structure
npm run dev:dist         # loopback server for the existing dist build
python tests/qa_m1.py     # local persistence/accessibility/viewport regressions
python tests/qa_m2.py     # cloud wiring with synthetic mocked SDK transport
python tests/qa_m25.py    # motion/touch/reduced-motion on five viewport profiles
```

Run relevant checks after changes; do not repeat accepted M2/M2.5 testing just to
recreate evidence. `lint` is a syntax checker, not a semantic linter. Browser QA
uses the pinned Playwright tooling and Chromium; results are not hardware Safari
or live hosted-RLS certification.

## Local and protected-cloud modes

With no public configuration, the build produces a localStorage prototype. That
artifact is **not** evidence of a configured protected-cloud release candidate.
Configured cloud builds require all three public inputs together:
`ORBIT_SUPABASE_URL`, `ORBIT_SUPABASE_PUBLISHABLE_KEY`, `ORBIT_SITE_URL`.
See [.env.example](.env.example); no dotenv loader is provided. Privileged/service-role
keys must never enter browser configuration, build output, logs or Git.

Cloud mode uses verified Auth, an administrator-configured owner UUID, restrictive
server RLS, snapshot persistence and revision-checked conflict recovery. It does
not automatically import legacy local content. Explicit import replaces the cloud
snapshot and requires review/consent; JSON backups are unencrypted. Session Auth
uses sessionStorage and unsaved drafts are not durable across tab closure.

Public viewing remains disabled. Vercel protection and Supabase authorization are
separate boundaries. Keep both intact; do not use real private data in an
unprotected deployment. Password sign-in does not establish OTP or Google OAuth
acceptance.

`npm run build` emits only allowlisted app/assets into ignored `dist/`, bundling
the SDK boundary and writing allowlisted public runtime configuration. Repository
docs, tests, migrations, environment examples and backups are not deployment files.
Automatic Vercel Git deployment remains disabled in repository configuration; do
not remove that hold or promote an artifact without separate authorization.

## Production build safety

`npm run build:release` enforces the same guarded path as VERCEL_ENV=production.
It refuses local fallback and requires complete cloud inputs, reviewed public
origins in release/production-target.json, development exclusions and matching
private CSP. `npm run verify:release` verifies a clean committed artifact and prints
hashes without keys; it does not certify live protection/Auth/RLS. Production metadata now explicitly reviews shared project `ixfgavgtwuzdgucjriec`
for `https://orbit.starscene.com/`, through a narrow source exception. Live Production-scoped URLs and the public key's active-project match were verified;
Production runtime/hosted authentication is not yet attested. See the [target decision](docs/decisions/M3-SHARED-PRODUCTION-TARGET.md). Neither command deploys anything.

## Evidence and handoff

- [Repository instructions](AGENTS.md) and [current handoff](CODEX_HANDOFF.md).
- [M2 conditional acceptance](docs/decisions/M2-HOSTED-CLOSEOUT.md) and
  [preserved evidence](docs/evidence/m2/acceptance-20261106/manifest.json).
- [M2.5 implementation/results](docs/decisions/M2_5-IMPLEMENTATION.md) and
  [preserved evidence](docs/evidence/m2_5/implementation/verification.json).
- [Roadmap](docs/14-CODEX-IMPLEMENTATION-ROADMAP.md),
  [deployment boundaries](docs/12-VERCEL-DEPLOYMENT.md) and
  [security/test evidence](docs/13-SECURITY-AND-TESTING.md).
- [Immutable V6 provenance](docs/reference/V6_SOURCE_MANIFEST.json), historical M1
  and reviewed current source inventory. Record current hashes only after reviewing
  intentional source changes; never rewrite original provenance to make checks pass.

Older handoff/first-task documents and numbered milestone sections are historical
where superseded by the current records. Production release is not implied by a
passing local build, a protected Preview, or this release-readiness work.
