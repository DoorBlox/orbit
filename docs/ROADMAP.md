# ORBIT — roadmap after 1.0.0

## In development — ORBIT 2.3, private source branch (9 Nov 2026)

- [ ] Verify authenticated blob media previews and error/retry states; detached image references remain undoable with original files preserved (#26, #29).
- [ ] Check Parchment / Night Garden / Frost workspace appearance and reduced-motion preference on 320px phones, 174% and 200% zoom, keyboard and large text; keep the pan-and-zoom world and six widget positions intact.
- [ ] Finish navigator cursor bounds and separate caption QA.
- [ ] Review exact-head CI, protected Preview and accessibility before an explicitly approved release.
- [ ] Later: real upstream Excalidraw editor island (journal and sticky), private reusable media library with safe deletion, task checklists, reminders and optional connected integrations. These are NOT in the current code slice.


**Updated 9 November 2026.** The original V1–V6 creative evolution and M0–M6 delivery sequence are documented in [PROJECT_HISTORY.md](PROJECT_HISTORY.md). This is a **possible follow-up backlog**, not an authorization to deploy or a promise of features.

## Shipped

- [x] One continuous glass/pastel spatial world with six independently movable/resizable windows.
- [x] Radial task branches, active/completed views, timeline/milestones, paper-like dated journal, backups and mobile-oriented navigation.
- [x] Owner-only private cloud persistence with Supabase Auth/RLS and revision-aware recovery.
- [x] Motion/accessibility fixes and browser CI; public MIT source and free disposable database security tests.
- [x] Owner-approved protected Production 1.0.0 on `orbit.starscene.com`; secondary hostname redirects to it.

## Next patch (2.2.1, source only)

- [ ] Close signed private-image display defect [#26](https://github.com/DoorBlox/orbit/issues/26) after exact Supabase-origin CSP change, approved deployment and real browser confirmation. Private Storage RLS stays unchanged.
- [ ] Ship independent draggable sticky **Copy** action and browser backup/persistence regression; preserve the private image reference, no duplicate file writes.
- [ ] Ensure four required PR checks pass on exact head; keep the existing live 2.2 Production alias until reviewed promotion.

## Near-term quality and operations

- [x] Main branch protection is active with PR-only merges, no force push and four required status checks.
- [ ] Perform a privacy-safe post-authenticated **Production response** header/CSP check; preserve Vercel Authentication.
- [ ] Record physical Safari/Android/touch, large-font/screen-reader and high-refresh-rate regression results.
- [ ] Improve owner backup discipline: encrypted offsite copy and a supervised restore rehearsal against disposable data.
- [ ] Consider narrow hosted PATCH/DELETE authorization validation only with approved synthetic fixtures, baseline and rollback.
- [ ] Revoke/rotate short-lived Vercel staging token when not needed.

## Future product options — require a new brief

- [ ] Structured rich-text editor replacing legacy formatting commands without losing diary compatibility.
- [ ] Optional snapping/collision aids and additional layout presets without abandoning freeform movement.
- [ ] Deeper timeline views (hour to years), reminders, calendar/Classroom integration or study sessions.
- [ ] Stronger accessible navigation, privacy controls and performance at extreme task density.
- [ ] Google-first 2.2 beta is in source development; complete OAuth owner setup, hosted multi-user isolation, private media validation and separately approved staged Production release. See [rollout](OAUTH_2_2_ROLLOUT.md).

For current operations, deployment and rollback use [OPERATIONS.md](OPERATIONS.md). The user prefers no paid services and the original six-window aesthetic should be treated as a binding product requirement.
