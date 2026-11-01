# M1 protected-preview readiness

The static artifact can be built locally with Node 22 and `npm ci && npm run check`.
No application secrets or runtime npm packages are required. The app is still local-only.

Automatic Vercel Git deployments are explicitly disabled in `vercel.json` with
`git.deploymentEnabled: false`. This prevents the review branch/PR from initiating
an unintended preview if Git integration is connected. No deployment is authorized.
See [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration).

Before any future deployment:

- Review/merge the M1 PR only when approved; merging is separate from authorizing deployment.
- Select the exact Vercel account/project/repository and verify the target with the owner.
- Enable Vercel Authentication for All Deployments and verify denial from an incognito browser.
- Use synthetic demo content only. Private repository visibility does not protect the app URL.
- Use Framework Other, root `.`, Node 22, `npm run build`, output `dist`.
- Confirm the artifact contains only active public browser files; no docs, SQL, backups, env files or inactive cloud adapters.
- Only after a separate deployment approval, intentionally remove the automatic-deployment hold or use an approved protected deployment workflow.
- Verify HTTPS routing, assets, storage origin, keyboard/touch flows, data export/import and console/network failures on that protected URL.
- Record commit, target, URL, protection evidence and rollback version. A static rollback must preserve localStorage/backups.

Not yet verified: hosted build, preview URL, protection settings, real-device Safari/Android,
Auth/RLS, cloud sync and production rollback. M1 does not make a private production diary.
The build-readiness specialist's read-only project lookup returned no linked project in
its accessible Vercel scope; it did not prove absence across inaccessible accounts/teams.
