# Cloud sync setup (Supabase, free plan)

Cloud sync keeps your tasks, archive, workspaces, documents and profile in your own Supabase project,
so every PC you sign in on has the same data. Changes on one open PC show up on the others
within a second or two. You do this once; about 10 minutes.

## 1. Create the project
1. Go to https://supabase.com and sign up (GitHub sign-in is fine). The free plan needs no card.
2. Click **New project**. Pick any name (for example `tasks`), set a database password
   (save it somewhere; the app doesn't need it), and choose the region closest to you.
3. Wait a minute or two until the project is ready.

## 2. Create the tables and the documents folder
1. In the left bar, open **SQL Editor** → **New query**.
2. Open `supabase/setup.sql` from this folder, copy all of it, paste it in, and click **Run**.
   You should see "Success. No rows returned". (Running it again later is harmless.)

## 3. Create your sign-in, and turn off sign-ups
1. Open **Authentication** → **Users** → **Add user** → **Create new user**.
   Enter your email and a password, tick **Auto Confirm User**, and click **Create user**.
2. Open **Authentication** → **Sign In / Providers**, turn off **Allow new users to sign up**,
   and save. Now nobody else can make an account in your project.

## 4. Send the two values to be built into the app
Click **Connect** at the top of the project (or open **Project Settings** → **API Keys** and **Data API**) and copy:
- the **Project URL**, like `https://abcdefgh.supabase.co`
- the **Publishable key** (`sb_publishable_…`; on older projects it's called the `anon` `public` key)

These go into `src/cloud-config.js`, so they're part of the app and no PC ever asks for them.
They're safe to ship: the publishable key can only do what the security rules allow.
Never use or share the **secret** (`service_role`) key. The app refuses it.

## 5. Sign in on each PC
In Tasks, click the cloud icon at the bottom of the left rail (or your avatar → **Cloud sync…**)
and sign in with the email and password from step 3. That's all a new PC needs.

On the first PC, everything on that PC (tasks, archive, trash, buckets, rules, workspaces and
documents) is uploaded. On your other PCs, do step 5 only. If a PC already has tasks of its own,
Tasks asks whether to **use the cloud's data** (recommended for a second PC) or **combine both**,
and saves a backup of that PC's data in the data folder first.

## Already set up before 0.19.13?
Run `supabase/setup.sql` once more (SQL Editor → New query → paste → Run). It adds the `profiles`
table for your name, photo, role, phone, status and time zone. Running it again is safe: your tasks
and documents aren't touched. Until you do, everything else keeps syncing and Settings → Cloud & backups
says the profile is waiting.

## Teams (0.20)
Taskit 0.20 turns your cloud into one shared team workspace. Do this once, then update every PC to 0.20.
1. **SQL Editor** → **New query**: paste `supabase/teams-0.20.sql` and **Run**. You become the Owner.
   PCs still on 0.19 stop syncing from here until they update; their changes wait on the PC.
2. **Authentication** → **Sign In / Providers** → **Google**: turn it on, paste the app's Google Client ID into
   **Client IDs** and the secret into **Client Secret (for OAuth)**, and save.
3. **Authentication** → **Hooks** → **Add hook** → **Before User Created** → Postgres → `public` → `gate_signup`.
   Only invited emails can make an account.
4. **Sign In / Providers**: turn on **Allow new users to sign up** (the hook keeps strangers out).
5. On GitHub, **Settings** → **Secrets and variables** → **Actions**: add the variable `GOOGLE_CLIENT_ID` and the
   secret `GOOGLE_CLIENT_SECRET`, so the Google sign-in is built into the app.
Then invite people in Settings → Members. They sign in with Google using the invited email.

## Delete rules and sign-up safety (0.20.3)
Do this once, any time after the Teams steps. Every PC on 0.20.3 or later handles it; older PCs keep working.
1. **SQL Editor** → **New query**: paste `supabase/delete-rules-0.20.3.sql` and **Run**. From then on Supabase
   itself makes sure members delete only tasks they made, nobody but the Owner and Admins changes who made a
   task, and only the Owner and Admins delete or overwrite team documents.
2. **Authentication** → **Sign In / Providers** → **Email**: turn on **Confirm email** and save. Without it,
   someone who knows an invited address could make a password account with it before the real person signs in.

## Clearing out old leftovers (0.20.3)
Do this once, after the step above. It keeps the database and each PC's sync file from growing forever.
1. **SQL Editor** → **New query**: paste `supabase/cleanup-0.20.3.sql` and **Run**. It adds a job that runs
   every night and removes two kinds of leftovers older than 90 days: the "this was deleted" markers of
   deleted tasks, and the notes about which PC ran which automation. Tasks that still exist are never touched.
2. To check: run `select * from cron.job where jobname = 'tasks-cleanup';` and you should see one row.
   To run it once by hand: `select * from public.cleanup_sync();` shows how many rows it removed.

A PC that was switched off for more than about 80 days compares everything again when it comes back, so it
still learns about tasks deleted while it was away. PCs older than 0.20.3 don't do this, so update them first.

## Minimum app version (0.21.0)
Do this once, any time. It's safe while PCs are still on older versions: it sets no minimum, so nothing changes yet.
1. **SQL Editor** → **New query**: paste `supabase/min-version-0.21.0.sql` and **Run**. You should see "Success. No rows returned".
2. To lock every PC older than a version (only once all PCs can update to it), run:
   `update public.app_settings set min_version = '0.21.0';`
   Taskit 0.21.0 and later lock and ask to update; older versions just show "Not syncing" until they update.
3. To turn the lock off again: `update public.app_settings set min_version = null;`
4. To check the current value: `select min_version from public.app_settings;`

The minimum can only be changed here, never from inside Taskit.

## Good to know
- Your data stays on each PC too, so Tasks works offline and sends your changes when you're back online.
- Each task syncs on its own, so working on two PCs at once is fine. If two people change the same task,
  their edits are merged field by field; only when both change the same field does the newer edit win.
- Timers are per person. A running timer belongs to the PC that started it: closing or shutting
  down one PC only stops the timers started there.
- Watch folders are paths on one PC, so each PC keeps its own list.
- Your profile syncs as one row. Your teammates can see it; only you can change it.
- Free plan limits: 500 MB of data, 1 GB of documents, files up to 50 MB. A free project is paused after
  a week with no use at all; open it at supabase.com to wake it up (your data is kept).
