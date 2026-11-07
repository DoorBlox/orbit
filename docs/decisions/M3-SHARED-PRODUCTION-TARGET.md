# M3 reviewed shared Preview/Production target

Owner architecture decision, 6 November 2026. Supersedes the earlier requirement
to select a separate Production project; historical evidence is preserved.

- Supabase project: `ixfgavgtwuzdgucjriec`.
- API origin: `https://ixfgavgtwuzdgucjriec.supabase.co`.
- Protected Production origin: `https://orbit.starscene.com`.
- Canonical application/redirect URL: `https://orbit.starscene.com/`.
- Scope: existing **single-owner private** workspace, public reads disabled.
  Multi-user isolation is future Issue #4, outside M3. No signup, Auth, RLS,
  schema, owner assignment or workspace data changes are part of this decision.

## Narrow source exception

`release/production-target.json` records the reviewed pair and the explicit
`m3-shared-private-2026-11-06` exception. The guard checks its decision, private
scope and exact API/site pair against the source-reviewed constants. The known
development origin remains in the exclusions list. Removing the exception or
changing its scope/project/site rejects the shared build. A general environment
flag, wildcard or unrelated project's exception cannot bypass the exclusion.
Complete inputs, private mode, HTTPS and exact CSP remain mandatory.

This is source preparation, not evidence of actual hosted configuration. No real
Production artifact or live request is produced by the synthetic-key tests.

## Production configuration requirements — verify before any live changes

| Setting | Required value / verification |
| --- | --- |
| Vercel target | Confirm actual ORBIT project and that `orbit.starscene.com` is its intended protected Production domain; no DNS/domain action implied. |
| Production `ORBIT_SUPABASE_URL` | `https://ixfgavgtwuzdgucjriec.supabase.co` |
| Production `ORBIT_SITE_URL` | `https://orbit.starscene.com/` (canonical trailing slash) |
| Production `ORBIT_SUPABASE_PUBLISHABLE_KEY` | Existing verified publishable key for this exact project, supplied through Vercel settings; no invented value, service-role key, or key in evidence. Preview scope is insufficient. |
| Public mode | `ORBIT_PUBLIC_RELEASE` absent or `false`; runtime `publicRelease:false`. |
| Protection | Vercel Authentication must cover Production including custom domain and deployment URL; verify incognito denial. Do not disable or alter protection. |
| Supabase Auth Site URL | Verify exact `https://orbit.starscene.com/`; document current value before any separately authorized change. |
| Supabase Auth Redirect URLs | Verify explicit `https://orbit.starscene.com/` is allowed; preserve required exact Preview URLs. No wildcard expansion. Password login alone is not redirect verification. |
| Signup/providers | Preserve existing single-owner controls; do not enable signups or introduce new providers. Verify current settings without modifying them. |
| Database | Verify existing owner UUID/public reads disabled/effective grants/RLS/RPCs on this same project; no reassignment/migration. Existing hosted read evidence retained, write evidence pending. |

The repository's unchanged global CSP is already the exact required policy:

```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://ixfgavgtwuzdgucjriec.supabase.co; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'
```

Verify the delivered header, not just the repository file. The existing inline
style allowance supports the native scrapbook; no new script or network allowance
is added. No realtime/WebSocket dependency is introduced.

## Shared-database operational constraints

Preview and Production write to the **same owner workspace**. Preview edits are
real data edits; neither origin is a disposable restore/seed environment. Their
browser sessions/storage remain separate, while cloud revisions/conflicts apply
across both. Preserve a private owner export and drafts before release; code
rollback does not undo shared data writes. Never restore or seed real owner data
as a smoke test. The prepared nonowner fixture plan still requires narrow mutation
authorization and administrator checks; shared target approval is not that consent.

## Current decision

**NO-GO for live Production changes or deployment.** Target selection is resolved.
Remaining gates: actual Vercel Production bindings/domain/protection and Auth URL
verification; appropriate hosted nonowner write/effective privilege evidence;
final-commit CI, real configured artifact verification and private backup/rollback
records. No live settings were changed. Physical-device tests remain unverified.
