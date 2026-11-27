/* global __APP_VERSION__ */
/* Cloud sync (0.19): keeps this PC's tasks, archive, workspaces and documents in the user's own
   Supabase project, so every PC that signs in sees the same data, and changes on one open PC
   show up on the others within a second or two.

   How it works
   - The local JSON files stay the source the app works from, so Tasks still works offline.
   - Each store is split into rows: one per task ("t/<id>"), archived task ("a/<id>"),
     trashed task ("x/<id>"), and one per list such as buckets or rules ("m/<name>").
     Two PCs editing different tasks never clash.
   - For every row we remember the last value both sides agreed on (the "shadow", saved in the
     `cloud` store on this PC). A row whose local value differs from its shadow was changed here
     and is sent up; a row that changed in the cloud is taken, unless it also changed here, in
     which case the newer edit wins and the user gets a short notice.
   - Realtime pushes other PCs' changes here; a pull on connect catches up on anything missed.
   - Documents (files imported into the app's folder) are uploaded to the private `documents`
     bucket under <user id>/<file>, and downloaded on PCs that don't have them yet.
   Only the main window runs sync. Other windows get changes through the usual tasks-data events.

   Since 0.19.4 lists and settings sync item by item too, so two PCs changing different buckets,
   rules, statuses, platforms or settings at once never lose either change:
   - each bucket, rule, status, platform, loose document and workspace is its own row ("l/<list>/<id>"),
     and each setting and column name too ("f/<settings|labels>/<name>");
   - these rows live in a companion store "<store>:items" (for example "data:items"), which
     versions before 0.19.4 ignore, so a PC that hasn't updated yet can never delete them;
   - the whole-list rows ("m/buckets", …) are still written for PCs that haven't updated yet.
     A whole-list row from such a PC is compared with the last one, and only the items it
     changed are taken. Whole-list rows from updated PCs are ignored. Nothing in Supabase changes.

   Since 0.20 the cloud is a team workspace (teams-0.20.sql):
   - every row belongs to the workspace (workspace_id), not to one person; joining runs join_workspace();
   - Owner and Admin change the team's lists and settings; members' changes to those stay on their PC;
   - two people changing different fields of one task at once both keep their change (merged field by field);
   - documents live under <workspace id>/<file>. The Owner's PCs keep every document, teammates fetch
     one when they open it, so a big team doesn't use up the free plan's downloads;
   - a time-based automation is claimed in automation_runs, so only one PC runs it;
   - personal settings (watch folders, the Trash cleanup list) stay on each PC. */
import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { CLOUD_URL, CLOUD_PUBLISHABLE_KEY } from './cloud-config.js';

const ls = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
};
// Failures that used to vanish are written to the log file (0.20.3). The app registers the writer.
let logger = null;
export const cloudSetLogger = f => { logger = f; };
const warn = (what, e) => { try { console.warn('[sync]', what, e || ''); if (logger) logger('sync: ' + what, e); } catch (x) { /* logging must never break sync */ } };
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
// Which PC a change or a running timer came from.
export const DEVICE_ID = (() => { let id = ls.get('tasks-device-id'); if (!id) { id = rid(); ls.set('tasks-device-id', id); } return id; })();

const TABLE = 'records', BUCKET = 'documents';
// Casual names for your own machine in messages (0.21.1).
const MY = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform || navigator.userAgent || '') ? 'your Mac' : 'your PC';
const META = ['rules', 'projects', 'stages', 'buckets', 'labels', 'settings', 'looseDocs'];
const STORE_RE = /^(?:(?:data|archive)(?:-[a-z0-9_]{1,32})?|workspaces)$/;
const ITEMS = ':items'; // companion cloud store for list items and settings fields (0.19.4)
const CLOUD_STORE_RE = /^(?:(?:data|archive)(?:-[a-z0-9_]{1,32})?|workspaces)(?::items)?$/;
// Lists synced item by item. Ordered lists keep their order (each row carries its place).
const DATA_LISTS = { rules: 'ordered', stages: 'ordered', projects: 'set', buckets: 'set', looseDocs: 'set' };
const DATA_OBJS = ['settings', 'labels'];
// Teams and job roles (0.20) are team-wide, so they live with the workspace list.
const listsOf = name => (isData(name) ? DATA_LISTS : name === 'workspaces' ? { list: 'ordered', teams: 'ordered', roles: 'ordered' } : {});
const objsOf = name => (isData(name) ? DATA_OBJS : []);
const isSplitKey = k => k.startsWith('l/') || k.startsWith('f/');
const cloudStoreOf = (name, key) => (isSplitKey(key) ? name + ITEMS : name);
const enc = s => encodeURIComponent(String(s));
const DOC_RE = /^[a-z0-9]{20}(?:\.[a-z0-9]{1,8})?$/;
const isData = n => n === 'data' || n.startsWith('data-');
const isArch = n => n === 'archive' || n.startsWith('archive-');
const storeFor = (base, ws) => (ws === 'product' ? base : `${base}-${ws}`);
const J = v => (v === undefined || v === null ? null : JSON.stringify(v));
// The same, remembered per object (0.20.3): tasks that didn't change keep the same object, so finding
// what changed doesn't turn every task into JSON on every save.
const jMemo = new WeakMap();
const Jm = v => { if (!v || typeof v !== 'object') return J(v); let j = jMemo.get(v); if (j === undefined) { j = J(v); jMemo.set(v, j); } return j; };

/* ---------- Stores <-> rows ---------- */
// Watch folders are paths on this PC, so they stay local.
// Since 0.20 the Trash cleanup list (purgeFiles) is per PC too, since team settings are admin-only.
const LOCAL_SETTINGS = ['watchFolders', 'purgeFiles'];
const localOnly = s => { if (!s || typeof s !== 'object') return s; const rest = { ...s }; LOCAL_SETTINGS.forEach(k => delete rest[k]); return rest; };
const keepLocal = s => { const o = {}; if (s && typeof s === 'object') LOCAL_SETTINGS.forEach(k => { if (s[k] !== undefined) o[k] = s[k]; }); return o; };
const isLocalKey = k => LOCAL_SETTINGS.some(f => k === `f/settings/${f}`);
// Rows only Owner and Admin may change (the same test as records_admin_only in teams-0.20.sql).
const adminOnly = (store, key) => store === 'workspaces' || store.startsWith('workspaces:') || key.startsWith('m/') || (key.startsWith('l/') && !key.startsWith('l/looseDocs/')) || key.startsWith('f/');
// The rows of one list or settings object: { key: value }.
function fieldRows(name, field, v) {
  const out = {}, kind = listsOf(name)[field];
  if (kind && Array.isArray(v)) v.forEach((x, i) => { out[`l/${field}/${enc(itemKey(x))}`] = kind === 'ordered' ? { v: x, p: i } : { v: x }; });
  else if (objsOf(name).includes(field) && v && typeof v === 'object') Object.entries(field === 'settings' ? localOnly(v) : v).forEach(([k, x]) => { if (x !== undefined && x !== null) out[`f/${field}/${enc(k)}`] = x; });
  return out;
}
// The whole-list row kept for PCs before 0.19.4. Lists whose order doesn't matter are sorted, so every
// updated PC writes exactly the same value and none of them has to send it again.
const compat = (name, field, v) => {
  if (field === 'settings') return localOnly(v);
  return listsOf(name)[field] === 'set' && Array.isArray(v) ? v.slice().sort((a, b) => (String(itemKey(a)) < String(itemKey(b)) ? -1 : String(itemKey(a)) > String(itemKey(b)) ? 1 : 0)) : v;
};
function split(name, c) {
  const out = {};
  if (!c) return out;
  if (isData(name)) {
    Object.entries(c.tasks || {}).forEach(([id, t]) => { out['t/' + id] = t; });
    META.forEach(k => { if (c[k] !== undefined && c[k] !== null) { out['m/' + k] = compat(name, k, c[k]); Object.assign(out, fieldRows(name, k, c[k])); } });
  } else if (isArch(name)) {
    Object.entries(c.archived || {}).forEach(([id, t]) => { out['a/' + id] = t; });
    Object.entries(c.trash || {}).forEach(([id, t]) => { out['x/' + id] = t; });
  } else if (name === 'workspaces') {
    if (Array.isArray(c.list)) { out['m/list'] = c.list; Object.assign(out, fieldRows(name, 'list', c.list)); }
    ['teams', 'roles'].forEach(f => { if (Array.isArray(c[f])) Object.assign(out, fieldRows(name, f, c[f])); });
  }
  return out;
}
const fieldOf = key => (isSplitKey(key) ? key.split('/')[1] : key.slice(2));
function getRow(name, c, key) {
  if (!c) return undefined;
  const [p, id] = [key.slice(0, 2), key.slice(2)];
  if (isSplitKey(key)) { const f = fieldOf(key); return fieldRows(name, f, c[f])[key]; }
  if (isData(name)) {
    if (p === 't/') return (c.tasks || {})[id];
    if (p === 'm/') { const v = c[id]; return v === null || v === undefined ? undefined : compat(name, id, v); }
  } else if (isArch(name)) {
    if (p === 'a/') return (c.archived || {})[id];
    if (p === 'x/') return (c.trash || {})[id];
  } else if (name === 'workspaces' && key === 'm/list') return c.list;
  return undefined;
}
// Applies {key: value | null (deleted)} to a store's content and returns the new content.
export function applyRows(name, c, patch) {
  const n = { ...(c || {}) };
  const setIn = (field, id, v) => { const m = { ...(n[field] || {}) }; if (v === null) delete m[id]; else m[id] = v; n[field] = m; };
  // Items of lists and fields of settings, one at a time.
  const byField = {};
  Object.entries(patch).forEach(([key, v]) => { if (isSplitKey(key)) (byField[fieldOf(key)] || (byField[fieldOf(key)] = {}))[key] = v; });
  Object.entries(byField).forEach(([field, rows]) => {
    if (isData(name) && !n.version) n.version = 4;
    if (name === 'workspaces') n.version = 1;
    if (listsOf(name)[field]) {
      const ordered = listsOf(name)[field] === 'ordered';
      const cur = (Array.isArray(n[field]) ? n[field] : []).map((x, i) => ({ k: `l/${field}/${enc(itemKey(x))}`, x, p: i, i }));
      const have = new Set(cur.map(e => e.k));
      let list = cur.filter(e => rows[e.k] !== null).map(e => (rows[e.k] ? { ...e, x: rows[e.k].v, p: ordered && typeof rows[e.k].p === 'number' ? rows[e.k].p : e.p } : e));
      Object.entries(rows).forEach(([k, w], j) => { if (w && !have.has(k)) list.push({ k, x: w.v, p: ordered && typeof w.p === 'number' ? w.p : 1e9, i: 1e6 + j }); });
      if (ordered) list = list.sort((a, b) => a.p - b.p || a.i - b.i);
      n[field] = list.map(e => e.x);
    } else {
      const o = { ...(n[field] || {}) };
      Object.entries(rows).forEach(([k, v]) => { const f = decodeURIComponent(k.split('/').slice(2).join('/')); if (v === null) delete o[f]; else o[f] = v; });
      n[field] = o;
    }
  });
  Object.entries(patch).forEach(([key, v]) => {
    if (isSplitKey(key)) return;
    const p = key.slice(0, 2), id = key.slice(2);
    if (isData(name)) {
      if (!n.version) n.version = 4;
      if (p === 't/') setIn('tasks', id, v);
      else if (p === 'm/' && META.includes(id)) n[id] = id === 'settings' ? { ...localOnly(v || {}), ...keepLocal(n.settings) } : v;
    } else if (isArch(name)) {
      if (!n.version) n.version = 1;
      if (p === 'a/') setIn('archived', id, v); else if (p === 'x/') setIn('trash', id, v);
    } else if (name === 'workspaces' && key === 'm/list' && Array.isArray(v)) { n.version = 1; n.list = v; }
  });
  return n;
}
const itemKey = x => (x && typeof x === 'object' ? (x.id ?? x.name ?? JSON.stringify(x)) : JSON.stringify(x));
function mergeLists(remote, local) {
  if (Array.isArray(remote) && Array.isArray(local)) {
    const seen = new Set(remote.map(itemKey));
    return [...remote, ...local.filter(x => !seen.has(itemKey(x)))];
  }
  if (remote && local && typeof remote === 'object' && typeof local === 'object' && !Array.isArray(remote) && !Array.isArray(local)) return { ...local, ...remote };
  return remote;
}
const isItem = key => /^[taxl]\//.test(key);
const isRowItem = key => /^[tax]\//.test(key); // a task, archived task or trashed task
const unwrap = (key, v) => (key && key.startsWith('l/') && v && typeof v === 'object' ? v.v : v);
const itemTime = v => (v && typeof v === 'object' ? v.updatedAt || v.archivedAt || v.deletedAt || 0 : 0);
/* Which edit is newer must not depend on each PC's clock (0.20.3). Every answer from Supabase carries
   the server's time (updated_at), so this PC learns how far its own clock is off and corrects the
   times it sends and compares. Differences under 30 seconds are left alone: that's just the network. */
