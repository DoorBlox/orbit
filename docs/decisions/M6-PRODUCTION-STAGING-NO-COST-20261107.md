# M6 — protected Production staging without paid services (7 November 2026)

**Status: PRE-RELEASE; NO PRODUCTION PROMOTION OR ALIAS CHANGE AUTHORIZED BY THIS DOCUMENT.**

This records live controls and a safe final release route for ORBIT 1.0.0. It
supplements rather than rewrites earlier M3-era checklists. It does not enable
public viewing, alter Supabase RLS/Auth, or publish private journal data. The
canonical milestone sequence is M0, M1, M2, M2.5, M3, M4, M5, M6.

## Exact known identities and environment

| Item | Recorded result |
| --- | --- |
| Source | Public MIT repository `DoorBlox/orbit`; original app source/assets, not hosted user data |
| Final tested source at this checkpoint | `fc5af5a8cd2c99d1e104615e72c3cd2b460f60d6` |
| GitHub main quality | `42327185452` PASS at that exact SHA |
| Local SQL/HTTP RLS | `42326076564` PASS at reviewed PR #7 head (205 pgTAP, 7 visibility, 14 PATCH, 14 DELETE; 0 hosted requests; isolated fixtures unchanged) |
| Production-targeted offline artifact CI | `42326076634` PASS at reviewed PR #7 head with synthetic publishable key |
| Hosted nonowner bearer READ/INSERT | 7 zero-row reads + 7 POST/403, SQLSTATE 42501, verified against gateway logs and unchanged hosted row totals |
| Latest protected Preview | `dpl_CMBbJGs34mVQvwDXAQBwMmeoWhtQ`, `https://orbit-q85p9rojq-doorbloxs-projects.vercel.app/`, READY, `target=null` |
| Latest Preview owner experience | Owner explicitly confirmed successful sign-in and that workspace looked good; owner-attested, not an independently captured browser session |
| Supabase | `ixfgavgtwuzdgucjriec` at `https://ixfgavgtwuzdgucjriec.supabase.co` |
| Vercel project | `prj_FZH5dyyZvUXfVmTz04HBCMbIrQk5` (`orbit`), team `team_xHRnXQbjaIEx2rNZ94p5QBao` |
| Canonical site | `https://orbit.starscene.com/` |
| Deployment protection | Vercel Authentication `deploymentType=all` was rechecked; Supabase public workspace reads disabled |
| Owner backup | Offline JSON export saved, owner-attested; contents/restorability not inspected or uploaded |
| Auth redirect | Exact Production callback `https://orbit.starscene.com/` owner-attested added; provider flow for Production origin not independently tested |

**Critical preexisting Production binding:** Vercel reports older READY Production
deployment `dpl_89ozqhgtoJL6FRVSanpZ8gKNknZW`, named
`orbit-personal-dev`, created 2 November 2026, as the current deployment
associated with both `orbit.starscene.com` and `orbit.allintime.space`.
This is **not** the above `fc5af5a` release. Its provenance and functionality
as a rollback target have **not** been independently validated. Do not replace
the domain alias as a side effect of a routine deployment, and do not claim
Production is unpublished merely because project metadata reports
`live=false`.

## Security evidence interpretation

- The actual **hosted** nonowner bearer session has a validated owner-data
  visibility/INSERT boundary (7 GET-equivalent HEAD counts zero and seven
  rejected POSTs, corroborated in gateway logs).
- UPDATE and DELETE were exercised with actual nonowner bearer sessions on a
  **disposable local** Supabase stack, with both owner/nonowner synthetic fixtures
  present, and 14 PATCH and 14 DELETE requests changing zero rows. The SQL
  pgTAP suite also covered RLS privileges. This is strong end-to-end **local**
  evidence, **not** hosted bearer-token PATCH/DELETE evidence. Keep the
  distinction in any GO/NO-GO statement.
- Read-only hosted postflight after tests confirmed zero nonowner records in
  all seven owner tables, one temporary nonowner test Auth identity retained,
  and published content empty.
