// Appearance: 'light', 'dark' or 'system' (follow Windows).
// Stored on this computer and applied before the app first draws, so there's no flash.
import { getCurrentWindow } from '@tauri-apps/api/window';

const KEY = 'tasks-theme';

export function readTheme() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch (e) {
    return 'system';
  }
}

export function saveTheme(mode) {
  try { localStorage.setItem(KEY, mode); } catch (e) {}
}

export function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === 'light' || mode === 'dark') root.dataset.theme = mode;
  else delete root.dataset.theme;
  // Match the window's title bar to the app.
  try { getCurrentWindow().setTheme(mode === 'system' ? null : mode).catch(() => {}); } catch (e) {}
}

// Shift+D switches between light and dark from anywhere (except while typing).
export function installThemeShortcut() {
  document.addEventListener('keydown', e => {
    if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.key.toLowerCase() !== 'd') return;
    const el = document.activeElement;
    if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
    e.preventDefault();
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const cur = readTheme();
    const isDark = cur === 'dark' || (cur === 'system' && sysDark);
    const next = isDark ? 'light' : 'dark';
    saveTheme(next);
    applyTheme(next);
    window.dispatchEvent(new CustomEvent('tasks-theme', { detail: next }));
  });
}