const CLOCK_SLACK = 30000;
const clockOff = () => (st && Number(st.clockOff)) || 0;
const srvNow = () => Date.now() + clockOff();
const srv = t => (t ? t + clockOff() : 0); // a time from this PC's clock, as the server would have seen it
function learnClock(iso, t0, t1) {
  const at = Date.parse(iso);
  if (!st || !Number.isFinite(at)) return;
  const off = Math.round(at - (t0 + t1) / 2), next = Math.abs(off) < CLOCK_SLACK ? 0 : off;
  if (Math.abs(next - clockOff()) < 5000) return;
  st.clockOff = next; saveSoon();
}
// Two people changed the same task: start from the last agreed copy and take each side's changed fields.
// A field both changed goes to the newer edit; lists of things with ids (comments, files, links) are combined.
const byId = a => Array.isArray(a) && a.every(x => x && typeof x === 'object' && (typeof x.id === 'string' || typeof x.id === 'number'));
function mergeIds(base, mine, theirs, mineWins) {
  const b = new Map((byId(base) ? base : []).map(x => [x.id, J(x)])), m = new Map(mine.map(x => [x.id, x])), t = new Map(theirs.map(x => [x.id, x]));
  const out = [];
  theirs.forEach(x => {
    if (!m.has(x.id)) { if (!b.has(x.id) || b.get(x.id) !== J(x)) out.push(x); return; } // removed here, unless changed there
    const mx = m.get(x.id);
    out.push(J(mx) === J(x) ? x : b.get(x.id) === J(mx) ? x : b.get(x.id) === J(x) ? mx : mineWins ? mx : x);
  });
  mine.forEach(x => { if (!t.has(x.id) && (!b.has(x.id) || b.get(x.id) !== J(x))) out.push(x); }); // added here
  return out;
}
export function mergeFields(base, mine, theirs, mineWins) {
  if (!mine || !theirs || typeof mine !== 'object' || typeof theirs !== 'object' || Array.isArray(mine) || Array.isArray(theirs)) return mineWins ? mine : theirs;
  base = base && typeof base === 'object' ? base : {};
  const out = {};
  new Set([...Object.keys(mine), ...Object.keys(theirs)]).forEach(k => {
    const bj = J(base[k]), mj = J(mine[k]), tj = J(theirs[k]);
    let v;
    if (mj === tj || mj === bj) v = theirs[k];
    else if (tj === bj) v = mine[k];
    else if (byId(mine[k]) && byId(theirs[k])) v = mergeIds(base[k], mine[k], theirs[k], mineWins);
    else v = mineWins ? mine[k] : theirs[k];
    if (v !== undefined) out[k] = v;
  });
  if (typeof mine.updatedAt === 'number' || typeof theirs.updatedAt === 'number') out.updatedAt = Math.max(mine.updatedAt || 0, theirs.updatedAt || 0);
  return out;
}
const rowTitle = v => (v && typeof v === 'object' ? (typeof v.title === 'string' ? v.title : typeof v.name === 'string' ? v.name : '') : '');
// For the open window: list items and settings fields become the whole list or object it already knows.
function livePatch(name, next, patch) {
  const out = {};
  Object.entries(patch).forEach(([k, v]) => {
    if (/^[tax]\//.test(k)) out[k] = v;
    else { const f = fieldOf(k); out['m/' + f] = next && next[f] !== undefined ? next[f] : null; }
  });
  return out;
}
function docRefs(v, out) {
  if (!v || typeof v !== 'object') return;
  if (Array.isArray(v)) { v.forEach(x => docRefs(x, out)); return; }
  if (typeof v.file === 'string' && DOC_RE.test(v.file)) out.add(v.file);
  Object.values(v).forEach(x => { if (x && typeof x === 'object') docRefs(x, out); });
}

/* ---------- State ---------- */
// Saved in the `cloud` store: { url, key, uid, email, ready, cursor, stores: {name: {shadow, dirtyAt}}, docsUp, lastSync }
let st = null, client = null, uid = null, channel = null, wsId = null, access = null, teamChannel = null;
const clashes = new Map(); // task key -> how many times in a row it clashed while sending
let status = { phase: 'loading' };
const subs = new Set(), noticeSubs = new Set();
const live = {};   // store name -> function applying a patch to the open window's state
const cache = {};  // store name -> latest content known here
const dirty = new Set();
// Stores whose file couldn't be read (0.20.3). Sync never treats them as empty: nothing is sent from them
// and nothing is written into them, until the app has recovered the file.
const unreadable = new Set();
// Paused while a backup is restored (0.20.3), so nothing is read, written or sent in between.
let frozen = false;
// Large deletions held back until confirmed with Sync now (0.20.3); see heldDeletes().
let deleteOk = false;
const heldNoted = new Set();
let caughtUp = false, started = false, loopBusy = false, loopAgain = false, timer = null, retryMs = 0, docsBusy = false, docsAgain = false;

/* ---------- Minimum app version (0.21.0) ----------
   The team's minimum version lives in Supabase (app_settings, set in the SQL Editor). An app older than it
   stops sending changes and shows the update lock; Supabase refuses its changes too. The last value seen is
   kept, so an old PC that starts offline is still locked. */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
const verParts = v => (/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(String(v || '')) ? String(v).split('.').map(Number) : null);
// True when version v is older than min. No minimum, or one that isn't a version, never locks.
export function olderThan(v, min) {
  const a = verParts(v), b = verParts(min);
  if (!b) return false;
  if (!a) return true;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}
let outdated = false, settingsChannel = null;

const setStatus = patch => { status = { ...status, ...patch }; subs.forEach(f => f(status)); };
export const cloudStatus = () => status;
export function onCloudStatus(f) { subs.add(f); f(status); return () => subs.delete(f); }
// Notices: { kind: 'conflict', title, kept: 'here' | 'other' } and { kind: 'error', title, detail }.
export function onCloudNotice(f) { noticeSubs.add(f); return () => noticeSubs.delete(f); }
const notice = n => noticeSubs.forEach(f => f(n));

let saveBusy = false, saveNext = false;
async function saveState() {
  if (frozen) return;
  if (saveBusy) { saveNext = true; return; }
  saveBusy = true;
  try { do { saveNext = false; await invoke('write_store', { name: 'cloud', content: JSON.stringify(st) }); } while (saveNext); }
  catch (e) { warn('Sync state not saved', e); } finally { saveBusy = false; }
}
let saveT = null;
const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(saveState, 400); };
const sstore = name => { const s = st.stores[name] || (st.stores[name] = { shadow: {}, dirtyAt: {} }); if (!s.itemAt) s.itemAt = {}; if (!s.legacySeen) s.legacySeen = {}; if (!s.seenAt) s.seenAt = {}; return s; };
const pendingCount = () => Object.values(st.stores).reduce((n, s) => n + Object.keys(s.dirtyAt || {}).length, 0);

