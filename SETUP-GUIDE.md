# Setup guide

Everything here is free, and no step asks for a credit card. If a screen looks slightly
different from what's described, the service has probably renamed a button; look for the
closest match.

**The one-time setup:**

1. Put the project on GitHub (Step 1)
2. Create your update key (Step 2)
3. Publish the first version (Step 3)
4. Create your Google sign-in key (Step 4)
5. Install the app and sign in (Step 5)

After that, the app updates itself (see **Updating** at the end).

---

## Step 1: Put the project on GitHub

1. Unzip `tasks-desktop.zip`. Open the folders until you see `package.json`, `src` and
   `src-tauri` together. Windows often unzips into `tasks-desktop\tasks-desktop`.
2. Go to **github.com**, sign in, click **+** (top right) → **New repository**.
   Name it `tasks-desktop` and click **Create repository**.
3. Click **uploading an existing file**. In File Explorer, press **Ctrl+A** in the folder
   from point 1 and **drag** everything onto the page. Wait for the list to finish
   (about 50 files, including `src/…` and `src-tauri/…` paths), then click **Commit changes**.
4. Make the repository **public**, so installed apps can find new versions:
   **Settings** → scroll to the bottom (**Danger Zone**) → **Change visibility** →
   **Make public**.
   Your code becomes visible to others, but your tasks, documents and keys never go to
   GitHub, so they stay private.

## Step 2: Create your update key

Updates are signed with a key that only you have, so the app only accepts updates that
really come from you. You create it once, on your own PC.

1. Install **Node.js**: download the **LTS** version from nodejs.org and install it with the
   default options.
2. Open the **Start** menu, type `cmd` and open **Command Prompt**. Paste this and press Enter:

   ```
   npx @tauri-apps/cli signer generate -w "%USERPROFILE%\.tauri\tasks.key"
   ```

   - If it asks to install a package, type `y` and press Enter.
   - It asks for a **password** twice. Choose one and write it down. Nothing appears on
     screen while you type; that's normal.
3. This creates two files. Open them in Notepad by running these two lines:

   ```
   notepad "%USERPROFILE%\.tauri\tasks.key"
   notepad "%USERPROFILE%\.tauri\tasks.key.pub"
   ```

4. On GitHub, open your repository → **Settings** → **Secrets and variables** → **Actions**.
   - **Secrets** tab → **New repository secret**:
     - Name `TAURI_SIGNING_PRIVATE_KEY`, value: the whole text of **tasks.key**.
     - Name `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, value: your password.
   - **Variables** tab → **New repository variable**:
     - Name `UPDATER_PUBKEY`, value: the whole text of **tasks.key.pub**.

> **Keep `tasks.key` and the password safe.** Copy the `.tauri` folder (in your user folder)
> to a USB stick or a password manager. If you lose them, installed apps can't accept
> updates anymore, and you'd have to create a new key and reinstall the app by hand once.

## Step 3: Publish the first version

1. Click the **Actions** tab. If GitHub asks, click the button to enable workflows.
2. Click **Build Windows installer** on the left → **Run workflow** → **Run workflow**.
3. Wait about 15 to 25 minutes, until it shows a green check mark.
4. Open the **Code** tab. On the right, under **Releases**, click **Tasks 0.2.0**.
   Download **Tasks_0.2.0_x64-setup.exe**.

## Step 4: Create your Google sign-in key

1. Go to **console.cloud.google.com** and sign in. Accept the terms if asked.
2. Click the project picker at the top → **New project**. Name it `Tasks` → **Create**.
   Make sure it's selected at the top.
3. Search for **Google Auth Platform** and open it (older layouts:
   **APIs & Services → OAuth consent screen**). Click **Get started**:
   app name `Tasks`, your email as support email, Audience **External**,
   your email as contact. Agree and **Create**.
4. **Audience** (left menu) → **Test users** → **Add users** → your Gmail address → Save.
5. **Clients** (older layouts: **Credentials**) → **Create client** →
   Application type **Desktop app** → name `Tasks desktop` → **Create**.
6. Copy the **Client ID** and **Client secret** somewhere safe.

## Step 5: Install and sign in

1. Double-click **Tasks_0.2.0_x64-setup.exe**. If Windows shows
   **"Windows protected your PC"**, click **More info → Run anyway**. (This appears for any
   app without a paid Microsoft-recognized signature.)
2. Open **Tasks** from the Start menu. Paste the **Client ID** and **Client secret** → **Save**.
3. Click **Sign in with Google**, choose your account in the browser, and click **Continue**
   if Google says it hasn't verified the app (it's your own private app).
   When the browser says **"You're signed in"**, go back to Tasks.
4. Click your photo → **Profile** to add your phone number.

---

## Updating

Whenever the app changes, three things happen:

1. **You put the changed files on GitHub.** Open the repository → **Add file → Upload files**,
   drag in the files you were given (keep their folders), and click **Commit changes**.
   Or edit a single file on GitHub with the pencil icon.
2. **GitHub builds the new version by itself**, as soon as the version number in
   `package.json` changes. It takes 10 to 20 minutes. You can watch it in the **Actions** tab.
3. **The app offers the update.** Next time you open Tasks (or via your photo →
   **Check for updates**), a bar says **"Version … is ready to install"**.
   Click **Install and restart**. Your tasks and documents are kept.

Every update must have a higher version number in `package.json` (for example `0.2.0` →
`0.2.1`), and `RELEASE-NOTES.md` holds the text shown in the update bar.

## Everyday tips

- **Documents from WhatsApp:** drag a file from WhatsApp Desktop or File Explorer onto the
  window. If a task is open, it's attached to that task; otherwise you choose where it goes.
  The app keeps its own copy, so you can delete the original.
- **Open a Word or Excel file in its usual app:** open its preview → **Open in its app**.
- **Back up regularly:** your photo → **Back up data…** saves everything as one `.zip`.
  **Restore from backup…** brings it back, for example on a new computer.
- **Keyboard:** `N` new task, `/` search, `?` all shortcuts, `Ctrl + Enter` saves a task.

## Something not working?

| Problem | What to do |
| --- | --- |
| Build fails with "The update key isn't set up yet" | Check the three names in Step 2.4 are spelled exactly as shown, and that `UPDATER_PUBKEY` is under **Variables**, not Secrets. |
| Build fails while signing ("incorrect password", "invalid key") | Paste the whole `tasks.key` text again (all of it, no extra spaces), and check the password. |
| "Check for updates" says it couldn't check | The repository must be **public**, and at least one release must exist (Step 3). |
| A new version was built but the app doesn't offer it | The version number in `package.json` must be higher than the installed one. |
| "Google refused the sign-in" | On the sign-in screen, click **Change Google settings** and paste the Client ID and secret again. Make sure the client type is **Desktop app**. |
| "Access blocked" or "not a test user" | Add your Gmail address under **Audience → Test users** (Step 4.4). |
| Want to use it without Google | On the sign-in screen, click **Use without Google** and type your name. |

## Building on your own PC (optional)

Install Node.js, **Visual Studio Build Tools** (tick **Desktop development with C++**) and
**Rust** (rustup.rs). Then, in the project folder:

```
npm install
npm run tauri dev      (run the app with live reload)
npm run tauri build    (make an installer without update support)
```
