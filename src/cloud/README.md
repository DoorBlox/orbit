# Cloud integration boundary (NOT ACTIVATED)

`client-config.js` validates **future public-only** Supabase configuration. `mappers.js` is a tested, synchronous mapping layer between the actual V6 in-memory models and the proposed SQL rows. Neither module is imported by `src/app.js`. There are no authentication requests or database writes today.

During Codex Milestone 2/3:
1. Install and pin `@supabase/supabase-js` through npm; commit updated lockfile.
2. Generate a **public-only** browser configuration at build time, or adopt an equivalent safe approach. Static `import.meta.env` is NOT available in the present native ES-module build.
3. Add sign-in/session UI with Supabase Auth, avoid auto-creating demo tasks on a real account, and block the app's private view until session restoration completes.
4. Add repositories for `branches`, `tasks`, `journal_entries`, `milestones`, `widget_layouts`, `preferences`; do not replace `src/app.js` wholesale. Use schema constraints + owner-specific RLS; handle conflict and offline states.
5. Sanitize journal HTML on every ingestion path and before rendering. Replace deprecated `execCommand` with a structured editor in a separate reviewed change.
6. Migrate an explicitly selected local JSON backup only after user review and full validation. Never silently upload existing `localStorage`.

**Use zero service role or secret keys in a browser**, including build-generated files. These adapters are a preparation step, not production auth.