// A store's content: null when it doesn't exist yet, undefined when its file can't be read (0.20.3).
// An unreadable file is never taken as empty, or every task in it would be deleted from the cloud.
async function content(name) {
  if (cache[name] !== undefined) return cache[name];
  let c = null;
  try { const raw = await invoke('read_store', { name }); c = raw ? JSON.parse(raw) : null; }
  catch (e) {
    if (!unreadable.has(name)) {
      unreadable.add(name);
      notice({ kind: 'error', title: 'Some of your data couldn’t be read', detail: 'Cloud sync left it alone, so nothing was lost in the cloud. Open Tasks again to recover it.' });
    }
    return undefined;
  }
  unreadable.delete(name);
  if (cache[name] === undefined) cache[name] = c;
  return cache[name];
}
async function workspaceIds() {
  const w = await content('workspaces');
  const list = w && Array.isArray(w.list) && w.list.length ? w.list : [{ id: 'product' }, { id: 'marketing' }];
  return list.map(x => x.id).filter(id => /^[a-z0-9_]{1,32}$/.test(id));
}
async function localStores() {
  const names = ['workspaces'];
  (await workspaceIds()).forEach(id => names.push(storeFor('data', id), storeFor('archive', id)));
  Object.keys(st.stores).forEach(n => { if (!names.includes(n)) names.push(n); });
  return names;
}

/* ---------- Hooks used by the app ---------- */
// Called whenever this PC writes a store (main window, or a task window through tasks-data events).
export function cloudNote(name, data) {
  if (!started || frozen || !STORE_RE.test(name)) return;
  unreadable.delete(name);
  cache[name] = data;
  dirty.add(name);
  kick(600);
}
// The open window registers how to take a patch into its state; returns the unregister function.
// `loaded` is what the window read from the file; anything newer that sync already has is passed on.
export function cloudLive(name, fn, loaded) {
  live[name] = fn;
  if (started && cache[name] !== undefined && cache[name] !== null && loaded !== undefined) {
    const a = split(name, loaded), b = split(name, cache[name]), patch = {};
    Object.keys(b).forEach(k => { if (J(a[k]) !== J(b[k])) patch[k] = b[k]; });
    Object.keys(a).forEach(k => { if (!(k in b)) patch[k] = null; });
    if (Object.keys(patch).length) fn(livePatch(name, cache[name], patch));
  }
  return () => { if (live[name] === fn) delete live[name]; };
}

function kick(ms = 0) { clearTimeout(timer); timer = setTimeout(loop, ms); }

/* ---------- Pushing local changes ---------- */
function diff(name) {
  if (unreadable.has(name) || cache[name] === undefined) return [];
  const s = sstore(name), rows = split(name, cache[name]), now = srvNow(), out = [];
  Object.keys(s.shadow).forEach(k => { if (isLocalKey(k)) { delete s.shadow[k]; delete s.dirtyAt[k]; } });
  Object.entries(rows).forEach(([k, v]) => {
    const j = Jm(v);
    if ((s.shadow[k] ?? null) !== j) { s.dirtyAt[k] = s.dirtyAt[k] || srv(itemTime(v)) || now; out.push({ key: k, value: v, j }); }
    else delete s.dirtyAt[k];
  });
  Object.keys(s.shadow).forEach(k => {
    if (s.shadow[k] !== null && !(k in rows)) { s.dirtyAt[k] = s.dirtyAt[k] || now; out.push({ key: k, value: null, j: null }); }
  });
  Object.keys(s.dirtyAt).forEach(k => { if (!(k in rows) && (s.shadow[k] ?? null) === null) delete s.dirtyAt[k]; });
  return out;
}
async function pushAll() {
  if (!access) await loadTeam(); // who we are in the team decides which rows we may send; throws (and retries) if unknown
  if (!access) throw new Error('Couldn’t find you in the team. Try signing in again.');
  // Task lists before archives (0.20.3): a restored task is back in the list before it leaves the Trash,
  // which is what the team's delete rules check.
  const names = [...dirty].sort((a, b) => (isArch(a) ? 1 : 0) - (isArch(b) ? 1 : 0)); dirty.clear();
  let sent = 0;
  for (const name of names) {
    if (cache[name] === undefined) await content(name);
    if (unreadable.has(name)) continue; // never sent from a file that couldn't be read
    // Items go before the whole-list rows, so a PC that reads both always sees the items first.
    let changes = diff(name).sort((a, b) => (a.key.startsWith('m/') ? 1 : 0) - (b.key.startsWith('m/') ? 1 : 0));
    const s = sstore(name);
    // Many tasks vanishing at once (not moved to the Archive or Trash) looks like lost data, not a
    // choice: those deletions wait until someone presses Sync now (0.20.3).
    const held = await heldDeletes(name, changes);
    if (held.length) {
      const h = new Set(held);
      changes = changes.filter(c => !h.has(c.key));
      if (!heldNoted.has(name)) {
        heldNoted.add(name);
        notice({ kind: 'error', title: `${held.length} tasks disappeared from ${MY}`, detail: 'They weren’t deleted for your team. If you meant to delete them, open Cloud sync and press Sync now.' });
      }
      setStatus({ held: held.length });
    } else if (heldNoted.delete(name)) setStatus({ held: 0 });
    if (!isAdmin()) {
      // Members can't change the team's lists or settings (the app doesn't let them, and Supabase refuses).
      // Anything that differs here, like a default the team never saved, simply stays on this PC; the
      // team's copy comes in whenever an admin changes it. Nothing is put back, so nothing can ping-pong.
      changes.filter(c => adminOnly(cloudStoreOf(name, c.key), c.key)).forEach(c => { delete s.dirtyAt[c.key]; });
      changes = changes.filter(c => !adminOnly(cloudStoreOf(name, c.key), c.key));
    }
    const row = c => ({ workspace_id: wsId, store: cloudStoreOf(name, c.key), key: c.key, value: c.value, deleted: c.value === null, edited_at: s.dirtyAt[c.key] || srvNow(), device: DEVICE_ID });
    const done = (c, at) => { clashes.delete(c.key); if (isSplitKey(c.key)) s.itemAt[c.key] = s.dirtyAt[c.key] || srvNow(); s.shadow[c.key] = c.j; delete s.dirtyAt[c.key]; if (at) s.seenAt[c.key] = at; sent++; };
    // Lists and settings go item by item, so a plain write is safe.
    const plain = changes.filter(c => !isRowItem(c.key));
    for (let i = 0; i < plain.length; i += 200) {
      const part = plain.slice(i, i + 200);
      const { error } = await client.from(TABLE).upsert(part.map(row), { onConflict: 'workspace_id,store,key' });
      if (error) { dirty.add(name); throw error; }
      part.forEach(c => done(c));
    }
    // Tasks (0.20): written only over the copy this PC last saw, so two people's edits can't cross in flight
    // and wipe each other out. If someone got there first, their copy is merged with ours and sent again.
    const tasks = changes.filter(c => isRowItem(c.key)), conflicts = [];
    const fresh = tasks.filter(c => !s.seenAt[c.key]), known = tasks.filter(c => s.seenAt[c.key]);
    for (let i = 0; i < fresh.length; i += 200) {
      const part = fresh.slice(i, i + 200);
      const t0 = Date.now();
      const { data, error } = await client.from(TABLE).upsert(part.map(row), { onConflict: 'workspace_id,store,key', ignoreDuplicates: true }).select('key,updated_at');
      if (error) { dirty.add(name); throw error; }
      if (data && data.length) learnClock(data[0].updated_at, t0, Date.now());
      const got = new Map((data || []).map(r => [r.key, r.updated_at]));
      part.forEach(c => (got.has(c.key) ? done(c, got.get(c.key)) : conflicts.push(c.key)));
    }
    const refused = [];
    for (const c of known) {
      const { workspace_id, store, key, ...set } = row(c);
      const t0 = Date.now();
      const { data, error } = await client.from(TABLE).update(set).eq('workspace_id', wsId).eq('store', store).eq('key', key).eq('updated_at', s.seenAt[c.key]).select('key,updated_at');
      // Refused by the team's rules (delete-rules-0.20.3.sql), like deleting someone else's task:
      // the team's copy is put back here instead of trying again forever (0.20.3).
      if (error && (error.code === '42501' || /row-level security|permission/i.test(error.message || ''))) { refused.push(c.key); checkMember().catch(() => {}); continue; }
      if (error) { dirty.add(name); throw error; }
      if (data && data.length) { learnClock(data[0].updated_at, t0, Date.now()); done(c, data[0].updated_at); } else conflicts.push(c.key);
    }
    if (refused.length) {
      const { data, error } = await client.from(TABLE).select('store,key,value,deleted,updated_at,edited_at,device').eq('workspace_id', wsId).eq('store', name).in('key', refused);
      if (error) { dirty.add(name); throw error; }
      refused.forEach(k => { delete s.dirtyAt[k]; });
      await receive(data || [], 'replace');
      notice({ kind: 'error', title: refused.length === 1 ? 'That change was put back' : `${refused.length} changes were put back`, detail: 'Only the person who made a task, or the Owner or an Admin, can delete it.' });
    }
    if (conflicts.length) {
      const { data, error } = await client.from(TABLE).select('store,key,value,deleted,updated_at,edited_at,device').eq('workspace_id', wsId).eq('store', name).in('key', conflicts);
      if (error) { dirty.add(name); throw error; }
      // A task that keeps clashing (someone editing it nonstop, or a server hiccup) backs off instead of spinning.
      conflicts.forEach(k => { clashes.set(k, (clashes.get(k) || 0) + 1); });
      if (conflicts.some(k => clashes.get(k) > 5)) { conflicts.forEach(k => clashes.delete(k)); dirty.add(name); throw new Error('A task kept changing on another device while sending. Trying again shortly.'); }
      const found = new Set((data || []).map(r => r.key));
      // Gone from the cloud (an admin cleared it): send ours as a new row next time.
      conflicts.forEach(k => { if (!found.has(k)) delete s.seenAt[k]; });
      // A copy this PC wrote itself (its answer got lost): just note it, ours goes again.
      // Someone else's copy: take it in fresh (whatever this PC last noted), merging with ours.
      (data || []).forEach(r => { if (r.device === DEVICE_ID) s.seenAt[r.key] = r.updated_at; else delete s.seenAt[r.key]; });
      await receive((data || []).filter(r => r.device !== DEVICE_ID), 'normal');
      dirty.add(name);
    }
  }
  if (sent) saveSoon();
  return sent;
}

// The deletions to hold back from one push (0.20.3): tasks that vanished from this PC without being moved
// to the Archive or Trash (more than 10 at once), or an archive store that's suddenly empty.
const HOLD_OVER = 10;
async function heldDeletes(name, changes) {
  if (deleteOk) return [];
  const del = changes.filter(c => c.value === null && isRowItem(c.key));
  if (del.length <= HOLD_OVER) return [];
  if (isData(name)) {
    const arch = (await content(name.replace(/^data/, 'archive'))) || {};
    const gone = del.filter(c => c.key.startsWith('t/') && !((arch.archived || {})[c.key.slice(2)] || (arch.trash || {})[c.key.slice(2)]));
    return gone.length > HOLD_OVER ? gone.map(c => c.key) : [];
  }
  if (isArch(name)) return Object.keys(split(name, cache[name])).length === 0 ? del.map(c => c.key) : [];
  return [];
}
// For the unit tests (src/cloud.test.js) only.
export const _test = { get sessionStore() { return sessionStore; }, forgetOld, dropVanished, learnClock, clockOff, srv, split, applyRows, mergeFields, heldDeletes, diff, sstore, cache, unreadable, receive, setSt: v => { st = v; }, getSt: () => st, setClient: (c, ws) => { client = c; wsId = ws; } };

/* ---------- Taking in cloud changes ---------- */
// Rows are taken in one at a time, in the order they arrive, so two batches never work from the same old copy.
let recvQ = Promise.resolve();
function receive(rows, policy) { const p = recvQ.then(() => receiveNow(rows, policy)); recvQ = p.catch(() => {}); return p; }
async function receiveNow(rows, policy = 'normal') {
  if (frozen) return;
  const byStore = {};
  rows.forEach(r => {
    if (!r || typeof r.key !== 'string' || !CLOUD_STORE_RE.test(r.store || '')) return;
    const items = r.store.endsWith(ITEMS), base = items ? r.store.slice(0, -ITEMS.length) : r.store;
    if (items !== isSplitKey(r.key)) return; // a row in the wrong place is never taken
    if (isLocalKey(r.key)) return; // personal settings written by a PC before 0.20
    // A PC that writes item rows is on 0.19.4 or later: its whole-list rows are only for older PCs.
    if (items && r.device && !st.v2.includes(r.device)) { st.v2.push(r.device); saveSoon(); }
    (byStore[base] || (byStore[base] = [])).push(r);
  });
  // Workspaces first, so new workspaces exist before their tasks arrive.
  const names = Object.keys(byStore).sort((a, b) => (a === 'workspaces' ? -1 : b === 'workspaces' ? 1 : 0));
  for (const name of names) {
    const c = await content(name);
    if (unreadable.has(name)) continue; // left alone: never written over (0.20.3)
    const s = sstore(name), patch = {};
    // If this PC can't save what it takes in, it must not note the rows as taken (0.20.3).
    const before = { shadow: { ...s.shadow }, seenAt: { ...s.seenAt }, itemAt: { ...s.itemAt }, dirtyAt: { ...s.dirtyAt }, legacySeen: { ...s.legacySeen } };
    try {
    for (const r of byStore[name]) {
      // A row can arrive twice and out of order: realtime may bring a newer copy before the catch-up pull
      // (which looks back a minute) brings an older one. Only the newest copy of each row counts, or the
      // older one would put back an old value here and this PC would think it was up to date.
      if (r.updated_at) {
        const seen = s.seenAt[r.key];
        if (policy === 'normal' && seen && r.updated_at <= seen) continue;
        if (!seen || r.updated_at > seen) s.seenAt[r.key] = r.updated_at;
      }
      if (policy === 'normal' && r.device === DEVICE_ID) continue; // our own change coming back
      const j = r.deleted ? null : J(r.value), sj = s.shadow[r.key] ?? null;
      const field = r.key.slice(2);
      if (r.key.startsWith('m/') && (listsOf(name)[field] || objsOf(name).includes(field))) {
        // A whole list or settings object. From an updated PC (or this one) it only repeats its item rows.
        if (r.device === DEVICE_ID || st.v2.includes(r.device)) { s.shadow[r.key] = j; continue; }
        if (policy === 'normal' && j === sj) continue;
        if (r.updated_at && s.legacySeen[r.key] === r.updated_at) { s.shadow[r.key] = j; continue; } // seen already
        if (r.updated_at) s.legacySeen[r.key] = r.updated_at;
        // From a PC before 0.19.4: take just the items it changed compared with the cloud's list,
        // and only where its edit is newer than the last change to that item.
        const was = sj === null ? {} : fieldRows(name, field, JSON.parse(sj)), now = r.deleted ? {} : fieldRows(name, field, r.value);
        s.shadow[r.key] = j;
        const at = r.edited_at || 0, newer = k => at > (s.itemAt[k] || 0);
        const keep = sj !== null || policy === 'replace' ? null : 'add'; // with nothing to compare against, only add
        Object.entries(now).forEach(([k, v]) => {
          if (J(was[k]) === J(v) || !newer(k)) return;
          const lv = k in patch ? patch[k] : getRow(name, c, k);
          if (J(lv) === J(v)) return;
          // Changed here too since the last sync: the newer edit wins.
          if (lv !== undefined && J(lv) !== (s.shadow[k] ?? null) && (s.dirtyAt[k] || 0) > at) return;
          if (keep === 'add' && lv !== undefined && policy !== 'combine') return;
          patch[k] = v; s.itemAt[k] = at;
        });
        if (!keep) Object.keys(was).forEach(k => { if (!(k in now) && newer(k) && getRow(name, c, k) !== undefined) { patch[k] = null; s.itemAt[k] = at; } });
        dirty.add(name); // the items it changed go up as item rows
        continue;
      }
      if (policy === 'normal' && j === sj) continue;
      const lv = getRow(name, c, r.key), lj = J(lv);
      if (lj === j) { s.shadow[r.key] = j; delete s.dirtyAt[r.key]; if (isSplitKey(r.key)) s.itemAt[r.key] = Math.max(s.itemAt[r.key] || 0, r.edited_at || 0); continue; }
      let take;
      if (policy === 'replace') take = true;
      else if (policy === 'combine' && !isItem(r.key) && lv !== undefined && r.value) {
        // Lists (buckets, rules, …): keep everything from both, the cloud's version where both have it.
        const merged = mergeLists(r.value, lv);
        s.shadow[r.key] = j; patch[r.key] = merged;
        if (J(merged) !== j) dirty.add(name);
        continue;
      }
      else if (policy === 'combine') take = lj === null || (r.edited_at || 0) >= srv(itemTime(lv));
      else if (lj === sj) take = true; // not changed here since the last sync
      else if (/^[tax]\//.test(r.key) && lv && r.value && !r.deleted) {
        // Changed here and by someone else: keep both sides' changes, field by field.
        const mineWins = (s.dirtyAt[r.key] || srv(itemTime(lv)) || 0) > (r.edited_at || 0);
        const merged = mergeFields(sj === null ? null : JSON.parse(sj), lv, r.value, mineWins);
        s.shadow[r.key] = j; s.seenAt[r.key] = r.updated_at || s.seenAt[r.key];
        patch[r.key] = merged;
        if (J(merged) !== j) dirty.add(name); else delete s.dirtyAt[r.key];
        continue;
      }
      else {
        // Changed on both PCs: the newer edit wins.
        take = (r.edited_at || 0) >= (s.dirtyAt[r.key] || srv(itemTime(lv)) || 0);
        if (isItem(r.key)) notice({ kind: 'conflict', title: (take ? rowTitle(unwrap(r.key, r.value)) : rowTitle(unwrap(r.key, lv))) || 'A task', kept: take ? 'other' : 'here' });
      }
      s.shadow[r.key] = j;
      if (isSplitKey(r.key)) s.itemAt[r.key] = Math.max(s.itemAt[r.key] || 0, r.edited_at || 0);
      if (take) { patch[r.key] = j === null ? null : r.value; delete s.dirtyAt[r.key]; }
      else dirty.add(name);
    }
    // Ordered lists (statuses, rules, workspaces): items that didn't change take their place from
    // the cloud too, so a reorder that arrives one row at a time still ends in the right order.
    Object.entries(listsOf(name)).forEach(([f, kind]) => {
      if (kind !== 'ordered' || !Object.keys(patch).some(k => k.startsWith(`l/${f}/`))) return;
      Object.entries(fieldRows(name, f, c && c[f])).forEach(([k, w]) => {
        if (k in patch || !s.shadow[k]) return;
        const sp = JSON.parse(s.shadow[k]).p;
        if (typeof sp === 'number' && sp !== w.p) patch[k] = { v: w.v, p: sp };
      });
    });
    if (Object.keys(patch).length) await applyPatch(name, c, patch);
    } catch (e) {
      Object.assign(s, before);
      throw e;
    }
  }
  saveSoon();
}
async function applyPatch(name, c, patch) {
  const next = applyRows(name, c, patch);
  cache[name] = next;
  if (live[name]) { live[name](livePatch(name, next, patch)); return; }
  // Not open in this window: write the file, and tell any task windows showing it.
  // A failed write puts everything back and is retried (0.20.3), instead of being noted as done.
  try { await invoke('write_store', { name, content: JSON.stringify(next) }); }
  catch (e) { cache[name] = c; throw e; }
  announce(name, next);
}
// Tells any task windows showing this store about its new content.
function announce(name, next) {
  const ws = name.includes('-') ? name.slice(name.indexOf('-') + 1) : 'product';
  if (isData(name)) emit('tasks-data', { from: 'cloud', ws, data: next }).catch(() => {});
  else if (isArch(name)) emit('tasks-arch', { from: 'cloud', ws, data: { archived: next.archived || {}, trash: next.trash || {} } }).catch(() => {});
}
/* Old leftovers (0.20.3, cleanup-0.20.3.sql). Supabase removes "this was deleted" markers after 90
   days. So this PC forgets its own notes about rows deleted longer ago than that (a little later, to
   be sure the cloud went first), and a PC that was away for most of that time compares everything
   again when it's back, because the markers it would have learned from may be gone. */
