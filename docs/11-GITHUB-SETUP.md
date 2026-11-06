# 11 — GitHub repository setup (human-controlled)

## Readiness

- Source tree includes original `index.html`, `src`, `assets`, examples, historical docs/tests, plus `scripts/`, schema, project docs and CI. No git remote has been created, no GitHub repository created, no push executed.
- `package.json` is native ESM with zero runtime npm dependencies; `package-lock.json` generated offline by npm 10; Node 22 pinned in CI. `.gitignore` excludes secrets, `node_modules`, `dist`, `.vercel`, generated screenshots, browser artifacts and personal backups.
- There is no LICENSE: project is private until the user explicitly chooses a license; adding LICENSE by assumption would be inappropriate.
- Keep older docs in `docs/` for traceability. The 15 numbered handoff docs and root `AGENTS.md` override historical V6 planning notes when in conflict.

## Procedure (run in user's local folder, not in this handoff environment)

1. Download `PROJECT_CODEX_HANDOFF.zip`, extract to a private local directory, open folder in VS Code/Codex.
2. Run `node --version` (22.x), `npm ci`, `npm run check`. Review `git status` before creating a repository.
3. On GitHub, create **new Private repository** named `orbit` (or user chosen); do not initialize with conflicting README/license when uploading existing source. Keep organization and permission choices private.
4. Locally:

```sh
git init -b main
git add .
git status --short
git diff --cached --stat
git commit -m "chore: preserve ORBIT V6 and add Codex production handoff"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_PRIVATE_REPOSITORY.git
git push -u origin main
```

Replace `YOUR_USERNAME` / `YOUR_PRIVATE_REPOSITORY` manually; those are **documented placeholders**, not existing resources. Never paste a token/password into ChatGPT or commit it. Use GitHub's supported credential manager.

## CI workflow

`.github/workflows/quality.yml` runs on push to main and pull requests: checkout (read-only token), setup Node 22, `npm ci --ignore-scripts`, syntax check, Node unit tests, static build, structural checks. There are **no database or Vercel secrets**. It intentionally does **not** auto-run migrations or manual Vercel CLI deployments. With Vercel Git Integration enabled later, Vercel itself builds previews and the production branch; coordinate release gates and branch protection.

## Repository policy recommendations

- Require CI quality before merge; enable branch protection/rulesets to the extent supported by your GitHub plan.
- Avoid direct pushes to main once deployed; work on `feat/*` branches, open PRs with screenshots and passing checks.
- Review third-party dependencies before adding; install only needed libraries and pin exact versions in lockfile.
- Use GitHub Actions default read-only `GITHUB_TOKEN`, no arbitrary PR-code execution with privileged secrets.
- Never store `.env.local`, Vercel team tokens, service-role keys, CSV with personal tasks, or journal backups in git history.
- Dependabot, CodeQL, or secret scanning can be enabled after reviewing plan and licensing; not claimed active.

## Pre-push commands

```sh
npm ci
npm run lint
npm test
npm run build
npm run verify:structure
```

Actual `git` repo initialization and CI execution require the user's GitHub setup. `CODEX_FIRST_TASK.md` begins with local verification, **not** a push.
