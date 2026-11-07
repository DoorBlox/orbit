# M3 focused release security audit

6 November 2026 (Asia/Jakarta). Source review plus retained M2/M2.5 evidence and
new release-guard tests. This is not an independent live Production assessment.

| Boundary | Actual finding/evidence | Disposition |
| --- | --- | --- |
| Production configuration | Before the fix, `VERCEL_ENV=production` with no cloud fields returned null/local mode. The owner confirms cloud URL/key are configured for Preview only. | Fixed build-time fallback defect with failing-then-passing tests. Production now requires complete inputs and reviewed target/CSP; remains blocked until real configuration is verified. |
| API target/CSP | Repository CSP currently permits only the development Supabase origin. The owner now explicitly selected the same project for `https://orbit.starscene.com/`. | Reviewed metadata and a narrow exact project/site exception now permit intentional sharing. Live bindings/Auth/protection remain unverified; CSP is unchanged. |
| Auth/owner access | AuthController verifies getUser then requires RPC data exactly true; generation/owner-epoch guards prevent stale hydration; logout/revocation clears private view and aborts client work. | Existing Auth/unit/browser evidence retained; no Auth behavior/settings changed. A new Production origin still needs actual redirect/session verification. |
| Expiry/drafts | Auth errors fail closed. Cloud drafts are session-memory data, not guaranteed durable storage. Pending logout warns and export is available. | Documented lifetime limit; do not claim provider-outage or expiry recovery from ordinary offline tests. No plaintext persistence feature added. |
| RLS/RPC source | Seven workspace tables combine per-row UID policies with restrictive configured-owner policies. Public payload RPCs are invokers; two private boolean helpers are definers with empty search_path. | Hosted read denial and metadata evidence passed; hosted write denial not executed. Owner identity is not inferred from metadata/email. |
| Effective grants | Owner reports live direct TRUNCATE/TRIGGER/REFERENCES grants to authenticated on seven private tables. RLS does not constrain TRUNCATE. PR comment inaccessible here; no new live query claimed. | Confirmed release gate. New narrow migration revokes only these privileges, checks effective rights/retained CRUD atomically, and passes local SQL/Auth/API regressions. Not applied live. See M3-LEAST-PRIVILEGE.md. |
| Snapshots/conflicts | Atomic snapshot RPC locks revision, rejects stale bases with PT409, checks deferred relations and returns a new revision. Client queue retains conflict drafts; stale read/save guards protect newer input. | Existing real local SQL/Auth/API concurrency and browser evidence retained; Production parity is unverified. |
| Keys/artifacts | Only allowlisted public configuration reaches output; legacy service-role/privileged keys rejected. New verifier hashes all output, compares native files and rebuilt SDK, and requires clean committed CLI verification. | No credential value printed or archived. Release target metadata contains public origins only. |
| Journal/imports | Allowlist DOM reconstruction strips active content/attributes; safe HTTP(S) links, sanitized load/save/render/import boundaries, strict backup validation and recovery originals are present. | Existing adversarial paste/corruption/quota/restore tests retained and final browser regression selected. Server storage alone is not sanitization proof. |
| Backups/rollback | V6 export includes full workspace; import replaces cloud state and requires consent. Code rollback cannot restore erased data or revert schema. | New runbook forbids blind restore/empty snapshot/destructive rollback; export and validate privately before any separately approved restore. |
| Dependency/signature audit | Latest locked-dependency audit reports zero known vulnerabilities; credential signatures have no matches. | Limited evidence, not a universal security guarantee. Lockfile dependency versions are unchanged; only root release version changes. |

The Production fallback fix is locally complete. The newly reported live excess
grants are unresolved on hosted Supabase until the reviewed correction is authorized
and applied. This does **not** establish Production GO: required live configuration,
write-isolation and final CI evidence remain explicit gates. App HTML/CSS/native
modules, Auth, cloud logic, historical SQL migrations and current source manifest are unchanged
from accepted M2.5; build tooling and release metadata are the intentional changes.

The new target guard prevents reviewed builds from silently using known development
origins. The existing local/Preview build modes remain supported. Unit tests use
synthetic keys and offline artifacts to exercise success/failure paths, including
the reviewed shared pair; no live Production connection is made. No live database mutation, protection bypass or schema change
was needed for this audit.
