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

## Good to know
- Your data stays on each PC too, so Tasks works offline and sends your changes when you're back online.
- Each task syncs on its own, so working on two PCs at once is fine. If the same task is changed on
  both at the same moment, the newer edit is kept and you see a notice.
- A running timer shows on every PC, but it belongs to the PC that started it: closing or shutting
  down one PC only stops the timers started there.
- Watch folders are paths on one PC, so each PC keeps its own list.
- Your profile syncs as one row. Anyone signed in to your Supabase project can see it, which today is only you.
- Free plan limits: 500 MB of data, 1 GB of documents, files up to 50 MB. A free project is paused after
  a week with no use at all; open it at supabase.com to wake it up (your data is kept).
