> M3 target update: the owner explicitly approved shared Supabase project
> `ixfgavgtwuzdgucjriec` for `https://orbit.starscene.com/`. See the
> [exact configuration/security requirements](decisions/M3-SHARED-PRODUCTION-TARGET.md).
> Source preparation does not verify actual Production settings or permit changing them.

# 12 — Deployment boundaries and historical preparation

## Current state — 6 November 2026

The owner reports M2.5 GitHub Actions passed and a protected Preview is deployed.
M2 is accepted for the protected private password workflow. Auth, owner-restricted
RLS and snapshot synchronization are implemented; do not interpret the historical
M1 instructions below as current absence of authentication or as permission to
provision/redeploy. Main remains unmerged by this agent.

Current builds include native app modules plus one bundled SDK boundary. All three
allowlisted public configuration fields are required for a cloud artifact; absent
fields intentionally produce a local prototype. No populated configuration or
privileged credential is needed to read this guide. Keep public reads disabled,
protection intact, and the existing development target separate from Production.

The owner supplied authoritative issue #2 scope and conditionally authorized
protected-private Production publication after all release gates pass. Merges,
Auth/RLS/DNS/protection changes and live mutations are not implicitly authorized.
Production URL/key currently have Preview scope only per owner finding; reviewed
Production target/configuration and redirects remain unverified. M3 adds a fail-closed
Production build guard; do not blindly promote a development-configured Preview. This guide does not perform any of them.
Completed tests/evidence must not be repeated merely because historical checklists
below still use pre-M2 language. See M3-READINESS-CHECKPOINT.md in decisions/.

## Historical M1 deployment hold

The locally verified static artifact is prepared for a future protected preview, not deployed. `vercel.json` now sets `git.deploymentEnabled: false` to prevent review pushes/PRs from launching automatic deployments. No project settings changed. Review [the protected-preview checklist](decisions/M1-PREVIEW-CHECKLIST.md) before separately authorizing any deployment; do not remove the hold as part of routine source review. CSP is local-only until future Auth/cloud allowlists are explicitly reviewed.


## Confirmed stack configuration

- Framework preset: **Other** (static HTML/JS, no React/Next).
- Root directory: repository root (`.`).
- Install: `npm ci` (valid lockfile, zero runtime packages).
- Build: `npm run build` (explicit in `vercel.json` because this is a custom static build).
- Output: `dist` (also explicit in `vercel.json`). Only `dist/index.html`, original V6 browser modules/CSS in `dist/src`, and `dist/assets` are served; inactive cloud adapters are deliberately excluded, preventing exposure of `docs`, `supabase`, `tests`, `.env.example` and archives.
- Routes: root `/` serves index; no client router or rewrites; `index.html` contains relative imports.
- Security headers: original `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` retained. Strong CSP requires a separate dynamic-HTML/inline-style audit before enabling.
- Node version: select Node 22 in Vercel project settings. CI also uses Node 22.

Official references: [Vercel configuring builds](https://vercel.com/docs/builds/configure-a-build), [Git deployments](https://vercel.com/docs/git), [Deployment Protection](https://vercel.com/docs/deployment-protection), [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Personal privacy gate BEFORE any online preview

The V6 frontend is static and has **no authentication**, so a deployment would otherwise be publicly viewable. Before linking/triggering Git Integration, configure **Vercel Authentication** with scope **All Deployments**, then confirm in an incognito session that the site prompts for an authorized Vercel account. Per Vercel's September 9, 2026 changelog, All Deployments protection is now offered for Vercel Authentication on all plans; always verify current account availability rather than assuming settings are active. A private GitHub repo by itself does not protect the deployed URL. This Vercel protection is a temporary/extra deployment boundary, NOT a replacement for Supabase Auth/RLS when cloud data is enabled.

## GitHub-to-Vercel steps

1. Have a **private** reviewed GitHub repository from `docs/11-GITHUB-SETUP.md`.
2. In Vercel, **Import Git Repository**; verify account/team, repo, project name and production branch before clicking Deploy.
3. Set Framework: Other, Root: `.`, Node: 22. `vercel.json` specifies build command/output; avoid redundant and conflicting dashboard overrides.
4. Configure Vercel Authentication → All Deployments (under Security/Deployment Protection). If UI doesn't let you preconfigure before first build, do not share the resulting URL until protection is enabled and tested; use empty demo content only.
5. Push a feature branch/PR to inspect a preview. Do not enter private journal entries until Supabase Auth+RLS and deployed secure storage have been tested.
6. Test offline sample map, widget dragging/resizing, constellation, journal, timeline, CSV backup, 320/390px phone, Firefox/Safari as available. Check JS console and 404s.
7. Only merge/promote to production after explicit user approval; production URL is not proof that product features are ready.

## Environment variables

**Now:** none required. `.env.example` contains names for future Supabase client integration but current `npm run build` ignores them. Never create fake values and call them working.

**Future:** `ORBIT_SUPABASE_URL`, `ORBIT_SUPABASE_PUBLISHABLE_KEY` (both safe-to-expose by design under RLS), `ORBIT_SITE_URL` exact HTTPS URL. Implement an allowlisted public config generator (current static JS has no `import.meta.env`) and a secure client. Secret/service-role keys may only be used in separately authorized server contexts and are NOT required for this MVP.

Supabase Auth URL config requires production site URL plus explicit preview/local callback URLs; test magic-link callback with exact URLs. Limit preview wildcards. Never log email tokens or access tokens.

## Production/preview isolation

Use separate Supabase development and production projects when available, or validated branch configuration. Preview deployment must not write into private production data. Never run a production schema migration as a Vercel build step. Plan a reviewed manual migration phase ahead of release.

## Production checklist

- [ ] Repo private; tests and lockfile valid, no secrets tracked.
- [ ] Deployment Protection **All Deployments** confirmed, incognito access denied without Vercel login.
- [ ] Auth/RLS implemented if real diary is used, cross-user isolation validated.
- [ ] Redirect URLs/cookies/OTP flow verified on exact deployment URL.
- [ ] No sample content erroneously uploaded to private account.
- [ ] Vercel build log and static asset routing checked; no 404s.
- [ ] Physical iPhone/Android, desktop Safari/Chrome, keyboard, reduced motion tested.
- [ ] Backups/restores verified on sanitized staging fixture, no journal text in logs.
- [ ] Monitoring and rollback pathway tested, owner explicitly approves release.

## Rollback

For simple static changes, restore last known-good Git commit through reviewed PR/branch or Vercel's deployment rollback; for DB changes, **do not** assume code rollback reverts schema. Use backward-compatible expand/contract migrations and a documented data recovery plan. No rollback deployment has been performed.
