// Unit tests for the sync engine (0.20.3). Run with `npm test`.
// The Tauri bridge is replaced by an in-memory file store, so these run anywhere.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const files = {};
const calls = [];
let failWrites = false;
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async (cmd, args) => {
    calls.push([cmd, args && args.name]);
    if (cmd === 'read_store') {
      const v = files[args.name];
      if (v instanceof Error) throw v;
      return v === undefined ? null : v;
    }
    if (cmd === 'write_store') {
      if (failWrites) throw new Error('disk full');
      files[args.name] = args.content;
      return null;
    }
    return null;
  }),
}));
vi.mock('@tauri-apps/api/event', () => ({ emit: vi.fn(async () => {}), listen: vi.fn(async () => () => {}) }));

const cloud = await import('./cloud.js');
const { _test: T, cloudEditStore, cloudReadStore } = cloud;

const task = (id, extra = {}) => ({ id, title: 'Task ' + id, status: 'todo', updatedAt: 1, ...extra });
const tasksOf = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${i}`, task(`k${i}`)]));
// Marks every row of a store as last agreed with the cloud.
const agree = (name, content) => {
  const s = T.sstore(name);
  Object.entries(T.split(name, content)).forEach(([k, v]) => { s.shadow[k] = JSON.stringify(v); s.seenAt[k] = '2026-01-01T00:00:00Z'; });
};

beforeEach(() => {
  Object.keys(files).forEach(k => delete files[k]);
  Object.keys(T.cache).forEach(k => delete T.cache[k]);
  T.unreadable.clear();
  calls.length = 0;
  failWrites = false;
  T.setSt({ version: 1, stores: {}, docsUp: [], v2: [] });
});

describe('stores and rows', () => {
  it('splits a workspace into rows and puts it back together', () => {
    const c = { version: 4, tasks: { a: task('a'), b: task('b') }, buckets: [{ id: 'b1', name: 'Sprint 1' }], settings: { archiveDays: 30, watchFolders: ['C:/x'] } };
    const rows = T.split('data', c);
    expect(Object.keys(rows)).toEqual(expect.arrayContaining(['t/a', 't/b', 'l/buckets/b1', 'f/settings/archiveDays']));
    // Watch folders are personal and never become a row.
    expect(Object.keys(rows).some(k => k.includes('watchFolders'))).toBe(false);
    const back = T.applyRows('data', {}, { 't/a': rows['t/a'], 't/b': rows['t/b'], 'l/buckets/b1': rows['l/buckets/b1'] });
    expect(back.tasks).toEqual(c.tasks);
    expect(back.buckets).toEqual(c.buckets);
  });

  it('merges two people’s edits to different fields of one task', () => {
    const base = task('a', { title: 'Old', priority: 'normal' });
    const mine = { ...base, title: 'New title' };
    const theirs = { ...base, priority: 'high', updatedAt: 5 };
    const m = T.mergeFields(base, mine, theirs, false);
    expect(m.title).toBe('New title');
    expect(m.priority).toBe('high');
    expect(m.updatedAt).toBe(5);
  });
});

describe('D1: a file that can’t be read is never taken as empty', () => {
  it('sends nothing from an unreadable store', async () => {
    agree('data', { tasks: tasksOf(30) });
    files.data = new Error('DAMAGED: data.json is damaged');
    expect(await cloudReadStore('data')).toBeUndefined();
    expect(T.unreadable.has('data')).toBe(true);
    expect(T.diff('data')).toEqual([]);
  });

  it('never writes cloud changes into an unreadable store', async () => {
    files.data = new Error('DAMAGED');
    await T.receive([{ store: 'data', key: 't/x', value: task('x'), deleted: false, updated_at: '2026-02-01T00:00:00Z', edited_at: 9, device: 'other' }], 'normal');
    expect(calls.some(([c, n]) => c === 'write_store' && n === 'data')).toBe(false);
    expect(T.sstore('data').seenAt['t/x']).toBeUndefined(); // still to be taken once the file is back
  });

  it('holds back many tasks vanishing at once', async () => {
    const all = tasksOf(15);
    agree('data', { tasks: all });
    T.cache.data = { version: 4, tasks: {} }; // everything gone, and not in the Archive or Trash
    T.cache.archive = { version: 1, archived: {}, trash: {} };
    const changes = T.diff('data');
    const held = await T.heldDeletes('data', changes);
    expect(held).toHaveLength(15);
  });

  it('lets tasks moved to the Trash through', async () => {
    const all = tasksOf(15);
    agree('data', { tasks: all });
    T.cache.data = { version: 4, tasks: {} };
    T.cache.archive = { version: 1, archived: {}, trash: all };
    expect(await T.heldDeletes('data', T.diff('data'))).toEqual([]);
  });

  it('lets a few deletions through', async () => {
    const all = tasksOf(15);
    agree('data', { tasks: all });
    const left = { ...all }; ['k0', 'k1', 'k2'].forEach(k => delete left[k]);
    T.cache.data = { version: 4, tasks: left };
    T.cache.archive = { version: 1, archived: {}, trash: {} };
    expect(await T.heldDeletes('data', T.diff('data'))).toEqual([]);
  });
});

describe('A10: a change that can’t be saved here is taken again later', () => {
  it('puts the sync notes back when the write fails', async () => {
    files.data = JSON.stringify({ version: 4, tasks: { a: task('a') } });
    await cloudReadStore('data');
    agree('data', { tasks: { a: task('a') } });
    const before = JSON.stringify(T.sstore('data'));
    failWrites = true;
    await expect(T.receive([{ store: 'data', key: 't/a', value: task('a', { title: 'From another PC' }), deleted: false, updated_at: '2026-02-01T00:00:00Z', edited_at: 9, device: 'other' }], 'normal')).rejects.toThrow('disk full');
    expect(JSON.stringify(T.sstore('data'))).toBe(before);
    expect(T.cache.data.tasks.a.title).toBe('Task a');
    failWrites = false;
    await T.receive([{ store: 'data', key: 't/a', value: task('a', { title: 'From another PC' }), deleted: false, updated_at: '2026-02-01T00:00:00Z', edited_at: 9, device: 'other' }], 'normal');
    expect(JSON.parse(files.data).tasks.a.title).toBe('From another PC');
  });
});

describe('A3: editing a workspace that isn’t open', () => {
  it('reads, edits and writes the latest copy', async () => {
    files['data-marketing'] = JSON.stringify({ version: 4, tasks: { a: task('a') } });
    const ok = await cloudEditStore('data-marketing', c => ({ ...c, tasks: { ...c.tasks, b: task('b') } }));
    expect(ok).toBe(true);
    expect(Object.keys(JSON.parse(files['data-marketing']).tasks)).toEqual(['a', 'b']);
  });

  it('leaves an unreadable store alone', async () => {
    files['data-marketing'] = new Error('DAMAGED');
    const ok = await cloudEditStore('data-marketing', c => ({ ...c, tasks: {} }));
    expect(ok).toBe(false);
    expect(calls.some(([c, n]) => c === 'write_store' && n === 'data-marketing')).toBe(false);
  });
});

describe('A7: which edit is newer doesn’t depend on this PC’s clock', () => {
  it('learns how far the clock is off from the server’s answer', () => {
    const st = T.getSt();
    st.clockOff = 0;
    const now = Date.now();
    // The server says it's 10 minutes earlier than this PC thinks: this PC's clock is 10 minutes fast.
    T.learnClock(new Date(now - 600000).toISOString(), now - 100, now + 100);
    expect(Math.abs(T.clockOff() + 600000)).toBeLessThan(1000);
    expect(T.srv(1_000_000_000)).toBe(1_000_000_000 + T.clockOff());
    // A few seconds either way is just the network and is left alone.
    T.learnClock(new Date(now + 3000).toISOString(), now - 100, now + 100);
    expect(T.clockOff()).toBe(0);
  });

  it('stamps an edit made on a fast clock with the server’s time', () => {
    const st = T.getSt();
    st.clockOff = -600000;
    const now = Date.now();
    T.cache.data = { version: 4, tasks: { a: task('a', { updatedAt: now }) } };
    T.diff('data');
    expect(Math.abs(T.sstore('data').dirtyAt['t/a'] - (now - 600000))).toBeLessThan(5);
    st.clockOff = 0;
  });
});

describe('A5: a row deleted outright in Supabase', () => {
  it('is taken as a deletion on this PC', async () => {
    const content = { version: 4, tasks: { a: task('a'), b: task('b') } };
    files.data = JSON.stringify(content);
    await cloudReadStore('data');
    agree('data', T.cache.data);
    await T.receive([{ store: 'data', key: 't/a', value: null, deleted: true, updated_at: null, edited_at: Date.now(), device: null }], 'normal');
    expect(Object.keys(JSON.parse(files.data).tasks)).toEqual(['b']);
    expect(T.diff('data')).toEqual([]); // and it isn't sent back up
  });
});

describe('A8: old sync leftovers are cleared', () => {
  const longAgo = new Date(Date.now() - 200 * 864e5).toISOString(), lately = new Date(Date.now() - 5 * 864e5).toISOString();
  it('forgets notes about rows deleted long ago, and nothing else', async () => {
    files.data = JSON.stringify({ version: 4, tasks: { live: task('live'), back: task('back') } });
    await cloudReadStore('data');
    agree('data', T.cache.data);
    const s = T.sstore('data');
    s.shadow['t/old'] = null; s.seenAt['t/old'] = longAgo;      // deleted 200 days ago
    s.shadow['t/new'] = null; s.seenAt['t/new'] = lately;       // deleted last week: other PCs may still need it
    s.shadow['t/back'] = null; s.seenAt['t/back'] = longAgo;    // deleted long ago but made again here
    s.seenAt['t/live'] = longAgo;                               // an old task that still exists
    expect(await T.forgetOld()).toBe(1);
    expect('t/old' in s.shadow || 't/old' in s.seenAt).toBe(false);
    expect(s.shadow['t/new']).toBe(null);
    expect('t/back' in s.shadow).toBe(true);
    expect(s.shadow['t/live']).toBeTruthy();
    expect(await T.forgetOld()).toBe(0); // once a day
  });

  it('after a long time away, drops rows the cloud no longer has, but keeps ones changed here', async () => {
    files.data = JSON.stringify({ version: 4, tasks: { kept: task('kept'), gone: task('gone'), edited: task('edited') } });
    await cloudReadStore('data');
    agree('data', T.cache.data);
    T.cache.data = { ...T.cache.data, tasks: { ...T.cache.data.tasks, edited: task('edited', { title: 'Changed while away', updatedAt: Date.now() }), fresh: task('fresh') } };
    T.diff('data');
    // The cloud is asked for the missing rows by name. Here it has none of them.
    const asked = [];
    const cloudWith = keys => ({ from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ in: async (_c, ks) => { asked.push(...ks); return { data: ks.filter(k => keys.includes(k)).map(key => ({ key })), error: null }; } }) }) }) }) });
    T.setClient(cloudWith([]), 'ws1');
    expect(await T.dropVanished(new Set(['data|t/kept']))).toBe(2);
    expect(asked.sort()).toEqual(['t/edited', 't/gone']);
    expect(Object.keys(T.cache.data.tasks).sort()).toEqual(['edited', 'fresh', 'kept']);
    expect(T.cache.data.tasks.edited.title).toBe('Changed while away');
  });

  it('keeps a row the page-by-page read missed but the cloud still has', async () => {
    files.data = JSON.stringify({ version: 4, tasks: { kept: task('kept'), moved: task('moved') } });
    await cloudReadStore('data');
    agree('data', T.cache.data);
    T.setClient({ from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ in: async () => ({ data: [{ key: 't/moved' }], error: null }) }) }) }) }) }, 'ws1');
    expect(await T.dropVanished(new Set(['data|t/kept']))).toBe(0);
    expect(Object.keys(T.cache.data.tasks).sort()).toEqual(['kept', 'moved']);
    T.setClient({ from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ in: async () => ({ data: null, error: new Error('offline') }) }) }) }) }) }, 'ws1');
    await expect(T.dropVanished(new Set(['data|t/kept']))).rejects.toThrow('offline');
    expect(Object.keys(T.cache.data.tasks).sort()).toEqual(['kept', 'moved']);
    T.setClient(null, null);
  });

  it('does nothing when the cloud answers with no rows at all', async () => {
    files.data = JSON.stringify({ version: 4, tasks: { a: task('a') } });
    await cloudReadStore('data');
    agree('data', T.cache.data);
    expect(await T.dropVanished(new Set())).toBe(0);
    expect(Object.keys(T.cache.data.tasks)).toEqual(['a']);
  });
});

describe('S5: the sign-in is kept in the protected store', () => {
  it('moves a sign-in saved by an earlier version, then reads it from the protected store', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    const vault = {}, ls = { 'tasks-cloud-auth': '{"old":"session"}' };
    globalThis.localStorage = { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = v; }, removeItem: k => { delete ls[k]; } };
    const real = invoke.getMockImplementation();
    invoke.mockImplementation(async (cmd, a) => {
      if (cmd === 'secret_get') return a.key in vault ? vault[a.key] : null;
      if (cmd === 'secret_set') { vault[a.key] = a.value; return null; }
      if (cmd === 'secret_remove') { delete vault[a.key]; return null; }
      return real(cmd, a);
    });
    expect(await T.sessionStore.getItem('tasks-cloud-auth')).toBe('{"old":"session"}');
    expect(vault['tasks-cloud-auth']).toBe('{"old":"session"}');
    expect('tasks-cloud-auth' in ls).toBe(false); // no longer in plain text
    await T.sessionStore.setItem('tasks-cloud-auth', '{"new":"session"}');
    expect(await T.sessionStore.getItem('tasks-cloud-auth')).toBe('{"new":"session"}');
    expect(Object.keys(ls)).toEqual([]);
    await T.sessionStore.removeItem('tasks-cloud-auth');
    expect(await T.sessionStore.getItem('tasks-cloud-auth')).toBe(null);
    // If Windows can't protect it, signing in still works from the old place.
    invoke.mockImplementation(async cmd => { if (cmd.startsWith('secret_')) throw new Error('unavailable'); return null; });
    await T.sessionStore.setItem('tasks-cloud-auth', '{"kept":"anyway"}');
    expect(await T.sessionStore.getItem('tasks-cloud-auth')).toBe('{"kept":"anyway"}');
    invoke.mockImplementation(real);
    delete globalThis.localStorage;
  });
});