const DAY = 864e5, FORGET_DAYS = 100, AWAY_DAYS = 80;
async function forgetOld() {
  if (srvNow() - (st.prunedAt || 0) < DAY) return 0;
  const before = srvNow() - FORGET_DAYS * DAY;
  let n = 0;
  for (const name of Object.keys(st.stores)) {
    const c = await content(name);
    if (c === undefined) continue; // unreadable: left alone
    const s = sstore(name), rows = c === null ? {} : split(name, c);
    for (const k of Object.keys(s.shadow)) {
      // Deleted, agreed with the cloud, not back on this PC, and long enough ago.
      if (s.shadow[k] !== null || k in rows || s.dirtyAt[k]) continue;
      const at = s.seenAt[k] ? Date.parse(s.seenAt[k]) : 0;
      if (at && at > before) continue;
      delete s.shadow[k]; delete s.seenAt[k]; delete s.itemAt[k]; delete s.legacySeen[k]; n++;
    }
  }
  st.prunedAt = srvNow(); saveSoon();
  return n;
}
// After a long time away: rows this PC knows from the cloud that the cloud no longer has at all were
// deleted and their markers cleaned up. They go from here too, unless they were changed here meanwhile
// (edited_at 0 loses to any edit made on this PC, which is then sent up again as a new row).
async function dropVanished(inCloud) {
  // An empty answer is far more likely "not allowed to read" (removed from the team) than "all deleted".
  if (!inCloud.size) return 0;
  let gone = [];
  for (const name of Object.keys(st.stores)) {
    const s = sstore(name);
    for (const k of Object.keys(s.seenAt)) {
      if ((s.shadow[k] ?? null) === null || isLocalKey(k)) continue;
      const store = cloudStoreOf(name, k);
      if (!inCloud.has(store + '|' + k)) gone.push({ store, key: k, value: null, deleted: true, updated_at: null, edited_at: 0, device: null });
    }
  }
  // Asked for by name before anything is dropped: a row that changed while the pages were being read
  // can be missed by the page-by-page read, and must not be taken for deleted. A failed check stops here
  // (the catch-up is tried again), so nothing is ever dropped on a guess.
  if (gone.length) {
    const still = new Set(), byStore = {};
    gone.forEach(r => (byStore[r.store] || (byStore[r.store] = [])).push(r.key));
    for (const [store, keys] of Object.entries(byStore)) {
      for (let i = 0; i < keys.length; i += 200) {
        const { data, error } = await client.from(TABLE).select('key').eq('workspace_id', wsId).eq('store', store).in('key', keys.slice(i, i + 200));
        if (error) throw error;
        (data || []).forEach(r => still.add(store + '|' + r.key));
      }
    }
    gone = gone.filter(r => !still.has(r.store + '|' + r.key));
  }
  if (gone.length) { warn(`Back after a long time away: ${gone.length} rows are gone from the cloud`); await receive(gone, 'normal'); }
  return gone.length;
}
async function pull(policy = 'normal') {
  const away = policy === 'normal' && st.cursor && srvNow() - Date.parse(st.cursor) > AWAY_DAYS * DAY;
  const since = policy === 'normal' && st.cursor && !away ? new Date(Date.parse(st.cursor) - 60000).toISOString() : null;
  const inCloud = away ? new Set() : null;
  let maxTs = st.cursor || null;
  for (let from = 0; ; from += 1000) {
    let q = client.from(TABLE).select('store,key,value,deleted,updated_at,edited_at,device').eq('workspace_id', wsId).order('updated_at', { ascending: true }).order('key', { ascending: true }).range(from, from + 999);
    if (since) q = q.gt('updated_at', since);
    const { data, error } = await q;
    if (error) throw error;
    await receive(data || [], policy);
    (data || []).forEach(r => { if (!maxTs || r.updated_at > maxTs) maxTs = r.updated_at; if (inCloud) inCloud.add(r.store + '|' + r.key); });
    if (!data || data.length < 1000) break;
  }
  if (inCloud) await dropVanished(inCloud);
  // Everything was just compared, so this PC is caught up to now, even if the team has been quiet for months.
  if (away) { const t = new Date(srvNow() - 300000).toISOString(); if (!maxTs || Date.parse(t) > Date.parse(maxTs)) maxTs = t; }
  st.cursor = maxTs;
  // A row "from the future" means this PC's clock is behind by at least that much.
  if (maxTs && Date.parse(maxTs) - srvNow() > CLOCK_SLACK) st.clockOff = Date.parse(maxTs) - Date.now();
  saveSoon();
}

/* ---------- Documents ---------- */
// Which documents each store mentions is remembered until the store changes (0.20.3), so a sync that
// changed nothing no longer walks every task again.
const refsOf = new Map();
async function allRefs() {
  const refs = new Set();
  for (const n of await localStores()) {
    if (n === 'workspaces') continue;
    const c = await content(n);
    let e = refsOf.get(n);
    if (!e || e.c !== c) { e = { c, refs: new Set() }; docRefs(c, e.refs); refsOf.set(n, e); }
    e.refs.forEach(f => refs.add(f));
  }
  return refs;
}
// The last document pass: which files it covered, when, and whether anything was left to retry.
let docsKey = null, docsAt = 0;
const DOCS_EVERY = 600e3;
const docPath = f => `${wsId}/${f}`;
// The Owner's PCs keep every document. Teammates fetch one when they open it (cloudEnsureDoc).
const keepsAllDocs = () => access === 'owner';
// 0.20: documents move from <user id>/ to <workspace id>/. Copied inside Supabase, so nothing is downloaded.
async function moveOldDocs() {
  if (!wsId || !uid || st.docsMoved === wsId) return;
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.storage.from(BUCKET).list(uid, { limit: 1000, offset });
    if (error) return;
    for (const o of data || []) {
      if (!o || !DOC_RE.test(o.name)) continue;
      const { error: e } = await client.storage.from(BUCKET).copy(`${uid}/${o.name}`, `${wsId}/${o.name}`);
      if (e && !/exist|duplicate|409/i.test(e.message || '')) return; // try again next launch
    }
    if (!data || data.length < 1000) break;
  }
  st.docsMoved = wsId; saveSoon();
}
async function download(file) {
  const { data, error } = await client.storage.from(BUCKET).download(docPath(file));
  if (error || !data) return false;
  const buf = new Uint8Array(await data.arrayBuffer());
  await invoke('save_document', buf, { headers: { 'x-file': file } });
  return true;
}
async function syncDocs() {
  if (docsBusy) { docsAgain = true; return; }
  docsBusy = true;
  try {
    do {
      docsAgain = false;
      const refs = [...await allRefs()].sort(), up = new Set(st.docsUp || []);
      // Same documents as the last complete pass, and it was under 10 minutes ago: nothing to do (0.20.3).
      const key = (wsId || '') + '|' + refs.join('|');
      if (key === docsKey && Date.now() - docsAt < DOCS_EVERY) continue;
      let missing = [], left = false;
      try { missing = await invoke('missing_documents', { files: refs }); } catch (e) { left = true; warn('Could not check documents', e); }
      const miss = new Set(missing);
      if (!keepsAllDocs()) missing = [];
      for (const f of refs) {
        if (up.has(f) || miss.has(f)) continue;
        let buf; try { buf = await invoke('read_document', { file: f }); } catch (e) { left = true; continue; }
        // Only the Owner and Admins may overwrite a team document (0.20.3), so teammates add new files only;
        // a file that's already there is already synced.
        const { error } = await client.storage.from(BUCKET).upload(docPath(f), new Blob([buf], { type: 'application/octet-stream' }), { upsert: isAdmin(), contentType: 'application/octet-stream' });
        if (error && /exist|duplicate|409/i.test(error.message || '') && !isAdmin()) { up.add(f); continue; }
        if (error) { if (/exceed|too large|413/i.test(error.message || '')) { up.add(f); notice({ kind: 'error', title: 'A document is too big to sync', detail: 'Supabase’s free plan takes files up to 50 MB.' }); } else { left = true; warn('Document not uploaded: ' + f, error); } continue; }
        up.add(f);
      }
      for (const f of missing) { try { if (await download(f)) up.add(f); else left = true; } catch (e) { left = true; warn('Document not downloaded: ' + f, e); } }
      docsKey = left ? null : key; docsAt = Date.now();
      st.docsUp = [...up];
      setStatus({ docs: up.size });
      saveSoon();
    } while (docsAgain);
  } finally { docsBusy = false; }
}
// Opening a document that hasn't arrived on this PC yet: fetch it now.
export async function cloudEnsureDoc(file) {
  if (!client || !uid || !wsId || !DOC_RE.test(file)) return false;
  try { const ok = await download(file); if (ok) { st.docsUp = [...new Set([...(st.docsUp || []), file])]; saveSoon(); } return ok; } catch (e) { return false; }
}
export async function cloudDeleteDoc(file) {
  if (!client || !uid || !wsId || !DOC_RE.test(file)) return;
  // Only the Owner and Admins delete the team's copy (0.20.3). A teammate's delete only affects this PC.
  if (!isAdmin()) return;
  try { await client.storage.from(BUCKET).remove([docPath(file)]); st.docsUp = (st.docsUp || []).filter(f => f !== file); saveSoon(); } catch (e) { warn('Team document not deleted: ' + file, e); }
}

/* ---------- Profile (0.19.13) ----------
   Your name, photo, role, phone, status and time zone live in the `profiles` table, one row per
   person, so they're the same on every PC (and teammates can see them once teams arrive).
   The photo is a small JPEG (about 20 KB) kept right in the row. The newer edit wins.
   If the profiles table hasn't been created yet, tasks keep syncing and only the profile waits. */
