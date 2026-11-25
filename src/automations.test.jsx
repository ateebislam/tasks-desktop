// @vitest-environment jsdom
// Unit tests for automations and timers (0.20.3). Run with `npm test`.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const claims = new Set();
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async () => null) }));
vi.mock('@tauri-apps/api/event', () => ({ emit: vi.fn(async () => {}), listen: vi.fn(async () => () => {}) }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ label: 'main', onCloseRequested: async () => () => {} }), LogicalSize: class {} }));
vi.mock('@tauri-apps/api/webview', () => ({ getCurrentWebview: () => ({}) }));
vi.mock('@tauri-apps/api/webviewWindow', () => ({ WebviewWindow: class {} }));
vi.mock('@tauri-apps/api/app', () => ({ getVersion: async () => '0.20.3' }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: vi.fn(async () => null) }));
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: vi.fn() }));
vi.mock('@tauri-apps/plugin-global-shortcut', () => ({ register: vi.fn(), unregister: vi.fn() }));
vi.mock('@tauri-apps/plugin-notification', () => ({ isPermissionGranted: async () => true, requestPermission: async () => 'granted', sendNotification: vi.fn() }));
// In a team, the first PC to claim a run does it; a second claim of the same key is refused.
vi.mock('./cloud.js', async orig => {
  const real = await orig();
  return { ...real, cloudClaim: vi.fn(async (taskId, key) => { const k = taskId + '|' + key; if (claims.has(k)) return false; claims.add(k); return true; }) };
});

const { _appTest: A } = await import('./App.jsx');

const iso = d => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const rule = { id: 'r1', enabled: true, trigger: 'overdue', action: 'priority', target: 'high' };
const engineFor = (tasks, rules) => A.makeEngine({ rules: () => rules, stages: () => [], prefs: () => ({}), team: () => ({ on: true, members: [] }), tasks: () => tasks });
const scan = (tasks, rules = [rule]) => A.scanTimeRules(engineFor(tasks, rules), rules, () => tasks, {});

beforeEach(() => claims.clear());

describe('A1: deadline automations after the deadline moves', () => {
  it('fires again for a new deadline, in a team', async () => {
    let t = { id: 't1', title: 'Ship', status: 'todo', deadline: iso(-2), priority: 'normal' };
    let r = await scan({ t1: t });
    expect(r.updates).toHaveLength(1);
    t = r.updates[0];
    expect((await scan({ t1: t })).updates).toHaveLength(0); // once per deadline
    // The deadline moves (which clears autoFired), and it's overdue again later.
    t = { ...t, deadline: iso(-1), autoFired: {}, priority: 'normal' };
    r = await scan({ t1: t });
    expect(r.updates).toHaveLength(1);
    expect(r.updates[0].priority).toBe('high');
  });

  it('doesn’t fire twice for a run noted before 0.20.3', async () => {
    const t = { id: 't1', title: 'Ship', status: 'todo', deadline: iso(-2), autoFired: { r1: true } };
    expect((await scan({ t1: t })).updates).toHaveLength(0);
  });

  it('skips a run another PC already did', async () => {
    const t = { id: 't1', title: 'Ship', status: 'todo', deadline: iso(-2) };
    await scan({ t1: t }); // this "other PC" claims it
    const r = await scan({ t1: t });
    expect(r.updates).toHaveLength(0);
    expect(r.quiet).toHaveLength(1); // noted as done here without running
  });
});

describe('A2: time history is kept whole', () => {
  it('keeps every session', () => {
    let t = { id: 't', timeSpent: 0, sessions: Array.from({ length: 400 }, (_, i) => ({ s: i * 10, e: i * 10 + 5 })) };
    t = A.stopT({ ...t, timerStartedAt: Date.now() - 1000 });
    expect(t.sessions).toHaveLength(401);
    t = A.stopAt({ ...t, timerStartedAt: Date.now() - 1000 }, Date.now());
    expect(t.sessions).toHaveLength(402);
  });
});

describe('A3: background edits keep newer changes', () => {
  it('lays only the changed fields over the current task', () => {
    const base = { id: 'a', title: 'Old', priority: 'normal' };
    const after = { ...base, priority: 'high' };
    const cur = { ...base, title: 'Renamed meanwhile' };
    expect(A.replay(base, after, cur)).toEqual({ id: 'a', title: 'Renamed meanwhile', priority: 'high' });
    expect(A.replay(base, after, undefined)).toBeNull();
  });
});

describe('A4: archiving and Trash cleanup run on one PC a day', () => {
  it('leaves it alone when another PC has claimed today, and keeps it once this PC has', async () => {
    const day = new Date().toISOString().slice(0, 10);
    claims.add('~house/marketing|day@' + day); // another PC got there first
    expect(await A.houseTurn('marketing')).toBe(false);
    expect(await A.houseTurn('sales')).toBe(true);
    expect(await A.houseTurn('sales')).toBe(true); // still this PC's turn for the rest of the day
  });
});

describe('Q4: undo steps hold only your own edits', () => {
  it('closes a step with the workspace before and after, and drops redo', () => {
    const h = { past: [], future: [{ before: 0, after: 1 }], last: { n: 2 }, pending: { n: 1 }, timer: null };
    A.closeStep(h);
    expect(h.past).toEqual([{ before: { n: 1 }, after: { n: 2 } }]);
    expect(h.pending).toBe(null);
    expect(h.future).toEqual([]);
  });
});
