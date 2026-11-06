# ORBIT product specification — V5 spatial scrapbook

## North star

A private, eventually secure, beautifully legible interactive map of the user's roles, intentions, projects, executable next actions, time, personal reflections, and unstructured playful life. The **whole** remains available while attention may be placed on **one** thing. The app must not equate productivity with personal worth.

## Invariants

- Single boundless-feeling 2D coordinate plane: all widgets are free-floating entities, not fixed sections or grid panels. Drag to rearrange; widget coordinates persist. Spatial overview/minimap as navigation rather than tabs or menu overlays.
- Atmospheric animated background throughout, rendered behind all content. Respect reduced motion, high contrast, and transparency reduction; glass legibility beats decorative blur.
- A radial, unconstrained-depth mind map centered on HISYAM. Tasks are terminal, vertically stacked plain text; their color and sort represent chosen urgency or deadline. Clicking a parent focuses that region; dragging is elastic but released structures return to their resting layout. Completed tasks omitted from active graph but retained in archives and timeline.
- All tasks in an independently sorted active widget, separate completed widget, shared underlying records. One task can have criteria, description, effort, due date, urgency, resource links and status.
- Timeline with horizontal zoom and draggable scrolling, deadline markers, life milestones, and completed tasks (prototype only).
- WYSIWYG paper journal, multiple pages, private reflection without score/streak. Markdown export; page creation, navigation, deletion/Undo, autosave. Never show Markdown syntax in normal editing mode.
- Quick task capture requires only name, parent inherited from selected branch; additional fields progressively revealed.
- Working on mobile and desktop, keyboard operable, touch friendly and performance conscious.

## V6 visible modules

Constellation map; Continuum timeline; Things to do; Already done; Your space/backup; The journal. All six are spatial children of the same world with saved coordinates.

## Data models

`Branch(id,parentId,label,color?)` / `Task(id,title,projectId,criteria,description,dueDate,urgency,effortMinutes,status,resourceUrl,createdAt,completedAt?)` / `Milestone(id,title,date)` / `JournalEntry(id,date,title,html,createdAt,updatedAt)` / `WidgetLayout(widgetId,x,y,width?,height?)` / `Preferences(colorMode)`.

## Next milestones

Publish protected preview to Vercel through private GitHub; test persistence on true origin; implement secure multi-device sync with Supabase and Row Level Security; replace legacy contentEditable formatting with Tiptap structured JSON; notification and classroom integrations later. Journal content must not be uploaded to any public database or unprotected route.


## V6 additions (binding)

**Window interaction:** any unused portion of a widget title bar, including heading text, is draggable; action buttons remain operable. All widgets must be resizable by pointer/touch via a discoverable corner and by keyboard arrows. Persist both world positions and sizes; full JSON backup/restore preserves them, while old V5 backup restores sensible defaults. Do not resize contents by screenshot scaling: internal text stays legible.

**Time-journal relation:** timeline displays deadlines above axis, milestones below axis, and actual dated journal pages below milestones. The marker must always lie within scrollable bounds, even when the timeline has its smallest permitted window size. A date with multiple pages groups their markers. A click brings the user to the matching journal page. Journal date field is editable and uses a civil date, with older ISO data normalized in Asia/Jakarta. Do not show a timeline journal pin for untouched empty pages.

**Mobile:** ensure minimal floating controls do not overlap paper titles or text. The spatial navigator collapses to a small compass until requested on narrow widths. Real-device testing pending.
