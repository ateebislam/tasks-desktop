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

// Which theme is actually showing (Match Windows resolves to the Windows setting).
function isDark(mode) {
  return mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

// Where the circle starts: the middle of the given element, else the theme button in the top bar.
function originOf(el) {
  const target = el || document.querySelector('[data-theme-toggle]');
  if (target && target.getBoundingClientRect) {
    const r = target.getBoundingClientRect();
    if (r.width || r.height) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return { x: window.innerWidth - 40, y: 28 };
}

// Switch theme (0.19.13). When light/dark actually changes, the new theme grows as a circle from
// `from` (the control that was clicked; defaults to the theme button) until it covers the window.
// Instant when Windows asks for reduced motion, or where the browser has no view transitions.
export function setTheme(mode, from) {
  const changes = isDark(mode) !== isDark(readTheme());
  const commit = () => {
    saveTheme(mode);
    applyTheme(mode);
    window.dispatchEvent(new CustomEvent('tasks-theme', { detail: mode }));
  };
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!changes || still || typeof document.startViewTransition !== 'function') { commit(); return; }
  const { x, y } = originOf(from);
  // Wait a frame so a menu that is closing is gone from the "before" picture.
  requestAnimationFrame(() => {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    let vt;
    try { vt = document.startViewTransition(commit); } catch (e) { root.classList.remove('theme-switching'); commit(); return; }
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 200, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' },
      );
    }).catch(() => {});
    vt.finished.finally(() => root.classList.remove('theme-switching'));
  });
}

// Light <-> dark, from the shortcut or the command palette.
export function toggleTheme(from) {
  setTheme(isDark(readTheme()) ? 'light' : 'dark', from);
}

// Shift+D switches between light and dark from anywhere (except while typing).
export function installThemeShortcut() {
  document.addEventListener('keydown', e => {
    if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.key.toLowerCase() !== 'd') return;
    const el = document.activeElement;
    if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
    e.preventDefault();
    toggleTheme();
  });
}
