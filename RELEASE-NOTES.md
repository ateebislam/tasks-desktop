Quick capture glass shows properly on Windows: rounded, with no dark square or white outline.
- Quick capture: the rounded glass bar no longer sits on a dark square-cornered rectangle, and the thick white outline and the old-style "Quick capture" title bar that could appear are gone. The window now has no frame of its own at all.
- Quick capture: the blur behind the glass now follows the rounded shape, and works on Windows 10 as well as Windows 11. Frostiness at 0 turns the blur off for clear glass.
- Nothing changes in what's saved or synced.

Quick capture is made of glass, with sliders for how frosted and how see-through it is.
- Quick capture: the floating window is now frosted glass. On Windows 11 the app behind it shows through, blurred, with a bright edge, a soft sheen and well-rounded corners. 
- Quick capture: bigger text, and Bucket and Platform buttons along the bottom. Click one to open the same list as typing @ or #. What you pick shows on the button, with × to remove it. Click it again to change it.
- Quick capture: the bottom right says where the task will go, Inbox or Open (a task with a platform goes straight to Open).
- Settings: new Frostiness (clear to frosted) and Translucency (solid to see-through) sliders under Quick capture glass, with a live preview and Reset. Changes apply to an open quick capture window straight away.
- These two settings stay on each PC, like the theme and the shortcut. Nothing new is synced and there's nothing to set up in Supabase.
- Quick add inside the app (`) keeps its current look.

What's new has a new layout.
- The title and text are on the left in big type, and the screenshot sits on the right, larger and easier to read.
- Back and Next use the same buttons as the rest of the app, and a bar at the top shows where you are.

What's new after each update.
- After an update, a short tour opens once with what changed since the version you used before, one page per feature with a screenshot. Use Next and Back or the arrow keys, and Got it to close it.
- Open it again any time from the ⋯ menu (What's new) or the command palette.
- A brand-new install with no tasks skips it.

Cloud sync keeps every change when two PCs edit at the same time.
- Buckets, automations, task statuses, platforms, documents without a task and workspaces now sync one item at a time, like tasks already did. Two PCs changing different buckets at once both keep their change. Before, the whole list was one record and the newer save replaced the other.
- Settings and column names sync one setting at a time, so changing the archive days on one PC and a column name on another keeps both.
- A reorder (for example of task statuses) ends in the same order on every PC.
- Changes from your other PCs are taken in one at a time, in the order they arrive, so two arriving together can no longer undo each other.
- Nothing to do in Supabase: no new SQL. Existing data moves over by itself the first time each PC syncs with 0.19.4.
- PCs that haven't updated yet keep working and still see every change. Update all your PCs soon: a PC on an older version still saves whole lists, so a change it makes at the exact same moment as another PC can still be lost, as before.

See why buckets keep growing: tasks added after a bucket starts are tracked, with the reason and the days they cost.
- Added later: a task that joins a bucket after its planned start day (created in it or moved into it) counts as added later. Tasks added on the start day, and tasks made by bucket automations, still count as planned.
- Reasons: the task panel shows an "Added later" row on those tasks. Pick Bug, Change request, Missed requirement or Other, or "Part of the plan" if it shouldn't count. You can also set it from the bucket's panel.
- A heads-up appears when you add a task to a bucket that has already started, and it warns you if the bucket now ends later than planned.
- Original end: when a bucket's start day arrives, its end date is kept as the original end, and every later move of the end is logged. Edit bucket shows the original end, and you can correct it. A bucket moved back into the future starts over.
- Buckets list: a chip shows how many tasks were added and how many days the end moved. It turns amber with a warning when added tasks come with a later end, or when the bucket is past its end with open tasks.
- Bucket panel: a new Scope section with tasks planned at start, tasks added later, days moved, a breakdown by reason, the time spent on added tasks, the history of end moves, and the list of added tasks with their reasons.
- Timeline: the part of a bar past the original end is striped amber, with a dashed line at the original end and a +days label.
- Weekly report: a new Scope changes section lists, for each bucket under way, what was added (and how much this week) by reason, the time spent on it and how far the end moved. A Pattern box shows, across all your buckets, which reason brings the most added work and which is behind the buckets that slipped. Switch it off if you don't want it in the copied report.
- Buckets that had already started before this update use their current end as the original end, and tasks created after the start day count as added later.

A weekly report for your product owner, built from your tasks and timers.
- Weekly report: a new Report page on the rail (or "Go to Weekly report" in the command palette) puts this week's update together for you, grouped by bucket.
- Done this week lists the tasks marked done this week, with the time spent on each. In progress lists tasks that are In progress or Blocked, or that you tracked time on this week, with how far along they are (checklist steps), the time this week and the deadline. Next week lists open tasks due by the end of next week (overdue ones too), plus the next bucket in sequence and its tasks.
- Each bucket shows how many of its tasks are done and when it ends, or when it starts for the next bucket.
- Edit it before you send it: add a short summary at the top, click any line to reword it, hover a line to add a note or remove it, and add your own lines to any section. Your edits are kept for each week on this PC. Reset rebuilds the report from your tasks.
- Copy it for email or Teams (keeps the headings and bullets), as plain text, or as Markdown, or save it as a .md or .txt file. The Time switch leaves the times out.
- Last week and the arrows show earlier weeks.

Quick capture picks buckets and platforms, and the side rail loses its stray scrollbar.
- Quick capture: type @ to pick a bucket and # to pick a platform from a list (arrow keys, then Enter or Tab). What you pick shows as a chip under the text, with × to remove it. Esc closes the list without closing quick capture.
- Quick capture: a task that gets a platform goes straight to Open, the same as accepting it from the Inbox. Without one it still lands in the Inbox.
- Quick capture: the box is wider and grows as you type, up to 30% of the screen height, then scrolls. The same box is used for Quick add (`) inside the app.
- Side rail: no more horizontal scrollbar at the bottom. On a short window the rail still scrolls up and down, just without a visible bar.
- Cloud sync: the cloud icon drifts gently while it's syncing or connecting, and sits still once it's up to date.

