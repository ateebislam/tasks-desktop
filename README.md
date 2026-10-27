# Tasks — desktop app

A personal task manager for Windows: tasks with status, assignee, deadline, priority,
checklists and a timer; blockers; projects with automatic follow-up tickets; and a
documents library for the PDFs, Word files and HTML pages that arrive in WhatsApp.

Everything is stored on your own computer. The app only goes online for the one-time
"Sign in with Google" (name, email and photo) and to check GitHub for new versions of itself.

**New here? Read [SETUP-GUIDE.md](SETUP-GUIDE.md).** It walks through everything step by step.

## How it's built

| Part | What it is |
| --- | --- |
| `src/App.jsx` | The whole interface (React, styled after shadcn/ui with Tailwind CSS) |
| `src-tauri/src/lib.rs` | The desktop side: saving data, documents, backups, Google sign-in |
| `src-tauri/tauri.conf.json` | App name, window size, installer settings |
| `.github/workflows/build-windows.yml` | Builds the app on GitHub and publishes it as a release the app updates from |
| `RELEASE-NOTES.md` | The text shown in the app's "update available" bar |

Built with [Tauri 2](https://tauri.app), React 18, Vite and Tailwind CSS 3.

## Where your data lives

`%APPDATA%\app.tasks.desktop` (type that into the File Explorer address bar), or use
**your photo → Open data folder** in the app:

- `data.json`: tasks, automations
- `profile.json`: your name, email, photo, phone number and Google sign-in settings
- `documents\`: copies of every attached file

Use **your photo → Back up data…** to save everything as one `.zip` file.

## Developing on your own PC

Needs Node.js 20+, Rust, and Visual Studio Build Tools (see SETUP-GUIDE.md, Option B).

```
npm install
npm run tauri dev      # run the app with live reload
npm run tauri build    # make an installer without update support (src-tauri\target\release\bundle\nsis)
```
