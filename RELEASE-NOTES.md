A tune-up: safer saves, faster long lists, and sync that double-checks.
- Safer saves: every save is written to a spare file first and the previous copy is kept, so a crash or power cut mid-save can't empty your list. A damaged file is reported, with a choice to bring tasks back from the cloud or a backup, and nothing is overwritten while you decide. Only one copy of the app runs at a time.
- Backups: restoring checks the whole backup before anything changes, and the cloud can no longer undo a restore. A safety backup is taken before the first sync on a PC.
- Sync: if many tasks disappear at once, sync holds the deletion until you press Sync now. PC clocks that are wrong no longer decide which edit wins. A PC that was away for months catches up on tasks deleted meanwhile. Someone removed from the team is signed out right away, and a teammate's profile change updates only that person.
- Deleting: Members can delete only the tasks they made; Admins and the Owner can delete any. Supabase now enforces this, not just the app.
- Automations: deadline automations run again when a deadline moves, time-based ones run in every workspace, and archiving and Trash cleanup happen once for the team instead of once per PC.
- Undo: undo and redo only touch what you changed, even when a teammate edits the same task in between.
- Speed: a running timer redraws only its own clock, saving is lighter, and the task table shows 150 rows at first and adds more as you scroll. Watch folders notice new files right away instead of on a timer.
- Sign-in and privacy: your sign-in is stored encrypted by Windows instead of as plain text (you stay signed in after updating). Quick capture runs with fewer permissions, and the app can only save files where you chose in a save dialog.
- Log folder: Settings > Cloud & backups has a Log folder button, so problems can be sent to us.
- What's new: slides move on by themselves after 6 seconds while the bar at the top fills (hold the mouse down to pause). A fixes release like this one gets one short slide with no screenshots.
- Updates: the app checks for a new version every 6 hours, not only at launch. GitHub builds an installer only when the version number is new, and runs lint and tests on every push.
- Supabase: run supabase/delete-rules-0.20.3.sql once and turn on Confirm email, before or right after updating. After every PC is on 0.20.3, run supabase/cleanup-0.20.3.sql once (it clears deleted records older than 90 days each night). No tables or columns change. Steps are in CLOUD-SETUP.md.
- Not yet tested on real Windows: the single-copy lock, restore, quick capture, the save dialogs (backup, timesheet, weekly report, Save a copy), watch folders, and staying signed in after the update. Please check them after updating.

A Documents library with a reader, a borderless look, Inter, and a softer dark mode.
- Documents library: the page opens as a table grouped by status (Approved, In review, Draft, Outdated), each group folds. Columns: document, status (click to change), linked tasks (first task plus a count), size and updated. Pointing at a row shows Open, Save a copy and Delete (red on hover). The file type tabs only show when the folder has more than one file type.
- Clean titles: names like "68-kaufes-sow-item-verification-EN.pdf" show as "SOW · Item Verification". The leading number, the word most names start with, language codes, version tags and the extension are dropped from the label only. The real file name shows on hover and in the details panel, and search still matches it.
- Reader: click a document to read it. Library (or Esc) goes back. The list on the left is grouped the same way and can fold into a narrow rail. One slim bar holds find, open, save, link and more. Details (linked tasks, file name, type, size, versions, Delete) open from the panel button and stay hidden until you open them.
- Borderless look: no outlines on cards, buttons, fields, chips, menus or dialogs, one shared set of styles. The task table keeps faint row lines and solid column lines.
- Font: Inter for text, Geist Mono for numbers.
- Softer dark mode: the page is #1A1A1A instead of #0A0A0A, with cards, fills, menus and lines one step lighter each.
- Supabase: no SQL changes and no new synced data. The library's folded groups, the rail and the details panel are remembered on each PC only.