- The Supabase Security Advisor warns that leaked-password protection is off.
  **Official Supabase docs state this is Pro-plan-only.** Do not demand a paid
  upgrade from a free-plan owner to clear the warning. Mitigations: a long,
  unique owner password, restrictive provider/signup settings, private Vercel
  Authentication, and monitored login/access anomalies. Do not claim these are
  equivalent to the unavailable breached-password screening feature.
- Public GitHub source is intentional; MIT licensing does not grant anyone
  access to private Auth or workspace records. Never commit service-role keys,
  cookies, backups, owner journal text, or unredacted browser recordings.
- GitHub reports `main` not branch-protected. GitHub Free supports **public**
  repository rulesets. A repository administrator can create a `main`
  ruleset with required check names `static-quality`,
  `production-artifact-dry-run`, and `local-postgres-rls`, prevent branch
  deletion and force pushes, and require PRs; do not require a second reviewer
  if this remains a sole-owner repository. The connected GitHub app lacks
  permission to create the ruleset itself.

## Safe next Production steps — staged, never blind Preview promotion

1. **Verify target and cost boundary.** Verify the Vercel account's current
   plan/remaining included usage in the dashboard (do not assume from project
   metadata), exact team/project IDs, the `main` SHA, the installed Production
   `ORBIT_SITE_URL` / `ORBIT_SUPABASE_URL` / active publishable key match
   without disclosing key contents, and the exact CSP in `vercel.json`.
   No paid Supabase branch is required. No migrations are part of 1.0.0.
2. **Preserve existing aliases.** Record both canonical-domain alias records and
   old deployment `dpl_89ozqhgtoJL6FRVSanpZ8gKNknZW`. Use an authenticated,
   safely isolated **Production-environment staged deployment** that does NOT
   assign domains. Vercel officially documents
   `vercel deploy --prod --skip-domain` for this purpose, followed only after
   review by `vercel promote <deployment-url-or-id>`. The connected Vercel
   MCP `create_deployment` action has no `--skip-domain` equivalent; never
   call it with `target=production` merely to stage, since it could
   immediately switch the two existing custom domains. If using a GitHub
   Action/CLI, set the token as an environment secret **directly in GitHub**,
   pin the CLI version, require an authorized release environment, and never
   print that token.
3. **Inspect staged Production artifact.** The Production-target static guard
   must pass with genuine configured Production public inputs (not the CI
   synthetic key). Verify the staged deployment ID, SHA, no domain alias
   reassignment, Vercel Authentication active, security headers/CSP on the
   actual protected response, and expected Supabase API origin. Keep public
   source and private workspace separation.
4. **Human Production-environment smoke.** In authenticated owner and private/
   incognito sessions, verify the staged Production deployment respectively
   signs the owner into the private workspace and rejects unauthorized access.
   Record only success/status and commit/deployment identity; no private
   screenshots, HAR, email, passwords or journals. Browser smoke on the
   **canonical** Production URL after promotion is separate, because Auth
   redirects, cookie scopes and canonical hostname routing differ.
5. **GO/NO-GO decision.** Review any outstanding physical Safari/Android
   coverage; explicitly acknowledge if hosted PATCH/DELETE was not performed
   (the local bearer-session coverage exists); confirm local backup saved,
   old deployment provenance/rollback suitability, and the ability to
   restore original custom-domain aliases. Only then authorize promotion of
   **the exact staged Production build** to the canonical domain.
6. **Post-promotion checks and rollback.** Verify canonical
   `https://orbit.starscene.com/` under Vercel Authentication, owner sign-in,
   current same-SHA build, headers, and nonowner denial; inspect Vercel logs
   for errors. If any gate fails, revert the alias to the previously confirmed
   known-good protected deployment. **A code/alias rollback never restores
   deleted database content**; separate owner-controlled backup/restoration
   consent and fresh backups are required for data recovery.

This is a **zero-new-subscription** release route using already connected
services and public-repository CI, subject to the owner's actual free-tier
quotas. No paid Pro-only security feature or Supabase branch is needed to
follow it. Until staging and smoke evidence exist, **Production GO is not
attested**.

Useful official references:

- Vercel staging: https://vercel.com/docs/cli/deploying-from-cli
- Supabase password protection (Pro-only): https://supabase.com/docs/guides/auth/password-security
- GitHub Free public rulesets: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository
