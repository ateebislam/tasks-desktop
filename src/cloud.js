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
     changed are taken. Whole-list rows from updated PCs are ignored. Nothing in Supabase changes. */
import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { CLOUD_URL, CLOUD_PUBLISHABLE_KEY } from './cloud-config.js';

const ls = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
};
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
// Which PC a change or a running timer came from.
export const DEVICE_ID = (() => { let id = ls.get('tasks-device-id'); if (!id) { id = rid(); ls.set('tasks-device-id', id); } return id; })();

const TABLE = 'records', BUCKET = 'documents';
const META = ['rules', 'projects', 'stages', 'buckets', 'labels', 'settings', 'looseDocs'];
const STORE_RE = /^(?:(?:data|archive)(?:-[a-z0-9_]{1,32})?|workspaces)$/;
const ITEMS = ':items'; // companion cloud store for list items and settings fields (0.19.4)
const CLOUD_STORE_RE = /^(?:(?:data|archive)(?:-[a-z0-9_]{1,32})?|workspaces)(?::items)?$/;
// Lists synced item by item. Ordered lists keep their order (each row carries its place).
const DATA_LISTS = { rules: 'ordered', stages: 'ordered', projects: 'set', buckets: 'set', looseDocs: 'set' };
const DATA_OBJS = ['settings', 'labels'];
const listsOf = name => (isData(name) ? DATA_LISTS : name === 'workspaces' ? { list: 'ordered' } : {});
const objsOf = name => (isData(name) ? DATA_OBJS : []);
const isSplitKey = k => k.startsWith('l/') || k.startsWith('f/');
const cloudStoreOf = (name, key) => (isSplitKey(key) ? name + ITEMS : name);
const enc = s => encodeURIComponent(String(s));
const DOC_RE = /^[a-z0-9]{20}(?:\.[a-z0-9]{1,8})?$/;
const isData = n => n === 'data' || n.startsWith('data-');
const isArch = n => n === 'archive' || n.startsWith('archive-');
const storeFor = (base, ws) => (ws === 'product' ? base : `${base}-${ws}`);
const J = v => (v === undefined || v === null ? null : JSON.stringify(v));

/* ---------- Stores <-> rows ---------- */
// Watch folders are paths on this PC, so they stay local.
const localOnly = s => { if (!s || typeof s !== 'object') return s; const { watchFolders, ...rest } = s; return rest; };
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
      else if (p === 'm/' && META.includes(id)) n[id] = id === 'settings' ? { ...(v || {}), ...(n.settings && n.settings.watchFolders ? { watchFolders: n.settings.watchFolders } : {}) } : v;
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
const unwrap = (key, v) => (key && key.startsWith('l/') && v && typeof v === 'object' ? v.v : v);
const itemTime = v => (v && typeof v === 'object' ? v.updatedAt || v.archivedAt || v.deletedAt || 0 : 0);
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
let st = null, client = null, uid = null, channel = null;
let status = { phase: 'loading' };
const subs = new Set(), noticeSubs = new Set();
const live = {};   // store name -> function applying a patch to the open window's state
const cache = {};  // store name -> latest content known here
const dirty = new Set();
let caughtUp = false, started = false, loopBusy = false, loopAgain = false, timer = null, retryMs = 0, docsBusy = false, docsAgain = false;

const setStatus = patch => { status = { ...status, ...patch }; subs.forEach(f => f(status)); };
export const cloudStatus = () => status;
export function onCloudStatus(f) { subs.add(f); f(status); return () => subs.delete(f); }
// Notices: { kind: 'conflict', title, kept: 'here' | 'other' } and { kind: 'error', title, detail }.
export function onCloudNotice(f) { noticeSubs.add(f); return () => noticeSubs.delete(f); }
const notice = n => noticeSubs.forEach(f => f(n));

let saveBusy = false, saveNext = false;
async function saveState() {
  if (saveBusy) { saveNext = true; return; }
  saveBusy = true;
  try { do { saveNext = false; await invoke('write_store', { name: 'cloud', content: JSON.stringify(st) }); } while (saveNext); }
  catch (e) {} finally { saveBusy = false; }
}
let saveT = null;
const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(saveState, 400); };
const sstore = name => { const s = st.stores[name] || (st.stores[name] = { shadow: {}, dirtyAt: {} }); if (!s.itemAt) s.itemAt = {}; if (!s.legacySeen) s.legacySeen = {}; return s; };
const pendingCount = () => Object.values(st.stores).reduce((n, s) => n + Object.keys(s.dirtyAt || {}).length, 0);

