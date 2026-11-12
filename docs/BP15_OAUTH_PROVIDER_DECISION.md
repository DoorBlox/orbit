# BP-15 — OAuth provider choice for ORBIT's private MCP (Nov 2026)

**Decision: prefer Supabase's supported OAuth 2.1 server plus user-scoped RLS for the eventual hosted integration, subject to explicit owner approval and a full token/RLS compatibility audit. Do NOT replace the already-reviewed ORBIT JWT verifier or enable OAuth on the hosted project yet.** The runnable local MCP fixture uses synthetic RSA access tokens and does not claim Supabase OAuth interoperability.

## Evidence (official documentation, verified 12 Nov 2026)

- [Supabase OAuth server](https://supabase.com/docs/guides/auth/oauth-server) is **Public Beta**. [Getting started](https://supabase.com/docs/guides/auth/oauth-server/getting-started) states available on all Supabase plans with no separate OAuth feature charge; OAuth sign-ins count toward monthly active users. Admin enablement, dynamic registration and consent frontend are separately configured.
- [OAuth flows](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows) implement authorization code plus PKCE and refresh tokens; `client_credentials`/password grants are not offered. Standard scopes are `openid`, `email`, `profile`, `phone`. **Custom application scopes are currently unsupported**. OAuth access tokens retain the user's ordinary data reach, with a `client_id` claim that RLS policies can use to narrow client access.
- [BYO MCP](https://supabase.com/docs/guides/ai-tools/byo-mcp) supports protected-resource discovery and `withSupabase({auth:'user'})` middleware returning a user-RLS-scoped client; prerequisites include asymmetric JWT signing keys (ES256 or RS256), OAuth enablement, dynamic registration and an existing-user consent screen. For ChatGPT custom connectors, a public HTTPS URL is required; not authorized here.
- The existing W4 verifier from PR #131 accepts **RS256 only**, `typ=at+jwt`, a precisely pinned issuer and audience, exactly `scope=tasks:read`, authenticated UUID subject, and a signed `grant_epoch` claim validated against the coherent revocation projection merged in PR #140. Actual Supabase OAuth tokens must NOT be assumed to meet these claims, signing algorithm, token type or audience. This is an incompatibility to resolve explicitly, not an invitation to loosen verification.

## Compared choices

| Criterion | Supabase OAuth 2.1 + delegated user RLS | Build ORBIT-owned OAuth server and grant store |
| --- | --- | --- |
| Standards and maintenance | Supported beta implementation of PKCE, refresh and client registration | Must implement, maintain, rotate and audit all of OAuth + discovery |
| Fit existing owner Auth | Reuses current Supabase Google login users | Needs identity federation/issuer boundaries or a separate account system |
| Custom tasks:read / grant_epoch | Not emitted by default; requires a carefully scoped adapter and RLS client policy | Can mint exactly the existing restricted JWT contract |
| Private database access | User token + RLS if ALL relevant table policies filter client_id and owner | Requires verified delegated user access; NEVER use a universal service-role key |
| Cost | No separate OAuth feature fee documented; MAU/bandwidth/compute quotas apply | Hosting, security operations and engineering cost |
| Release risk | Public beta, hosted settings, signing-key migration and user-wide RLS audit before enabling | Greater protocol, credential and maintenance blast radius |
| Rollback | Disable registered clients/grants, revoke tokens; preserve existing login/recovery | Disable server, revoke signing keys and grants; independent recovery plan |

**Preferred hosted design:** First prove tokens against a disposable Supabase environment, not the existing Production project; inspect exact token format, issuer/JWKS, client ID, role, audience and refresh semantics. Use official protected-resource metadata and user-scoped middleware, and ensure ALL Supabase data surfaces accessible by an OAuth token are additionally restricted by client-specific RLS: permitted `tasks` and branch reads only, no journal, media, arbitrary SQL, writes or storage escape. A token with ordinary Supabase user permissions must not grant broad access simply because MCP offers three read-only tools. Bind each request to a coherent issuer/owner/client/resource grant and current epoch/revocation. W1 must review all SQL/RLS and user identity propagation. W3 owns the visible consent/revoke UI. A dedicated token-exchange/profile adapter would need separate documented threat analysis and authorization; **never automatically accept ES256 or drop audience/scope/epoch requirements to make a hosted OAuth token pass**.

## Source-first milestones / owner gates

1. The zero-external-service local MCP fixture (BP-15 local vertical slice) gives a reproducible real TCP demonstration using synthetic tokens and two isolated account records.
2. Prove the official modern MCP SDK client and inspector protocol behavior in disposable local tests. Fully implement authorization-server discovery/challenge and JSON-RPC transport responses.
3. Agree with W1 on a complete RLS audit for every user-accessible table/storage path; no service-role short circuit. Agree with W3 on exact consent screen and revocation UX. Validate dynamic client registration and anti-redirect abuse.
4. Only with separately scoped owner permission: enable hosted OAuth, signing-key settings, SQL/RLS, deployed MCP function, custom connector registration, protected Preview tests with two real users and staged/Production release.

No hosted mutation, credential, paid service, public endpoint or user-private data operation was performed by this decision file.
