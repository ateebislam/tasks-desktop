# Setup guide

This takes about 45 minutes the first time, most of it waiting. Everything here is free,
and no step asks for a credit card. If a screen looks slightly different from what's
described, the services have probably renamed a button; look for the closest match.

You'll do three things:

1. **Get the installer** by letting GitHub build it for you (Step 1).
2. **Create your Google sign-in key** (Step 2).
3. **Install the app and sign in** (Step 3).

---

## Step 1: Get the installer

There are two ways. **Option A is easier**: GitHub builds the installer on its computers,
so you don't install any programming tools.

### Option A: Let GitHub build it (recommended)

1. Unzip `tasks-desktop.zip` somewhere you can find it, for example your Desktop.
2. Go to **github.com** and create a free account (or sign in).
3. Click the **+** at the top right → **New repository**.
   - Name: `tasks-desktop`
   - Choose **Private**, so only you can see it.
   - Leave everything else as it is and click **Create repository**.
4. On the next page, click the link **uploading an existing file**.
5. Open the unzipped `tasks-desktop` folder, select **everything inside it**
   (press Ctrl+A), and drag it into the upload area in the browser.
   - Make sure the `.github`, `src` and `src-tauri` folders are included.
   - Wait until all files have finished uploading, then click **Commit changes**.
6. Click the **Actions** tab at the top of your repository.
   - If GitHub asks, click the green button to enable workflows.
7. Click **Build Windows installer** on the left, then **Run workflow** → **Run workflow**.
8. Wait about 15 to 25 minutes. A green check mark means it's done
   (refresh the page if nothing changes).
9. Click the finished run. Under **Artifacts** at the bottom, click
   **Tasks-Windows-installer** to download a zip.
10. Unzip it. Inside is **Tasks_0.1.0_x64-setup.exe**: that's your installer.

> **About cost:** private repositories get 2,000 free build minutes a month. One build uses
> about 40–50 of them (Windows minutes count double), so you can build dozens of times a
> month for free.

### Option B: Build it on your own PC

Only if you'd rather not use GitHub. You need to install three free tools once:

1. **Node.js**: download the "LTS" version from nodejs.org and install it with the defaults.
2. **Visual Studio Build Tools**: download from visualstudio.microsoft.com/visual-cpp-build-tools.
   In the installer, tick **Desktop development with C++** and install.
3. **Rust**: download `rustup-init.exe` from rustup.rs, run it, and press Enter to accept the defaults.

Then restart your PC, open the unzipped `tasks-desktop` folder, click in the address bar,
type `cmd` and press Enter. In the black window, run these one at a time:

```
npm install
npm run tauri build
```

The first build takes 10–20 minutes. The installer appears in
`src-tauri\target\release\bundle\nsis\`.

---

## Step 2: Create your Google sign-in key

This lets the app show your Google name and photo. Google only gives these to apps
that are registered, so you register your own copy. It's free and needs no billing.

1. Go to **console.cloud.google.com** and sign in with your Google account.
   Accept the terms if asked.
2. At the top, click the project picker → **New project**. Name it `Tasks` and click **Create**.
   Make sure the new project is selected at the top.
3. In the search bar, type **Google Auth Platform** and open it
   (in older layouts: **APIs & Services → OAuth consent screen**).
   Click **Get started** and fill in:
   - App name: `Tasks`
   - User support email: your email
   - Audience: **External**
   - Contact email: your email
   - Agree to the policy and click **Create**.
4. Go to **Audience** in the left menu. Under **Test users**, click **Add users**,
   enter **your own Gmail address**, and save.
   (The app stays in "Testing" mode, which means only the people on this list can sign in:
   just you.)
5. Go to **Clients** in the left menu (older layouts: **Credentials**) →
   **Create client** (or **Create credentials → OAuth client ID**).
   - Application type: **Desktop app**
   - Name: `Tasks desktop`
   - Click **Create**.
6. A window shows your **Client ID** and **Client secret**. Copy both somewhere safe
   (for example a note). You'll paste them into the app in Step 3.

> **Is the "secret" really secret?** For desktop apps, Google expects this value to live
> inside the app, so it isn't treated like a password. Still, don't post it publicly.

---

## Step 3: Install and sign in

1. Double-click **Tasks_0.1.0_x64-setup.exe**.
2. Windows will probably show **"Windows protected your PC"**. This appears for any app
   that hasn't paid for a Microsoft-recognized signature. Click **More info → Run anyway**.
3. Follow the installer. It installs just for you and doesn't need admin rights.
4. Open **Tasks** from the Start menu.
5. Paste your **Client ID** and **Client secret** from Step 2 and click **Save**.
6. Click **Sign in with Google**. Your browser opens Google's sign-in page.
   - Choose your account.
   - Google may warn **"Google hasn't verified this app."** That's expected, because it's
     your own private app. Click **Continue**.
   - When the browser says **"You're signed in"**, close the tab and go back to Tasks.
7. Done. Your name and photo appear at the top right, and new tasks are assigned to you
   automatically. Click your photo → **Profile** to add your phone number.

---

## Everyday tips

- **Documents from WhatsApp:** drag a file from WhatsApp Desktop or File Explorer onto the
  app window. If a task is open, it's attached to that task; otherwise you choose where it
  goes. If WhatsApp won't let you drag a file out, save it first and drag it from your
  Downloads folder. The app keeps its own copy, so you can delete the original afterwards.
- **Open a Word or Excel file in its usual app:** open its preview → **Open in its app**.
- **Back up regularly:** your photo → **Back up data…** saves everything (tasks, documents,
  settings) as one `.zip`. Keep it in OneDrive, Google Drive or on a USB stick.
  **Restore from backup…** brings it all back, for example on a new computer.
- **Keyboard:** `N` new task, `/` search, `?` all shortcuts, `Ctrl + Enter` saves a task.

## Updating the app later

When you get a new version of the project files, upload the changed files to your GitHub
repository (Option A, step 4–5), run the workflow again, and install the new
`setup.exe` over the old one. Your tasks and documents are kept.

## Something not working?

| Problem | What to do |
| --- | --- |
| "Google refused the sign-in" | On the sign-in screen, click **Change Google settings** and paste the Client ID and secret again. Make sure you created a **Desktop app** client. |
| "Access blocked" or "not a test user" in the browser | Add your Gmail address under **Audience → Test users** (Step 2.4). |
| Sign-in page never comes back | Finish within 5 minutes, then try again. Some VPNs or security tools block the return step. |
| The GitHub build failed (red ✗) | Check that the `.github` folder and `package-lock.json` were uploaded, then run it again. |
| Want to use it without Google | On the sign-in screen, click **Use without Google** and type your name. |