async function content(name) {
  if (cache[name] !== undefined) return cache[name];
  let c = null;
  try { const raw = await invoke('read_store', { name }); c = raw ? JSON.parse(raw) : null; } catch (e) {}
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
  if (!started || !STORE_RE.test(name)) return;
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
  const s = sstore(name), rows = split(name, cache[name]), now = Date.now(), out = [];
  Object.entries(rows).forEach(([k, v]) => {
    const j = J(v);
    if ((s.shadow[k] ?? null) !== j) { s.dirtyAt[k] = s.dirtyAt[k] || itemTime(v) || now; out.push({ key: k, value: v, j }); }
    else delete s.dirtyAt[k];
  });
  Object.keys(s.shadow).forEach(k => {
    if (s.shadow[k] !== null && !(k in rows)) { s.dirtyAt[k] = s.dirtyAt[k] || now; out.push({ key: k, value: null, j: null }); }
  });
  Object.keys(s.dirtyAt).forEach(k => { if (!(k in rows) && (s.shadow[k] ?? null) === null) delete s.dirtyAt[k]; });
  return out;
}
async function pushAll() {
  const names = [...dirty]; dirty.clear();
  let sent = 0;
  for (const name of names) {
    if (cache[name] === undefined) await content(name);
    // Items go before the whole-list rows, so a PC that reads both always sees the items first.
    const changes = diff(name).sort((a, b) => (a.key.startsWith('m/') ? 1 : 0) - (b.key.startsWith('m/') ? 1 : 0));
    const s = sstore(name);
    for (let i = 0; i < changes.length; i += 200) {
      const part = changes.slice(i, i + 200);
      const { error } = await client.from(TABLE).upsert(part.map(c => ({
        user_id: uid, store: cloudStoreOf(name, c.key), key: c.key, value: c.value, deleted: c.value === null, edited_at: s.dirtyAt[c.key] || Date.now(), device: DEVICE_ID,
      })), { onConflict: 'user_id,store,key' });
      if (error) { dirty.add(name); throw error; }
      part.forEach(c => { if (isSplitKey(c.key)) s.itemAt[c.key] = s.dirtyAt[c.key] || Date.now(); s.shadow[c.key] = c.j; delete s.dirtyAt[c.key]; });
      sent += part.length;
    }
  }
  if (sent) saveSoon();
  return sent;
}