Cloud sync: use Tasks on any of your PCs, with the same tasks and documents everywhere.
- Cloud sync: click the cloud icon at the bottom of the rail (or your avatar → Cloud sync…) and sign in with your email and password. Your tasks, buckets, rules, workspaces, archive, trash, time history and documents are kept in your own Supabase project. CLOUD-SETUP.md explains the one-time setup.
- On the first PC you sign in on, everything is uploaded. A PC that already has tasks of its own asks whether to use the cloud's data or combine both, and saves a backup first.
- Changes on one open PC show up on your other PCs within a second or two. Each task syncs on its own, so working on two PCs is fine. If the same task is edited on both at once, the newer edit is kept and you see a notice.
- Your data stays on each PC too, so Tasks works offline and sends your changes when you're back online. The cloud icon shows the state: green up to date, blue syncing, amber offline.
- Timers: a running timer shows on every PC but belongs to the PC that started it, so closing or shutting down one PC only stops its own timers.
- Watch folders, theme and shortcuts stay separate on each PC.

Timers stop when Tasks closes, and bucket deadlines can be set earlier.
- Timers: closing Tasks (the window's X, Quit in the tray, or installing an update) stops every running timer and saves the time up to then. Next time you open Tasks, it lists the tasks whose timers were paused, with Resume for each one, Resume all, or Keep paused.
- Timers: if the PC shuts down or Tasks doesn't close normally, the timers stop at the last moment Tasks was known to be running (it checks in every 30 seconds), and you get the same list.
- Deadlines: a task in a bucket with a timeline is due on the bucket's end date by default, and follows it when the timeline moves. You can now pick an earlier date from the table or the task panel. Days after the bucket ends are crossed out, and "Bucket end" puts the deadline back on the end date. If the timeline moves earlier than a date you picked, the deadline moves back to the new end.

Edit bucket statuses, and let a bucket's timeline set its tasks' deadlines.
- Buckets: rename, recolor, reorder, add and delete bucket statuses. Open it with the sliders button next to the status tabs, or "Edit statuses…" in any bucket's status menu. Done always stays (you can rename and recolor it). Buckets in a deleted status move to the first one left, and you can undo it.
- Deadlines: when a bucket has a timeline, every task in it is due on the timeline's end date. The deadline shows a lock and can't be edited. It moves when you move or resize the bucket on the timeline. Remove the task from the bucket (there's a button for it when you click the deadline) to pick your own date again.

Plan buckets on a timeline, search inside documents, and run timers on several tasks at once.
- Buckets: a new Timeline view (switch between List and Timeline beside the search) shows each bucket as a bar from its planned start to its end, in work order. Drag a bar to move it, drag its edges to change the dates, or click an empty row to plan two weeks. The arrow keys also move the selected bar. Edit bucket now has Planned start and end dates, and both views sort by planned start.
- Documents: search now looks inside PDF, Word, HTML and text files too. Results split into Names and Inside documents and show the matching lines (with the page for PDFs). Click a line to open the document at that match. Ctrl+F finds text in the open document.
- Timers: you can have several tasks In progress, each with its own timer running. Starting a timer no longer pauses the others, and moving a task to In progress no longer blocks the one before it. With more than one timer running, the rail timer shows a count, and clicking it lists every timer so you can pause any of them or pause all. Home and the command palette list every running timer, and the idle prompt covers all of them.
- Settings: turn on "One task at a time" to go back to a single running timer and auto-blocking.
- Today and the Timesheet count each task's time separately, so an hour spent on two tasks at once shows as 2h.

A new look across the app: a side rail, one bar per page, full-width responsive layouts, and better Documents.
- Navigation moved to a slim rail on the left with Home, Inbox, Tasks, Buckets, Docs and Time, each with a count badge. The running timer sits at the bottom of the rail: click to pause, right-click to open the task.
- Tasks, Buckets, Documents and Timesheet share the same header: the page title with a short summary, then one bar with filter tabs on the left and the page's search and controls on the right.
- Tasks: Filter (bucket, platform, deadline) and Sort and display sit beside the status tabs. The overdue and due-this-week links next to the title filter the list, and active filters show in a strip you can clear.
- The Grouped view shows each task's full title on the first line and its status, platform, bucket and priority on the second.
- The app now uses the full width of the window. Grouped cards, Board columns, the Buckets panel and the Documents list adapt to the window size.
- Documents: every document has a status (Draft, In review, Approved or Outdated). Change it from the picker next to the name or press 1 to 4, and filter by it with the Status chip.
- Documents: merge several files into one document with versions (⋯ menu or Shift+U). Similar names are suggested; drag them into order, oldest at the top. Task links move over and you can undo it.
- Documents: double-clicking a document shows it in the app instead of opening it in Windows, and clicking a new document clears its "new" mark.
- Documents no longer create tasks. Add documents on their own, then link them to tasks.
- Home is a command center: type in the box (press / or Q) to find tasks, buckets and documents. Enter opens, Shift+Enter starts the timer, Tab captures to the Inbox.
- Create task (or N) fills in the status, bucket and platform from where you are, and everything saves as you type. In the task panel, Alt+S, B, F, L, P or A jumps to a field.
