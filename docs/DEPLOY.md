# V6: deployment plan (NOT DEPLOYED)

1. **User creates a private GitHub repository** or connects the GitHub app. Push the full modular project at repo root (`index.html`, `src/`, `assets/`, `vercel.json`). Do not push private journal exports, local JSON backups or tokens.
2. In Vercel, import the repository and use a **static Other** project / zero build command / root output (as supported by current Vercel setup). No Next.js migration is needed just to test the frontend.
3. Check the deployment's **access restrictions**. A private source repository does not imply a private hosted site. Treat the public prototype as a demo until access protection and proper identity are ready.
4. Test true HTTPS origin, persisted localStorage after reload, real iOS Safari/Android Chrome, touch pinch, editor input, downloads and JSON backup. Confirm real device reduced motion and browser errors.
5. **Before sensitive journal data or cross-device sync**, implement Supabase Auth + owner-specific Row Level Security, backups/migration, and well-defined data retention. Supabase service role key must never ship to browser.
6. Next move existing locally backed-up records into the authenticated database only after testing import and rollback.

The user's next requested phase after V5 is to try going online. Do not ask for passwords or API keys pasted into chat.
