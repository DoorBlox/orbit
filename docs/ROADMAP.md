# ORBIT — roadmap after 1.0.0

**Updated 8 November 2026.** The original V1–V6 creative evolution and M0–M6 delivery sequence are documented in [PROJECT_HISTORY.md](PROJECT_HISTORY.md). This is a **possible follow-up backlog**, not an authorization to deploy or a promise of features.

## Shipped

- [x] One continuous glass/pastel spatial world with six independently movable/resizable windows.
- [x] Radial task branches, active/completed views, timeline/milestones, paper-like dated journal, backups and mobile-oriented navigation.
- [x] Owner-only private cloud persistence with Supabase Auth/RLS and revision-aware recovery.
- [x] Motion/accessibility fixes and browser CI; public MIT source and free disposable database security tests.
- [x] Owner-approved protected Production 1.0.0 on `orbit.starscene.com`; secondary hostname redirects to it.

## Near-term quality and operations

- [ ] Add a free public-repository `main` branch ruleset with required checks and no force pushes (admin action).
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
- [ ] Multi-user support only under an explicitly separate architecture/security project; **not** a default extension of 1.0.0.

For current operations, deployment and rollback use [OPERATIONS.md](OPERATIONS.md). The user prefers no paid services and the original six-window aesthetic should be treated as a binding product requirement.
