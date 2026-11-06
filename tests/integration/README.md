# Actual local Auth and HTTP integration

`run_http.py` runs real GoTrue, PostgREST and the pinned Supabase JavaScript SDK against a disposable database. It supplements `tests/db/run_local.py` and the browser suite using an injected SDK; it does not replace either.

Prerequisites:

- Node 22, `npm ci`, Python Playwright and `/usr/bin/chromium`.
- Managed local Docker socket `/var/run/docker.sock`.
- The synthetic `orbit-m2-local-postgres` PostgreSQL 15+ container used by the SQL harness, running and accepting trusted local test connections. This is a disposable test container, never a linked or hosted project.
- Pinned GoTrue `v2.197.0` and PostgREST `v14.18` images. The harness references their verified image digests; Docker can pull them through the environment's configured registry proxy. No full Supabase database image is needed.

From the repository root:

```sh
export PATH=/workspace/.orbit-environment/node-v22.23.4-linux-x64/bin:$PATH
python tests/integration/run_http.py
```

The runner creates only `orbit_m2_http_tests`, two named HTTP containers and `orbit-m2-http-network`. Services bind to loopback ports 55433–55435. It preserves inherited proxy settings, mounts the CA bundle read only, and uses no host networking. It generates synthetic signing material, passwords, identities and session tokens in memory; none are printed or written to fixtures. Temporary app output is isolated from the repository's `dist/`. Cleanup drops the dedicated database and authenticator role, removes the temporary containers/network and temporary build, even after a failed assertion. The existing PostgreSQL container remains available for other tests. Do not run concurrent copies of this runner because its disposable resource names are fixed.

Assertions cover actual Auth-created owner/nonowner identities; JWT-backed REST owner isolation for all seven populated private tables; atomic snapshot persistence and stale HTTP 409/PT409 responses; forged owner denial; two-session SDK conflict retention; default-off public projection, explicit publication and immediate unpublication; browser session restoration, task save/reload, journal propagation between independent Auth sessions, anonymous/nonowner private DOM denial and logout cleanup.

The harness exposed the documented [PostgREST 14 serialization-error retry loop](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions). The additive business-conflict migration uses `PT409` instead of raising deterministic `40001` errors. This suite checks the actual HTTP response, so a mock-only error mapping cannot hide that regression.

Email/password sign-in creates local synthetic sessions for the test. **Google OIDC, email delivery, hosted Auth redirects, hosted RLS settings and Vercel protection are not verified by this suite.** The Node test supplies known-safe synthetic HTML with an identity sanitizer; adversarial HTML sanitization is verified separately by the browser/security tests. Public reading is enabled only inside the disposable database for the projection assertion and reset before browser gating checks; no deployment is made public.

Container versions were checked against the [official Supabase Docker Compose](https://github.com/supabase/supabase/blob/master/docker/docker-compose.yml) on 1 November 2026. Existing signed-out and private fixture browser contexts are discarded after each run.
