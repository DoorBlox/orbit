# W6 — bounded owner/device acceptance protocol

**State: NOT REQUESTED.** W6 must first verify a currently protected Preview with the **exact reviewed source SHA** and completed synthetic CI coverage. This document is a reusable safe protocol, **not** an instruction for the owner to start testing on an old Preview.

## Current evidence restriction (12 November 2026)

Read-only connected Vercel project `orbit` (`prj_FZH5dyyZvUXfVmTz04HBCMbIrQk5`) reports `ssoProtection.enabled=true` with `deploymentType=prod_deployment_urls_and_all_previews`. Latest listed READY protected Preview is `dpl_8eBFFLzLHa1Vz1edQG5wqXmL5Eb7`, `https://orbit-83nft6djg-doorbloxs-projects.vercel.app/`, source `01c153d6b2f4a13e105404e78fd2f520158db688` — **older than the W6/other current main source**. Last listed Production-target deployment `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4` maps to source `4e57aca785259192b92010c5d0e1634a4c1efe14`; this read-only listing does not independently prove today's canonical alias target. **Do not claim PR #165/#168 is on either deployment.** No release was triggered.

## Before any human request (W6 and W4)

Record and check: (1) protected URL, (2) deployment ID, (3) exact Git SHA, (4) READY state, (5) SSO/deployment-protection policy, (6) four exact-head PR checks and a passed standalone W6 browser suite, (7) synthetic browser defects resolved or separately tracked. Never ask owner to run tests solely to collect evidence already available from CI.

## Owner checklist template — send only after that gate

Once an up-to-date protected Preview is verified, provide the **real URL, SHA and deployment ID** instead of placeholders. In a *disposable or clearly identified test workspace*, using only names like `W6 TEST TASK`, `W6 TEST JOURNAL` and a self-created nonpersonal small PNG:

1. **Cloud reload:** edit a dummy task, short Journal entry, Sticky note and private Project brief. Wait for **Saved to your cloud**; reload and confirm all four survive with their original layout. If the status remains “Not saved”, stop before signing out and export the dummy backup.
2. **Offline recovery:** while already signed in, disconnect network, make a new clearly marked dummy edit, reconnect; verify it eventually reports saved and persists after reload. If there is a conflict, export the dummy draft rather than deleting/replacing anything.
3. **Private images:** attach the disposable PNG to Journal and Sticky and, if the Preview supports it, the official Excalidraw canvas. Confirm visible pixels after save/reload (not just a filename); export portable `.orbit` backup containing private image bytes.
4. **Nondestructive restore:** only in a fresh *disposable* target workspace, review the exported dummy archive and restore. Verify text and image pixels. Never overwrite an actual diary or use a personal archive for QA.
5. **Privacy and mobile:** from an already controlled second test account (if available), confirm other-account private media cannot be opened; test phone/physical touch pan, minimap navigation, Focus enter/exit and return. Anonymous visitors must see sign-in/public-only content, never the test journal. No bypass of deployed authentication or attempt to guess private URLs.

**Report only:** device model, OS/browser versions, source SHA, per-step PASS/FAIL/NOT TESTED, concise expected vs actual, and whether an error occurred. Optional screenshot/short clip must show **dummy data only**, with emails, tokens, OAuth fragments, address bar query strings, signed image URLs, notifications and private images removed. Do not send passwords, credentials, Storage URLs, browser console session dumps or real journal content.

**Limits:** This owner checklist cannot authorize hosted Auth/RLS/Storage changes, destructive cleanup, Production deployment, alias switching, paid services or private-to-public publication. Those gates remain with W4/Command HQ and the owner. OWNER TESTING REQUIRED is distinct from PASS and VERIFIED; report only cases actually tested.
