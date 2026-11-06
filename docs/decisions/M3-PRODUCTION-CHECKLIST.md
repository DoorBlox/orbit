# M3 concise protected Production checklist

Read-only verification first; no live changes or deployment are authorized here.
Shared Supabase project: `ixfgavgtwuzdgucjriec`. Site: `https://orbit.starscene.com/`.

- [ ] Confirm actual ORBIT Vercel project/domain binding and Production-scoped
  `ORBIT_SUPABASE_URL=https://ixfgavgtwuzdgucjriec.supabase.co`,
  `ORBIT_SITE_URL=https://orbit.starscene.com/`, and the existing project's verified
  publishable key. Never record key values in evidence. Preview scope is insufficient.
- [ ] Confirm public mode remains absent/false and Vercel Authentication covers both
  the Production custom domain and deployment URL; incognito access is denied.
- [ ] Verify Supabase Auth Site URL exactly `https://orbit.starscene.com/` and explicit
  allowed redirect `https://orbit.starscene.com/`. Preserve required exact Preview
  redirects. No wildcard expansion, signup/provider changes or new users.
- [ ] Confirm delivered CSP matches the unchanged repository policy, including
  `connect-src 'self' https://ixfgavgtwuzdgucjriec.supabase.co`, `script-src 'self'`,
  `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, `form-action 'self'`.
- [ ] Approve/apply only the reviewed grant correction and verify read-only postflight;
  current owner remains configured and public reads disabled. No schema/RLS change.
- [ ] Approve/run scoped nonowner fixture CRUD validation, verify baseline unchanged
  after probes and zero fixture rows after cleanup. Preserve the test Auth account.
- [ ] Retain final-SHA CI PASS, real configured artifact verification, private owner
  export/drafts and known-good rollback deployment record. Keep physical-device
  coverage explicitly unverified. No blind Preview promotion.

See [target/security requirements](M3-SHARED-PRODUCTION-TARGET.md),
[grant review](M3-LEAST-PRIVILEGE.md), [fixture validation](M3-HOSTED-WRITE-VALIDATION.md)
and [backup/rollback runbook](M3-LAUNCH-RUNBOOK.md). Multi-user Issue #4 is outside M3.
