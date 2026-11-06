# ORBIT ROADMAP (as of V5)

- [x] V1: first radial tree and task capture.
- [x] V2: Apple-design mobility/accessibility cleanup.
- [x] V3: free-depth hierarchy, light glass, plain task text and inline details.
- [x] V4: separate task/timeline representations using shared data; ambient field and completed-task history.
- [x] V5: transform all modules into movable widgets on one panning/zooming spatial world; persistent positions, spatial navigation; complete first functional journal with autosave, rich text, pages, deletion/Undo and Markdown export.
- [ ] Deploy private project via GitHub and Vercel; manually inspect on real mobile browsers.
- [ ] Establish authenticated production data with Supabase RLS and migrations; connect existing JSON backups safely.
- [ ] Replace legacy rich-text command API with Tiptap/ProseMirror, strengthen journal accessibility and large-font layout.
- [ ] More fluid drag/snapping/collision prevention and user-selected widget placement presets.
- [ ] More advanced timeline: hour→decade zoom, sessions vs deadlines vs milestones, history correlations.
- [ ] Reminders, Google Calendar/Classroom integrations, configurable Pomodoro, study criteria and retrieval practice support.
- [ ] Full accessibility audits (screen readers/keyboard/safe areas), extreme task-density performance, journal encryption/key management exploration.


## V6 delivery checkpoint

Window header drag, resizable widgets, milestone bounds fix, editable journal dates and timeline page links are implemented in the local prototype. **Next approved goal** is to try going online: first protect a Vercel preview associated with a private GitHub repository, verify real-origin persistence and phone interaction, then add authenticated Supabase storage for sensitive diary content. Do not conflate a private GitHub repository with a protected website.