Taskit is a team app: invite people, see Tasks for me or everyone's, and sign in with Google.
- One team workspace: everyone shares the same tasks, buckets, platforms, documents and automations, synced live. Your watch folders, theme, sidebar pin and notification choices stay personal.
- Members: Settings > Members lists the team with role, teams and access. Invite people takes emails, a role, teams and Member or Admin. Only invited emails can sign in, and no email is sent, so the ⋯ menu copies a heads-up message. The Owner and Admins can change or remove people, and someone removed is signed out right away.
- Access: Members can create and edit any task and delete the ones they made. Admins also change statuses, buckets, automations, platforms, teams, roles, column names and team settings.
- Roles & teams: a new Settings page where the Owner and Admins add, rename or delete teams and job titles. Deleting one in use asks where its people and tasks go.
- For me / Everyone: click the title on Tasks to see Tasks for me (your teams plus anything that's yours), Everyone, or one team. Ctrl + 1 and Ctrl + 2 switch. Tasks get a Teams field, and the assignee is picked from a searchable list of members.
- Sign-in: Continue with Google, then a short first run to confirm your name, photo and time zone, and a three-step tour for your team (skippable, replay from ⋯ > Team tour). Email and password still work for the Owner.
- Sync: two people editing the same task merge field by field instead of the newer one winning. Time-based automations run once for the team, not once per PC. Timers and time logs are per person. Undo only reverts your own changes. Notifications are personal and only for your tasks and teams. Teammates download documents when they open them; the Owner keeps a full copy.
- Fixes: the Cloud sync box no longer stays on the project screen after Next.
- Supabase: run supabase/teams-0.20.sql once, turn on the Google provider with the app's Client ID and secret, add the Before User Created hook (public.gate_signup), and allow sign-ups. Steps are in CLOUD-SETUP.md. PCs still on 0.19 stop syncing once the update is run, until they update; their changes wait on the PC.
- GitHub: add the GOOGLE_CLIENT_ID variable and GOOGLE_CLIENT_SECRET secret under Settings > Secrets and variables > Actions, so the Google sign-in is built in.

See what added tasks cost a bucket, and move its end in one click.
- Impact: a bucket's Scope section now turns the time spent on tasks added after it started into working days (8 hours a day, Monday to Friday), for example "Added tasks took 14h, about 2 working days".
- Suggested end: when the end date hasn't moved far enough to cover that time, it says how many days short it is and offers "Move end to …". Nothing moves on its own. Pressing it moves the end, logs the move against the original end like any other, and can be undone from the toast.
- Weekly report: Scope changes adds the working days next to the time spent on added tasks.
- Supabase: no SQL changes and no new fields. Moving the end is a normal bucket edit and syncs as before.

A new top of the window, new Filter and Sort, movable columns, more automations, and smoother motion.
- Title bar: the Windows title bar is gone. A slim top row shows the workspace and page, the cloud status, and the app's own minimize, maximize and close buttons (close turns red on hover). Drag the row to move the window and double-click it to maximize. Close still hides to the tray when that setting is on. Pointing at maximize no longer shows the Windows 11 snap layouts; Win + Z and dragging to a screen edge still snap.
- Page header: every page has a big title and summary, with search, the theme button, ⋯ and Create task on the right. The theme button switches light and dark in one click; Match Windows is in Settings > Appearance.
- Timers: running timers moved from the sidebar to a green pill next to search, so long times are no longer cut off. Click it to pause one timer or all of them. With one timer it shows the task's name, and the menu adds Open task. In a narrow window the pill keeps just the dot, the time and the arrow.
- Filter: a new menu with a search box and Bucket, Platform and Deadline, each with checkboxes and open-task counts. Typing searches all three and Enter picks the top match. Filters of the same kind share one chip, like "Homepage +2", and + Filter offers only the ones you aren't using. Deadline has a new choice, No deadline.
- Sort: works like Filter. The button turns blue with a count once you change the sort, and each rule is a chip under the toolbar that you can click to change, with Reset to go back to Deadline.
- Columns: drag a heading in the task table left or right to move it (Esc cancels), or use Move left / Move right in the heading's menu. The Columns button lists them in their order, and "Show all, reset widths and order" puts everything back.
- Automations: new triggers (a timer starts, a timer runs longer than some hours, a task has been in a status for some days), new actions (pause its timer, set its priority), and "Only if…" lines so a rule runs only for matching tasks. New ideas at the bottom use them.
- Full text on hover: any text cut off with "…" shows in full in a tooltip after a short pause, everywhere in the app. An item's own hint shows as a second line.
- Platform chips: in the task table a platform is just its icon, and opens to show the name when you point at it.
- Motion: menus, dialogs, the task panel, toasts and the light/dark switch ease in and out over 150–200ms. Typing, dragging and scrolling stay instant, and nothing animates when Windows is set to reduce motion.
- Supabase: no SQL changes. Filters, sort and column order stay on each PC, as before. New automations sync like the others, but a PC still on 0.19.13 shows them switched off and doesn't run them, so update all your PCs and switch the new automations on or off only on updated ones.
- Not yet tested on real Windows: the new window buttons and dragging the top row. Please check them after updating.

A new Settings with your profile and status, platform icons, and time summary tiles.
- Profile: a new Profile page in Settings, with your photo, display name, role, phone, status and time zone (from this PC's clock). It syncs to your other PCs. Members, beside it, lists everyone in your workspaces, which for now is just you.
- Status: click your photo at the bottom of the sidebar for the new menu with your status, Profile, Settings, workspace switching and Sign out. Pick Available, Busy, Do not disturb or Away, add a note and choose when it clears. Do not disturb mutes alerts.
- Hover card: point at your photo next to a task to see your name, role, status, local time and email.
- Settings: pages down the left (General, Appearance, Notifications, Shortcuts, Workspace, Watch folders, Cloud & backups, About), one short line per setting with longer help behind ⓘ. Notifications moved here from Automations and are stored and synced as before.
- Edit statuses: a quieter layout. Each group has a + by its name, counts are plain numbers, and the arrows, lock and delete show only on the row you point at.
- Manage platforms: click a name to rename it in the list (Enter or clicking away saves, Esc undoes). The count sits on the right and turns into the bin when you point at the row.
- Platform icons: click a platform's icon to pick one from a searchable grid. Platforms you haven't changed keep the folder. The icon is saved on the platform, which already syncs.
- Delete, remove and trash buttons turn red when you point at them, everywhere in the app.
- Time summary: a row of tiles with time tracked today and this week, then your top platforms and their share of the week.
- Light and dark: switching spreads as a circle from the button you clicked (also from Settings and Shift + D).
- Supabase: your profile syncs through a new `profiles` table. If your cloud was set up before this version, run the updated `supabase/setup.sql` once (it's safe to run again). Everything else syncs as before.

Status and priority chips, a hover sidebar, no tabs, and grouped Automations.
- Status and priority: both are colored chips in the table, list and board. Status has a colored dot, and priority has bars, with High in red.
- Sidebar: the left rail is a slim row of icons that opens with page names when you point at it and closes when you move away. The panel button at the top keeps it open; that choice stays on this PC.
- Tabs: the tab bar is gone. A task opens in the side panel, and Ctrl+click or middle-click does the same. An old "open in new tab" setting now opens the panel.
- Cloud sync note: beside the page title, a quiet note says when your work was last saved to the cloud, or that you're offline. Point at it to sync again now; click it to open cloud sync.
- ⋯ menu: grouped into Automations, Statuses and Platforms; Time summary, Archive and Trash; then Settings, Keyboard shortcuts and What's new. Automations shows how many are on, and Time summary is a switch.
- Automations: grouped by the event that sets them off, written as a sentence. One event can do several things, each step can be switched on or off, and Ideas at the bottom add common ones.
- Notifications: several of the same kind arriving together become one, like "12 tasks are overdue", naming the first few.
- Messages (toasts) now use Sonner for their animation and stacking, and look exactly as before. Undo is still on the message, and the update card has its own spot at the bottom left.
- Scroll bars: a thin, faint line that follows the theme, a little wider while scrolling and wider still when you point at it. Long windows fade at the edge when there's more to see.
- Fixed: Automations can assign to a new person again (type a name and pick Assign to it), on task and bucket automations.
- Fixed: the time summary showed twice on the Tasks page.
- Fixed: a scroll bar could stay wide and bright after the pointer left the window.
- Fixed (sync): when a PC came back online, an older copy of a task or setting could arrive after a newer one and be kept, leaving that PC out of date, and an edit there could put the old content back everywhere. Each PC now ignores any copy older than the newest it has seen.
- Nothing new to set up in Supabase: no SQL changes, and nothing new is synced. The sidebar pin stays on each PC.

Quick capture is a plain solid panel, with no glass.
- Quick capture: the frosted glass is gone. The window is a solid panel in the app's colors, with a thin border and rounded corners, so it reads the same over any background.
- Everything else works the same: the Bucket and Platform buttons, @ and #, the Inbox or Open hint, and Enter to save.
- Settings: the Frostiness and Translucency sliders under Quick capture glass are removed.
- Nothing changes in what's saved or synced.

The Frostiness slider visibly changes quick capture.
- Quick capture: Frostiness used to only switch the blur on or off, plus a faint haze, so moving it barely showed. Now the haze and grain grow clearly as you slide it, and from 50% up Windows uses its heavier, grainier Acrylic blur instead of the light blur. At 0 the glass is clear.
- Settings explains what Frostiness does under the slider.

Quick capture glass reads well over any background, and its corners are clean.
- Quick capture: dark glass over a bright window (or light glass over a dark one) no longer turns a washed-out grey with faint text. The glass never goes fully see-through, and grey text inside it is brighter with a soft shadow.
- Quick capture: the rounded corners no longer show a lighter sliver where Windows' cut and the drawn corner differ.
- Translucency now starts at 40% instead of 55%. If you moved the sliders before, press Reset under Quick capture glass in Settings to get the new default.

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
