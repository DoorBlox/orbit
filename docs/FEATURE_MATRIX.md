# ORBIT 1.0.0 — feature and verification matrix

**Updated 8 November 2026.** This replaces the V6-only "Auth not implemented" matrix. Product features below describe the reviewed, owner-confirmed **single-owner protected Production** experience, not an independently certified multi-user platform.

| Feature | State | Evidence / scope |
| --- | --- | --- |
| One continuous zoomable/pannable spatial canvas | Implemented | V6 layout preserved, browser suites and owner Preview/Production smoke |
| Six draggable/resizable glass widgets | Implemented | Constellation, timeline, active, completed, personal space and journal; keyboard/pointer/touch |
| Radial arbitrary-depth task graph | Implemented | Shared task/branch models; active tasks and completed-state separation |
| Timeline, deadlines, milestones and journal markers | Implemented | Date-keyed journal links and dedicated marker lanes |
| Rich-text dated journal, undo and Markdown export | Implemented | Sanitized HTML, user editable `YYYY-MM-DD` journal date, autosave |
| Full JSON backup/restore and V5/V6 compatibility | Implemented | Owner attests offline backup saved; file integrity/full cloud restore not independently tested |
| CSV import/export | Implemented | Source tests and import validation |
| Mobile spatial navigator, pinch, reduced motion | Implemented | Simulated Chromium profiles and M2.5 motion tests; real device coverage still incomplete |
| Protected owner password sign-in | **Live** | Owner-confirmed canonical Production sign-in; server Auth + owner RPC + RLS |
| Cloud persistence, revision conflicts and recovery | **Live** | Owner acceptance and browser/local HTTP suites; hosted conflict save scope recorded in issue #2 |
| Anonymous Vercel access gate | **Enabled** | All-deploy project protection; pre-promotion two-host anonymous 302 checks |
| Hosted nonowner READ and INSERT isolation | **Passed** | Seven zero-row HEAD and seven POST 403/42501; gateway/SQL corroboration |
| Hosted nonowner PATCH and DELETE | **Not independently run** | 14+14 **local** bearer HTTP denials with unchanged synthetic fixtures |
| Public content publishing / multi-user accounts | **Disabled / out of scope** | Private single-owner release; public-read flag false and published table empty at last audit |
| Google OAuth and Email OTP delivery | Optional integration code present, **not certified** | Password flow is release-supported path |
| Actual hardware Safari/Android/120 Hz / AT audit | **Not certified** | Responsive browser simulation is not physical hardware |
| New rich-text editing engine, reminders and calendar integrations | **Not delivered** | Separate future proposals, not promised as 1.0.0 functionality |

The complete verified/owner-attested distinction lives in [PROJECT_HISTORY.md](PROJECT_HISTORY.md) and the [operations runbook](OPERATIONS.md). Public MIT source and private user content remain separate.