/* ---------- Taking in cloud changes ---------- */
// Rows are taken in one at a time, in the order they arrive, so two batches never work from the same old copy.
let recvQ = Promise.resolve();
function receive(rows, policy) { const p = recvQ.then(() => receiveNow(rows, policy)); recvQ = p.catch(() => {}); return p; }
async function receiveNow(rows, policy = 'normal') {
  const byStore = {};
  rows.forEach(r => {
    if (!r || typeof r.key !== 'string' || !CLOUD_STORE_RE.test(r.store || '')) return;
    const items = r.store.endsWith(ITEMS), base = items ? r.store.slice(0, -ITEMS.length) : r.store;
    if (items !== isSplitKey(r.key)) return; // a row in the wrong place is never taken
    // A PC that writes item rows is on 0.19.4 or later: its whole-list rows are only for older PCs.
    if (items && r.device && !st.v2.includes(r.device)) { st.v2.push(r.device); saveSoon(); }
    (byStore[base] || (byStore[base] = [])).push(r);
  });
  // Workspaces first, so new workspaces exist before their tasks arrive.
  const names = Object.keys(byStore).sort((a, b) => (a === 'workspaces' ? -1 : b === 'workspaces' ? 1 : 0));
  for (const name of names) {
    const c = await content(name), s = sstore(name), patch = {};
    for (const r of byStore[name]) {
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
      else if (policy === 'combine') take = lj === null || (r.edited_at || 0) >= itemTime(lv);
      else if (lj === sj) take = true; // not changed here since the last sync
      else {
        // Changed on both PCs: the newer edit wins.
        take = (r.edited_at || 0) >= (s.dirtyAt[r.key] || itemTime(lv) || 0);
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
  }
  saveSoon();
}
async function applyPatch(name, c, patch) {
  const next = applyRows(name, c, patch);
  cache[name] = next;
  if (live[name]) { live[name](livePatch(name, next, patch)); return; }
  // Not open in this window: write the file, and tell any task windows showing it.
  try { await invoke('write_store', { name, content: JSON.stringify(next) }); } catch (e) {}
  const ws = name.includes('-') ? name.slice(name.indexOf('-') + 1) : 'product';
  if (isData(name)) emit('tasks-data', { from: 'cloud', ws, data: next }).catch(() => {});
  else if (isArch(name)) emit('tasks-arch', { from: 'cloud', ws, data: { archived: next.archived || {}, trash: next.trash || {} } }).catch(() => {});
}
async function pull(policy = 'normal') {
  const since = policy === 'normal' && st.cursor ? new Date(Date.parse(st.cursor) - 60000).toISOString() : null;
  let maxTs = st.cursor || null;
  for (let from = 0; ; from += 1000) {
    let q = client.from(TABLE).select('store,key,value,deleted,updated_at,edited_at,device').order('updated_at', { ascending: true }).order('key', { ascending: true }).range(from, from + 999);
    if (since) q = q.gt('updated_at', since);
    const { data, error } = await q;
    if (error) throw error;
    await receive(data || [], policy);
    (data || []).forEach(r => { if (!maxTs || r.updated_at > maxTs) maxTs = r.updated_at; });
    if (!data || data.length < 1000) break;
  }
  st.cursor = maxTs;
  saveSoon();
}

/* ---------- Documents ---------- */
async function allRefs() {
  const refs = new Set();
  for (const n of await localStores()) if (n !== 'workspaces') docRefs(await content(n), refs);
  return refs;
}
const docPath = f => `${uid}/${f}`;
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
      const refs = [...await allRefs()], up = new Set(st.docsUp || []);
      let missing = [];
      try { missing = await invoke('missing_documents', { files: refs }); } catch (e) {}
      const miss = new Set(missing);
      for (const f of refs) {
        if (up.has(f) || miss.has(f)) continue;
        let buf; try { buf = await invoke('read_document', { file: f }); } catch (e) { continue; }
        const { error } = await client.storage.from(BUCKET).upload(docPath(f), new Blob([buf], { type: 'application/octet-stream' }), { upsert: true, contentType: 'application/octet-stream' });
        if (error) { if (/exceed|too large|413/i.test(error.message || '')) { up.add(f); notice({ kind: 'error', title: 'A document is too big to sync', detail: 'Supabase’s free plan takes files up to 50 MB.' }); } continue; }
        up.add(f);
      }
      for (const f of missing) { try { if (await download(f)) up.add(f); } catch (e) {} }
      st.docsUp = [...up];
      setStatus({ docs: up.size });
      saveSoon();
    } while (docsAgain);
  } finally { docsBusy = false; }
}
// Opening a document that hasn't arrived on this PC yet: fetch it now.
export async function cloudEnsureDoc(file) {
  if (!client || !uid || !DOC_RE.test(file)) return false;
  try { return await download(file); } catch (e) { return false; }
}
export async function cloudDeleteDoc(file) {
  if (!client || !uid || !DOC_RE.test(file)) return;
  try { await client.storage.from(BUCKET).remove([docPath(file)]); st.docsUp = (st.docsUp || []).filter(f => f !== file); saveSoon(); } catch (e) {}
}