const PROFILE_TABLE = 'profiles';
let profileApply = null, profileGet = null, profileBusy = false, profileAgain = false, profileChannel = null;
// The app registers how to read its profile ({ name, role, …, editedAt }) and how to take one from the cloud.
export function cloudProfileLive(apply, get) {
  profileApply = apply; profileGet = get;
  if (uid && st && st.ready) syncProfile().catch(() => {});
  return () => { if (profileApply === apply) { profileApply = null; profileGet = null; } };
}
// Called after you edit your profile here.
export function cloudProfileNote() {
  if (!st) return;
  st.profileDirty = true; saveSoon();
  if (uid && st.ready) syncProfile().catch(() => {});
}
const profileRow = p => ({
  user_id: uid, email: st.email || null, name: p.name || null, role: p.role || null, phone: p.phone || null, photo: p.photo || null,
  status: p.status || null, status_note: p.statusNote || null, status_until: p.statusUntil || null, time_zone: p.timeZone || null,
  edited_at: p.editedAt || Date.now(), device: DEVICE_ID,
});
const profileFrom = r => ({
  name: r.name || '', role: r.role || '', phone: r.phone || '', photo: r.photo || '', status: r.status || '', statusNote: r.status_note || '',
  statusUntil: r.status_until || null, timeZone: r.time_zone || '', editedAt: r.edited_at || 0,
});
const missingTable = e => /profiles/i.test(String(e && (e.message || e))) && /exist|could not find|schema cache/i.test(String(e && (e.message || e)));
function takeProfile(r) {
  if (!r || r.user_id !== uid || r.device === DEVICE_ID || !profileApply || !profileGet) return;
  const mine = profileGet();
  if (!mine) return;
  if ((r.edited_at || 0) > (mine.editedAt || 0)) { profileApply(profileFrom(r)); st.profileDirty = false; saveSoon(); }
}
async function syncProfile() {
  if (!client || !uid || !profileGet) return;
  if (profileBusy) { profileAgain = true; return; }
  const mine = profileGet();
  if (!mine) return;
  profileBusy = true;
  try {
    const { data, error } = await client.from(PROFILE_TABLE).select('*').eq('user_id', uid).maybeSingle();
    if (error) throw error;
    if (data && (data.edited_at || 0) > (mine.editedAt || 0)) { profileApply(data.device !== DEVICE_ID ? profileFrom(data) : { editedAt: data.edited_at }); st.profileDirty = false; }
    else if (!data || st.profileDirty || (mine.editedAt || 0) > (data.edited_at || 0)) {
      const { error: e2 } = await client.from(PROFILE_TABLE).upsert([profileRow(mine)], { onConflict: 'user_id' });
      if (e2) throw e2;
      st.profileDirty = false;
    }
    saveSoon();
    setStatus({ profileMissing: false });
    if (!profileChannel) {
      profileChannel = client.channel('profiles-' + DEVICE_ID)
        .on('postgres_changes', { event: '*', schema: 'public', table: PROFILE_TABLE, filter: `user_id=eq.${uid}` }, p => takeProfile(p.new))
        .subscribe();
    }
  } catch (e) {
    if (missingTable(e)) setStatus({ profileMissing: true });
  } finally { profileBusy = false; if (profileAgain) { profileAgain = false; syncProfile().catch(() => {}); } }
}
function dropProfileChannel() { if (profileChannel) { try { client.removeChannel(profileChannel); } catch (e) {} profileChannel = null; } }

/* ---------- The sync loop ---------- */
async function loop() {
  if (frozen || outdated || !client || !uid || !wsId || !st.ready || !caughtUp) return;
  if (loopBusy) { loopAgain = true; return; }
  loopBusy = true;
  try {
    do {
      loopAgain = false;
      if (dirty.size) { setStatus({ phase: 'syncing', pending: pendingCount() }); await pushAll(); }
    } while (loopAgain || dirty.size);
    deleteOk = false;
    retryMs = 0;
    st.lastSync = Date.now(); saveSoon();
    setStatus({ phase: 'synced', pending: 0, lastSync: st.lastSync, error: null });
    moveOldDocs().catch(() => {}).then(() => syncDocs()).catch(() => {});
    if (st.profileDirty) syncProfile().catch(() => {});
  } catch (e) {
    const offline = isOffline(e);
    if (e && (e.code === '42501' || /row-level security/i.test(String(e.message || '')))) checkMember().catch(() => {});
    if (e && e.code === 'TKVER') loadMinVersion().catch(() => {}); // refused as too old: the lock shows once the minimum is read
    retryMs = Math.min(60000, retryMs ? retryMs * 2 : 4000);
    if (!offline) warn('Sync failed', e);
    setStatus({ phase: offline ? 'offline' : 'error', error: String(e && (e.message || e)), pending: pendingCount() });
    kick(retryMs);
  } finally { loopBusy = false; }
}
// No connection, or Supabase can't be reached: just offline, which never locks the app.
const isOffline = e => !navigator.onLine || /fetch|network|failed to|timeout/i.test(String(e && (e.message || e)));
async function catchUp() {
  try { await pull('normal'); caughtUp = true; loadMinVersion().catch(() => {}); kick(0); syncProfile().catch(() => {}); checkMember().catch(() => {}); forgetOld().catch(e => warn('Old sync notes not cleared', e)); }
  catch (e) { warn('Catch-up failed', e); setStatus({ phase: isOffline(e) ? 'offline' : 'error', error: String(e && (e.message || e)) }); retryMs = Math.min(60000, retryMs ? retryMs * 2 : 4000); setTimeout(catchUp, retryMs); }
}
function connect() {
  if (channel) { try { client.removeChannel(channel); } catch (e) {} channel = null; }
  channel = client.channel('records-' + DEVICE_ID)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `workspace_id=eq.${wsId}` }, p => {
      // A row deleted outright in Supabase (the app itself only marks rows deleted) is taken as a
      // deletion here too, so this PC doesn't keep the old copy (0.20.3). Only the row's key arrives.
      if (p.eventType === 'DELETE') {
        const o = p.old || {};
        if (o.store && o.key && (!o.workspace_id || o.workspace_id === wsId)) receive([{ store: o.store, key: o.key, value: null, deleted: true, updated_at: null, edited_at: srvNow(), device: null }]).catch(e => warn('Cloud delete not applied', e));
        return;
      }
      if (!p.new || !p.new.store) return;
      // The cursor only moves once the change is saved here, so a failed one is fetched again (0.20.3).
      receive([p.new])
        .then(() => { if (p.new.updated_at && (!st.cursor || p.new.updated_at > st.cursor)) st.cursor = p.new.updated_at; })
        .catch(e => { warn('Cloud change not applied', e); setTimeout(() => { if (uid && st.ready && !frozen) catchUp(); }, 5000); });
    })
    .subscribe(s => { if (s === 'SUBSCRIBED') catchUp(); });
  // Each store is checked once for changes made while Tasks was closed or offline, after the
  // first pull, so an older offline edit never overwrites a newer one from another PC.
  caughtUp = false;
  localStores().then(ns => ns.forEach(n => dirty.add(n)));
}

function applyMinVersion(min) {
  const v = verParts(min) ? min : null;
  if (st && st.minVersion !== v) { st.minVersion = v; saveSoon(); }
  const was = outdated;
  outdated = olderThan(APP_VERSION, v);
  setStatus({ outdated, minVersion: v });
  // The minimum was lowered or cleared: sync picks up where it stopped.
  if (was && !outdated && uid && st && st.ready) { retryMs = 0; catchUp(); }
}
async function loadMinVersion() {
  if (!client || !uid || !wsId) return;
  const { data, error } = await client.from('app_settings').select('min_version').eq('workspace_id', wsId).maybeSingle();
  if (error) {
    // A Supabase project without min-version-0.21.0.sql has no minimum.
    if (error.code === '42P01' || error.code === 'PGRST205' || /app_settings/i.test(String(error.message || ''))) applyMinVersion(null);
    return;
  }
  applyMinVersion(data ? data.min_version : null);
  if (!settingsChannel) {
    settingsChannel = client.channel('settings-' + DEVICE_ID)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: `workspace_id=eq.${wsId}` }, p => { if (p.new && 'min_version' in p.new) applyMinVersion(p.new.min_version); })
      .subscribe();
  }
}
function dropSettingsChannel() { if (settingsChannel) { try { client.removeChannel(settingsChannel); } catch (e) {} settingsChannel = null; } }
// Checked again every 30 minutes, in case the live update was missed.
setInterval(() => { loadMinVersion().catch(() => {}); }, 30 * 60e3);
// Try again from the "can't sync" lock: reconnects from wherever it stopped.
export async function cloudRetry() {
  if (!st || !st.url) return;
  retryMs = 0;
  try {
    if (!client) await makeClient();
    if (uid && wsId && st.ready) { setStatus({ phase: 'connecting', error: null }); connect(); return; }
    const { data } = await client.auth.getSession();
    if (data && data.session && data.session.user) { uid = data.session.user.id; setStatus({ phase: 'connecting', error: null }); await begin(data.session.user); }
    else setStatus({ phase: 'signin', error: null });
  } catch (e) { fail(e); }
}

/* ---------- The team (0.20) ---------- */
let team = { members: [], invites: [] };
const teamSubs = new Set();
const isAdmin = () => access === 'owner' || access === 'admin';
export const cloudAccess = () => access;
export const cloudMe = () => uid;
export const cloudTeam = () => team;
export function onCloudTeam(f) { teamSubs.add(f); f(team); return () => teamSubs.delete(f); }
// Removed from the team (0.20.3). The realtime message about it often never arrives (Supabase can't
// filter deletes), so this is also checked after every reconnect, whenever the team list no longer
// has this person, and when the cloud refuses a change. join_workspace decides: it lets an invited
// person back in and refuses everyone else, who is then signed out here with the "removed" message.
let leaving = false;

