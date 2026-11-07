# ORBIT 1.0.0 private launch gates, backup and rollback

Production publication is authorized **only after every applicable gate passes**.
Public viewing stays disabled and Vercel Authentication stays enabled. This runbook
does not itself perform a deployment, schema change, Auth/RLS change or mutation.

## Gates before any build promotion

- [ ] Identify the exact Vercel project, protected Production origin and intended
  Supabase project. The reviewed shared project/site pair is recorded in M3-SHARED-PRODUCTION-TARGET.md; verify the actual Vercel project.
- [ ] In `release/production-target.json`, review canonical public API/site URLs,
  verify the reviewed shared exception and retain development exclusions. This is
  source metadata, not a secret store or proof of live settings.
- [ ] Verify **Production-scoped** ORBIT_SUPABASE_URL,
  ORBIT_SUPABASE_PUBLISHABLE_KEY and explicit ORBIT_SITE_URL exist and match the
  reviewed target. The owner confirms URL/key currently have Preview scope only;
  do not blindly promote that Preview; shared database approval does not verify Production-scoped bindings. Never store privileged keys in frontend.
- [ ] Review exact Production CSP connect-src to the chosen API while retaining
  private script/object/base/frame/form restrictions. Do not broaden to wildcards.
- [ ] Verify Production protection and current configuration through an authorized
  live session. Confirm incognito denial and exact Auth site/redirect entries.
  Password sign-in does not prove redirect or other-provider settings are correct.
- [ ] Confirm intended owner and disabled public reads on the **chosen project**,
  effective RLS/GRANTs/RPCs, and appropriate owner/nonowner validation. The project is now intentionally shared; retain the existing hosted read
  evidence without treating it as Production-origin/session verification. Hosted
  write cases require the separate safe-fixture plan and narrow authorization.
- [ ] Required CI/browser checks pass on the exact final release commit; retain
  run URL, head SHA and individual outcomes. M2.5 run `42199466081` passed at the
  older baseline; do not relabel it as M3 final-commit CI.
- [ ] Backup/export, recovery and rollback records are ready; physical-device and
  other unverified coverage are explicitly recorded with accepted scope limits.

## Artifact preparation, without deployment

After target/configuration review, provide public build inputs through the secure
environment settings or ephemeral shell environment; never paste secret values
into commands, chat or source. From a clean committed checkout:

```sh
npm run build:release
npm run verify:release > /tmp/orbit-private-release-verification.json
```

The same guard runs when Vercel invokes the ordinary build with VERCEL_ENV=production.
It refuses local fallback, unreviewed/mismatched targets, known development targets
without the exact owner-approved shared exception, and mismatched/weakened CSP **before replacing existing output**. Verification
reports version, source commit and artifact SHA256 inventory without the public
key; rejects extra files/symlinks/native or SDK drift. It does not attest live
Vercel protection, live RLS or Auth redirects. A clean artifact alone is not GO.

Current expected result: NO-GO, until required live configuration/security checks pass. The source target pair is now reviewed; offline synthetic-key guard tests pass. Do not disable the gate to make it pass.

## Private backup/export and recovery

1. Let pending writes finish, or privately export each unsaved conflict draft
   first. Record which session/revision is the committed source of truth.
2. Use the existing Export backup action in the verified owner session. Store
   the downloaded V6 JSON offline in encrypted storage under owner control;
   the export itself is unencrypted. Do not commit/upload/share it or a HAR.
3. Privately validate JSON format/version, entity IDs/counts, dated/formatted
   journal, milestones, layout and preferences against the intended workspace.
   Keep file hash/time/source revision privately, not personal content in logs.
4. A restore replaces cloud state. Do not test it on a real workspace. Use the
   existing synthetic/local fixtures or a separately approved isolated target;
   get explicit overwrite consent and another current backup before any live restore.
5. On conflict, preserve the losing draft before Reload cloud version. On an
   uncertain network ACK, read current server revision before retrying; aborting
   a request does not prove its transaction never committed.

## Gated publication and rollback

Only when the release decision records GO at the exact SHA and target may the
already authorized protected-private Production publication proceed. Build for
the verified Production environment; do not promote a development-configured
Preview or remove deployment protection. Do not merge, change DNS/Auth/RLS/schema
or seed live fixtures implicitly as part of deployment.

Before publication, record the known-good deployment ID/URL, code commit and
configuration target without credentials. If post-launch checks fail, stop further
edits and preserve drafts/evidence; restore the previously approved protected code
deployment through the authorized release channel. Reverify its original API/site
configuration and protection. No previous approved Production deployment is yet
identified, so do not invent a rollback deployment ID.

Code rollback does not revert database data or schema. No schema migration is part
of this candidate. Any data restore or schema rollback needs a separate reviewed
plan and authorization; never drop tables, reassign owner, weaken RLS or import an
empty snapshot to recover. Preserve the hosted temporary nonowner account.