/* ---------- The sync loop ---------- */
async function loop() {
  if (!client || !uid || !st.ready || !caughtUp) return;
  if (loopBusy) { loopAgain = true; return; }
  loopBusy = true;
  try {
    do {
      loopAgain = false;
      if (dirty.size) { setStatus({ phase: 'syncing', pending: pendingCount() }); await pushAll(); }
    } while (loopAgain || dirty.size);
    retryMs = 0;
    st.lastSync = Date.now(); saveSoon();
    setStatus({ phase: 'synced', pending: 0, lastSync: st.lastSync, error: null });
    syncDocs().catch(() => {});
  } catch (e) {
    const offline = !navigator.onLine || /fetch|network|failed to|timeout/i.test(String(e && (e.message || e)));
    retryMs = Math.min(60000, retryMs ? retryMs * 2 : 4000);
    setStatus({ phase: offline ? 'offline' : 'error', error: String(e && (e.message || e)), pending: pendingCount() });
    kick(retryMs);
  } finally { loopBusy = false; }
}
async function catchUp() {
  try { await pull('normal'); caughtUp = true; kick(0); }
  catch (e) { setStatus({ phase: navigator.onLine ? 'error' : 'offline', error: String(e && (e.message || e)) }); retryMs = Math.min(60000, retryMs ? retryMs * 2 : 4000); setTimeout(catchUp, retryMs); }
}
function connect() {
  if (channel) { try { client.removeChannel(channel); } catch (e) {} channel = null; }
  channel = client.channel('records-' + DEVICE_ID)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${uid}` }, p => {
      if (p.new && p.new.store) receive([p.new]).catch(() => {});
      if (p.new && p.new.updated_at && (!st.cursor || p.new.updated_at > st.cursor)) st.cursor = p.new.updated_at;
    })
    .subscribe(s => { if (s === 'SUBSCRIBED') catchUp(); });
  // Each store is checked once for changes made while Tasks was closed or offline, after the
  // first pull, so an older offline edit never overwrites a newer one from another PC.
  caughtUp = false;
  localStores().then(ns => ns.forEach(n => dirty.add(n)));
}

/* ---------- Setup, sign-in, first sync ---------- */
const DEFAULT_STATE = () => ({ version: 1, stores: {}, docsUp: [], v2: [] });
async function makeClient() {
  const { createClient } = await import('@supabase/supabase-js');
  client = createClient(st.url, st.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'tasks-cloud-auth' }, realtime: { params: { eventsPerSecond: 20 } } });
  client.auth.onAuthStateChange(ev => {
    if (ev === 'SIGNED_OUT' && uid) { uid = null; caughtUp = false; setStatus({ phase: 'signin' }); }
  });
}
const fail = e => setStatus({ phase: 'error', error: String(e && (e.message || e)) });

// Runs once in the main window at launch.
export async function cloudStart() {
  if (started) return;
  started = true;
  try { const raw = await invoke('read_store', { name: 'cloud' }); st = raw ? { ...DEFAULT_STATE(), ...JSON.parse(raw) } : DEFAULT_STATE(); }
  catch (e) { st = DEFAULT_STATE(); }
  // The project built into the app (cloud-config.js) is used unless this PC was pointed at another one.
  if (!st.url && CLOUD_URL && CLOUD_PUBLISHABLE_KEY) { st.url = CLOUD_URL.replace(/\/+$/, ''); st.key = CLOUD_PUBLISHABLE_KEY; }
  setStatus({ phase: st.url ? 'connecting' : 'off', builtIn: !!CLOUD_URL, email: st.email || null, lastSync: st.lastSync || null, docs: (st.docsUp || []).length, url: st.url || '' });
  // Writes from task windows.
  listen('tasks-data', e => { const p = e.payload; if (p && p.from !== 'main' && p.from !== 'cloud') cloudNote(storeFor('data', p.ws || 'product'), p.data); }).catch(() => {});
  listen('tasks-arch', e => { const p = e.payload; if (p && p.from !== 'main' && p.from !== 'cloud') cloudNote(storeFor('archive', p.ws || 'product'), { version: 1, ...p.data }); }).catch(() => {});
  window.addEventListener('online', () => { if (uid && st.ready) { retryMs = 0; catchUp(); } });
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
async function begin(user) {
  if (st.uid && st.uid !== user.id) { st = { ...DEFAULT_STATE(), url: st.url, key: st.key }; }
  st.uid = user.id; st.email = user.email || st.email; saveSoon();
  setStatus({ email: st.email });
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
        const { appDataDir, join } = await import('@tauri-apps/api/path');
        const d = new Date(), p = n => String(n).padStart(2, '0');
        await invoke('backup', { dest: await join(await appDataDir(), `before-cloud-sync-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.zip`) });
      } catch (e) {}
    }
    st.stores = {}; st.cursor = null;
    if (mode !== 'upload') {
      await pull(mode);
      if (mode === 'replace') {
        // Tasks that only exist on this PC are dropped (they're in the backup).
        for (const name of await localStores()) {
          const s = sstore(name), c = await content(name), patch = {};
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
  channel = null; caughtUp = false;
  const was = uid; uid = null;
  try { if (was) await client.auth.signOut(); } catch (e) {}
  uid = null;
  // Keep the data on this PC; the next sign-in on this PC compares it with the cloud again.
  st = { ...DEFAULT_STATE(), url: st.url, key: st.key, email: st.email };
  await saveState();
  setStatus({ phase: 'signin', lastSync: null });
}
export async function cloudForget() {
  await cloudSignOut().catch(() => {});
  client = null; st = DEFAULT_STATE(); await saveState();
  setStatus({ phase: 'off', email: null, url: '' });
}
export function cloudSyncNow() { if (uid && st && st.ready) { localStores().then(ns => { ns.forEach(n => dirty.add(n)); catchUp(); }); } }
// Before Tasks quits: send what's left, but never hold up quitting for long.
export async function cloudFlush(ms = 2500) {
  if (!uid || !st || !st.ready) return;
  clearTimeout(timer);
  await Promise.race([loop(), new Promise(r => setTimeout(r, ms))]);
}