async function leftTeam() {
  if (leaving || !client || !uid) return;
  leaving = true;
  try {
    const { error } = await client.rpc('join_workspace');
    if (!error) return; // still (or again) on the team
    if (error.code === '42501' || /isn.?t invited/i.test(String(error.message || ''))) { await cloudSignOut(); setStatus({ phase: 'removed' }); }
  } catch (e) { warn('Membership check failed', e); } finally { leaving = false; }
}
async function checkMember() {
  if (!client || !uid || !wsId) return;
  const { data, error } = await client.from('members').select('user_id').eq('workspace_id', wsId).eq('user_id', uid);
  if (!error && data && !data.length) await leftTeam();
}
const profileBits = p => ({ email: p.email || '', name: p.name || p.email || '', photo: p.photo || '', timeZone: p.time_zone || '', status: p.status || '', statusNote: p.status_note || '' });
async function loadTeam() {
  if (!client || !wsId) return;
  const { data: ms, error } = await client.from('members').select('user_id,access,job_role,teams,joined_at').eq('workspace_id', wsId);
  if (error) throw error;
  const ids = (ms || []).map(m => m.user_id);
  const { data: ps } = ids.length ? await client.from(PROFILE_TABLE).select('user_id,email,name,photo,time_zone,status,status_note').in('user_id', ids) : { data: [] };
  const pr = new Map((ps || []).map(p => [p.user_id, p]));
  let invites = [];
  const mine = (ms || []).find(m => m.user_id === uid);
  if (!mine && uid && !leaving) { await leftTeam(); if (!uid || !wsId) return; }
  access = mine ? mine.access : access;
  if (isAdmin()) { const { data: iv } = await client.from('invites').select('email,access,job_role,teams,invited_at,accepted_at').eq('workspace_id', wsId).is('accepted_at', null).order('invited_at'); invites = iv || []; }
  team = {
    members: (ms || []).map(m => { const p = pr.get(m.user_id) || {}; return { id: m.user_id, access: m.access, role: m.job_role || '', teams: m.teams || [], joinedAt: m.joined_at, ...profileBits(p) }; })
      .sort((a, b) => (a.access === 'owner' ? -1 : b.access === 'owner' ? 1 : (a.name || '').localeCompare(b.name || ''))),
    invites: invites.map(i => ({ email: i.email, access: i.access, role: i.job_role || '', teams: i.teams || [], invitedAt: i.invited_at })),
  };
  setStatus({ access });
  teamSubs.forEach(f => f(team));
  if (!teamChannel) {
    teamChannel = client.channel('members-' + DEVICE_ID)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `workspace_id=eq.${wsId}` }, p => {
        // Removed from the team on another PC: stop syncing here.
        if (p.eventType === 'DELETE' && p.old && p.old.user_id === uid) { cloudSignOut().then(() => setStatus({ phase: 'removed' })).catch(() => {}); return; }
        loadTeam().catch(() => {});
      })
      // A teammate's name and photo arrive a moment after they join (and whenever they edit them).
      .on('postgres_changes', { event: '*', schema: 'public', table: PROFILE_TABLE }, p => {
        const id = (p.new && p.new.user_id) || (p.old && p.old.user_id);
        if (!id || id === uid || !team.members.some(m => m.id === id)) return;
        // The changed row arrives with the message, so only that person is updated (0.20.3), instead of
        // downloading every teammate and their photo again.
        // The message may leave out a photo that didn't change, so then just that one row is read.
        const put = row => { team = { ...team, members: team.members.map(m => (m.id === id ? { ...m, ...profileBits(row) } : m)) }; teamSubs.forEach(f => f(team)); };
        if (p.eventType === 'DELETE') { loadTeam().catch(() => {}); return; }
        if (p.new && typeof p.new.photo === 'string' && p.new.photo) { put(p.new); return; }
        client.from(PROFILE_TABLE).select('user_id,email,name,photo,time_zone,status,status_note').eq('user_id', id).maybeSingle()
          .then(({ data, error }) => { if (error || !data) throw error || new Error('no row'); put(data); })
          .catch(e => { warn('Teammate not refreshed', e); loadTeam().catch(() => {}); });
      })
      .subscribe();
  }
}
function dropTeamChannel() { if (teamChannel) { try { client.removeChannel(teamChannel); } catch (e) {} teamChannel = null; } }
export const cloudReloadTeam = () => loadTeam();
const teamErr = e => { const m = String((e && e.message) || e || ''); if (/row-level security|permission|42501/i.test(m)) return new Error('Only the Owner and Admins can do that.'); if (/duplicate|23505/i.test(m)) return new Error('That email is already invited.'); return new Error(m || 'That didn’t work. Try again.'); };
const cleanTeams = t => [...new Set((t || []).map(x => String(x).trim()).filter(Boolean))];
export async function cloudInvite({ email, access: a = 'member', role = '', teams = [] }) {
  email = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('That doesn’t look like an email address.');
  if (team.members.some(m => (m.email || '').toLowerCase() === email)) throw new Error('They’re already on the team.');
  const { error } = await client.from('invites').insert([{ workspace_id: wsId, email, access: a === 'admin' ? 'admin' : 'member', job_role: role || null, teams: cleanTeams(teams) }]);
  if (error) throw teamErr(error);
  await loadTeam();
}
export async function cloudUpdateInvite(email, { access: a, role, teams }) {
  const patch = {};
  if (a) patch.access = a === 'admin' ? 'admin' : 'member';
  if (role !== undefined) patch.job_role = role || null;
  if (teams) patch.teams = cleanTeams(teams);
  const { error } = await client.from('invites').update(patch).eq('workspace_id', wsId).eq('email', email);
  if (error) throw teamErr(error);
  await loadTeam();
}
export async function cloudCancelInvite(email) {
  const { error } = await client.from('invites').delete().eq('workspace_id', wsId).eq('email', email);
  if (error) throw teamErr(error);
  await loadTeam();
}
export async function cloudUpdateMember(id, { access: a, role, teams }) {
  const patch = {};
  if (a) patch.access = a === 'admin' ? 'admin' : 'member';
  if (role !== undefined) patch.job_role = role || null;
  if (teams) patch.teams = cleanTeams(teams);
  const { data, error } = await client.from('members').update(patch).eq('workspace_id', wsId).eq('user_id', id).select('user_id');
  if (error) throw teamErr(error);
  if (!data || !data.length) throw new Error('Only the Owner and Admins can change that, and nobody can change their own access.');
  await loadTeam();
}
export async function cloudRemoveMember(id) {
  const { data, error } = await client.from('members').delete().eq('workspace_id', wsId).eq('user_id', id).select('user_id');
  if (error) throw teamErr(error);
  if (!data || !data.length) throw new Error('You can’t remove yourself or the Owner.');
  await loadTeam();
}
// Time-based automations: the first PC to claim a run does it. true: run it here; false: another PC did; null: couldn't ask.
// strict (housekeeping, 0.20.3): while sync is set up but not connected yet, answer null instead of going ahead.
export async function cloudClaim(taskId, ruleKey, strict) {
  if (strict && (!st || (st.ready && (!client || !uid || !wsId || !caughtUp)))) return null;
  if (!client || !uid || !wsId || !st || !st.ready) return true; // not syncing: this PC is the only one
  try {
    const { error } = await client.from('automation_runs').insert([{ workspace_id: wsId, task_id: String(taskId), rule_key: String(ruleKey), device: DEVICE_ID }]);
    if (!error) return true;
    if (error.code === '23505' || /duplicate/i.test(error.message || '')) return false;
    // automation_runs missing (teams update not run): this PC goes ahead. Offline or a hiccup: ask again later.
    if (/automation_runs|schema cache|does not exist/i.test(error.message || '')) return true;
    return null;
  } catch (e) { return null; }
}

/* ---------- Setup, sign-in, first sync ---------- */
const DEFAULT_STATE = () => ({ version: 1, stores: {}, docsUp: [], v2: [] });
/* Where the sign-in is kept (0.20.3). It used to sit in the WebView's storage as plain text, where
   anything that can read the profile folder could copy it. Now Windows encrypts it for this Windows
   account (secret_get / secret_set in lib.rs). A sign-in saved by an earlier version is moved over the
   first time it's read. If the protected store can't be used, the old place still works, so nobody is
   locked out; that's written to the log. */
const plain = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  del: k => { try { localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } },
};
const sessionStore = {
  getItem: async k => {
    try { const v = await invoke('secret_get', { key: k }); if (typeof v === 'string') return v; }
    catch (e) { warn('Protected sign-in store not readable', e); return plain.get(k); }
    const old = plain.get(k);
    if (old !== null) { try { await invoke('secret_set', { key: k, value: old }); plain.del(k); } catch (e) { warn('Sign-in not moved to the protected store', e); } }
    return old;
  },
  setItem: async (k, v) => {
    try { await invoke('secret_set', { key: k, value: v }); plain.del(k); }
    catch (e) { warn('Sign-in kept in the old place', e); plain.set(k, v); }
  },
  removeItem: async k => {
    try { await invoke('secret_remove', { key: k }); } catch (e) { warn('Protected sign-in not removed', e); }
    plain.del(k);
  },
};
async function makeClient() {
  const { createClient } = await import('@supabase/supabase-js');
  client = createClient(st.url, st.key, { global: { headers: { 'x-taskit-version': APP_VERSION } }, auth: { persistSession: true, autoRefreshToken: true, storageKey: 'tasks-cloud-auth', storage: sessionStore }, realtime: { params: { eventsPerSecond: 20 } } });
  client.auth.onAuthStateChange(ev => {
    if (ev === 'SIGNED_OUT' && uid) { uid = null; wsId = null; caughtUp = false; setStatus({ phase: 'signin' }); }
  });
}
const fail = e => setStatus({ phase: isOffline(e) ? 'offline' : 'error', error: String(e && (e.message || e)) });
async function dropSession() { const was = uid; uid = null; wsId = null; try { if (was) await client.auth.signOut(); } catch (e) {} }

