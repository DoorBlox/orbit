# M1 targeted frontend security review

Scope: local browser persistence, JSON/CSV import, rich text, recovery records and build output.
No Supabase/Auth or deployed service was exercised. This is not a complete penetration test.

## Fixed and verified

- A single malformed task no longer substitutes demos for saved data. Recoverable records remain in memory while original raw storage is protected from ordinary writes. Malformed branches, preferences, journal and layout also have recovery guards. Only explicit local Backup exports raw recovery data; it is not logged or sent to a server.
- Backup validation happens before state replacement: V5/V6 version, entity/ID uniqueness, hierarchy/parent references, dates, counts and finite layout values. Unknown layout keys (including prototype-related keys) are rejected. Journal import requires the existing allowlist sanitizer.
- Restoration serializes and captures originals before any data write. A write-ahead recovery record enables in-process rollback and startup recovery after interruption. Rollback failures retain originals and prevent ordinary overwrites. This is recoverable multi-key localStorage, not a transaction or cross-tab concurrency protocol.
- CSV rejects duplicate normalized headers, omits excess-width rows, validates resource URLs and neutralizes spreadsheet prefixes including minus and leading whitespace/control characters. Ordinary quoted/multiline values roundtrip. Dangerous formula text intentionally gains a leading apostrophe; no spreadsheet application was launched.
- Clipboard paste is cancelled, sanitized and inserted with selection handling before unsafe HTML reaches the live editor. Chromium regression verifies safe formatting, removal of event attributes/executable URLs and no payload execution. Stored/rendered/imported journal content is allowlisted as before.
- Static HTTP and Vercel configuration use a local-only CSP: self scripts, no eval, no network connections, no objects/frames/base injection. Inline styles remain necessary for the existing spatial positioning. Future cloud integration must deliberately review the CSP allowlist.
- Dist is an allowlist copy of active HTML/JS/CSS/SVG only. Inactive cloud adapters, docs, SQL, backups and environment files are excluded. Limited credential signature scan passes; its scope is not a whole-history secret audit.
- Original V6 manifest and blobs are verified from the pinned Git commit; the separate reviewed M1 inventory rejects changed or unexpected source files. Tests explicitly demonstrate tampering rejection.

## Evidence

`npm run check` (49 test results), `python tests/qa_m1.py`, inherited `qa_v6.py`, HTTP/origin tests,
handoff verifier and credential signature scanner passed in the managed runtime.
Pure changed data/recovery modules measured 95.69% line / 85.17% branch coverage;
this excludes DOM modules and is not a whole-application coverage percentage.
See [implementation evidence](M1-IMPLEMENTATION.md).

## Remaining limits and release gates

- localStorage and downloaded backups are plaintext, per origin. Existing app still has no login, owner authorization or remote persistence. Auth and independently tested RLS remain release blockers for private cloud use.
- Legacy `execCommand` remains, and the sanitizer has targeted tests rather than comprehensive mutation-XSS fuzzing. CSP is defense in depth, not evidence of cloud journal security.
- Multiple tabs/devices can overwrite one another; there is no optimistic concurrency or sync. localStorage itself cannot provide crash-proof transactions or persist a draft when browser storage is wholly unavailable. In-memory drafts and explicit export are recovery paths.
- A recovery marker duplicates original data and can fail on quota. Such failure rejects restoration before replacing data. If rollback also fails, retain/export the recovery record before retrying on a working storage origin.
- No physical-device, full screen-reader, comprehensive contrast/text-scale, hosted isolation, live CSP or deployment-protection certification. Do not enter private data in an unprotected preview.