// Runs once in the main window at launch.
export async function cloudStart() {
  if (started) return;
  started = true;
  try { const raw = await invoke('read_store', { name: 'cloud' }); st = raw ? { ...DEFAULT_STATE(), ...JSON.parse(raw) } : DEFAULT_STATE(); }
  catch (e) { st = DEFAULT_STATE(); }
  // The project built into the app (cloud-config.js) is used unless this PC was pointed at another one.
  if (!st.url && CLOUD_URL && CLOUD_PUBLISHABLE_KEY) { st.url = CLOUD_URL.replace(/\/+$/, ''); st.key = CLOUD_PUBLISHABLE_KEY; }
  if (st.url) applyMinVersion(st.minVersion);
  setStatus({ phase: st.url ? 'connecting' : 'off', builtIn: !!CLOUD_URL, email: st.email || null, lastSync: st.lastSync || null, docs: (st.docsUp || []).length, url: st.url || '' });
  // Writes from task windows.
  listen('tasks-data', e => { const p = e.payload; if (p && p.from !== 'main' && p.from !== 'cloud') cloudNote(storeFor('data', p.ws || 'product'), p.data); }).catch(() => {});
  listen('tasks-arch', e => { const p = e.payload; if (p && p.from !== 'main' && p.from !== 'cloud') cloudNote(storeFor('archive', p.ws || 'product'), { version: 1, ...p.data }); }).catch(() => {});
  window.addEventListener('online', () => { if (uid && st.ready) { retryMs = 0; catchUp(); } });
  // Coming back to the window after a while (a laptop waking from sleep, or Tasks reopened from the tray
  // or menu bar) checks the cloud straight away instead of waiting for the live connection to recover (0.21.1).
  let lastLook = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !uid || !st.ready || frozen || Date.now() - lastLook < 60000) return;
    lastLook = Date.now(); catchUp();
  });
  if (!st.url) return;
  try {
    await makeClient();
    const { data } = await client.auth.getSession();
    if (data && data.session && data.session.user) { uid = data.session.user.id; await begin(data.session.user); }
    else setStatus({ phase: 'signin' });
  } catch (e) { fail(e); }
}
export async function cloudConfigure(url, key) {
  url = String(url || '').trim().replace(/\/+$/, ''); key = String(key || '').trim();
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) throw new Error('The Project URL looks like https://abcdefgh.supabase.co');
  if (key.length < 20) throw new Error('Paste the publishable (anon) key.');
  if (/service_role|^sb_secret_/.test(key) || (() => { try { return JSON.parse(atob(key.split('.')[1])).role === 'service_role'; } catch (e) { return false; } })())
    throw new Error('That is the secret (service role) key. Use the publishable (anon) key instead; the secret key must never be in an app.');
  st = { ...DEFAULT_STATE(), url, key };
  await saveState();
  await makeClient();
  setStatus({ phase: 'signin', url, error: null });
}
// Google sign-in (0.20): the app's own Google window hands its ID token to Supabase. The token isn't kept.
export async function cloudSignInGoogle(idToken) {
  if (!client) throw new Error('Cloud sync isn’t set up on ' + MY + ' yet.');
  if (!idToken) throw new Error('Google didn’t send a sign-in token. Try again.');
  const { data, error } = await client.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) {
    if (/invite/i.test(error.message || '') || error.status === 403) { setStatus({ phase: 'notinvited' }); return; }
    throw new Error(error.message);
  }
  uid = data.user.id;
  await begin(data.user);
}
export async function cloudSignIn(email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(/invalid login/i.test(error.message) ? 'Wrong email or password.' : error.message);
  uid = data.user.id;
  await begin(data.user);
}
async function countLocal() {
  let n = 0;
  for (const name of await localStores()) if (isData(name)) n += Object.keys(split(name, await content(name))).filter(k => k.startsWith('t/')).length;
  return n;
}
// Joining the team workspace (0.20). Returns false when this person can't get in.
async function joinTeam() {
  const { data, error } = await client.rpc('join_workspace');
  if (error) {
    const m = String(error.message || '');
    if (error.code === '42501' || /isn.?t invited/i.test(m)) { await dropSession(); setStatus({ phase: 'notinvited', email: st.email }); return false; }
    if (error.code === 'PGRST202' || /could not find the function|schema cache|does not exist/i.test(m)) {
      setStatus({ phase: 'error', error: 'This Supabase project hasn’t had the teams update yet. Run teams-0.20.sql in its SQL Editor, then try again.' });
      return false;
    }
    throw error;
  }
  if (st.wsId && st.wsId !== data) { st = { ...DEFAULT_STATE(), url: st.url, key: st.key, uid: st.uid, email: st.email }; }
  wsId = data; st.wsId = data; saveSoon();
  await loadMinVersion().catch(() => {});
  await loadTeam().catch(() => {});
  return true;
}
async function begin(user) {
  if (st.uid && st.uid !== user.id) { st = { ...DEFAULT_STATE(), url: st.url, key: st.key }; }
  st.uid = user.id; st.email = user.email || st.email; saveSoon();
  setStatus({ email: st.email });
  if (!(await joinTeam())) return;
  if (st.ready) { setStatus({ phase: 'connecting' }); connect(); return; }
  setStatus({ phase: 'checking' });
  const { count, error } = await client.from(TABLE).select('key', { count: 'exact', head: true }).eq('deleted', false).like('key', 't/%');
  if (error) throw error;
  const local = await countLocal();
  if (!count) return cloudFirstSync('upload');
  if (!local) return cloudFirstSync('replace');
  setStatus({ phase: 'choose', remoteCount: count, localCount: local });
}
// 'upload' (the cloud is empty), 'replace' (take the cloud's data), or 'combine' (keep both; newer edit wins).
export async function cloudFirstSync(mode) {
  setStatus({ phase: 'first', mode });
  try {
    if (mode !== 'upload' && (await countLocal())) {
      // A copy of this PC's data, just in case, next to the data files.
      try {
        const d = new Date(), p = n => String(n).padStart(2, '0');
        await invoke('safety_backup', { stamp: `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}` });
      } catch (e) { warn('Safety backup before the first sync failed', e); }
    }
    st.stores = {}; st.cursor = null;
    if (mode !== 'upload') {
      await pull(mode);
      if (mode === 'replace') {
        // Tasks that only exist on this PC are dropped (they're in the backup).
        for (const name of await localStores()) {
          const c = await content(name);
          if (unreadable.has(name)) continue;
          const s = sstore(name), patch = {};
          // List items that only an older PC's whole-list row has (no item rows in the cloud yet) are kept.
          const legacy = {};
          Object.keys(s.shadow).forEach(k => { if (k.startsWith('m/') && s.shadow[k] !== null) Object.assign(legacy, fieldRows(name, k.slice(2), JSON.parse(s.shadow[k]))); });
          Object.keys(split(name, c)).forEach(k => { if (isItem(k) && s.shadow[k] === undefined && !(k.startsWith('l/') && k in legacy)) patch[k] = null; });
          if (Object.keys(patch).length) await applyPatch(name, c, patch);
        }
      }
    }
    st.ready = true; await saveState();
    setStatus({ phase: 'connecting' });
    connect();
  } catch (e) { fail(e); }
}
export async function cloudSignOut() {
  try { if (channel) client.removeChannel(channel); } catch (e) {}
  channel = null; caughtUp = false; dropProfileChannel(); dropTeamChannel(); dropSettingsChannel();
  wsId = null; access = null; team = { members: [], invites: [] }; teamSubs.forEach(f => f(team));
  const was = uid; uid = null;
  try { if (was) await client.auth.signOut(); } catch (e) {}
  uid = null;
  // Keep the data on this PC; the next sign-in on this PC compares it with the cloud again.
  st = { ...DEFAULT_STATE(), url: st.url, key: st.key, email: st.email, minVersion: st.minVersion || null };
  await saveState();
  setStatus({ phase: 'signin', lastSync: null });
}
export async function cloudForget() {
  await cloudSignOut().catch(() => {});
  client = null; st = DEFAULT_STATE(); await saveState();
  setStatus({ phase: 'off', email: null, url: '' });
}
// Sync now also confirms deletions that were held back (0.20.3).
export function cloudSyncNow() { if (uid && st && st.ready) { deleteOk = true; heldNoted.clear(); localStores().then(ns => { ns.forEach(n => dirty.add(n)); catchUp(); }); } }

/* ---------- Restoring a backup (0.20.3) ----------
   Sync stops while the files are swapped. Afterwards this PC is treated like a new one: it compares its
   restored data with the team's and asks whether to use the cloud's data or combine both. The restored
   backup is never sent up as if every old task were a new edit, which would wipe newer team changes. */
const idle = async () => { const t0 = Date.now(); while ((loopBusy || saveBusy || docsBusy) && Date.now() - t0 < 5000) await new Promise(r => setTimeout(r, 50)); };
export async function cloudPause() {
  frozen = true; clearTimeout(timer); clearTimeout(saveT);
  await idle();
  await recvQ.catch(() => {});
}
export function cloudResume() { frozen = false; if (uid && st && st.ready) kick(0); }
export async function cloudForgetSyncState() {
  if (!st || !st.ready) return;
  st = { ...st, ready: false, stores: {}, cursor: null };
  await invoke('write_store', { name: 'cloud', content: JSON.stringify(st) });
}
// Before Tasks quits: send what's left, but never hold up quitting for long.
export async function cloudFlush(ms = 2500) {
  if (!uid || !st || !st.ready) return;
  clearTimeout(timer);
  await Promise.race([loop(), new Promise(r => setTimeout(r, ms))]);
}

/* ---------- Recovering a damaged store from the cloud (0.20.3) ----------
   The damaged file is kept aside in the data folder, and this PC takes the team's copy of that store,
   exactly as the cloud has it. Nothing is sent up. */
export const cloudCanRecover = () => !!(client && uid && wsId && st && st.ready);
export async function cloudRecoverStore(name) {
  if (!cloudCanRecover()) throw new Error('Cloud sync isn’t connected on ' + MY + '.');
  if (!STORE_RE.test(name)) throw new Error('Unknown store');
  const rows = [];
  for (const store of [name, name + ITEMS]) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await client.from(TABLE).select('store,key,value,deleted,updated_at,edited_at,device')
        .eq('workspace_id', wsId).eq('store', store).order('key', { ascending: true }).range(from, from + 999);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
  }
  await invoke('set_aside_store', { name });
  unreadable.delete(name);
  delete st.stores[name];
  cache[name] = null;
  delete live[name];
  await receive(rows, 'replace');
  if (cache[name] === null) await invoke('write_store', { name, content: JSON.stringify(isArch(name) ? { version: 1, archived: {}, trash: {} } : { version: 4, tasks: {} }) });
  await saveState();
}

/* ---------- Workspaces that aren't open (0.20.3) ----------
   Their time-based automations, archiving and Trash cleanup run in the background. Reads and edits take
   turns with incoming cloud changes, so neither works from an old copy, and the change is synced as usual. */
export function cloudReadStore(name) {
  const p = recvQ.then(() => content(name));
  recvQ = p.catch(() => {});
  return p;
}
// fn(content) returns the new content, or null for no change. Never touches a store that's open in a window
// here (that window saves it) or one whose file couldn't be read.
export function cloudEditStore(name, fn) {
  const p = recvQ.then(async () => {
    if (frozen || live[name] || !STORE_RE.test(name)) return false;
    const c = await content(name);
    if (c === undefined || unreadable.has(name)) return false;
    const next = fn(c);
    if (!next || next === c) return false;
    cache[name] = next;
    try { await invoke('write_store', { name, content: JSON.stringify(next) }); }
    catch (e) { cache[name] = c; throw e; }
    announce(name, next);
    if (started) { dirty.add(name); kick(600); }
    return true;
  });
  recvQ = p.catch(() => {});
  return p;
}
