
import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { check as checkForUpdate } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';
import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { applyTheme, readTheme, saveTheme } from './theme.js';
const cn = (...a) => a.filter(Boolean).join(' ');

/* =========================================================
   Icons (lucide)
   ========================================================= */
const Icon = ({ children, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn(/(^|\s)size-/.test(className || '') ? '' : 'size-4', 'shrink-0', className)} aria-hidden="true">{children}</svg>
);
const I = {
  plus: p => <Icon {...p}><path d="M5 12h14"/><path d="M12 5v14"/></Icon>,
  play: p => <Icon {...p}><polygon points="6 3 20 12 6 21 6 3"/></Icon>,
  pause: p => <Icon {...p}><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></Icon>,
  more: p => <Icon {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></Icon>,
  calendar: p => <Icon {...p}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></Icon>,
  left: p => <Icon {...p}><path d="m15 18-6-6 6-6"/></Icon>,
  right: p => <Icon {...p}><path d="m9 18 6-6-6-6"/></Icon>,
  down: p => <Icon {...p}><path d="m6 9 6 6 6-6"/></Icon>,
  updown: p => <Icon {...p}><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></Icon>,
  trash: p => <Icon {...p}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></Icon>,
  pencil: p => <Icon {...p}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></Icon>,
  check: p => <Icon {...p}><path d="M20 6 9 17l-5-5"/></Icon>,
  x: p => <Icon {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></Icon>,
  reset: p => <Icon {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></Icon>,
  clipboard: p => <Icon {...p}><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></Icon>,
  timer: p => <Icon {...p}><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></Icon>,
  cloud: p => <Icon {...p}><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></Icon>,
  hdd: p => <Icon {...p}><line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/></Icon>,
  zap: p => <Icon {...p}><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></Icon>,
  folder: p => <Icon {...p}><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></Icon>,
  arrowRight: p => <Icon {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></Icon>,
  search: p => <Icon {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></Icon>,
  copy: p => <Icon {...p}><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></Icon>,
  sliders: p => <Icon {...p}><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></Icon>,
  keyboard: p => <Icon {...p}><path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/></Icon>,
  chart: p => <Icon {...p}><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></Icon>,
  listCheck: p => <Icon {...p}><path d="M11 18H3"/><path d="m15 18 2 2 4-4"/><path d="M16 12H3"/><path d="M16 6H3"/></Icon>,
  flag: p => <Icon {...p}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></Icon>,
  paperclip: p => <Icon {...p}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></Icon>,
  upload: p => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></Icon>,
  download: p => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></Icon>,
  eye: p => <Icon {...p}><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></Icon>,
  file: p => <Icon {...p}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></Icon>,
  sun: p => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></Icon>,
  moon: p => <Icon {...p}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></Icon>,
  monitor: p => <Icon {...p}><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></Icon>,
  loader: p => <Icon {...p}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></Icon>,
  layers: p => <Icon {...p}><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></Icon>,
  ban: p => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></Icon>,
  calendarCheck: p => <Icon {...p}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></Icon>,
  grid: p => <Icon {...p}><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></Icon>,
  up: p => <Icon {...p}><path d="m18 15-6-6-6 6"/></Icon>,
  lock: p => <Icon {...p}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>,
  external: p => <Icon {...p}><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></Icon>,
  panelRight: p => <Icon {...p}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/></Icon>,
  panelCenter: p => <Icon {...p}><rect width="18" height="18" x="3" y="3" rx="2"/><rect width="10" height="10" x="7" y="7" rx="1"/></Icon>,
  maximize: p => <Icon {...p}><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></Icon>,
  home: p => <Icon {...p}><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></Icon>,
  tab: p => <Icon {...p}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 3v6"/></Icon>,
  table: p => <Icon {...p}><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></Icon>,
  rows: p => <Icon {...p}><path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/></Icon>,
  kanban: p => <Icon {...p}><path d="M6 5v11"/><path d="M12 5v6"/><path d="M18 5v14"/></Icon>,
  user: p => <Icon {...p}><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></Icon>,
};

/* =========================================================
   shadcn/ui components (ported to a single file)
   ========================================================= */
const buttonVariants = {
  default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
  outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
};
const buttonSizes = { default: 'h-9 px-4 py-2', sm: 'h-8 rounded-md px-3 text-xs', lg: 'h-10 rounded-md px-8', icon: 'h-9 w-9', 'icon-sm': 'h-8 w-8' };
const Button = React.forwardRef(({ variant = 'default', size = 'default', className, type = 'button', ...p }, ref) => (
  <button ref={ref} type={type} className={cn('inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50', /(^|\s)justify-/.test(className || '') ? '' : 'justify-center', buttonVariants[variant], buttonSizes[size], className)} {...p} />
));

const inputCls = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';
const Input = React.forwardRef(({ className, ...p }, ref) => <input ref={ref} className={cn(inputCls, className)} {...p} />);
const Textarea = React.forwardRef(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn('flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm', className)} {...p} />
));
const Label = ({ className, ...p }) => <label className={cn('text-sm font-medium leading-none', className)} {...p} />;
const Field = ({ label, htmlFor, children, className, hint }) => (
  <div className={cn('grid gap-2', className)}>
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    {hint && <p className="text-[0.8rem] text-muted-foreground">{hint}</p>}
  </div>
);

const NativeSelect = ({ className, children, ...p }) => (
  <div className={cn('relative', className)}>
    <select className={cn(inputCls, 'appearance-none pr-8 cursor-pointer bg-background')} {...p}>{children}</select>
    <I.down className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50" />
  </div>
);

const badgeVariants = {
  default: 'border-transparent bg-primary text-primary-foreground shadow',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  destructive: 'border-transparent bg-destructive text-destructive-foreground shadow',
  outline: 'text-foreground',
};
const Badge = ({ variant = 'default', className, ...p }) => (
  <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors whitespace-nowrap', badgeVariants[variant], className)} {...p} />
);

const Card = ({ className, ...p }) => <div className={cn('rounded-xl border bg-card text-card-foreground', className)} {...p} />;

const Kbd = ({ children, className }) => (
  <kbd className={cn('pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground', className)}>{children}</kbd>
);

// The signed-in person, so their Google photo can be shown wherever their name appears.
const MeContext = createContext(null);
const Avatar = ({ name, className, picture }) => {
  const me = useContext(MeContext);
  const pic = picture || (me && me.picture && name && norm(name) === norm(me.name) ? me.picture : null);
  const initials = (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  return (
    <span className={cn('relative flex h-6 w-6 shrink-0 overflow-hidden rounded-full', className)}>
      {pic
        ? <img src={pic} alt="" className="h-full w-full object-cover" />
        : <span className="flex h-full w-full items-center justify-center rounded-full bg-muted text-[10px] font-medium">{initials || <I.user className="size-3" />}</span>}
    </span>
  );
};

const Separator = ({ className }) => <div role="separator" className={cn('shrink-0 bg-border h-px w-full', className)} />;

const Tabs = ({ value, onChange, items }) => (
  <div role="tablist" className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground max-w-full overflow-x-auto">
    {items.map(it => (
      <button key={it.value} role="tab" type="button" aria-selected={value === it.value} data-state={value === it.value ? 'active' : 'inactive'}
        onClick={() => onChange(it.value)}
        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">
        {it.label}
        <span className="tnum text-xs text-muted-foreground">{it.count}</span>
      </button>
    ))}
  </div>
);

const Alert = ({ className, ...p }) => <div role="status" className={cn('relative w-full rounded-lg border px-4 py-3 text-sm', className)} {...p} />;

const Table = ({ className, ...p }) => (
  <div className="relative w-full overflow-auto"><table className={cn('w-full caption-bottom text-sm', className)} {...p} /></div>
);
const TableHeader = p => <thead className="[&_tr]:border-b" {...p} />;
const TableBody = p => <tbody className="[&_tr:last-child]:border-0" {...p} />;
const TableRow = ({ className, ...p }) => <tr className={cn('border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', className)} {...p} />;
const TableHead = ({ className, ...p }) => <th className={cn('h-10 px-2 text-left align-middle font-medium text-muted-foreground whitespace-nowrap', className)} {...p} />;
const TableCell = ({ className, ...p }) => <td className={cn('p-2 align-middle', className)} {...p} />;

const Empty = ({ icon, title, description, children }) => (
  <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
    <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">{icon}</div>
    <div className="grid gap-1 max-w-sm">
      <h3 className="text-lg font-medium tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    {children}
  </div>
);

/* Floating layer used by Popover, Dropdown Menu and Combobox */
function useDismiss(open, setOpen, refs) {
  useEffect(() => {
    if (!open) return;
    const down = e => { if (!refs.some(r => r.current && r.current.contains(e.target))) setOpen(false); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    const away = () => setOpen(false);
    document.addEventListener('mousedown', down);
    document.addEventListener('touchstart', down, { passive: true });
    document.addEventListener('keydown', key, true);
    window.addEventListener('resize', away);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('touchstart', down);
      document.removeEventListener('keydown', key, true);
      window.removeEventListener('resize', away);
    };
  }, [open]);
}
function Floating({ anchorRef, open, align = 'start', matchWidth, minMatch, className, children, panelRef }) {
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const place = () => {
      const r = anchorRef.current.getBoundingClientRect();
      const el = panelRef.current; const h = el ? el.offsetHeight : 0; const w = el ? el.offsetWidth : 0;
      const below = window.innerHeight - r.bottom;
      const top = below < h + 12 && r.top > h + 12 ? r.top - h - 4 : r.bottom + 4;
      let left = align === 'end' ? r.right - w : r.left;
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
      setPos({ top, left, width: matchWidth ? r.width : undefined, minWidth: minMatch ? r.width : undefined });
    };
    place();
    const id = requestAnimationFrame(place);
    window.addEventListener('scroll', place, true);
    return () => { cancelAnimationFrame(id); window.removeEventListener('scroll', place, true); };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div ref={panelRef} style={{ position: 'fixed', top: pos ? pos.top : -9999, left: pos ? pos.left : -9999, width: pos && pos.width, minWidth: pos && pos.minWidth, maxWidth: 'calc(100vw - 16px)' }}
      className={cn('z-[80] rounded-md border bg-popover text-popover-foreground shadow-md outline-none anim-pop', className)}>
      {children}
    </div>, document.body);
}

function DropdownMenu({ trigger, items, align = 'end' }) {
  const [open, setOpen] = useState(false);
  const a = useRef(null), p = useRef(null);
  useDismiss(open, setOpen, [a, p]);
  useEffect(() => { if (open && p.current) { const f = p.current.querySelector('[role=menuitem]'); f && f.focus(); } }, [open]);
  const onKey = e => {
    const els = [...p.current.querySelectorAll('[role=menuitem]')]; const i = els.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length].focus(); }
    if (e.key === 'Tab') setOpen(false);
  };
  return (
    <>
      {trigger({ ref: a, open, onClick: e => { e.stopPropagation(); setOpen(o => !o); }, 'aria-haspopup': 'menu', 'aria-expanded': open })}
      <Floating anchorRef={a} panelRef={p} open={open} align={align} className="min-w-[10rem] p-1">
        <div role="menu" onKeyDown={onKey} onClick={e => e.stopPropagation()}>
          {items.map((it, i) => it === 'sep'
            ? <div key={i} className="-mx-1 my-1 h-px bg-muted" />
            : <button key={i} role="menuitem" type="button" onClick={() => { setOpen(false); it.onSelect(); }}
                className={cn('relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground', it.destructive && 'text-destructive hover:text-destructive focus:text-destructive')}>
                {it.icon}{it.label}
                {it.shortcut && <span className="ml-auto text-xs tracking-widest opacity-60">{it.shortcut}</span>}
              </button>)}
        </div>
      </Floating>
    </>
  );
}

/* Select: the app's own dropdown, used everywhere instead of the system one.
   options: [{ value, label, node?, icon?, group?, divider? }] */
function Select({ value, onChange, options, placeholder = 'Choose…', variant = 'field', className, id, label, footer, searchable, renderValue, icon, menuClassName }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const a = useRef(null), p = useRef(null), inp = useRef(null), lst = useRef(null);
  useDismiss(open, setOpen, [a, p]);
  const sel = options.find(o => o.value === value);
  const canSearch = searchable ?? options.length > 8;
  const nq = norm(q);
  const list = options.filter(o => !nq || norm(o.label).includes(nq));
  useEffect(() => {
    if (!open) return;
    setQ('');
    setHi(Math.max(0, options.findIndex(o => o.value === value)));
    setTimeout(() => { (inp.current || lst.current) && (inp.current || lst.current).focus(); }, 0);
  }, [open]);
  useEffect(() => {
    if (!open || !lst.current) return;
    const el = lst.current.querySelector(`[data-i="${hi}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [hi, open]);
  const pick = o => { onChange(o.value); setOpen(false); setTimeout(() => a.current && a.current.focus(), 0); };
  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, list.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Home') { e.preventDefault(); setHi(0); }
    else if (e.key === 'End') { e.preventDefault(); setHi(list.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (list[hi]) pick(list[hi]); }
    else if (e.key === 'Tab') setOpen(false);
  };
  const triggerCls = {
    field: 'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-base md:text-sm transition-colors hover:border-foreground/20',
    ghost: 'inline-flex h-8 max-w-full items-center gap-2 rounded-md border border-transparent bg-transparent px-2 text-left text-sm transition-colors hover:bg-muted',
    chip: 'inline-flex h-7 max-w-[16rem] items-center gap-1.5 rounded-full border border-border bg-transparent px-2.5 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground',
  }[variant];
  let lastGroup = null;
  return (
    <>
      <button ref={a} id={id} type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); setOpen(true); } }}
        className={cn(triggerCls, 'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', open && variant !== 'chip' && 'border-input', className)}>
        {icon}
        <span className={cn('flex min-w-0 flex-1 items-center truncate', !sel && 'text-muted-foreground')}>
          {sel ? (renderValue ? renderValue(sel) : (sel.node || <span className="truncate">{sel.label}</span>)) : placeholder}
        </span>
        <I.down className={cn('shrink-0 opacity-50 transition-transform', variant === 'chip' ? 'size-3' : 'size-4', open && 'rotate-180')} />
      </button>
      <Floating anchorRef={a} panelRef={p} open={open} minMatch className={cn('p-1 min-w-[14rem]', menuClassName)}>
        <div onKeyDown={onKey}>
          {canSearch && (
            <input ref={inp} value={q} onChange={e => { setQ(e.target.value); setHi(0); }} placeholder="Search…" aria-label="Search options"
              className="mb-1 h-8 w-full border-b bg-transparent px-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none" />
          )}
          <div ref={lst} role="listbox" tabIndex={-1} aria-activedescendant={list[hi] ? `opt-${hi}` : undefined}
            className="max-h-[min(22rem,55vh)] overflow-y-auto focus-visible:outline-none">
            {list.map((o, i) => {
              const head = !nq && o.group && o.group !== lastGroup ? o.group : null;
              if (o.group) lastGroup = o.group;
              return (
                <React.Fragment key={String(o.value) + i}>
                  {(head && i > 0) || (o.divider && !nq && i > 0) ? <div className="mx-1 my-1 h-px bg-border" /> : null}
                  {head && <div className="px-2 pb-0.5 pt-1.5 text-xs text-muted-foreground">{head}</div>}
                  <div id={`opt-${i}`} data-i={i} role="option" aria-selected={o.value === value}
                    onMouseEnter={() => setHi(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(o)}
                    className={cn('flex min-h-8 cursor-default items-center gap-2 rounded-sm px-2 py-1 text-sm', i === hi && 'bg-accent text-accent-foreground')}>
                    {o.icon}
                    <span className="flex min-w-0 flex-1 items-center">{o.node || <span className="truncate">{o.label}</span>}</span>
                    {o.value === value && <I.check className="size-3.5 shrink-0 text-muted-foreground" />}
                  </div>
                </React.Fragment>
              );
            })}
            {list.length === 0 && <div className="px-2 py-2 text-sm text-muted-foreground">Nothing found</div>}
          </div>
          {footer && (
            <>
              <div className="mx-1 my-1 h-px bg-border" />
              {footer(() => setOpen(false))}
            </>
          )}
        </div>
      </Floating>
    </>
  );
}

/* Popover */
function Popover({ trigger, children, align = 'start', className }) {
  const [open, setOpen] = useState(false);
  const a = useRef(null), p = useRef(null);
  useDismiss(open, setOpen, [a, p]);
  return (
    <>
      {trigger({ ref: a, open, onClick: () => setOpen(o => !o), 'aria-expanded': open })}
      <Floating anchorRef={a} panelRef={p} open={open} align={align} className={className}>{children}</Floating>
    </>
  );
}

/* Checkbox & Toggle Group */
const Checkbox = ({ checked, onChange, label }) => (
  <button type="button" role="checkbox" aria-checked={checked} aria-label={label} data-state={checked ? 'checked' : 'unchecked'} onClick={() => onChange(!checked)}
    className="peer flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground">
    {checked && <I.check className="size-3" />}
  </button>
);
const ToggleGroup = ({ value, onChange, items, label }) => (
  <div role="radiogroup" aria-label={label} className="inline-flex items-center rounded-md shadow-sm">
    {items.map((it, i) => (
      <button key={it.value} type="button" role="radio" aria-checked={value === it.value} data-state={value === it.value ? 'on' : 'off'} onClick={() => onChange(it.value)}
        className={cn('inline-flex h-9 items-center justify-center gap-1.5 border border-input bg-transparent px-3 text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
          i === 0 ? 'rounded-l-md' : '-ml-px', i === items.length - 1 && 'rounded-r-md')}>
        {it.icon}{it.label}
      </button>
    ))}
  </div>
);

/* Calendar + Date Picker */
const pad = n => String(n).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

function Calendar({ selected, onSelect }) {
  const base = selected ? fromISO(selected) : new Date();
  const [month, setMonth] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const start = new Date(month); start.setDate(1 - month.getDay());
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const today = toISO(new Date());
  const nav = 'inline-flex items-center justify-center rounded-md h-7 w-7 border border-input bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-accent';
  return (
    <div className="p-3">
      <div className="relative flex items-center justify-center pt-1 pb-3">
        <button type="button" className={cn(nav, 'absolute left-1')} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><I.left /></button>
        <div className="text-sm font-medium">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
        <button type="button" className={cn(nav, 'absolute right-1')} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><I.right /></button>
      </div>
      <div className="grid grid-cols-7">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="w-8 text-center text-[0.8rem] font-normal text-muted-foreground pb-1">{d}</div>)}
        {days.map(d => {
          const iso = toISO(d), outside = d.getMonth() !== month.getMonth(), sel = iso === selected, isToday = iso === today;
          return (
            <button key={iso} type="button" onClick={() => onSelect(iso)}
              className={cn('h-8 w-8 p-0 text-sm rounded-md font-normal tnum transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                isToday && !sel && 'bg-accent text-accent-foreground',
                sel && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                outside && !sel && 'text-muted-foreground opacity-50')}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function DatePicker({ id, value, onChange, className, placeholder = 'Pick a date', format = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }, variant = 'outline', icon = true }) {
  const [open, setOpen] = useState(false);
  const a = useRef(null), p = useRef(null);
  useDismiss(open, setOpen, [a, p]);
  return (
    <>
      <Button id={id} ref={a} variant={variant} onClick={() => setOpen(o => !o)} className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground', className)}>
        {icon && <I.calendar />}
        {value ? fromISO(value).toLocaleDateString(undefined, format) : placeholder}
      </Button>
      <Floating anchorRef={a} panelRef={p} open={open} className="w-auto p-0">
        <Calendar selected={value} onSelect={v => { onChange(v); setOpen(false); }} />
        <div className="flex gap-2 border-t p-2">
          <Button size="sm" variant="ghost" className="flex-1" onClick={() => { onChange(toISO(new Date())); setOpen(false); }}>Today</Button>
          <Button size="sm" variant="ghost" className="flex-1" onClick={() => { onChange(''); setOpen(false); }} disabled={!value}>Clear</Button>
        </div>
      </Floating>
    </>
  );
}

/* Combobox (assignee) */
function Combobox({ id, value, onChange, options, placeholder, createLabel = v => `Assign to “${v}”`, icon, inputClassName, hideIcon }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const a = useRef(null), p = useRef(null);
  useDismiss(open, setOpen, [a, p]);
  const q = value.trim().toLowerCase();
  const list = options.filter(o => !q || o.toLowerCase().includes(q));
  const exact = options.some(o => o.toLowerCase() === q);
  const rows = [...list, ...(q && !exact ? [{ create: value.trim() }] : [])];
  const pick = r => { onChange(typeof r === 'string' ? r : r.create); setOpen(false); };
  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi(h => Math.min(h + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && open && rows[hi]) { e.preventDefault(); pick(rows[hi]); }
  };
  return (
    <div ref={a} className="relative">
      <Input id={id} value={value} placeholder={placeholder} autoComplete="off" role="combobox" aria-expanded={open}
        onFocus={() => { setOpen(true); setHi(0); }} onChange={e => { onChange(e.target.value); setOpen(true); setHi(0); }} onKeyDown={onKey} className={cn(!hideIcon && 'pr-8', inputClassName)} />
      {!hideIcon && <I.updown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50" />}
      <Floating anchorRef={a} panelRef={p} open={open && rows.length > 0} matchWidth className="p-1 max-h-60 overflow-auto">
        <div role="listbox">
          {rows.map((r, i) => {
            const label = typeof r === 'string' ? r : createLabel(r.create);
            const sel = typeof r === 'string' && r === value;
            return (
              <button key={label} type="button" role="option" aria-selected={sel} onMouseEnter={() => setHi(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(r)}
                className={cn('relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none', i === hi && 'bg-accent text-accent-foreground')}>
                {typeof r === 'string' ? (icon ? icon(r) : <Avatar name={r} className="h-5 w-5" />) : <I.plus />}
                <span className="truncate">{label}</span>
                {sel && <I.check className="ml-auto" />}
              </button>
            );
          })}
        </div>
      </Floating>
    </div>
  );
}

/* Sheet & Alert Dialog */
function useLockScroll(on) {
  useEffect(() => { if (!on) return; const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = o; }; }, [on]);
}
const SHEET_VARIANTS = {
  side: 'fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l bg-background shadow-lg sm:max-w-md anim-sheet',
  center: 'fixed left-1/2 top-1/2 z-50 flex h-[min(88vh,920px)] w-[min(880px,calc(100%-2rem))] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl anim-zoom',
  full: 'fixed inset-0 z-50 flex flex-col bg-background anim-fade',
};
function Sheet({ open, onClose, children, labelledBy, variant = 'side' }) {
  useLockScroll(open);
  useEffect(() => {
    if (!open) return;
    const k = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <>
      {variant !== 'full' && <div className="fixed inset-0 z-50 bg-black/80 anim-fade" onClick={onClose} />}
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy}
        className={SHEET_VARIANTS[variant] || SHEET_VARIANTS.side}
        style={{ paddingTop: 'env(safe-area-inset-top,0px)', paddingBottom: 'env(safe-area-inset-bottom,0px)', ...(variant === 'center' ? { transform: 'translate(-50%,-50%)' } : {}) }}>
        {children}
        <button type="button" onClick={onClose} aria-label="Close"
          className="absolute right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          style={{ top: 'calc(1rem + env(safe-area-inset-top,0px))' }}><I.x /></button>
      </div>
    </>, document.body);
}
function AlertDialog({ open, title, description, confirmLabel, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    cancelRef.current && cancelRef.current.focus();
    const k = e => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, [open]);
  if (!open) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[70] bg-black/80 anim-fade" />
      <div role="alertdialog" aria-modal="true" className="fixed left-1/2 top-1/2 z-[70] grid w-[calc(100%-2rem)] max-w-lg gap-4 rounded-lg border bg-background p-6 shadow-lg anim-zoom" style={{ transform: 'translate(-50%,-50%)' }}>
        <div className="flex flex-col space-y-2 text-center sm:text-left">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </>, document.body);
}

/* Switch & Dialog */
const Switch = ({ checked, onChange, label }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} data-state={checked ? 'checked' : 'unchecked'} onClick={() => onChange(!checked)}
    className="inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=unchecked]:bg-input">
    <span data-state={checked ? 'checked' : 'unchecked'} className="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
  </button>
);
function Dialog({ open, onClose, title, description, children, footer, className }) {
  useLockScroll(open);
  useEffect(() => {
    if (!open) return;
    const k = e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[70] bg-black/80 anim-fade" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="dlg-title"
        className={cn('fixed left-1/2 top-1/2 z-[70] grid max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] gap-5 overflow-y-auto rounded-lg border bg-background p-6 shadow-lg anim-zoom', className || 'max-w-2xl')} style={{ transform: 'translate(-50%,-50%)' }}>
        <div className="flex flex-col space-y-1.5 pr-6 text-left">
          <h2 id="dlg-title" className="text-lg font-semibold leading-none tracking-tight break-words">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {children}
        {footer && <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"><I.x /></button>
      </div>
    </>, document.body);
}

/* Toast (Sonner style) */
const toastSubs = new Set();
const toast = (title, description, opts = {}) => toastSubs.forEach(f => f({ title, description, undo: !!opts.undo }));
// Set by the app, so a message's "Undo" button can undo the change it describes.
const undoHook = { current: null };
function Toaster() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const f = t => { const id = Math.random(); setItems(p => [...p.slice(-2), { ...t, id }]); setTimeout(() => setItems(p => p.filter(x => x.id !== id)), t.undo ? 6000 : 3000); };
    toastSubs.add(f); return () => toastSubs.delete(f);
  }, []);
  return (
    <div aria-live="polite" className="fixed right-4 z-[100] flex w-[calc(100%-2rem)] max-w-[356px] flex-col gap-2" style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom,0px))' }}>
      {items.map(t => (
        <div key={t.id} className="anim-toast flex items-start gap-3 rounded-lg border bg-background p-4 text-sm shadow-lg">
          <div className="min-w-0 flex-1">
            <div className="font-medium">{t.title}</div>
            {t.description && <div className="text-muted-foreground mt-0.5">{t.description}</div>}
          </div>
          {t.undo && undoHook.current && (
            <button type="button" onClick={() => { undoHook.current(); setItems(p => p.filter(x => x.id !== t.id)); }}
              className="shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted">Undo</button>
          )}
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   Data
   ========================================================= */
const STATUSES = [
  { id: 'todo', label: 'To do', dot: 'bg-orange-400', tone: 'bg-orange-100 text-orange-600 dark:bg-orange-950/70 dark:text-orange-300', icon: 'layers' },
  { id: 'doing', label: 'In progress', dot: 'bg-blue-500', tone: 'bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-300', icon: 'loader' },
  { id: 'blocked', label: 'Blocked', dot: 'bg-red-500', tone: 'bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-300', icon: 'ban' },
  { id: 'done', label: 'Done', dot: 'bg-emerald-500', tone: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300', icon: 'check' },
];
const S = Object.fromEntries(STATUSES.map((s, i) => [s.id, { ...s, i }]));
const LS = 'tasks-cache-v1';
const LS_RULES = 'tasks-rules-v1';
const RULES_DOC = '_rules';
const DEFAULT_PROJECTS = ['Kaufes - Mobile', 'Kaufes - Web'];
const DEFAULT_RULES = [{ id: 'r-kaufes', enabled: true, project: 'Kaufes - Mobile', trigger: 'done', action: 'copy', target: 'Kaufes - Web' }];
// Older versions only had "copy to another project when done" rules ({ from, to }).
const normalizeRule = r => r && r.trigger ? r : { id: r.id || newId(), enabled: r.enabled !== false, project: r.from || '', trigger: 'done', action: 'copy', target: r.to || '' };

/* Project colors (full class names, so Tailwind keeps them). */
const PROJECT_COLORS = {
  violet: { dot: 'bg-violet-500', soft: 'bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300', bar: 'bg-violet-500' },
  blue: { dot: 'bg-blue-500', soft: 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300', bar: 'bg-blue-500' },
  emerald: { dot: 'bg-emerald-500', soft: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300', bar: 'bg-emerald-500' },
  amber: { dot: 'bg-amber-500', soft: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300', bar: 'bg-amber-500' },
  rose: { dot: 'bg-rose-500', soft: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300', bar: 'bg-rose-500' },
  cyan: { dot: 'bg-cyan-500', soft: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300', bar: 'bg-cyan-500' },
  orange: { dot: 'bg-orange-500', soft: 'bg-orange-100 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300', bar: 'bg-orange-500' },
  slate: { dot: 'bg-slate-500', soft: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300', bar: 'bg-slate-500' },
};
const COLOR_KEYS = Object.keys(PROJECT_COLORS);
const autoColor = name => COLOR_KEYS[[...(name || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % COLOR_KEYS.length];

/* Automations: "When a task [in project] [trigger], [action] [target]". */
const TRIGGERS = [
  { id: 'created', label: 'is created', short: 'When created', group: 'Status' },
  { id: 'started', label: 'is started (In progress)', short: 'When started', group: 'Status' },
  { id: 'blocked', label: 'becomes blocked', short: 'When blocked', group: 'Status' },
  { id: 'unblocked', label: 'is no longer blocked', short: 'When unblocked', group: 'Status' },
  { id: 'done', label: 'is marked done', short: 'When done', group: 'Status' },
  { id: 'reopened', label: 'is reopened after being done', short: 'When reopened', group: 'Status' },
  { id: 'due_soon', label: 'is due tomorrow', short: 'A day before the deadline', group: 'Dates' },
  { id: 'overdue', label: 'becomes overdue', short: 'When overdue', group: 'Dates' },
  { id: 'checklist', label: 'has its checklist finished', short: 'When the checklist is finished', group: 'Details' },
  { id: 'assigned', label: 'gets a new assignee', short: 'When assigned', group: 'Details' },
  { id: 'high', label: 'is set to High priority', short: 'When made High priority', group: 'Details' },
  { id: 'file_added', label: 'gets a document attached', short: 'When a document is attached', group: 'Details' },
  { id: 'moved', label: 'is moved into the project', short: 'When moved into this project', group: 'Details' },
];
// Triggers that depend on the date are checked when the app opens and every minute after.
const TIME_TRIGGERS = ['overdue', 'due_soon'];
const ACTIONS = [
  { id: 'copy', label: 'create a copy in', target: 'project' },
  { id: 'move', label: 'move it to', target: 'project' },
  { id: 'status', label: 'change its status to', target: 'status' },
  { id: 'priority', label: 'set its priority to', target: 'priority' },
  { id: 'assign', label: 'assign it to', target: 'person' },
  { id: 'unassign', label: 'remove its assignee', target: 'none' },
  { id: 'deadline', label: 'set its deadline to', target: 'days' },
  { id: 'checklist', label: 'add checklist items', target: 'text', placeholder: 'For example: Brief, Design, Review' },
  { id: 'stop_timer', label: 'stop its timer', target: 'none' },
  { id: 'notify', label: 'notify me', target: 'text', optional: true, placeholder: 'Message (optional)' },
];
const DEADLINE_OPTIONS = [['0', 'today'], ['1', 'tomorrow'], ['2', 'in 2 days'], ['3', 'in 3 days'], ['7', 'in a week'], ['14', 'in 2 weeks'], ['30', 'in a month'], ['none', 'no deadline']];
const TRIG = Object.fromEntries(TRIGGERS.map(t => [t.id, t]));
const ACT = Object.fromEntries(ACTIONS.map(a => [a.id, a]));
const norm = s => (s || '').trim().toLowerCase();
const LS_VIEW = 'tasks-view-v1';
const PRIORITIES = [{ id: 'low', label: 'Low', i: 2 }, { id: 'normal', label: 'Medium', i: 1 }, { id: 'high', label: 'High', i: 0 }];
const PRI_PILL = { high: 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300', normal: 'bg-orange-100 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300', low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
const P = Object.fromEntries(PRIORITIES.map(p => [p.id, p]));
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const targetText = r => {
  const kind = (ACT[r.action] || {}).target;
  if (kind === 'none') return '';
  if (r.action === 'status') return (S[r.target] || {}).label;
  if (r.action === 'priority') return (P[r.target] || {}).label;
  if (r.action === 'deadline') return (DEADLINE_OPTIONS.find(o => o[0] === r.target) || [])[1];
  if (kind === 'text') return r.target ? `“${r.target}”` : '';
  return r.target;
};
const describeRule = r => {
  const a = ACT[r.action] || {};
  const tail = a.target === 'none' || (a.optional && !r.target) ? '' : ` ${targetText(r) || '…'}`;
  return `${r.project ? `In ${r.project}, when` : 'When'} a task ${(TRIG[r.trigger] || {}).label}, ${a.label}${tail}`;
};

/* Local storage: everything is written as JSON files in the app's data folder on this computer. */
const writers = {};
function persist(name, obj) {
  const w = writers[name] || (writers[name] = { busy: false, next: null });
  w.next = JSON.stringify(obj);
  if (w.busy) return;
  w.busy = true;
  (async () => {
    while (w.next !== null) {
      const content = w.next; w.next = null;
      try { await invoke('write_store', { name, content }); }
      catch (e) { toast('Couldn’t save your changes', String(e)); }
    }
    w.busy = false;
  })();
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function flushAll() { while (Object.values(writers).some(w => w.busy)) await sleep(30); }

/* Several windows can be open (the main one and tasks popped out on their own).
   Whenever one saves, it tells the others, which take over the new data. */
const WINDOW_LABEL = (() => { try { return getCurrentWindow().label; } catch (e) { return 'main'; } })();
// Column names can be changed per workspace. Marketing starts with names that suit its work.
const LABEL_KEYS = ['task', 'status', 'bucket', 'platform', 'assignee', 'deadline', 'priority', 'time'];
const LABEL_DEFAULTS = { task: 'Task', status: 'Status', bucket: 'Bucket', platform: 'Platform', assignee: 'Assignee', deadline: 'Deadline', priority: 'Priority', time: 'Time' };
const WS_LABELS = { marketing: { bucket: 'Campaign', platform: 'Channel' } };
const ARCHIVE_DAYS_DEFAULT = 30;
const TRASH_DAYS = 15;
const storeFor = (base, ws) => (ws === 'product' ? base : `${base}-${ws}`);
const plural = w => (/s$/i.test(w) ? w : /[^aeiou]y$/i.test(w) ? w.slice(0, -1) + 'ies' : w + 's');

function useTasks(ws = 'product') {
  const isProduct = ws === 'product';
  const [loaded, setLoaded] = useState(false);
  const [tasks, setTasks] = useState({});
  const [rules, setRules] = useState(isProduct ? DEFAULT_RULES : []);
  const [projects, setProjects] = useState(isProduct ? null : []);
  const [stages, setStages] = useState([]);
  const [buckets, setBuckets] = useState([]);
  const [labels, setLabels] = useState({});
  const [settings, setSettings] = useState({ archiveDays: ARCHIVE_DAYS_DEFAULT });
  const [looseDocs, setLooseDocs] = useState([]);
  // Archive and Trash live in their own file, so the everyday list stays small and fast.
  const [arch, setArch] = useState({ archived: {}, trash: {} });
  const [archLoaded, setArchLoaded] = useState(false);
  const remote = useRef(null), remoteArch = useRef(null);
  // Undo history: snapshots of this workspace, grouped so a burst of changes is one step.
  const hist = useRef({ past: [], future: [], last: null, pending: null, mute: 0, timer: null });
  const [, bumpHist] = useState(0);
  const apply = d => {
    hist.current.mute += 1;
    setTasks(d.tasks || {});
    if (Array.isArray(d.rules)) setRules(d.rules.map(normalizeRule));
    if (Array.isArray(d.projects)) setProjects(d.projects);
    setStages(Array.isArray(d.stages) ? d.stages : []);
    setBuckets(Array.isArray(d.buckets) ? d.buckets : []);
    setLabels(d.labels && typeof d.labels === 'object' ? d.labels : {});
    setSettings({ archiveDays: ARCHIVE_DAYS_DEFAULT, ...(d.settings || {}) });
    setLooseDocs(Array.isArray(d.looseDocs) ? d.looseDocs : []);
  };
  useEffect(() => {
    let un = null, un2 = null, dead = false;
    listen('tasks-data', e => {
      if (!e.payload || e.payload.from === WINDOW_LABEL || (e.payload.ws || 'product') !== ws) return;
      remote.current = JSON.stringify(e.payload.data);
      apply(e.payload.data);
    }).then(f => { if (dead) f(); else un = f; }).catch(() => {});
    listen('tasks-arch', e => {
      if (!e.payload || e.payload.from === WINDOW_LABEL || e.payload.ws !== ws) return;
      remoteArch.current = JSON.stringify(e.payload.data);
      hist.current.mute += 1;
      setArch(e.payload.data);
    }).then(f => { if (dead) f(); else un2 = f; }).catch(() => {});
    return () => { dead = true; try { un && un(); un2 && un2(); } catch (e) {} };
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const raw = await invoke('read_store', { name: storeFor('data', ws) });
        if (raw) apply(JSON.parse(raw));
      } catch (e) { toast('Couldn’t read your saved tasks', String(e)); }
      setLoaded(true);
      try {
        const raw = await invoke('read_store', { name: storeFor('archive', ws) });
        if (raw) { const a = JSON.parse(raw); setArch({ archived: a.archived || {}, trash: a.trash || {} }); }
      } catch (e) {}
      setArchLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const data = { version: 4, tasks, rules, projects: projects || [], stages, buckets, labels, settings, looseDocs };
    if (JSON.stringify(data) === remote.current) return; // came from another window, already saved there
    persist(storeFor('data', ws), data);
    emit('tasks-data', { from: WINDOW_LABEL, ws, data }).catch(() => {});
  }, [tasks, rules, projects, stages, buckets, labels, settings, looseDocs, loaded]);
  useEffect(() => {
    if (!archLoaded) return;
    if (JSON.stringify(arch) === remoteArch.current) return;
    persist(storeFor('archive', ws), { version: 1, ...arch });
    emit('tasks-arch', { from: WINDOW_LABEL, ws, data: arch }).catch(() => {});
  }, [arch, archLoaded]);

  useEffect(() => {
    if (!loaded || !archLoaded) return;
    const h = hist.current;
    const cur = { tasks, rules, projects, stages, buckets, labels, settings, looseDocs, arch };
    if (!h.last || h.mute > 0) { h.mute = Math.max(0, h.mute - 1); h.last = cur; return; }
    if (!h.pending) h.pending = h.last;
    h.last = cur;
    clearTimeout(h.timer);
    h.timer = setTimeout(() => { if (h.pending) { h.past.push(h.pending); if (h.past.length > 30) h.past.shift(); h.future = []; h.pending = null; bumpHist(x => x + 1); } }, 700);
  }, [tasks, rules, projects, stages, buckets, labels, settings, looseDocs, arch, loaded, archLoaded]);
  const restoreSnap = sn => {
    hist.current.mute += 1;
    setTasks(sn.tasks); setRules(sn.rules); setProjects(sn.projects); setStages(sn.stages); setBuckets(sn.buckets);
    setLabels(sn.labels); setSettings(sn.settings); setLooseDocs(sn.looseDocs); setArch(sn.arch);
  };
  const flushHist = () => { const h = hist.current; clearTimeout(h.timer); if (h.pending) { h.past.push(h.pending); h.future = []; h.pending = null; } };
  const undo = useCallback(() => {
    flushHist();
    const h = hist.current; if (!h.past.length) return false;
    const prev = h.past.pop(); h.future.push(h.last); h.last = prev; restoreSnap(prev); bumpHist(x => x + 1); return true;
  }, []);
  const redo = useCallback(() => {
    flushHist();
    const h = hist.current; if (!h.future.length) return false;
    const next = h.future.pop(); h.past.push(h.last); h.last = next; restoreSnap(next); bumpHist(x => x + 1); return true;
  }, []);

  // Every save stamps the time, and records when a task was completed (cleared again if it's reopened).
  const saveMany = useCallback(list => {
    const now = Date.now();
    setTasks(p => {
      const n = { ...p };
      list.forEach(t => {
        const prev = p[t.id];
        let doneAt = null;
        if (t.status === 'done') doneAt = (prev && prev.status === 'done' && (prev.doneAt || t.doneAt)) || t.doneAt || now;
        n[t.id] = { ...t, updatedAt: now, doneAt };
      });
      return n;
    });
  }, []);
  const remove = useCallback(id => { setTasks(p => { const n = { ...p }; delete n[id]; return n; }); }, []);
  const saveRules = useCallback(list => setRules(list), []);

  // Files no task (active, archived or in the Trash) uses anymore stay in Documents as "No task".
  const keepFiles = (files, stillUsed) => {
    const free = (files || []).filter(f => !stillUsed.some(t => (t.files || []).some(x => x.id === f.id)));
    if (free.length) setLooseDocs(l => [...l, ...free.filter(f => !l.some(x => x.id === f.id))]);
  };
  const tasksRef = useRef(tasks); tasksRef.current = tasks;
  const archRef = useRef(arch); archRef.current = arch;
  const trashTasks = useCallback(ids => {
    const now = Date.now(), cur = tasksRef.current, a = archRef.current;
    const moving = ids.map(id => cur[id] || a.archived[id]).filter(Boolean);
    if (!moving.length) return;
    setTasks(p => { const n = { ...p }; ids.forEach(id => delete n[id]); return n; });
    setArch(x => {
      const archived = { ...x.archived }, trash = { ...x.trash };
      moving.forEach(t => { delete archived[t.id]; trash[t.id] = { ...stopT(t), deletedAt: now }; });
      return { archived, trash };
    });
  }, []);
  const restoreTask = useCallback(id => {
    const a = archRef.current, t = a.archived[id] || a.trash[id];
    if (!t) return;
    const { archivedAt, deletedAt, ...rest } = t;
    setArch(x => { const archived = { ...x.archived }, trash = { ...x.trash }; delete archived[id]; delete trash[id]; return { archived, trash }; });
    setTasks(p => ({ ...p, [id]: { ...rest, doneAt: rest.status === 'done' ? Date.now() : null, updatedAt: Date.now() } }));
  }, []);
  const purgeTrash = useCallback(ids => {
    const a = archRef.current;
    const gone = ids.map(id => a.trash[id]).filter(Boolean);
    if (!gone.length) return;
    const rest = [...Object.values(tasksRef.current), ...Object.values(a.archived), ...Object.values(a.trash).filter(t => !ids.includes(t.id))];
    keepFiles(gone.flatMap(t => t.files || []), rest);
    setArch(x => { const trash = { ...x.trash }; ids.forEach(id => delete trash[id]); return { ...x, trash }; });
  }, []);
  // Archive finished tasks after the chosen number of days, and empty the Trash after 15 days.
  useEffect(() => {
    if (!loaded || !archLoaded || WINDOW_LABEL !== 'main') return;
    const run = () => {
      const now = Date.now(), days = Number(settings.archiveDays) || 0;
      if (days > 0) {
        const cutoff = now - days * 864e5;
        const old = Object.values(tasksRef.current).filter(t => t.status === 'done' && !t.timerStartedAt && (t.doneAt || t.updatedAt || t.createdAt || now) < cutoff);
        if (old.length) {
          setTasks(p => { const n = { ...p }; old.forEach(t => delete n[t.id]); return n; });
          setArch(x => { const archived = { ...x.archived }; old.forEach(t => { archived[t.id] = { ...t, archivedAt: now }; }); return { ...x, archived }; });
        }
      }
      const expired = Object.values(archRef.current.trash).filter(t => now - (t.deletedAt || now) > TRASH_DAYS * 864e5).map(t => t.id);
      if (expired.length) purgeTrash(expired);
    };
    run();
    const i = setInterval(run, 3600e3);
    return () => clearInterval(i);
  }, [loaded, archLoaded, settings.archiveDays]);

  // Deleting a document removes it from every task. The file itself is deleted at the next start,
  // so Undo can still bring it back in this session.
  const deleteDocEverywhere = useCallback(f => {
    const strip = t => (t.files || []).some(x => x.id === f.id) ? { ...t, files: t.files.filter(x => x.id !== f.id) } : t;
    setTasks(p => { const n = {}; Object.entries(p).forEach(([k, t]) => { n[k] = strip(t); }); return n; });
    setArch(x => ({ archived: Object.fromEntries(Object.entries(x.archived).map(([k, t]) => [k, strip(t)])), trash: Object.fromEntries(Object.entries(x.trash).map(([k, t]) => [k, strip(t)])) }));
    setLooseDocs(l => l.filter(x => x.id !== f.id));
    setSettings(st => ({ ...st, purgeFiles: [...(st.purgeFiles || []).filter(x => x.id !== f.id), f] }));
  }, []);
  useEffect(() => {
    if (!loaded || !archLoaded || WINDOW_LABEL !== 'main' || !(settings.purgeFiles || []).length) return;
    const used = id => [...Object.values(tasksRef.current), ...Object.values(archRef.current.archived), ...Object.values(archRef.current.trash)]
      .some(t => (t.files || []).some(x => x.id === id)) || looseDocs.some(x => x.id === id);
    settings.purgeFiles.forEach(f => { if (!used(f.id)) deleteDoc(f); });
    setSettings(st => ({ ...st, purgeFiles: [] }));
  }, [loaded, archLoaded]);

  return {
    undo, redo, canUndo: hist.current.past.length > 0 || !!hist.current.pending, canRedo: hist.current.future.length > 0,
    deleteDocEverywhere,
    tasks, saveMany, remove, rules, saveRules, projects: projects || [], saveProjects: setProjects, stages, saveStages: setStages,
    buckets, saveBuckets: setBuckets, labels: { ...LABEL_DEFAULTS, ...(WS_LABELS[ws] || {}), ...labels }, saveLabels: setLabels,
    settings, saveSettings: setSettings, looseDocs, saveLooseDocs: setLooseDocs,
    archived: arch.archived, trash: arch.trash, trashTasks, restoreTask, purgeTrash, loaded: loaded && archLoaded,
  };
}

/* Desktop notifications (used by the "send me a notification" automation). Falls back to an in-app message. */
async function notifyDesktop(title, body) {
  try {
    let ok = await isPermissionGranted();
    if (!ok) ok = (await requestPermission()) === 'granted';
    if (ok) { sendNotification({ title, body }); return; }
  } catch (e) {}
  toast(title, body);
}

/* Self-updating: new versions are published as GitHub releases.
   The app checks a few seconds after it starts, and whenever you ask it to. */
function useUpdater() {
  const [version, setVersion] = useState('');
  const [update, setUpdate] = useState(null);
  const [progress, setProgress] = useState(null); // null = idle, -1 = downloading (size unknown), 0–100, 'installing'
  const look = useCallback(async manual => {
    try {
      const u = await checkForUpdate();
      if (u) setUpdate(u);
      else if (manual) toast('You’re up to date', `You have the latest version, ${await getVersion()}.`);
    } catch (e) {
      if (manual) toast('Couldn’t check for updates', 'Check your internet connection and try again.');
    }
  }, []);
  useEffect(() => {
    getVersion().then(setVersion).catch(() => {});
    const t = WINDOW_LABEL === 'main' ? setTimeout(() => look(false), 4000) : null;
    return () => clearTimeout(t);
  }, [look]);
  const install = async () => {
    if (!update) return;
    try {
      await flushAll();
      let total = 0, got = 0;
      setProgress(-1);
      await update.downloadAndInstall(ev => {
        if (ev.event === 'Started') total = ev.data.contentLength || 0;
        else if (ev.event === 'Progress') { got += ev.data.chunkLength; if (total) setProgress(Math.min(99, Math.round(got / total * 100))); }
        else if (ev.event === 'Finished') setProgress('installing');
      });
      await relaunch();
    } catch (e) {
      setProgress(null);
      toast('The update didn’t install', String(e));
    }
  };
  return { version, update, progress, look, install, dismiss: () => setUpdate(null) };
}

/* Light, dark, or follow Windows. Remembered on this computer. */
const THEMES = [{ id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }, { id: 'system', label: 'Match Windows' }];
function useTheme() {
  const [mode, setMode] = useState(readTheme);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = e => setSystemDark(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const choose = m => { setMode(m); saveTheme(m); applyTheme(m); };
  useEffect(() => { const on = e => setMode(e.detail); window.addEventListener('tasks-theme', on); return () => window.removeEventListener('tasks-theme', on); }, []);
  const dark = mode === 'dark' || (mode === 'system' && systemDark);
  return { mode, dark, choose, toggle: () => choose(dark ? 'light' : 'dark') };
}

/* The tab strip: Home first, then each task you opened in a tab. */
function TabStrip({ list, active, tasks, stages, onSelect, onClose, onNew }) {
  return (
    <div role="tablist" aria-label="Open tabs" className="flex h-10 shrink-0 items-end gap-0.5 overflow-x-auto overflow-y-hidden px-2 [scrollbar-width:none]" style={{ background: 'hsl(var(--strip))' }}>
      {['home', ...list].map(id => {
        const t = id === 'home' ? null : tasks[id];
        if (id !== 'home' && !t) return null;
        const on = active === id, name = t ? (t.title || 'Untitled') : 'Home';
        return (
          <div key={id} role="tab" tabIndex={0} aria-selected={on} title={name}
            onClick={() => onSelect(id)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(id); } }}
            onAuxClick={e => { if (e.button === 1 && t) { e.preventDefault(); onClose(id); } }}
            onMouseDown={e => { if (e.button === 1) e.preventDefault(); }}
            className={cn('flex h-[34px] min-w-0 cursor-default items-center gap-2 rounded-t-lg pl-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
              t ? 'min-w-[7rem] flex-[0_1_13rem] pr-1.5' : 'shrink-0 pr-3', on ? 'font-medium text-foreground' : 'text-muted-foreground hover:bg-background/40 hover:text-foreground')}
            style={on ? { background: 'hsl(var(--page))' } : undefined}>
            {t ? <span className={cn('size-2 shrink-0 rounded-full', STATUS_COLORS[statusDef(t, stages).color])} /> : <I.home className="size-3.5 shrink-0" />}
            <span className="min-w-0 flex-1 truncate">{name}</span>
            {t && (
              <button type="button" aria-label={`Close ${name}`} title="Close tab (Ctrl+W)" onClick={e => { e.stopPropagation(); onClose(id); }}
                className="flex size-5 shrink-0 items-center justify-center rounded opacity-60 hover:bg-muted hover:opacity-100"><I.x className="size-3" /></button>
            )}
          </div>
        );
      })}
      <button type="button" aria-label="New task in a new tab" title="New task in a new tab" onClick={onNew}
        className="mb-1 ml-1 flex size-7 shrink-0 items-center justify-center self-center rounded-md text-muted-foreground hover:bg-background/50 hover:text-foreground"><I.plus className="size-3.5" /></button>
    </div>
  );
}

function ThemeToggle() {
  const th = useTheme();
  return (
    <DropdownMenu
      trigger={p => <Button {...p} variant="outline" size="icon" className="rounded-full bg-card shadow-none" aria-label={`Appearance: ${THEMES.find(t => t.id === th.mode).label}`} title="Appearance (Shift+D)">{th.dark ? <I.moon /> : <I.sun />}</Button>}
      items={THEMES.map(t => ({
        label: t.label,
        icon: t.id === 'light' ? <I.sun /> : t.id === 'dark' ? <I.moon /> : <I.monitor />,
        shortcut: th.mode === t.id ? '✓' : undefined,
        onSelect: () => th.choose(t.id),
      }))} />
  );
}

async function openTaskWindow(id, title, ws = 'product') {
  const label = 'task-' + String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  try {
    const existing = await WebviewWindow.getByLabel(label);
    if (existing) { await existing.setFocus(); return; }
    const w = new WebviewWindow(label, { url: 'index.html#task=' + encodeURIComponent(id) + '&ws=' + encodeURIComponent(ws), title: title || 'Task', width: 780, height: 880, minWidth: 480, minHeight: 480 });
    w.once('tauri://error', e => toast('Couldn’t open a new window', String(e && e.payload)));
  } catch (e) { toast('Couldn’t open a new window', String(e)); }
}

function useProfile() {
  const [state, setState] = useState({ loaded: false, data: {} });
  useEffect(() => {
    invoke('read_store', { name: 'profile' })
      .then(raw => setState({ loaded: true, data: raw ? JSON.parse(raw) : {} }))
      .catch(() => setState({ loaded: true, data: {} }));
  }, []);
  const update = useCallback(patch => setState(s => { const data = { ...s.data, ...patch }; persist('profile', data); return { ...s, data }; }), []);
  return { ...state, update };
}

const elapsed = t => (t.timeSpent || 0) + (t.timerStartedAt ? Date.now() - t.timerStartedAt : 0);
// Stops a running timer and records the session, so time can be summed per day and week.
const stopT = t => t.timerStartedAt
  ? { ...t, timeSpent: elapsed(t), timerStartedAt: null, sessions: [...(t.sessions || []), { s: t.timerStartedAt, e: Date.now() }].slice(-300) }
  : t;
const overlap = (s, e, a, b) => Math.max(0, Math.min(e, b) - Math.max(s, a));
const trackedIn = (t, a, b) => (t.sessions || []).reduce((x, ss) => x + overlap(ss.s, ss.e, a, b), 0) + (t.timerStartedAt ? overlap(t.timerStartedAt, Date.now(), a, b) : 0);
const fmtShort = ms => { const m = Math.floor(ms / 60000), h = Math.floor(m / 60); return h ? `${h}h ${m % 60}m` : `${m}m`; };
const fmt = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 3600)}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`; };
const dayDiff = iso => { const n = new Date(); n.setHours(0, 0, 0, 0); return Math.round((fromISO(iso) - n) / 864e5); };
function due(t) {
  if (!t.deadline) return { text: 'No deadline', tone: 'muted' };
  const nice = fromISO(t.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (t.status === 'done') return { text: nice, tone: 'muted' };
  const d = dayDiff(t.deadline);
  if (d < 0) return { text: `${-d} ${d === -1 ? 'day' : 'days'} overdue`, tone: 'late' };
  if (d === 0) return { text: 'Due today', tone: 'soon' };
  if (d === 1) return { text: 'Tomorrow', tone: 'soon' };
  return { text: nice, tone: 'normal' };
}
const dueCls = { muted: 'text-muted-foreground', late: 'text-destructive font-medium', soon: 'text-foreground font-medium', normal: 'text-foreground' };

/* =========================================================
   App
   ========================================================= */
/* =========================================================
   Documents
   ========================================================= */
const MAX_FILE = 200 * 1024 * 1024;
const ALLOWED = ['pdf', 'docx', 'html', 'htm', 'xlsx', 'csv', 'pptx', 'txt', 'md', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'zip', 'json'];
const RAW_TYPES = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
const MIME = { docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', html: 'text/html', htm: 'text/html', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', txt: 'text/plain', md: 'text/markdown', zip: 'application/zip', json: 'application/json' };
const KINDS = {
  pdf: { label: 'PDF', short: 'PDF', cls: 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400' },
  word: { label: 'Word document', short: 'DOC', cls: 'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' },
  html: { label: 'HTML page', short: 'HTML', cls: 'border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300' },
  image: { label: 'Image', short: 'IMG', cls: 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
  sheet: { label: 'Spreadsheet', short: 'XLS', cls: 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300' },
  slides: { label: 'Presentation', short: 'PPT', cls: 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
  text: { label: 'Text file', short: 'TXT', cls: 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300' },
  other: { label: 'File', short: 'FILE', cls: 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300' },
};
const extOf = name => ((name || '').match(/\.([^.]+)$/) || [, ''])[1].toLowerCase();
const kindOf = name => {
  const e = extOf(name);
  if (e === 'pdf') return 'pdf';
  if (e === 'docx') return 'word';
  if (e === 'html' || e === 'htm') return 'html';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(e)) return 'image';
  if (e === 'xlsx' || e === 'csv') return 'sheet';
  if (e === 'pptx') return 'slides';
  if (['txt', 'md', 'json'].includes(e)) return 'text';
  return 'other';
};
const fmtSize = b => b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`;
const fmtDay = ms => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: new Date(ms).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });

let mammothP = null;
const loadMammoth = () => mammothP || (mammothP = import('mammoth/mammoth.browser.js').then(m => m.default || m).catch(e => { mammothP = null; throw e; }));
// Documents are copied into the app's own folder on this computer,
// so moving or deleting the original file later doesn't break anything.
async function importDoc(info) {
  const r = await invoke('import_document', { path: info.path });
  const e = extOf(info.name);
  return { id: r.id, file: r.file, name: info.name, size: r.size, kind: kindOf(info.name), mime: RAW_TYPES[e] || MIME[e] || 'application/octet-stream', addedAt: Date.now() };
}
async function fileBlob(f) {
  const buf = await invoke('read_document', { file: f.file });
  return new Blob([buf], { type: f.mime });
}
async function downloadFile(f) {
  try {
    const ext = extOf(f.name);
    const dest = await saveDialog({ defaultPath: f.name.replace(/\.htm$/i, '.html'), filters: ext ? [{ name: (KINDS[f.kind] || KINDS.other).label, extensions: [ext === 'htm' ? 'html' : ext] }] : [] });
    if (!dest) return;
    await invoke('export_document', { file: f.file, dest });
    toast('Copy saved', dest);
  } catch (e) { toast(`Couldn’t save “${f.name}”`, String(e)); }
}
async function openExternal(f) {
  try { await invoke('open_document', { file: f.file }); }
  catch (e) { toast(`Couldn’t open “${f.name}”`, 'There may be no app on this computer for this file type.'); }
}
async function deleteDoc(f) { try { await invoke('delete_document', { file: f.file }); } catch (e) {} }
const fileInfos = paths => invoke('file_info', { paths });
async function pickFiles() {
  const sel = await openDialog({ multiple: true, filters: [{ name: 'Documents', extensions: ALLOWED }] });
  if (!sel) return [];
  return await fileInfos(Array.isArray(sel) ? sel : [sel]);
}

const FileBadge = ({ kind, className }) => {
  const k = KINDS[kind] || KINDS.other;
  return <span className={cn('flex h-9 w-8 shrink-0 items-center justify-center rounded-md border text-[9px] font-bold tracking-wide', k.cls, className)} aria-hidden="true">{k.short}</span>;
};

function DropZone({ onFiles, compact, busy }) {
  const pick = async () => { const fs = await pickFiles(); if (fs.length) onFiles(fs); };
  return (
    <button type="button" onClick={pick} disabled={busy}
      className={cn('flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed bg-muted/30 text-center transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60', compact ? 'px-4 py-5' : 'px-6 py-10')}>
      <I.upload className="text-muted-foreground" />
      <div className="text-sm">
        {busy ? <span className="text-muted-foreground">Adding…</span>
          : <><span className="font-medium underline underline-offset-4">Choose files</span><span className="text-muted-foreground"> or drag them onto this window</span></>}
      </div>
      <div className="text-xs text-muted-foreground">PDF, Word, HTML, Excel and more</div>
    </button>
  );
}

function FileRow({ f, onPreview, onDownload, onRemove }) {
  return (
    <div className="flex items-center gap-3 rounded-md border px-3 py-2">
      <FileBadge kind={f.kind} />
      <button type="button" onClick={() => onPreview(f)} className="min-w-0 flex-1 text-left focus-visible:outline-none group">
        <div className="truncate text-sm font-medium group-hover:underline group-focus-visible:underline underline-offset-4">{f.name}</div>
        <div className="text-xs text-muted-foreground">{fmtSize(f.size)}, added {fmtDay(f.addedAt)}</div>
      </button>
      <Button variant="ghost" size="icon-sm" aria-label={`Save a copy of ${f.name}`} onClick={() => onDownload(f)}><I.download /></Button>
      <Button variant="ghost" size="icon-sm" aria-label={`Remove ${f.name}`} onClick={() => onRemove(f)}><I.x /></Button>
    </div>
  );
}

const wrapDoc = body => `<!doctype html><html><head><meta charset="utf-8"><style>body{font:15px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif;color:#18181b;max-width:760px;margin:32px auto;padding:0 24px}img{max-width:100%;height:auto}table{border-collapse:collapse;margin:12px 0}td,th{border:1px solid #e4e4e7;padding:6px 10px;vertical-align:top}h1,h2,h3{line-height:1.25}</style></head><body>${body}</body></html>`;

function useDocPreview(file) {
  const [st, setSt] = useState(null);
  useEffect(() => {
    if (!file) { setSt(null); return; }
    let dead = false, url = null;
    setSt({ loading: true });
    (async () => {
      try {
        if (file.kind === 'pdf' || file.kind === 'image') {
          url = URL.createObjectURL(await fileBlob(file));
          if (!dead) setSt(file.kind === 'pdf' ? { pdf: url } : { img: url });
          return;
        }
        if (file.kind === 'html') { const t = await (await fileBlob(file)).text(); if (!dead) setSt({ html: t }); return; }
        if (file.kind === 'text' || extOf(file.name) === 'csv') { const t = await (await fileBlob(file)).text(); if (!dead) setSt({ text: t }); return; }
        if (file.kind === 'word') {
          const [m, b] = await Promise.all([loadMammoth(), fileBlob(file)]);
          const r = await m.convertToHtml({ arrayBuffer: await b.arrayBuffer() });
          if (!dead) setSt({ html: wrapDoc(r.value) });
          return;
        }
        if (!dead) setSt({ none: true });
      } catch (e) { if (!dead) setSt({ error: true }); }
    })();
    return () => { dead = true; if (url) URL.revokeObjectURL(url); };
  }, [file && file.id]);
  return st;
}
function DocPreview({ file, className }) {
  const st = useDocPreview(file);
  const msg = t => <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">{t}</div>;
  return (
    <div className={cn('overflow-hidden rounded-md border bg-muted/30', className)}>
      {!file ? msg('Select a document to preview it.')
        : !st || st.loading ? msg('Loading preview…')
        : st.error ? msg('Couldn’t show a preview of this file. Use “Open in its app” instead.')
        : st.none ? msg('There’s no preview for this file type. Use “Open in its app” to view it.')
        : st.pdf ? <iframe title={file.name} src={st.pdf} className="h-full w-full bg-white" />
        : st.img ? <img src={st.img} alt={file.name} className="h-full w-full object-contain" />
        : st.html ? <iframe title={file.name} sandbox="" srcDoc={st.html} className="h-full w-full bg-white" />
        : st.text != null ? <pre className="h-full overflow-auto whitespace-pre-wrap p-4 font-mono text-xs">{st.text}</pre>
        : null}
    </div>
  );
}
function PreviewDialog({ file, onClose, onDownload }) {
  if (!file) return null;
  return (
    <Dialog open={!!file} onClose={onClose} className="max-w-4xl" title={file.name}
      description={`${(KINDS[file.kind] || KINDS.other).label}, ${fmtSize(file.size)}`}
      footer={<>
        <Button variant="outline" onClick={() => onDownload(file)}><I.download />Save a copy</Button>
        <Button onClick={() => openExternal(file)}>Open in its app</Button>
      </>}>
      <DocPreview file={file} className="h-[60vh]" />
    </Dialog>
  );
}

function AddDocsDialog({ open, files, setFiles, tasks, projects, busy, onClose, onSubmit }) {
  const [target, setTarget] = useState('__new');
  const [project, setProject] = useState('');
  const openTasks = tasks.filter(t => t.status !== 'done').sort((a, b) => b.createdAt - a.createdAt);
  const doneTasks = tasks.filter(t => t.status === 'done').sort((a, b) => b.createdAt - a.createdAt);
  const n = files.length;
  return (
    <Dialog open={open} onClose={onClose} title="Add documents"
      description="Attach files to a task so they’re easy to find later. You can drag files straight from WhatsApp or File Explorer onto this window."
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!n || busy} onClick={() => onSubmit(files, { target, project })}>{busy ? 'Uploading…' : n ? `Add ${n} ${n === 1 ? 'file' : 'files'}` : 'Add files'}</Button>
      </>}>
      <div className="grid gap-4">
        <DropZone compact onFiles={fs => setFiles(p => [...p, ...fs])} />
        {n > 0 && (
          <div className="grid gap-1.5">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 rounded-md border px-3 py-1.5">
                <FileBadge kind={kindOf(f.name)} className="h-8 w-7" />
                <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                <span className="text-xs text-muted-foreground tnum">{fmtSize(f.size)}</span>
                <Button variant="ghost" size="icon-sm" className="h-7 w-7" aria-label={`Remove ${f.name}`} onClick={() => setFiles(p => p.filter((_, j) => j !== i))}><I.x /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Attach to" htmlFor="ad-target">
            <Select id="ad-target" value={target} onChange={setTarget} options={[
              { value: '__new', label: 'A new task for each file', icon: <I.plus className="size-3.5 text-muted-foreground" /> },
              ...openTasks.map(t => ({ value: t.id, label: t.title || 'Untitled', group: 'Open tasks' })),
              ...doneTasks.map(t => ({ value: t.id, label: t.title || 'Untitled', group: 'Complete' })),
            ]} />
          </Field>
          {target === '__new' && (
            <Field label="Project" htmlFor="ad-project">
              <Select id="ad-project" value={project} onChange={setProject} options={[
                { value: '', label: 'No project', node: <span className="text-muted-foreground">No project</span> },
                ...projects.map(p => ({ value: p, label: p, icon: <I.folder className="size-3.5 text-muted-foreground" /> })),
              ]} />
            </Field>
          )}
        </div>
      </div>
    </Dialog>
  );
}

const DOC_FILTERS = [{ value: 'all', label: 'All' }, { value: 'pdf', label: 'PDF' }, { value: 'word', label: 'Word' }, { value: 'html', label: 'HTML' }, { value: 'other', label: 'Other' }];
function DocumentsView({ docs, tasks, onAdd, onDownload, onRemove, onDelete, onOpenTask, onAttach, dragOver, focusId }) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [selKey, setSelKey] = useState(null);
  useEffect(() => { if (focusId) setSelKey(focusId); }, [focusId]);
  const nq = norm(q);
  const keyOf = d => d.id;
  const list = docs
    .filter(d => (kind === 'all' || (kind === 'other' ? !['pdf', 'word', 'html'].includes(d.kind) : d.kind === kind))
      && (!nq || [d.name, ...d.links.map(l => l.task.title), ...d.links.map(l => l.task.bucket)].some(v => norm(v).includes(nq))))
    .sort((a, b) => b.addedAt - a.addedAt);
  const sel = list.find(d => keyOf(d) === selKey) || list[0] || null;
  const total = docs.reduce((n, d) => n + (d.size || 0), 0);
  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold">Documents</h2>
        <span className="text-sm text-muted-foreground">{docs.length} {docs.length === 1 ? 'file' : 'files'}{total ? `, ${fmtSize(total)}` : ''}</span>
        <div className="relative ml-auto w-60">
          <I.search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search documents" aria-label="Search documents" className="h-9 bg-card pl-9 shadow-none"
            onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setQ(''); e.currentTarget.blur(); } }} />
        </div>
      </div>
      <div className="mb-3 overflow-x-auto"><ToggleGroup label="File type" value={kind} onChange={setKind} items={DOC_FILTERS} /></div>
      {docs.length === 0 ? (
        <Card className={cn(dragOver && 'ring-2 ring-ring')}>
          <Empty icon={<I.file />} title="No documents yet"
            description="Collect the PDFs, Word files and HTML pages from your WhatsApp group here. Each one is attached to a task, so it’s one search away.">
            <Button variant="outline" size="sm" onClick={() => onAdd([])}><I.upload />Add documents</Button>
          </Empty>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <Card className={cn('overflow-hidden', dragOver && 'ring-2 ring-ring')}>
            {list.length === 0 ? <Empty icon={<I.search />} title="No documents match" description="Try another word or file type." /> : (
              <div className="max-h-[min(70vh,720px)] divide-y overflow-y-auto">
                {list.map(d => {
                  const on = sel && keyOf(sel) === keyOf(d);
                  return (
                    <button key={keyOf(d)} type="button" onClick={() => setSelKey(keyOf(d))} aria-pressed={on}
                      className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/60', on && 'bg-muted/70')}>
                      <FileBadge kind={d.kind} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{d.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{d.links.length === 0 ? 'Not linked' : d.links.length === 1 ? `${d.links[0].task.title || 'Untitled'}${d.links[0].archived ? ' (archived)' : ''}` : `${d.links.length} tasks`}, {fmtSize(d.size)}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{relTime(d.addedAt)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
          <Card className="flex min-h-[24rem] flex-col gap-3 p-4">
            {sel ? (
              <>
                <div className="flex items-start gap-3">
                  <FileBadge kind={sel.kind} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{sel.name}</div>
                    <div className="text-xs text-muted-foreground">{fmtSize(sel.size)}, added {relTime(sel.addedAt).toLowerCase()}</div>
                  </div>
                  <DropdownMenu trigger={p => <Button {...p} variant="ghost" size="icon-sm" aria-label={`More for ${sel.name}`}><I.more /></Button>}
                    items={[
                      { label: 'Link to a task…', icon: <I.paperclip />, onSelect: () => onAttach(sel) },
                      'sep',
                      { label: 'Delete document', icon: <I.trash />, destructive: true, onSelect: () => onDelete(sel) },
                    ]} />
                </div>
                <div className="rounded-md border px-3 py-2">
                  <div className="mb-1 flex items-center text-xs font-medium text-muted-foreground">Linked to<span className="ml-1 font-normal">({sel.links.length})</span>
                    <button type="button" onClick={() => onAttach(sel)} className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-normal hover:bg-muted hover:text-foreground"><I.plus className="size-3" />Link to task…</button>
                  </div>
                  {sel.links.length === 0 && <div className="py-1 text-xs text-muted-foreground">Not linked to any task yet.</div>}
                  {sel.links.map(l => (
                    <div key={l.task.id} className="group flex h-8 items-center gap-2 text-[13px]">
                      <span className={cn('size-2 shrink-0 rounded-full', (S[l.task.status] || S.todo).dot)} />
                      <button type="button" onClick={() => onOpenTask(l.task.id, l.archived)} className="min-w-0 flex-1 truncate text-left hover:underline underline-offset-4">{l.task.title || 'Untitled'}{l.archived ? ' (archived)' : ''}</button>
                      {!l.archived && <button type="button" onClick={() => onRemove(sel, l.task.id)} aria-label={`Unlink from ${l.task.title || 'Untitled'}`} title="Unlink"
                        className="flex size-6 items-center justify-center rounded text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100 [@media(hover:none)]:opacity-100"><I.x className="size-3.5" /></button>}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => openExternal(sel)}>Open in its app</Button>
                  <Button size="sm" variant="outline" onClick={() => onDownload(sel)}><I.download />Save a copy</Button>
                </div>
                <DocPreview file={sel} className="min-h-[20rem] flex-1" />
              </>
            ) : <DocPreview file={null} className="flex-1" />}
          </Card>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Tip: drag files from WhatsApp or File Explorer anywhere onto this window.</p>
    </div>
  );
}

function LinkDocsDialog({ taskId, library, linkedIds, onClose, onLink }) {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState([]);
  useEffect(() => { setQ(''); setPicked([]); }, [taskId]);
  if (!taskId) return null;
  const nq = norm(q);
  const list = library.filter(d => !linkedIds.includes(d.id) && (!nq || norm(d.name).includes(nq))).sort((a, b) => b.addedAt - a.addedAt);
  const toggle = id => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  return (
    <Dialog open onClose={onClose} title="Choose from Documents" className="max-w-lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!picked.length} onClick={() => onLink(taskId, library.filter(d => picked.includes(d.id)))}>Link {picked.length || ''} {picked.length === 1 ? 'document' : 'documents'}</Button></>}>
      <div className="relative">
        <I.search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search documents" aria-label="Search documents" className="pl-9" />
      </div>
      <div className="max-h-80 overflow-y-auto rounded-md border">
        {list.length === 0 && <div className="p-4 text-sm text-muted-foreground">{library.length ? 'No other documents match.' : 'There are no documents yet.'}</div>}
        {list.map(d => (
          <label key={d.id} className="flex cursor-default items-center gap-3 border-b px-3 py-2 last:border-0 hover:bg-muted/50">
            <Checkbox checked={picked.includes(d.id)} onChange={() => toggle(d.id)} label={d.name} />
            <FileBadge kind={d.kind} className="h-7 w-6" />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm">{d.name}</span><span className="block text-xs text-muted-foreground">{fmtSize(d.size)}, {d.links.length ? `linked to ${d.links.length} ${d.links.length === 1 ? 'task' : 'tasks'}` : 'not linked'}</span></span>
          </label>
        ))}
      </div>
    </Dialog>
  );
}

function AttachDocDialog({ file, tasks, onClose, onAttach }) {
  const [target, setTarget] = useState('');
  const linked = new Set(((file && file.links) || []).map(l => l.task.id));
  useEffect(() => { setTarget(''); }, [file && file.id]);
  if (!file) return null;
  return (
    <Dialog open={!!file} onClose={onClose} title="Link to a task" description={file.name} className="max-w-md"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!target} onClick={() => onAttach(file, target)}>Link</Button></>}>
      <Field label="Task" htmlFor="att-t">
        <Select id="att-t" value={target} onChange={setTarget} placeholder="Choose a task…"
          options={tasks.filter(t => !linked.has(t.id)).sort((a, b) => b.createdAt - a.createdAt).map(t => ({ value: t.id, label: t.title || 'Untitled', group: t.status === 'done' ? 'Complete' : 'Open' }))} />
      </Field>
    </Dialog>
  );
}

function StatusBadge({ status, className }) {
  const s = S[status] || S.todo;
  const Ico = I[s.icon];
  return (
    <span className={cn('inline-flex items-center gap-2 whitespace-nowrap text-[13px]', className)}>
      <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full', s.tone)}><Ico className="size-3" /></span>{s.label}
    </span>
  );
}
const PRI_DOT = { high: 'bg-red-500', normal: 'bg-orange-400', low: 'bg-slate-400' };
const PriorityPill = ({ priority }) => (
  <span className="inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-md border px-1.5 text-xs text-foreground/80">
    <span className={cn('size-1.5 rounded-full', PRI_DOT[priority || 'normal'])} />{P[priority || 'normal'].label}
  </span>
);
// Subtle outlined chips, like a database table.
// Custom statuses ("Ready for design", "In review"…) belong to one of the four built-in groups,
// which is what filters, automations and blocking use. The task keeps the group in `status`
// and the custom one in `stage`.
const STATUS_COLORS = {
  gray: 'bg-zinc-400', brown: 'bg-amber-700', orange: 'bg-orange-500', yellow: 'bg-yellow-500', green: 'bg-emerald-500',
  blue: 'bg-blue-500', purple: 'bg-violet-500', pink: 'bg-pink-500', red: 'bg-red-500',
};
/* Table columns: standard widths and the narrowest each can be. The Task column takes the rest. */
const TABLE_COLS = [
  { key: 'task', min: 200, icon: 'task' },
  { key: 'status', w: 150, min: 90 },
  { key: 'bucket', w: 150, min: 90 },
  { key: 'assignee', w: 140, min: 90 },
  { key: 'deadline', w: 112, min: 80 },
  { key: 'priority', w: 92, min: 72 },
  { key: 'time', w: 96, min: 80 },
];
const STATUS_HEX = { gray: '#a1a1aa', brown: '#b45309', orange: '#f97316', yellow: '#eab308', green: '#10b981', blue: '#3b82f6', purple: '#8b5cf6', pink: '#ec4899', red: '#ef4444' };
const GROUP_HEAD = { todo: 'To-do', doing: 'In progress', blocked: 'Blocked', done: 'Complete' };
const BUILTIN_COLOR = { todo: 'orange', doing: 'blue', blocked: 'red', done: 'green' };
const NEW_COLOR = { todo: 'gray', doing: 'blue', blocked: 'red', done: 'green' };
// Every status, in order, grouped. Each group has a main status (its id is the group's id,
// it can be renamed and recolored but not deleted) plus any number of your own.
const statusList = stages => STATUSES.flatMap(g => {
  const inGroup = stages.filter(x => x.group === g.id);
  const list = inGroup.some(x => x.id === g.id) ? inGroup : [{ id: g.id, group: g.id }, ...inGroup];
  return list.map(x => x.id === g.id
    ? { name: g.label, color: BUILTIN_COLOR[g.id], ...x, builtin: true }
    : { color: NEW_COLOR[g.id], ...x });
});
const statusDef = (t, stages) => {
  const all = statusList(stages), group = S[t.status] ? t.status : 'todo';
  return (t.stage && all.find(x => x.id === t.stage && x.group === group && !x.builtin)) || all.find(x => x.id === group);
};
const StatusPill = ({ status, label, color }) => {
  const st = S[status] || S.todo;
  return <span className="inline-flex h-5 max-w-full items-center gap-1.5 whitespace-nowrap rounded-md border px-1.5 text-xs text-foreground/80"><span className={cn('size-1.5 shrink-0 rounded-full', color ? STATUS_COLORS[color] : st.dot)} /><span className="truncate">{label || st.label}</span></span>;
};
const DefPill = ({ def }) => <StatusPill status={def.group} label={def.name || '…'} color={def.color} />;
const stageOf = (t, stages) => { const d = statusDef(t, stages); return d && !d.builtin ? d : null; };
const statusLabel = (t, stages) => statusDef(t, stages).name;
const Tag = ({ color, children }) => (
  <span className={cn('inline-flex h-5 max-w-full items-center rounded px-1.5 text-xs font-medium', (PROJECT_COLORS[color] || PROJECT_COLORS.slate).soft)}><span className="truncate">{children}</span></span>
);
const relTime = ms => {
  if (!ms) return '';
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  if (ms >= d0.getTime()) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  if (ms >= d0.getTime() - 864e5) return 'Yesterday';
  return fmtDay(ms);
};

function TimerButton({ task, onToggle }) {
  const on = !!task.timerStartedAt;
  return (
    <Button size="sm" variant={on ? 'default' : 'outline'} onClick={e => { e.stopPropagation(); onToggle(task.id); }}
      aria-label={`${on ? 'Pause' : 'Start'} timer for ${task.title}`} className="tnum w-[6.5rem] justify-start">
      {on ? <I.pause className="size-3.5" /> : <I.play className="size-3.5" />}{fmt(elapsed(task))}
    </Button>
  );
}

/* ---------- Inline cell editing ---------- */
// Opens under a table cell. Lists show values exactly as they appear in the row,
// and typing a name that doesn't exist yet offers to create it.
function CellEditor({ edit, task, ctx, onClose }) {
  const a = useRef(edit.el), p = useRef(null), inp = useRef(null);
  a.current = edit.el;
  useDismiss(true, v => { if (!v) onClose(); }, [a, p]);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  useEffect(() => { setTimeout(() => inp.current && inp.current.focus(), 0); }, []);
  const set = patch => { ctx.update(task.id, patch); onClose(); };
  const nq = norm(q), name = q.trim();
  let items = [], creates = [], placeholder = '';
  const check = on => on ? <I.check className="ml-auto size-3.5 shrink-0 text-muted-foreground" /> : null;

  if (edit.field === 'status') {
    placeholder = 'Search or create…';
    const cur = statusDef(task, ctx.stages);
    items = statusList(ctx.stages).map(x => ({
      key: x.id, text: x.name, section: GROUP_HEAD[x.group], node: <DefPill def={x} />, on: cur.id === x.id,
      pick: () => set({ status: x.group, stage: x.builtin ? '' : x.id }),
    }));
    creates = STATUSES.map(g => ({ key: 'new-' + g.id, text: name, node: <span className="flex min-w-0 items-center gap-2"><span className="shrink-0 text-muted-foreground">Create</span><DefPill def={{ group: g.id, name, color: NEW_COLOR[g.id] }} /><span className="truncate text-xs text-muted-foreground">in {GROUP_HEAD[g.id]}</span></span>,
      pick: () => { const id = ctx.addStage(name, g.id); set({ status: g.id, stage: id }); } }));
  } else if (edit.field === 'bucket') {
    const L = ctx.labels.bucket;
    placeholder = `Search or create a ${L.toLowerCase()}…`;
    items = [
      { key: '', text: `No ${L.toLowerCase()}`, node: <span className="text-muted-foreground">No {L.toLowerCase()}</span>, on: !task.bucket, pick: () => set({ bucket: '' }) },
      ...ctx.buckets.map(n => ({ key: n, text: n, node: <span className="flex min-w-0 items-center gap-1.5"><I.layers className="size-3.5 shrink-0 text-muted-foreground/70" /><span className="truncate">{n}</span></span>, on: norm(task.bucket) === norm(n), pick: () => set({ bucket: n }) })),
    ];
    creates = [{ key: 'new', text: name, node: <span className="flex min-w-0 items-center gap-1.5"><I.plus className="size-3.5 shrink-0 text-muted-foreground" /><span className="text-muted-foreground">Create {L.toLowerCase()}</span><span className="truncate font-medium">{name}</span></span>,
      pick: () => { ctx.ensureBucket(name); set({ bucket: name }); } }];
  } else if (edit.field === 'project') {
    placeholder = `Search or create a ${ctx.labels.platform.toLowerCase()}…`;
    items = [
      { key: '', text: `No ${ctx.labels.platform.toLowerCase()}`, node: <span className="text-muted-foreground">No {ctx.labels.platform.toLowerCase()}</span>, on: !task.project, pick: () => set({ project: '' }) },
      ...ctx.projects.map(n => ({ key: n, text: n, node: <span className="flex min-w-0 items-center gap-1.5"><I.folder className="size-3.5 shrink-0 text-muted-foreground/70" /><span className="truncate">{n}</span></span>, on: norm(task.project) === norm(n), pick: () => set({ project: n }) })),
    ];
    creates = [{ key: 'new', text: name, node: <span className="flex min-w-0 items-center gap-1.5"><I.plus className="size-3.5 shrink-0 text-muted-foreground" /><span className="text-muted-foreground">Create {ctx.labels.platform.toLowerCase()}</span><I.folder className="size-3.5 shrink-0 text-muted-foreground/70" /><span className="truncate font-medium">{name}</span></span>,
      pick: () => { ctx.ensureProject(name); set({ project: name }); } }];
  } else if (edit.field === 'assignee') {
    placeholder = 'Search or add a person…';
    items = [
      { key: '', text: 'Unassigned', node: <span className="text-muted-foreground">Unassigned</span>, on: !task.assignee, pick: () => set({ assignee: '' }) },
      ...ctx.people.map(n => ({ key: n, text: n, node: <span className="flex min-w-0 items-center gap-1.5"><Avatar name={n} className="h-5 w-5 [&_span]:text-[9px]" /><span className="truncate">{n}</span></span>, on: norm(task.assignee) === norm(n), pick: () => set({ assignee: n }) })),
    ];
    creates = [{ key: 'new', text: name, node: <span className="flex min-w-0 items-center gap-1.5"><I.plus className="size-3.5 shrink-0 text-muted-foreground" /><span className="text-muted-foreground">Assign to</span><Avatar name={name} className="h-5 w-5 [&_span]:text-[9px]" /><span className="truncate font-medium">{name}</span></span>,
      pick: () => set({ assignee: name }) }];
  } else if (edit.field === 'priority') {
    items = ['high', 'normal', 'low'].map(x => ({ key: x, text: P[x].label, node: <PriorityPill priority={x} />, on: (task.priority || 'normal') === x, pick: () => set({ priority: x }) }));
  }

  const searchable = edit.field !== 'priority' && edit.field !== 'deadline';
  const shown = items.filter(i => !nq || norm(i.text).includes(nq));
  const list = [...shown, ...(name && !items.some(i => norm(i.text) === nq) ? creates : [])];
  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, list.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (list[hi]) list[hi].pick(); }
  };
  // Start with the current value highlighted.
  useEffect(() => { const i = list.findIndex(x => x.on); if (i > 0) setHi(i); }, []);
  let lastSection = null;
  return (
    <Floating anchorRef={a} panelRef={p} open className={cn('p-1', edit.field === 'deadline' ? 'w-auto' : 'w-80')}>
      {edit.field === 'deadline' ? (
        <div>
          <Calendar selected={task.deadline} onSelect={v => set({ deadline: v })} />
          <div className="flex gap-1 border-t p-1">
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => set({ deadline: toISO(new Date()) })}>Today</Button>
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); set({ deadline: toISO(d) }); }}>Tomorrow</Button>
            <Button size="sm" variant="ghost" className="flex-1" disabled={!task.deadline} onClick={() => set({ deadline: '' })}>Clear</Button>
          </div>
        </div>
      ) : (
        <div onKeyDown={onKey}>
          {edit.field === 'status' ? (
            // Like a tag field: the current status sits in front of the cursor.
            <div className="mb-1 flex min-h-9 flex-wrap items-center gap-1.5 border-b px-2 py-1">
              <DefPill def={statusDef(task, ctx.stages)} />
              <input ref={inp} value={q} onChange={e => { setQ(e.target.value); setHi(0); }} aria-label={placeholder} placeholder={q ? '' : 'Search or create…'}
                className="h-6 min-w-[6rem] flex-1 bg-transparent text-sm placeholder:text-muted-foreground/70 focus-visible:outline-none" />
            </div>
          ) : searchable
            ? <input ref={inp} value={q} onChange={e => { setQ(e.target.value); setHi(0); }} placeholder={placeholder} aria-label={placeholder}
                className="mb-1 h-8 w-full rounded-md border-b bg-transparent px-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none" />
            : <input ref={inp} readOnly aria-label="Choose" className="sr-only" />}
          <div role="listbox" className="max-h-[min(26rem,60vh)] overflow-y-auto">
            {list.map((it, i) => {
              const head = !nq && it.section && it.section !== lastSection ? it.section : null;
              if (it.section) lastSection = it.section;
              return (
                <React.Fragment key={it.key + i}>
                  {head && i > 0 && <div className="mx-1 my-1 h-px bg-border" />}
                  {head && edit.field === 'status' && <div className="px-2 pb-0.5 pt-1.5 text-xs text-muted-foreground">{head}</div>}
                  <div role="option" aria-selected={!!it.on} onMouseEnter={() => setHi(i)} onMouseDown={e => e.preventDefault()} onClick={it.pick}
                    className={cn('group/opt flex h-8 cursor-default items-center gap-2 rounded-sm px-2 text-sm', i === hi && 'bg-accent')}>
                    <span className="flex min-w-0 flex-1 items-center">{it.node}</span>
                    {check(it.on)}
                    {it.remove && (
                      <button type="button" aria-label={`Delete status ${it.text}`} title="Delete this status"
                        onClick={e => { e.stopPropagation(); it.remove(); }}
                        className="hidden size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground group-hover/opt:flex"><I.trash className="size-3.5" /></button>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
            {list.length === 0 && <div className="px-2 py-2 text-sm text-muted-foreground">Nothing found</div>}
          </div>
          {edit.field === 'status' && (
            <>
              <div className="mx-1 my-1 h-px bg-border" />
              <button type="button" onClick={() => { onClose(); ctx.editStatuses(); }}
                className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
                <I.sliders className="size-3.5" />Edit property
              </button>
            </>
          )}
        </div>
      )}
    </Floating>
  );
}

/* ---------- Edit the Status property ---------- */
function StatusesDialog({ open, stages, tasks, onClose, onSave }) {
  const [draft, setDraft] = useState([]);
  useEffect(() => { if (open) setDraft(statusList(stages)); }, [open]);
  const upd = (id, patch) => setDraft(d => d.map(x => x.id === id ? { ...x, ...patch } : x));
  const move = (id, dir) => setDraft(d => {
    const i = d.findIndex(x => x.id === id), j = i + dir;
    if (j < 0 || j >= d.length || d[j].group !== d[i].group) return d;
    const n = [...d]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const used = x => tasks.filter(t => (S[t.status] ? t.status : 'todo') === x.group && (x.builtin ? !t.stage || !draft.some(y => y.id === t.stage) : t.stage === x.id)).length;
  const dupes = new Set(draft.map(x => norm(x.name)).filter((n, i, a) => n && a.indexOf(n) !== i));
  const valid = draft.every(x => x.name.trim() && !dupes.has(norm(x.name)));
  return (
    <Dialog open={open} onClose={onClose} title="Edit the Status property" className="max-w-xl"
      description="Rename, recolor and reorder statuses, or add your own. Each one belongs to a group, and the group decides how it behaves: Complete counts as done, In progress blocks the previous task, and so on."
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!valid} onClick={() => onSave(draft.map(({ builtin, ...x }) => ({ ...x, name: x.name.trim() })))}>Save</Button>
      </>}>
      <div className="grid gap-5">
        {STATUSES.map(g => {
          const rows = draft.filter(x => x.group === g.id);
          return (
            <div key={g.id}>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">{GROUP_HEAD[g.id]}</div>
              <div className="grid gap-1">
                {rows.map((x, i) => {
                  const n = used(x), clash = dupes.has(norm(x.name));
                  return (
                    <div key={x.id} className="group/row flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted/50">
                      <Popover className="p-2"
                        trigger={p => <button {...p} type="button" aria-label={`Color of ${x.name || 'status'}`} className="flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-muted"><span className={cn('size-2.5 rounded-full', STATUS_COLORS[x.color])} /></button>}>
                        <div className="grid grid-cols-3 gap-1">
                          {Object.keys(STATUS_COLORS).map(c => (
                            <button key={c} type="button" onClick={() => upd(x.id, { color: c })}
                              className={cn('flex h-7 items-center gap-2 rounded px-2 text-xs capitalize hover:bg-accent', x.color === c && 'bg-accent font-medium')}>
                              <span className={cn('size-2.5 rounded-full', STATUS_COLORS[c])} />{c}
                            </button>
                          ))}
                        </div>
                      </Popover>
                      <Input value={x.name} onChange={e => upd(x.id, { name: e.target.value })} placeholder="Status name" aria-label="Status name"
                        className={cn('h-8 flex-1 border-transparent bg-transparent shadow-none hover:border-input focus-visible:border-input', clash && 'border-destructive')} />
                      <span className="w-14 shrink-0 text-right text-xs text-muted-foreground tnum">{n ? `${n} ${n === 1 ? 'task' : 'tasks'}` : ''}</span>
                      <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(x.id, -1)}
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"><I.up className="size-3.5" /></button>
                      <button type="button" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(x.id, 1)}
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"><I.down className="size-3.5" /></button>
                      {x.builtin
                        ? <span title="Every group keeps its main status. You can rename and recolor it." className="flex size-7 items-center justify-center text-muted-foreground/50"><I.lock className="size-3.5" /></span>
                        : <button type="button" aria-label={`Delete ${x.name || 'status'}`} title={n ? `Its ${n} ${n === 1 ? 'task moves' : 'tasks move'} to ${(draft.find(y => y.id === g.id) || {}).name}` : 'Delete'}
                            onClick={() => setDraft(d => d.filter(y => y.id !== x.id))}
                            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"><I.trash className="size-3.5" /></button>}
                    </div>
                  );
                })}
                <button type="button" onClick={() => setDraft(d => {
                    const at = d.map(y => y.group).lastIndexOf(g.id) + 1;
                    return [...d.slice(0, at), { id: 'st-' + newId(), name: '', group: g.id, color: NEW_COLOR[g.id] }, ...d.slice(at)];
                  })}
                  className="flex h-8 items-center gap-2 rounded-md px-2 text-left text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                  <I.plus className="size-3.5" />Add a status
                </button>
              </div>
            </div>
          );
        })}
        {dupes.size > 0 && <p className="text-[0.8rem] text-destructive">Two statuses can’t have the same name.</p>}
      </div>
    </Dialog>
  );
}

/* ---------- Compact task sheet ---------- */
const ghostField = 'h-8 w-full rounded-md border border-transparent bg-transparent px-2 text-sm !shadow-none transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-0 focus-visible:border-input focus-visible:bg-background placeholder:text-muted-foreground';
const hoverAct = 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover:opacity-100 [@media(hover:none)]:opacity-100';
const PropRow = ({ label, htmlFor, children }) => (
  <div className="grid min-h-8 grid-cols-[88px_minmax(0,1fr)] items-center gap-2">
    <label htmlFor={htmlFor} className="text-[13px] text-muted-foreground">{label}</label>
    <div className="min-w-0">{children}</div>
  </div>
);
const SectionHead = ({ children, right }) => (
  <div className="flex h-7 items-center justify-between px-2">
    <div className="text-[13px] font-medium text-muted-foreground">{children}</div>
    {right}
  </div>
);
const Note = ({ tone, children }) => (
  <div className={cn('flex items-start gap-2 rounded-md px-2.5 py-1.5 text-xs leading-relaxed', tone === 'amber' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200' : tone === 'red' ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300' : 'bg-muted text-muted-foreground')}>
    {children}
  </div>
);
const MiniLink = ({ t, tone, onOpen }) => (
  <button type="button" onClick={() => onOpen(t.id)}
    className={cn('group flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', tone === 'red' && 'text-red-700 dark:text-red-400')}>
    <span className={cn('size-2 shrink-0 rounded-full', S[t.status].dot)} title={S[t.status].label} />
    <span className="truncate">{t.title}</span>
    <I.right className="ml-auto size-3.5 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100" />
  </button>
);
const CompactFile = ({ f, onPreview, onDownload, onRemove }) => (
  <div className="group flex h-9 items-center gap-2.5 rounded-md px-2 hover:bg-muted/60">
    <FileBadge kind={f.kind} className="h-6 w-5 rounded text-[7px]" />
    <button type="button" onClick={() => onPreview(f)} className="min-w-0 flex-1 truncate text-left text-sm hover:underline underline-offset-4 focus-visible:outline-none focus-visible:underline">{f.name}</button>
    <span className="tnum text-xs text-muted-foreground">{fmtSize(f.size)}</span>
    <button type="button" className={hoverAct} aria-label={`Download ${f.name}`} onClick={() => onDownload(f)}><I.download className="size-3.5" /></button>
    <button type="button" className={hoverAct} aria-label={`Remove ${f.name}`} onClick={() => onRemove(f)}><I.x className="size-3.5" /></button>
  </div>
);

/* Where a task opens: a side panel, a centered window, full screen, or its own window. */
const OPEN_MODES = [
  { id: 'side', label: 'Side panel', icon: <I.panelRight className="size-3.5" /> },
  { id: 'center', label: 'Centered', icon: <I.panelCenter className="size-3.5" /> },
  { id: 'full', label: 'Full screen', icon: <I.maximize className="size-3.5" /> },
  { id: 'tab', label: 'New tab', icon: <I.tab className="size-3.5" /> },
];
function SheetFrame({ mode, open, onClose, children }) {
  if (mode === 'tab') return <div className="flex min-h-0 flex-1 flex-col bg-background" role="tabpanel" aria-labelledby="sheet-title">{children}</div>;
  if (mode === 'window') return <div className="flex h-screen flex-col bg-background" role="main" aria-labelledby="sheet-title">{children}</div>;
  return <Sheet open={open} onClose={onClose} labelledBy="sheet-title" variant={mode}>{children}</Sheet>;
}

const FORM_KEYS = ['title', 'project', 'bucket', 'status', 'stage', 'assignee', 'deadline', 'description', 'priority', 'checklist'];
const formFrom = (task, stages) => ({
  title: task.title || '', project: task.project || '', bucket: task.bucket || '', status: S[task.status] ? task.status : 'todo', stage: stageOf(task, stages) ? task.stage : '',
  assignee: task.assignee || '', deadline: task.deadline || '', description: task.description || '', priority: task.priority || 'normal', checklist: task.checklist || [],
});

// Every change is saved automatically: choices right away, typing after a short pause.
function TaskSheet({ onLinkExisting, labels = LABEL_DEFAULTS, buckets = [], mode = 'side', onMode, onPopOut, onNewTab, onHome, closeRef, open, task, people, projects, stages = [], rules, defaultProject, defaultAssignee, dropRef, allTasks, onOpen, onPatch, onClose, onSave, onDelete, onDiscardEmpty, onToggle, onReset, storageOk, busy, onUpload, onAttach, onPreview, onDownload, onRemoveFile, onDiscard }) {
  const [form, setForm] = useState(null);
  const titleRef = useRef(null);
  const pending = useRef({}), pendingId = useRef(null), timer = useRef(null), saveRef = useRef(onSave);
  saveRef.current = onSave;
  const commit = () => {
    clearTimeout(timer.current);
    const patch = pending.current; pending.current = {};
    if (Object.keys(patch).length && pendingId.current) saveRef.current(pendingId.current, patch);
  };
  useEffect(() => {
    commit(); // save anything still waiting for the task you were on
    if (open && task) {
      setForm(formFrom(task, stages));
      if (!task.title) setTimeout(() => titleRef.current && titleRef.current.focus(), 50);
    }
  }, [open, task?.id]);
  // Keep fields you're not editing in step with changes made elsewhere (automations, the table, the timer).
  useEffect(() => {
    if (!open || !task) return;
    const fresh = formFrom(task, stages);
    setForm(f => {
      if (!f) return f;
      const n = { ...f };
      FORM_KEYS.forEach(k => { if (!(k in pending.current)) n[k] = fresh[k]; });
      return n;
    });
  }, [task, stages]);
  useEffect(() => () => commit(), []);
  if (!open || !form || !task) return null;
  const change = (patch, debounce) => {
    setForm(f => ({ ...f, ...patch }));
    pendingId.current = task.id;
    Object.assign(pending.current, patch);
    clearTimeout(timer.current);
    if (debounce) timer.current = setTimeout(commit, 500); else commit();
  };
  const TYPED = ['title', 'description', 'bucket', 'project', 'assignee'];
  const set = k => v => change({ [k]: v && v.target ? v.target.value : v }, TYPED.includes(k));
  const isEmpty = () => !form.title.trim() && !form.description.trim() && !form.checklist.length && !(task.files || []).length;
  const close = () => {
    if (isEmpty()) { clearTimeout(timer.current); pending.current = {}; onDiscardEmpty(task.id); onClose(); return; }
    commit(); onClose();
  };
  const submit = e => { e && e.preventDefault(); close(); };
  if (closeRef) closeRef.current = close;
  const on = task && !!task.timerStartedAt;
  // Documents on a saved task are stored right away; on a new task they wait in the form until Save.
  const files = task ? (task.files || []) : (form.files || []);
  const addFiles = async fs => {
    const metas = await onUpload(fs);
    if (!metas.length) return;
    if (task) onAttach(task.id, metas); else setForm(f => ({ ...f, files: [...(f.files || []), ...metas] }));
  };
  const removeFile = f => {
    if (task) onRemoveFile(f, task.id);
    else { setForm(x => ({ ...x, files: x.files.filter(y => y.id !== f.id) })); onDiscard([f]); }
  };
  const cancel = close;
  // Files dropped onto the window while this sheet is open get attached here.
  if (dropRef) dropRef.current = addFiles;
  const chooseFiles = () => pickFiles().then(fs => { if (fs.length) addFiles(fs); });
  const inProgress = allTasks.filter(o => o.status === 'doing' && o.id !== task?.id);
  const blocker = task?.status === 'blocked' && task.blockedBy ? allTasks.find(o => o.id === task.blockedBy) : null;
  const blocking = task ? allTasks.filter(o => o.status === 'blocked' && o.blockedBy === task.id) : [];
  const generatedFrom = task?.generatedFrom ? allTasks.find(o => o.id === task.generatedFrom) : null;
  const followUps = task ? allTasks.filter(o => o.generatedFrom === task.id) : [];
  const autoRules = rules.filter(r => r.enabled && r.project && norm(r.project) === norm(form.project) && r.trigger !== 'created' && !(r.action === 'copy' && (task?.followUps || {})[r.id]));
  const overdue = form.deadline && form.status !== 'done' && dayDiff(form.deadline) < 0;
  const doneCount = form.checklist.filter(c => c.done).length;
  const canUpload = storageOk !== false;

  return (
    <SheetFrame mode={mode} open={open} onClose={cancel}>
      <form onSubmit={submit} className="flex h-full min-h-0 flex-col" autoComplete="off"
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }}>
        {/* Header */}
        <div className={cn('flex h-12 shrink-0 items-center gap-2 border-b px-3 text-xs text-muted-foreground', mode !== 'window' && mode !== 'tab' && 'pr-12', mode === 'tab' && 'px-5')}>
          {mode === 'tab' && (
            <>
              <button type="button" onClick={onHome} className="text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4">Home</button>
              <span className="text-sm text-muted-foreground/60">/</span>
            </>
          )}
          {mode !== 'window' && mode !== 'tab' && (
            <>
              <DropdownMenu align="start"
                trigger={p => <button {...p} type="button" aria-label="How tasks open" title="How tasks open" className="flex size-7 items-center justify-center rounded-md hover:bg-muted hover:text-foreground">{(OPEN_MODES.find(m => m.id === mode) || OPEN_MODES[0]).icon}</button>}
                items={[
                  { label: 'Open in new tab', icon: <I.tab />, onSelect: () => { commit(); onNewTab(); } },
                  { label: 'Open in new window', icon: <I.external />, onSelect: () => { commit(); onPopOut(); } },
                  'sep',
                  ...OPEN_MODES.map(m => ({ label: m.label, icon: m.icon, shortcut: mode === m.id ? '✓' : undefined, onSelect: () => onMode(m.id) })),
                ]} />
              <button type="button" onClick={() => { commit(); onPopOut(); }} aria-label="Open in new window" title="Open in new window"
                className="flex size-7 items-center justify-center rounded-md hover:bg-muted hover:text-foreground"><I.external className="size-3.5" /></button>
              <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
            </>
          )}
          <span id="sheet-title" className={cn('text-sm font-medium text-foreground', mode === 'tab' && 'min-w-0 truncate')}>{mode === 'tab' ? (form.title || 'Untitled') : (task.title || form.title ? 'Task' : 'New task')}</span>
          {task && <span className="shrink-0">Created {fmtDay(task.createdAt)}</span>}
          {generatedFrom && <span className="inline-flex shrink-0 items-center gap-1"><I.zap className="size-3" />Auto</span>}
          {mode === 'tab' && (
            <button type="button" onClick={() => { commit(); onPopOut(); }} aria-label="Open in new window" title="Open in new window"
              className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-muted hover:text-foreground"><I.external className="size-4" /></button>
          )}
        </div>

        {/* Body */}
        <div className={cn('relative flex-1 overflow-y-auto py-4', mode === 'side' ? 'px-3' : 'px-6')}>
          <div className={cn(mode !== 'side' && 'mx-auto w-full max-w-3xl')}>

          <textarea ref={titleRef} rows={1} value={form.title} onChange={set('title')} placeholder="Task title" aria-label="Task title"
            onKeyDown={e => { if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) e.preventDefault(); }}
            style={{ fieldSizing: 'content' }}
            className="block w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1 text-lg font-semibold leading-snug placeholder:text-muted-foreground/60 hover:bg-muted/60 focus-visible:outline-none focus-visible:border-input focus-visible:bg-background" />

          {/* Properties */}
          <div className="mt-3 grid gap-0.5 px-2">
            <PropRow label={labels.status} htmlFor="t-status">
              <Select id="t-status" variant="ghost" value={form.stage ? `${form.status}|${form.stage}` : form.status}
                onChange={v => { const [st, sg] = v.split('|'); change({ status: st, stage: sg || '' }); }}
                options={statusList(stages).map(x => ({ value: x.builtin ? x.group : `${x.group}|${x.id}`, label: x.name, group: GROUP_HEAD[x.group], node: <DefPill def={x} /> }))} />
            </PropRow>
            <PropRow label={labels.priority}>
              <div role="radiogroup" aria-label="Priority" className="inline-flex rounded-md bg-muted p-0.5 ml-1">
                {['low', 'normal', 'high'].map(pid => (
                  <button key={pid} type="button" role="radio" aria-checked={form.priority === pid} onClick={() => set('priority')(pid)}
                    className={cn('inline-flex h-7 items-center gap-1 rounded px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                      form.priority === pid ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                    {pid === 'high' && <I.flag className={cn('size-3', form.priority === 'high' && 'text-red-600 dark:text-red-400')} />}{P[pid].label}
                  </button>
                ))}
              </div>
            </PropRow>
            <PropRow label={labels.assignee} htmlFor="t-assignee">
              <Combobox id="t-assignee" value={form.assignee} onChange={set('assignee')} options={people} placeholder="Add assignee" hideIcon inputClassName={ghostField} />
            </PropRow>
            <PropRow label={labels.bucket} htmlFor="t-bucket">
              <Combobox id="t-bucket" value={form.bucket} onChange={set('bucket')} options={buckets} placeholder={`Add ${labels.bucket.toLowerCase()}`} hideIcon inputClassName={ghostField}
                createLabel={v => `Use “${v}”`} icon={() => <I.layers className="text-muted-foreground" />} />
            </PropRow>
            <PropRow label={labels.platform} htmlFor="t-project">
              <Combobox id="t-project" value={form.project} onChange={set('project')} options={projects} placeholder={`Add ${labels.platform.toLowerCase()}`} hideIcon inputClassName={ghostField}
                createLabel={v => `Use “${v}”`} icon={() => <I.folder className="text-muted-foreground" />} />
            </PropRow>
            <PropRow label={labels.deadline} htmlFor="t-deadline">
              <DatePicker id="t-deadline" value={form.deadline} onChange={set('deadline')} variant="ghost" icon={false} placeholder="Add deadline"
                format={{ weekday: 'short', month: 'short', day: 'numeric' }}
                className={cn('h-8 px-2 hover:bg-muted', overdue && 'text-red-600 dark:text-red-400 font-medium')} />
            </PropRow>
            {task && (
              <PropRow label={labels.time}>
                <div className="flex items-center gap-1 pl-2">
                  <span className={cn('tnum min-w-[4.5rem] text-sm font-medium', on && 'text-emerald-600 dark:text-emerald-400')}>{fmt(elapsed(task))}</span>
                  <Button size="sm" variant={on ? 'default' : 'outline'} className="h-7 px-2.5" onClick={() => onToggle(task.id)}>
                    {on ? <><I.pause className="size-3" />Pause</> : <><I.play className="size-3" />Start</>}
                  </Button>
                  {elapsed(task) > 0 && <button type="button" onClick={() => onReset(task.id)} aria-label="Reset timer" className={cn(hoverAct, 'opacity-100')}><I.reset className="size-3.5" /></button>}
                </div>
              </PropRow>
            )}
            {blocker && <PropRow label="Blocked by"><MiniLink t={blocker} tone="red" onOpen={onOpen} /></PropRow>}
            {blocking.length > 0 && <PropRow label="Blocking"><div className="grid">{blocking.map(b => <MiniLink key={b.id} t={b} onOpen={onOpen} />)}</div></PropRow>}
            {generatedFrom && <PropRow label="Copied from"><MiniLink t={generatedFrom} onOpen={onOpen} /></PropRow>}
            {followUps.length > 0 && <PropRow label="Follow-ups"><div className="grid">{followUps.map(f => <MiniLink key={f.id} t={f} onOpen={onOpen} />)}</div></PropRow>}
          </div>

          {/* Heads-ups */}
          {((form.status === 'doing' && task?.status !== 'doing' && inProgress.length > 0) || (blocker && form.status !== 'blocked') || (autoRules.length > 0 && form.status !== 'done')) && (
            <div className="mt-3 grid gap-1.5 px-2">
              {form.status === 'doing' && task?.status !== 'doing' && inProgress.length > 0 && (
                <Note tone="amber"><I.flag className="mt-0.5 size-3 shrink-0" />
                  <span>This blocks {inProgress.length === 1 ? `“${inProgress[0].title}”` : `${inProgress.length} in-progress tasks`}.</span></Note>
              )}
              {blocker && form.status !== 'blocked' && <Note><I.x className="mt-0.5 size-3 shrink-0" /><span>This removes the blocker.</span></Note>}
              {autoRules.length > 0 && form.status !== 'done' && (
                <Note><I.zap className="mt-0.5 size-3 shrink-0" /><span>{autoRules.slice(0, 2).map(r => `${TRIG[r.trigger].short}: ${ACT[r.action].label} ${targetText(r)}.`).join(' ')}{autoRules.length > 2 ? ` And ${autoRules.length - 2} more.` : ''}</span></Note>
              )}
            </div>
          )}

          {/* Description */}
          <div className="mt-5">
            <SectionHead>Description</SectionHead>
            <textarea id="t-desc" value={form.description} onChange={set('description')} placeholder="Add details, links or acceptance criteria…" aria-label="Description"
              style={{ fieldSizing: 'content', minHeight: '4.5rem', maxHeight: '45vh' }}
              className="block w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm leading-relaxed placeholder:text-muted-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:border-input focus-visible:bg-background" />
          </div>

          {/* Checklist */}
          <div className="mt-4">
            <SectionHead right={form.checklist.length > 0 && <span className="tnum text-xs text-muted-foreground">{doneCount}/{form.checklist.length}</span>}>Checklist</SectionHead>
            <Checklist items={form.checklist} onChange={list => { setForm(f => ({ ...f, checklist: list })); if (task) onPatch(task.id, { checklist: list }); }} />
          </div>

          {/* Documents */}
          <div className="mt-4">
            <SectionHead right={canUpload && (
              <DropdownMenu
                trigger={p => (
                  <button {...p} type="button" disabled={busy}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">
                    <I.paperclip className="size-3.5" />{busy ? 'Adding…' : 'Attach'}<I.down className="size-3" />
                  </button>
                )}
                items={[
                  { label: 'Upload new files', icon: <I.upload />, onSelect: chooseFiles },
                  { label: 'Choose from Documents', icon: <I.file />, onSelect: () => { if (task) onLinkExisting(task.id); } },
                ]} />
            )}>Documents{files.length > 0 && <span className="ml-1 font-normal">({files.length})</span>}</SectionHead>
            {files.map(f => <CompactFile key={f.id} f={f} onPreview={onPreview} onDownload={onDownload} onRemove={removeFile} />)}
            {files.length === 0 && (canUpload
              ? <button type="button" onClick={chooseFiles} className="flex h-9 w-full items-center gap-2 rounded-md border border-dashed px-3 text-left text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                  <I.upload className="size-3.5" />Drag files here, or choose files
                </button>
              : <p className="px-2 text-xs text-muted-foreground">File storage isn’t available in this view.</p>)}
          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-2 border-t px-4 py-2.5">
          {task && <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={onDelete} aria-label="Delete task"><I.trash /></Button>}
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><I.check className="size-3.5" />Changes save automatically</span>
          <div className="flex-1" />
          <Button type="submit" variant="outline" size="sm">{mode === 'tab' ? 'Close tab' : 'Close'}</Button>
        </div>
      </form>
    </SheetFrame>
  );
}

function Checklist({ items, onChange }) {
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(null); // { id, value }
  const add = () => { const v = text.trim(); if (!v) return; onChange([...items, { id: newId(), text: v, done: false }]); setText(''); };
  // Click an item's text to edit it. Enter or clicking away saves, Esc cancels, and clearing it removes the item.
  const saveEdit = () => {
    if (!editing) return;
    const v = editing.value.trim(), cur = items.find(x => x.id === editing.id);
    setEditing(null);
    if (!cur || v === cur.text) return;
    onChange(v ? items.map(x => x.id === editing.id ? { ...x, text: v } : x) : items.filter(x => x.id !== editing.id));
  };
  return (
    <div className="grid">
      {items.map(it => (
        <div key={it.id} className="group flex min-h-8 items-center gap-2.5 rounded-md px-2 hover:bg-muted/60">
          <Checkbox checked={it.done} label={it.text} onChange={v => onChange(items.map(x => x.id === it.id ? { ...x, done: v } : x))} />
          {editing && editing.id === it.id ? (
            <input autoFocus value={editing.value} aria-label="Edit checklist item"
              onChange={e => setEditing({ id: it.id, value: e.target.value })}
              onFocus={e => { const n = e.target.value.length; e.target.setSelectionRange(n, n); }}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setEditing(null); }
              }}
              onBlur={saveEdit}
              className="-mx-1 h-7 min-w-0 flex-1 rounded border bg-background px-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          ) : (
            <span role="button" tabIndex={0} title="Click to edit"
              onClick={() => setEditing({ id: it.id, value: it.text })}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setEditing({ id: it.id, value: it.text }); } }}
              className={cn('-mx-1 flex-1 cursor-text rounded px-1 py-1 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', it.done && 'text-muted-foreground line-through')}>{it.text}</span>
          )}
          <button type="button" className={cn(hoverAct, 'h-6 w-6')} aria-label={`Remove ${it.text}`}
            onClick={() => onChange(items.filter(x => x.id !== it.id))}><I.x className="size-3.5" /></button>
        </div>
      ))}
      <div className="flex h-8 items-center gap-2.5 px-2">
        <I.plus className="text-muted-foreground" />
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Add item" aria-label="Add checklist item"
          className="h-8 min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus-visible:outline-none"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} onBlur={add} />
      </div>
    </div>
  );
}

function TimeSummary({ tasks, onHide }) {
  const now = Date.now();
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const today = d0.getTime();
  const w = new Date(d0); w.setDate(w.getDate() - ((w.getDay() + 6) % 7));
  const week = w.getTime();
  let todayMs = 0, weekMs = 0; const byProject = {};
  tasks.forEach(t => {
    todayMs += trackedIn(t, today, now);
    const wm = trackedIn(t, week, now);
    weekMs += wm;
    if (wm) { const k = t.project || 'No project'; byProject[k] = (byProject[k] || 0) + wm; }
  });
  const rows = Object.entries(byProject).sort((a, b) => b[1] - a[1]);
  return (
    <Card className="mt-6 p-5 shadow-none">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-8">
          <div><div className="text-xs text-muted-foreground">Today</div><div className="tnum text-2xl font-semibold tracking-tight">{fmtShort(todayMs)}</div></div>
          <div><div className="text-xs text-muted-foreground">This week</div><div className="tnum text-2xl font-semibold tracking-tight">{fmtShort(weekMs)}</div></div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onHide} aria-label="Hide time summary"><I.x /></Button>
      </div>
      {rows.length > 0 ? (
        <div className="mt-4 grid gap-2.5">
          {rows.map(([name, ms]) => (
            <div key={name} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
              <span className="truncate text-muted-foreground">{name}</span>
              <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, ms / weekMs * 100)}%` }} /></div>
              <span className="tnum font-medium">{fmtShort(ms)}</span>
            </div>
          ))}
        </div>
      ) : <p className="mt-3 text-sm text-muted-foreground">Start a timer on any task and your time shows up here, split by project.</p>}
    </Card>
  );
}

const SHORTCUTS = [['Command palette', 'Ctrl + K'], ['Undo / redo', 'Ctrl + Z / Ctrl + Shift + Z'], ['New task, bucket or document (on that page)', 'N'], ['Open a task in a new tab', 'Ctrl + click'], ['Close tab', 'Ctrl + W'], ['Next tab', 'Ctrl + Tab'], ['Back to Home', 'Ctrl + 1'], ['Search tasks', '/'], ['Switch light and dark mode', 'Shift + D'], ['Clear search or close a panel', 'Esc'], ['Show this list', '?']];
function ShortcutsDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard shortcuts">
      <div className="grid">
        {SHORTCUTS.map(([what, key]) => (
          <div key={key} className="flex items-center justify-between border-b py-2.5 text-sm last:border-0">
            <span>{what}</span><Kbd className="h-6 px-2 text-xs">{key}</Kbd>
          </div>
        ))}
      </div>
    </Dialog>
  );
}

function AutomationsDialog({ open, onClose, rules, projects, people, me, onSave }) {
  const [draft, setDraft] = useState(rules);
  useEffect(() => { if (open) setDraft(rules); }, [open]);
  const upd = (id, patch) => setDraft(d => d.map(r => r.id === id ? { ...r, ...patch } : r));
  const problem = r => {
    const a = ACT[r.action] || {};
    if (a.target !== 'none' && !a.optional && (!r.target || !String(r.target).trim())) return a.target === 'text' ? 'Type the checklist items.' : 'Choose what to set.';
    if ((r.action === 'copy' || r.action === 'move') && r.project && norm(r.project) === norm(r.target)) return 'Pick a different project than the one the task is in.';
    return null;
  };
  const valid = draft.every(r => !problem(r));
  const ideas = [
    { title: 'Finish tasks automatically', text: 'Mark a task done when its checklist is finished.', rule: { trigger: 'checklist', action: 'status', target: 'done' } },
    { title: 'Flag overdue work', text: 'Make a task High priority when it becomes overdue.', rule: { trigger: 'overdue', action: 'priority', target: 'high' } },
    { title: 'Assign new tasks to me', text: 'Every new task starts assigned to you.', rule: { trigger: 'created', action: 'assign', target: me } },
    { title: 'Claim what you start', text: 'Assign a task to you when it moves to In progress.', rule: { trigger: 'started', action: 'assign', target: me } },
    { title: 'Raise blocked tasks', text: 'Make a task High priority when it gets blocked.', rule: { trigger: 'blocked', action: 'priority', target: 'high' } },
    { title: 'Remind me a day before', text: 'Send a desktop notification when a task is due tomorrow.', rule: { trigger: 'due_soon', action: 'notify', target: 'Due tomorrow' } },
    { title: 'Tell me when work is overdue', text: 'Send a desktop notification when a task becomes overdue.', rule: { trigger: 'overdue', action: 'notify', target: 'Overdue' } },
    { title: 'Stop the clock when blocked', text: 'Pause the timer as soon as a task gets blocked.', rule: { trigger: 'blocked', action: 'stop_timer', target: '' } },
    { title: 'Give new tasks a deadline', text: 'New tasks without a date are due in a week.', rule: { trigger: 'created', action: 'deadline', target: '7' } },
    { title: 'Start with a checklist', text: 'Add Brief, Design and Review to every new task.', rule: { trigger: 'created', action: 'checklist', target: 'Brief, Design, Review' } },
    { title: 'Reopened work goes to the top', text: 'Make a task High priority when it’s reopened.', rule: { trigger: 'reopened', action: 'priority', target: 'high' } },
  ].filter(i => !draft.some(r => !r.project && r.trigger === i.rule.trigger && r.action === i.rule.action && r.target === i.rule.target));
  const add = (rule = {}) => setDraft(d => [...d, { id: 'r-' + newId(), enabled: true, project: '', trigger: 'done', action: 'copy', target: '', ...rule }]);
  const targetField = r => {
    const kind = (ACT[r.action] || ACT.copy).target;
    const setT = v => upd(r.id, { target: v });
    if (kind === 'project') return <Select label="Project" value={r.target} onChange={setT} placeholder="Choose a project…"
      options={projects.map(p => ({ value: p, label: p, icon: <I.folder className="size-3.5 text-muted-foreground" /> }))} />;
    if (kind === 'status') return <Select label="Status" value={r.target} onChange={setT} placeholder="Choose a status…"
      options={STATUSES.map(x => ({ value: x.id, label: x.label, node: <StatusPill status={x.id} /> }))} />;
    if (kind === 'priority') return <Select label="Priority" value={r.target} onChange={setT} placeholder="Choose a priority…"
      options={['high', 'normal', 'low'].map(x => ({ value: x, label: P[x].label, node: <PriorityPill priority={x} /> }))} />;
    if (kind === 'days') return <Select label="Deadline" value={r.target} onChange={setT} placeholder="Choose a date…"
      options={DEADLINE_OPTIONS.map(([v, l]) => ({ value: v, label: l[0].toUpperCase() + l.slice(1) }))} />;
    if (kind === 'text') return <Input value={r.target} onChange={e => upd(r.id, { target: e.target.value })} placeholder={ACT[r.action].placeholder} aria-label="Text" />;
    if (kind === 'none') return <div className="flex h-9 items-center text-xs text-muted-foreground">Nothing else to choose</div>;
    return <Combobox id={`t-${r.id}`} value={r.target} onChange={v => upd(r.id, { target: v })} options={people} placeholder="Person" />;
  };
  return (
    <Dialog open={open} onClose={onClose} title="Automations" className="max-w-3xl"
      description="Let the app do routine steps for you. Each automation reads like a sentence: when something happens to a task, do something."
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!valid} onClick={() => onSave(draft.map(r => ({ ...r, target: String(r.target || '').trim() })))}>Save automations</Button>
      </>}>
      <div className="grid gap-3">
        {draft.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No automations yet. Add one, or start from an idea below.</p>}
        {draft.map(r => {
          const err = problem(r);
          return (
            <Card key={r.id} className={cn('p-4 shadow-none', !r.enabled && 'opacity-60')}>
              <div className="mb-3 flex items-center gap-3">
                <Switch checked={r.enabled} onChange={v => upd(r.id, { enabled: v })} label="Turn automation on or off" />
                <p className="min-w-0 flex-1 truncate text-sm font-medium" title={describeRule(r)}>{describeRule(r)}</p>
                <Button variant="ghost" size="icon-sm" aria-label="Delete automation" onClick={() => setDraft(d => d.filter(x => x.id !== r.id))}><I.trash /></Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="For tasks in" htmlFor={`p-${r.id}`}>
                  <Select id={`p-${r.id}`} value={r.project} onChange={v => upd(r.id, { project: v })} options={[
                    { value: '', label: 'Any project' },
                    ...projects.map(p => ({ value: p, label: p, icon: <I.folder className="size-3.5 text-muted-foreground" /> })),
                  ]} />
                </Field>
                <Field label="When the task" htmlFor={`w-${r.id}`}>
                  <Select id={`w-${r.id}`} value={r.trigger} onChange={v => upd(r.id, { trigger: v })} searchable={false}
                    options={TRIGGERS.map(t => ({ value: t.id, label: t.label, group: t.group }))} />
                </Field>
                <Field label="Then" htmlFor={`a-${r.id}`}>
                  <Select id={`a-${r.id}`} value={r.action} onChange={v => upd(r.id, { action: v, target: '' })} searchable={false}
                    options={ACTIONS.map(a => ({ value: a.id, label: a.label[0].toUpperCase() + a.label.slice(1) }))} />
                </Field>
                <div className="grid gap-2"><Label>&nbsp;</Label>{targetField(r)}</div>
              </div>
              {err && <p className="mt-2 text-[0.8rem] text-destructive">{err}</p>}
            </Card>
          );
        })}
        <Button variant="outline" className="justify-start border-dashed" onClick={() => add()}><I.plus />Add automation</Button>
        {ideas.length > 0 && (
          <div className="mt-2">
            <div className="mb-2 text-sm font-medium text-muted-foreground">Ideas</div>
            <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
              {ideas.map(i => (
                <button key={i.title} type="button" onClick={() => add(i.rule)}
                  className="flex items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"><I.zap className="size-3.5" /></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{i.title}</span>
                    <span className="block text-xs text-muted-foreground">{i.text}</span>
                  </span>
                  <I.plus className="ml-auto mt-1 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

/* ---------- Projects ---------- */
function ProjectDialog({ open, project, names, onClose, onSave, noun = 'project' }) {
  const [name, setName] = useState('');
  useEffect(() => { if (open) setName(project ? project.name : ''); }, [open]);
  const clash = names.some(n => norm(n) === norm(name) && (!project || norm(n) !== norm(project.name)));
  const ok = name.trim() && !clash;
  const color = (project && project.color) || autoColor(name);
  const lower = noun.toLowerCase();
  return (
    <Dialog open={open} onClose={onClose} title={project ? `Rename ${lower}` : `New ${lower}`} className="max-w-md"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!ok} onClick={() => onSave({ name: name.trim(), color })}>{project ? 'Save' : `Create ${lower}`}</Button>
      </>}>
      <form className="grid gap-4" onSubmit={e => { e.preventDefault(); if (ok) onSave({ name: name.trim(), color }); }}>
        <Field label="Name" htmlFor="pj-name" hint={clash ? `A ${lower} with this name already exists.` : project ? `Renaming updates every task${noun === 'bucket' ? '' : ' and automation'} that uses it.` : undefined}>
          <Input id="pj-name" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </Field>
      </form>
    </Dialog>
  );
}

/* A small dialog to rename something: a column, a workspace. */
function NameDialog({ open, title, value, hint, defaultValue, onClose, onSave }) {
  const [v, setV] = useState('');
  useEffect(() => { if (open) setV(value || ''); }, [open]);
  return (
    <Dialog open={open} onClose={onClose} title={title} className="max-w-sm"
      footer={<>
        {defaultValue && v !== defaultValue && <Button variant="ghost" className="sm:mr-auto" onClick={() => onSave(defaultValue)}>Reset to “{defaultValue}”</Button>}
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!v.trim()} onClick={() => onSave(v.trim())}>Save</Button>
      </>}>
      <form onSubmit={e => { e.preventDefault(); if (v.trim()) onSave(v.trim()); }}>
        <Field label="Name" htmlFor="nm-v" hint={hint}><Input id="nm-v" value={v} onChange={e => setV(e.target.value)} autoFocus /></Field>
      </form>
    </Dialog>
  );
}

/* Manage platforms: rarely needed, so it lives in a small window. */
function PlatformsDialog({ open, onClose, list, tasks, noun, onNew, onEdit, onDelete }) {
  return (
    <Dialog open={open} onClose={onClose} title={`Manage ${plural(noun).toLowerCase()}`} className="max-w-md"
      description={`Rename or delete ${plural(noun).toLowerCase()}. Renaming updates every task and automation that uses it.`}
      footer={<Button variant="outline" onClick={onClose}>Done</Button>}>
      <div className="grid gap-1">
        {list.length === 0 && <p className="text-sm text-muted-foreground">No {plural(noun).toLowerCase()} yet.</p>}
        {list.map(p => {
          const n = tasks.filter(t => norm(t.project) === norm(p.name)).length;
          return (
            <div key={p.name} className="group flex h-10 items-center gap-3 rounded-md px-2 hover:bg-muted/60">
              <I.folder className="size-4 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
              <span className="text-xs text-muted-foreground tnum">{n} {n === 1 ? 'task' : 'tasks'}</span>
              <Button variant="ghost" size="icon-sm" aria-label={`Rename ${p.name}`} onClick={() => onEdit(p)}><I.pencil className="size-3.5" /></Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Delete ${p.name}`} onClick={() => onDelete(p)}><I.trash className="size-3.5" /></Button>
            </div>
          );
        })}
        <button type="button" onClick={onNew} className="mt-1 flex h-9 items-center gap-2 rounded-md px-2 text-left text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"><I.plus className="size-3.5" />Add {noun.toLowerCase()}</button>
      </div>
    </Dialog>
  );
}

/* Buckets page: one card per bucket with its progress. */
function BucketsView({ list, tasks, noun, onNew, onEdit, onDelete, onOpen }) {
  const stats = name => {
    const ts = tasks.filter(t => (name === null ? !t.bucket : norm(t.bucket) === norm(name)));
    const done = ts.filter(t => t.status === 'done').length;
    const open = ts.filter(t => t.status !== 'done');
    const next = open.filter(t => t.deadline).sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
    const people = [...new Set(ts.map(t => t.assignee).filter(Boolean))];
    return { total: ts.length, done, open: open.length, next, people, time: ts.reduce((x, t) => x + elapsed(t), 0) };
  };
  const card = (b, st, editable) => {
    const pct = st.total ? Math.round(st.done / st.total * 100) : 0;
    return (
      <Card key={b.name} className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-semibold">{(b.label || b.name).trim().charAt(0).toUpperCase() || '?'}</span>
          <div className="min-w-0 flex-1">
            <button type="button" onClick={() => onOpen(b.name)} className="block max-w-full truncate text-left font-semibold hover:underline underline-offset-4">{b.label || b.name}</button>
            <div className="text-xs text-muted-foreground">{st.total} {st.total === 1 ? 'task' : 'tasks'}{st.time ? `, ${fmtShort(st.time)} tracked` : ''}</div>
          </div>
          {editable && (
            <DropdownMenu trigger={pp => <Button {...pp} variant="ghost" size="icon-sm" aria-label={`Options for ${b.name}`}><I.more /></Button>}
              items={[{ label: 'Rename', icon: <I.pencil />, onSelect: () => onEdit(b) }, 'sep', { label: `Delete ${noun.toLowerCase()}`, icon: <I.trash />, destructive: true, onSelect: () => onDelete(b) }]} />
          )}
        </div>
        <div>
          <div className="flex items-baseline gap-1.5"><span className="tnum text-2xl font-semibold leading-none">{pct}%</span><span className="text-xs text-muted-foreground">complete</span></div>
          <div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="min-w-0 flex-1 truncate">{st.open} open{st.next ? `, next due ${due(st.next).text}` : ''}</span>
          <span className="flex -space-x-1.5">{st.people.slice(0, 3).map(n => <Avatar key={n} name={n} className="h-6 w-6 ring-2 ring-card [&_span]:text-[9px]" />)}</span>
        </div>
      </Card>
    );
  };
  const none = stats(null);
  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-base font-semibold">{plural(noun)}</h2>
        <span className="text-sm text-muted-foreground">{list.length} active</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(b => card(b, stats(b.name), true))}
        {none.total > 0 && card({ name: 'none', label: `No ${noun.toLowerCase()}` }, none, false)}
        <button type="button" onClick={onNew}
          className="flex min-h-[11rem] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-card hover:text-foreground">
          <span className="flex size-9 items-center justify-center rounded-full bg-muted"><I.plus /></span>
          <span className="text-sm font-medium">New {noun.toLowerCase()}</span>
        </button>
      </div>
    </div>
  );
}

/* List view: tasks grouped into cards (by platform unless you pick something else). */
const GROUP_OPTIONS = ['project', 'bucket', 'status', 'assignee', 'priority'];
function groupTasks(tasks, by, stages, labels) {
  const key = t => by === 'status' ? statusDef(t, stages).id : by === 'priority' ? (t.priority || 'normal') : (t[by] || '').trim();
  const groups = new Map();
  tasks.forEach(t => { const k = key(t); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); });
  let order;
  if (by === 'status') order = statusList(stages).map(x => x.id).filter(id => groups.has(id));
  else if (by === 'priority') order = ['high', 'normal', 'low'].filter(k => groups.has(k));
  else order = [...groups.keys()].filter(Boolean).sort((a, b) => a.localeCompare(b)).concat(groups.has('') ? [''] : []);
  const name = k => {
    if (by === 'status') { const d = statusList(stages).find(x => x.id === k); return d ? d.name : k; }
    if (by === 'priority') return P[k].label;
    if (!k) return by === 'assignee' ? 'Unassigned' : `No ${(labels[by === 'project' ? 'platform' : by] || by).toLowerCase()}`;
    return k;
  };
  return order.map(k => ({ key: k, name: name(k), tasks: groups.get(k) }));
}

const TaskTimer = ({ t, onToggle, className }) => {
  const on = !!t.timerStartedAt;
  return (
    <button type="button" onClick={e => { e.stopPropagation(); onToggle(t.id); }} aria-label={`${on ? 'Pause' : 'Start'} timer for ${t.title || 'Untitled'}`}
      className={cn('tnum inline-flex h-6 items-center gap-1 rounded px-1 text-xs transition-colors hover:bg-muted', on ? 'font-semibold text-foreground' : 'text-muted-foreground', className)}>
      {on ? <I.pause className="size-3" /> : <I.play className="size-3" />}{fmt(elapsed(t))}
    </button>
  );
};
const MiniTag = ({ icon, children }) => (
  <span className="inline-flex h-5 max-w-[10rem] shrink-0 items-center gap-1 rounded-md border px-1.5 text-[11px] text-foreground/75">{icon}<span className="truncate">{children}</span></span>
);

function ListView({ tasks, stages, labels, groupBy, onOpen, onToggle, onAdd }) {
  const groups = groupTasks(tasks, groupBy, stages, labels);
  const presetFor = g => groupBy === 'status' ? (() => { const d = statusList(stages).find(x => x.id === g.key); return d ? { status: d.group, stage: d.builtin ? '' : d.id } : {}; })()
    : groupBy === 'priority' ? { priority: g.key } : { [groupBy]: g.key };
  return (
    <div className="mt-3 grid items-start gap-3 lg:grid-cols-2">
      {groups.map(g => (
        <Card key={g.key || '_none'} className="overflow-hidden">
          <div className="flex h-10 items-center gap-2 px-4 text-xs font-semibold">
            {groupBy === 'status' ? <DefPill def={statusList(stages).find(x => x.id === g.key)} />
              : <>{groupBy === 'project' ? <I.folder className="size-3.5 text-muted-foreground" /> : groupBy === 'bucket' ? <I.layers className="size-3.5 text-muted-foreground" /> : groupBy === 'assignee' ? <Avatar name={g.key} className="h-5 w-5 [&_span]:text-[9px]" /> : <I.flag className="size-3.5 text-muted-foreground" />}<span className="truncate">{g.name}</span></>}
            <span className="font-normal text-muted-foreground">{g.tasks.length}</span>
            <button type="button" onClick={() => onAdd(presetFor(g))} className="ml-auto inline-flex h-7 items-center gap-1 rounded-md px-2 font-normal text-muted-foreground hover:bg-muted hover:text-foreground"><I.plus className="size-3.5" />Add</button>
          </div>
          {g.tasks.map(t => {
            const def = statusDef(t, stages), d = due(t), done = t.status === 'done';
            return (
              <div key={t.id} className="group flex h-10 items-center gap-3 border-t border-border/60 px-4 text-[13px] hover:bg-muted/40">
                <span title={def.name} aria-label={def.name} className={cn('flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px]', done && STATUS_COLORS[def.color])}
                  style={{ borderColor: STATUS_HEX[def.color] }}>{done && <I.check className="size-2.5 text-white" />}</span>
                <button type="button" title={t.title} onClick={e => onOpen(t.id, e)} onAuxClick={e => { if (e.button === 1) { e.preventDefault(); onOpen(t.id, { ctrlKey: true }); } }}
                  className={cn('min-w-0 truncate text-left font-medium hover:underline underline-offset-4', done && 'text-muted-foreground line-through', !t.title && 'font-normal text-muted-foreground')}>{t.title || 'Untitled'}</button>
                {groupBy !== 'status' && t.status !== 'todo' && !done && <span className="shrink-0 text-[11px] text-muted-foreground">{def.name}</span>}
                {groupBy !== 'project' && t.project && <MiniTag icon={<I.folder className="size-3 text-muted-foreground" />}>{t.project}</MiniTag>}
                {groupBy !== 'bucket' && t.bucket && <MiniTag icon={<I.layers className="size-3 text-muted-foreground" />}>{t.bucket}</MiniTag>}
                <span className="ml-auto flex shrink-0 items-center gap-3.5 text-xs text-muted-foreground">
                  {groupBy !== 'priority' && <span className="inline-flex items-center gap-1.5"><span className={cn('size-1.5 rounded-full', PRI_DOT[t.priority || 'normal'])} />{P[t.priority || 'normal'].label}</span>}
                  <span className={cn('w-24 text-right', t.deadline && dueCls[d.tone])}>{t.deadline ? d.text : ''}</span>
                  <TaskTimer t={t} onToggle={onToggle} className="w-16 justify-end" />
                  {groupBy !== 'assignee' && (t.assignee ? <Avatar name={t.assignee} className="h-5 w-5 [&_span]:text-[9px]" /> : <span className="w-5" />)}
                </span>
              </div>
            );
          })}
        </Card>
      ))}
      {groups.length === 0 && <Card><Empty icon={<I.clipboard />} title="Nothing here" description="Try another filter, or add a task." /></Card>}
    </div>
  );
}

/* Board view: a column per status. Drag a card to change its status. */
function BoardView({ tasks, stages, labels, onOpen, onToggle, onMove, onAdd }) {
  const [doneOpen, setDoneOpen] = useState(false);
  const [drag, setDrag] = useState(null);
  const justDragged = useRef(false);
  const cols = statusList(stages);
  const byCol = id => tasks.filter(t => statusDef(t, stages).id === id);
  const startDrag = (e, t) => {
    if (e.button !== 0 || e.target.closest('button[data-nodrag]')) return;
    const sx = e.clientX, sy = e.clientY; let moved = false;
    const over = ev => { const el = document.elementFromPoint(ev.clientX, ev.clientY); const c = el && el.closest('[data-col]'); return c ? c.getAttribute('data-col') : null; };
    const move = ev => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      moved = true;
      setDrag({ id: t.id, title: t.title || 'Untitled', x: ev.clientX, y: ev.clientY, over: over(ev) });
    };
    const up = ev => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      if (moved) { const c = over(ev); if (c) onMove(t.id, c); justDragged.current = true; setTimeout(() => { justDragged.current = false; }, 0); }
      setDrag(null);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const card = t => {
    const d = due(t), on = !!t.timerStartedAt;
    return (
      <div key={t.id} role="button" tabIndex={0} onPointerDown={e => startDrag(e, t)}
        onClick={e => { if (!justDragged.current) onOpen(t.id, e); }}
        onKeyDown={e => { if (e.key === 'Enter') onOpen(t.id, e); }}
        className={cn('flex cursor-grab select-none flex-col gap-2.5 rounded-lg border bg-card p-3 text-left transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring active:cursor-grabbing', drag && drag.id === t.id && 'opacity-40', on && 'ring-1 ring-foreground/20')}>
        <div className={cn('text-[13px] font-medium leading-snug', t.status === 'done' && 'text-muted-foreground line-through', !t.title && 'font-normal text-muted-foreground')}>{t.title || 'Untitled'}</div>
        <div className="flex flex-wrap gap-1.5">
          {t.project && <MiniTag icon={<I.folder className="size-3 text-muted-foreground" />}>{t.project}</MiniTag>}
          {t.bucket && <MiniTag icon={<I.layers className="size-3 text-muted-foreground" />}>{t.bucket}</MiniTag>}
          <PriorityPill priority={t.priority} />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {t.assignee && <Avatar name={t.assignee} className="h-5 w-5 [&_span]:text-[8px]" />}
          {t.deadline && <span className={cn('inline-flex items-center gap-1', dueCls[d.tone])}><I.calendar className="size-3" />{d.text}</span>}
          {(t.checklist || []).length > 0 && <span className="tnum inline-flex items-center gap-0.5"><I.listCheck className="size-3" />{t.checklist.filter(c => c.done).length}/{t.checklist.length}</span>}
          <span data-nodrag className="ml-auto"><TaskTimer t={t} onToggle={onToggle} /></span>
        </div>
      </div>
    );
  };
  const doneCols = cols.filter(c => c.group === 'done');
  const doneCount = doneCols.reduce((n, c) => n + byCol(c.id).length, 0);
  return (
    <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
      {cols.filter(c => c.group !== 'done' || doneOpen).map(c => {
        const list = byCol(c.id);
        return (
          <div key={c.id} data-col={c.id} className={cn('flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-muted/60 p-2 transition-colors', drag && drag.over === c.id && 'bg-muted ring-1 ring-foreground/20')}>
            <div className="flex h-7 items-center gap-2 px-1.5 text-[13px] font-medium">
              <span className={cn('size-2 rounded-full', STATUS_COLORS[c.color])} />{c.name}<span className="font-normal text-muted-foreground">{list.length}</span>
              {c.group === 'done' && <button type="button" onClick={() => setDoneOpen(false)} className="ml-auto text-xs font-normal text-muted-foreground hover:text-foreground">Collapse</button>}
            </div>
            {list.map(card)}
            <button type="button" onClick={() => onAdd({ status: c.group, stage: c.builtin ? '' : c.id })}
              className="flex h-8 items-center gap-1.5 rounded-md px-2 text-left text-xs text-muted-foreground hover:bg-background/60 hover:text-foreground"><I.plus className="size-3.5" />New</button>
          </div>
        );
      })}
      {!doneOpen && (
        <button type="button" data-col={(doneCols[0] || {}).id || 'done'} onClick={() => setDoneOpen(true)} title={`Show ${GROUP_HEAD.done}`}
          className={cn('flex w-12 shrink-0 flex-col items-center gap-2 rounded-xl bg-muted/60 py-3 text-xs text-muted-foreground transition-colors hover:text-foreground', drag && drag.over === ((doneCols[0] || {}).id || 'done') && 'bg-muted ring-1 ring-foreground/20')}>
          <span className="size-2 rounded-full bg-emerald-500" />
          <span className="tnum font-medium">{doneCount}</span>
          <span className="[writing-mode:vertical-rl]">{GROUP_HEAD.done}</span>
        </button>
      )}
      {drag && (
        <div className="pointer-events-none fixed z-[90] w-64 rounded-lg border bg-card p-3 text-[13px] font-medium shadow-lg" style={{ left: drag.x + 8, top: drag.y + 8 }}>{drag.title}</div>
      )}
    </div>
  );
}

/* Command palette (Ctrl+K): jump to anything, or run an action, by typing. */
function CommandPalette({ open, onClose, items }) {
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const lst = useRef(null);
  useEffect(() => { if (open) { setQ(''); setHi(0); } }, [open]);
  useLockScroll(open);
  useEffect(() => {
    if (!open) return;
    const k = e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, [open, onClose]);
  useEffect(() => { const el = lst.current && lst.current.querySelector(`[data-i="${hi}"]`); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); }, [hi]);
  if (!open) return null;
  const words = norm(q).split(/\s+/).filter(Boolean);
  const match = it => words.every(w => norm(`${it.label} ${it.hint || ''} ${it.keywords || ''}`).includes(w));
  const groups = ['Actions', 'Tasks', 'Buckets', 'Documents'];
  const shown = [];
  groups.forEach(g => { shown.push(...items.filter(it => it.group === g && match(it)).slice(0, g === 'Actions' && !q ? 8 : 8)); });
  const run = it => { onClose(); setTimeout(() => it.run(), 0); };
  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[hi]) run(shown[hi]); }
  };
  let last = null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[85] bg-black/40 anim-fade" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Command palette"
        className="fixed left-1/2 top-[14vh] z-[86] w-[min(640px,calc(100%-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl anim-pop">
        <div className="flex items-center gap-2 border-b px-4">
          <I.search className="text-muted-foreground" />
          <input autoFocus value={q} onChange={e => { setQ(e.target.value); setHi(0); }} onKeyDown={onKey} placeholder="Type a command, or search tasks, buckets and documents…" aria-label="Command"
            className="h-12 flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus-visible:outline-none" />
          <Kbd>Esc</Kbd>
        </div>
        <div ref={lst} role="listbox" className="max-h-[min(26rem,60vh)] overflow-y-auto p-1.5">
          {shown.length === 0 && <div className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing matches “{q}”.</div>}
          {shown.map((it, i) => {
            const head = it.group !== last ? it.group : null; last = it.group;
            return (
              <React.Fragment key={it.id}>
                {head && <div className="px-2.5 pb-1 pt-2 text-[11px] font-medium text-muted-foreground">{head === 'Buckets' && it.groupLabel ? it.groupLabel : head}</div>}
                <div role="option" aria-selected={i === hi} data-i={i} onMouseEnter={() => setHi(i)} onClick={() => run(it)}
                  className={cn('flex h-9 cursor-default items-center gap-2.5 rounded-md px-2.5 text-sm [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground', i === hi && 'bg-accent')}>
                  {it.icon}<span className="min-w-0 flex-1 truncate">{it.label}</span>
                  {it.hint && <span className="shrink-0 truncate text-xs text-muted-foreground">{it.hint}</span>}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </>, document.body);
}

/* Archive: finished tasks moved out of the way after a while. Searchable, restorable. */
const ARCHIVE_DAY_OPTIONS = [['7', 'After 7 days'], ['30', 'After 30 days'], ['90', 'After 90 days'], ['0', 'Never']];
function ArchiveView({ items, labels, days, onDays, onRestore, onTrash, onCleanUp }) {
  const [q, setQ] = useState('');
  const nq = norm(q);
  const list = Object.values(items).filter(t => !nq || [t.title, t.project, t.bucket].some(v => norm(v).includes(nq)))
    .sort((a, b) => (b.doneAt || b.archivedAt || 0) - (a.doneAt || a.archivedAt || 0));
  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold">Archive</h2>
        <span className="text-sm text-muted-foreground">{Object.keys(items).length} {Object.keys(items).length === 1 ? 'task' : 'tasks'}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Archive finished tasks</span>
          <Select variant="chip" label="When to archive" value={String(days)} onChange={v => onDays(Number(v))} searchable={false}
            options={ARCHIVE_DAY_OPTIONS.map(([value, label]) => ({ value, label }))} />
          <Button size="sm" variant="outline" onClick={onCleanUp} disabled={!Object.keys(items).length}><I.trash />Clean up…</Button>
        </div>
      </div>
      <div className="relative mb-3 max-w-sm">
        <I.search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search the archive" aria-label="Search the archive" className="h-9 bg-card pl-9 shadow-none" />
      </div>
      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <Empty icon={<I.clipboard />} title={q ? 'Nothing matches' : 'The archive is empty'}
            description={days ? `Finished tasks move here ${days} days after they’re completed.` : 'Archiving is turned off.'} />
        ) : (
          <div className="divide-y">
            {list.map(t => (
              <div key={t.id} className="flex h-11 items-center gap-3 px-4 text-[13px]">
                <I.check className="size-3.5 shrink-0 text-emerald-600" />
                <span className="min-w-0 flex-1 truncate font-medium">{t.title || 'Untitled'}</span>
                {t.project && <span className="hidden max-w-[10rem] truncate text-xs text-muted-foreground md:block">{t.project}</span>}
                {t.bucket && <span className="hidden max-w-[10rem] truncate text-xs text-muted-foreground lg:block">{t.bucket}</span>}
                <span className="w-28 shrink-0 text-right text-xs text-muted-foreground">Done {fmtDay(t.doneAt || t.archivedAt)}</span>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => onRestore(t.id)}><I.reset className="size-3.5" />Restore</Button>
                <Button size="icon-sm" variant="ghost" aria-label={`Move ${t.title || 'Untitled'} to the Trash`} title="Move to Trash" onClick={() => onTrash(t.id)}><I.trash className="size-3.5" /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function TrashView({ items, onRestore, onDeleteNow, onEmpty }) {
  const now = Date.now();
  const list = Object.values(items).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  return (
    <div className="mt-6">
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold">Trash</h2>
        <span className="text-sm text-muted-foreground">{list.length} {list.length === 1 ? 'task' : 'tasks'}</span>
        <Button size="sm" variant="outline" className="ml-auto" disabled={!list.length} onClick={onEmpty}>Empty Trash…</Button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">Tasks here are deleted for good after {TRASH_DAYS} days. Their documents stay in Documents.</p>
      <Card className="overflow-hidden">
        {list.length === 0 ? <Empty icon={<I.trash />} title="The Trash is empty" description="Deleted tasks wait here before they’re gone for good." /> : (
          <div className="divide-y">
            {list.map(t => {
              const left = Math.max(0, TRASH_DAYS - Math.floor((now - (t.deletedAt || now)) / 864e5));
              return (
                <div key={t.id} className="flex h-11 items-center gap-3 px-4 text-[13px]">
                  <I.file className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-medium">{t.title || 'Untitled'}</span>
                  <span className="w-40 shrink-0 text-right text-xs text-muted-foreground">Deleted {fmtDay(t.deletedAt)}, {left} {left === 1 ? 'day' : 'days'} left</span>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => onRestore(t.id)}><I.reset className="size-3.5" />Restore</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive" onClick={() => onDeleteNow(t)}>Delete now</Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function CleanUpDialog({ open, items, onClose, onConfirm }) {
  const [months, setMonths] = useState('6');
  const cutoff = Date.now() - Number(months) * 30.4 * 864e5;
  const matches = Object.values(items).filter(t => (t.doneAt || t.archivedAt || 0) < cutoff);
  return (
    <Dialog open={open} onClose={onClose} title="Clean up the archive" className="max-w-md"
      description={`Archived tasks completed before the date you pick move to the Trash. You can still restore them there for ${TRASH_DAYS} days. Documents are kept.`}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!matches.length} onClick={() => onConfirm(matches.map(t => t.id))}>Move {matches.length} {matches.length === 1 ? 'task' : 'tasks'} to Trash</Button>
      </>}>
      <Field label="Completed more than" htmlFor="cu-m">
        <Select id="cu-m" value={months} onChange={setMonths} searchable={false}
          options={[['1', '1 month ago'], ['3', '3 months ago'], ['6', '6 months ago'], ['12', '12 months ago']].map(([value, label]) => ({ value, label }))} />
      </Field>
      <p className="text-sm text-muted-foreground">{matches.length ? `${matches.length} of ${Object.keys(items).length} archived tasks match.` : 'No archived tasks are that old.'}</p>
    </Dialog>
  );
}

function ProjectsView({ list, tasks, onNew, onEdit, onDelete, onOpen }) {
  const now = Date.now();
  const stats = name => {
    const ts = tasks.filter(t => (name === null ? !t.project : norm(t.project) === norm(name)));
    const done = ts.filter(t => t.status === 'done').length;
    return {
      total: ts.length, done, open: ts.length - done, todo: ts.filter(t => t.status === 'todo' || t.status === 'blocked').length,
      doing: ts.filter(t => t.status === 'doing').length,
      blocked: ts.filter(t => t.status === 'blocked').length,
      overdue: ts.filter(t => t.status !== 'done' && t.deadline && dayDiff(t.deadline) < 0).length,
      time: ts.reduce((x, t) => x + elapsed(t), 0),
    };
  };
  const unassigned = stats(null);
  const ProjectCard = ({ p, st, editable }) => {
    const c = PROJECT_COLORS[p.color] || PROJECT_COLORS.slate;
    const pct = st.total ? Math.round(st.done / st.total * 100) : 0;
    return (
      <Card className="group flex flex-col p-5 transition-shadow hover:shadow-md">
        <div className="flex items-start gap-3">
          <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', c.soft)}><I.folder /></span>
          <div className="min-w-0 flex-1">
            <button type="button" onClick={() => onOpen(p.name)} className="block max-w-full truncate text-left font-semibold hover:underline underline-offset-4">{p.label || p.name}</button>
            <div className="text-xs text-muted-foreground">{st.total} {st.total === 1 ? 'task' : 'tasks'}{st.time ? `, ${fmtShort(st.time)} tracked` : ''}</div>
          </div>
          {editable && (
            <DropdownMenu
              trigger={pp => <Button {...pp} variant="ghost" size="icon-sm" aria-label={`Options for ${p.name}`}><I.more /></Button>}
              items={[
                { label: 'Rename or recolor', icon: <I.pencil />, onSelect: () => onEdit(p) },
                'sep',
                { label: 'Delete project', icon: <I.trash />, destructive: true, onSelect: () => onDelete(p) },
              ]} />
          )}
        </div>
        <div className="mt-5 flex items-end justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="tnum font-medium">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-muted"><div className={cn('h-full rounded-full transition-all', c.bar)} style={{ width: `${pct}%` }} /></div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[['To do', st.todo], ['In progress', st.doing], ['Done', st.done]].map(([l, v]) => (
            <div key={l} className="rounded-lg bg-muted/60 px-2 py-2">
              <div className="tnum text-lg font-semibold leading-none">{v}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
        {(st.overdue > 0 || st.blocked > 0) && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {st.overdue > 0 && <span className="text-red-600 dark:text-red-400">{st.overdue} overdue</span>}
            {st.blocked > 0 && <span className="text-muted-foreground">{st.blocked} blocked</span>}
          </div>
        )}
        <div className="mt-auto pt-4"><Button variant="ghost" size="sm" className="-mb-1 w-full justify-between px-2" onClick={() => onOpen(p.name)}>View tasks<I.right /></Button></div>
      </Card>
    );
  };
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map(p => <ProjectCard key={p.name} p={p} st={stats(p.name)} editable />)}
      {unassigned.total > 0 && <ProjectCard p={{ name: 'none', label: 'No project', color: 'slate' }} st={unassigned} />}
      <button type="button" onClick={onNew}
        className="flex min-h-[15rem] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-muted-foreground transition-colors hover:border-primary/40 hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
        <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground"><I.plus /></span>
        <span className="text-sm font-medium">New project</span>
      </button>
    </div>
  );
}

function App({ prof, standaloneId, ws = 'product', workspaces = [], onSwitchWorkspace = () => {}, onRenameWorkspace = () => {}, openOnLoad = null }) {
  const me = prof.data.user;
  const {
    tasks, saveMany, remove, rules, saveRules, projects: storedProjects, saveProjects, stages, saveStages, loaded,
    buckets: storedBuckets, saveBuckets, labels, saveLabels, settings, saveSettings, looseDocs, saveLooseDocs,
    archived, trash, trashTasks, restoreTask, purgeTrash, deleteDocEverywhere, undo, redo,
  } = useTasks(ws);
  const doUndo = () => { if (undo()) toast('Undone'); else toast('Nothing to undo'); };
  const doRedo = () => { if (redo()) toast('Redone'); else toast('Nothing to redo'); };
  undoHook.current = undo;
  // Ctrl+Z undoes, Ctrl+Shift+Z or Ctrl+Y redoes (text fields keep their own undo while you type).
  const undoKeys = useRef(null); undoKeys.current = { doUndo, doRedo };
  useEffect(() => {
    const k = e => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const el = document.activeElement;
      if (el && (/^(INPUT|TEXTAREA)$/.test(el.tagName) || el.isContentEditable)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) { e.preventDefault(); undoKeys.current.doUndo(); }
      else if ((key === 'z' && e.shiftKey) || key === 'y') { e.preventDefault(); undoKeys.current.doRedo(); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);
  const wsName = (workspaces.find(w => w.id === ws) || {}).name || 'Product';
  const [cellEdit, setCellEdit] = useState(null); // { id, field, el }
  const [renaming, setRenaming] = useState(null);
  const [statusesOpen, setStatusesOpen] = useState(false);
  const up = useUpdater();
  const savedView = useMemo(() => { try { return JSON.parse(localStorage.getItem(LS_VIEW)) || {}; } catch (e) { return {}; } }, []);
  const [projectFilter, setProjectFilter] = useState(savedView.projectFilter || 'all');
  const [view, setView] = useState(['docs', 'projects'].includes(savedView.view) ? savedView.view : 'tasks');
  const [projectEdit, setProjectEdit] = useState(null); // { project } | { project: null } for new
  const [projectDelete, setProjectDelete] = useState(null);
  const [showSummary, setShowSummary] = useState(!!savedView.showSummary);
  const [query, setQuery] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const searchRef = useRef(null);
  const [, setNow] = useState(0);
  const [filter, setFilter] = useState('open'); // the app always starts on Open
  const [sortBy, setSortBy] = useState(savedView.sortBy || 'deadline');
  useEffect(() => { try { localStorage.setItem(LS_VIEW, JSON.stringify({ projectFilter, sortBy, showSummary, view })); } catch (e) {} }, [projectFilter, sortBy, showSummary, view]);
  const [quick, setQuick] = useState('');
  const [sheet, setSheet] = useState(standaloneId ? { open: true, id: standaloneId } : { open: false, id: null });
  const [openMode, setOpenMode] = useState(() => { try { return localStorage.getItem('tasks-open-mode') || 'side'; } catch (e) { return 'side'; } });
  const chooseMode = m => { setOpenMode(m); try { localStorage.setItem('tasks-open-mode', m); } catch (e) {} };
  // Tabs: Home plus tasks you opened in a tab. Remembered between sessions (main window only).
  const [tabs, setTabs] = useState(() => {
    if (standaloneId) return { list: [], active: 'home' };
    try { const v = JSON.parse(localStorage.getItem((ws === 'product' ? 'tasks-tabs' : 'tasks-tabs-' + ws))); if (v && Array.isArray(v.list)) return { list: v.list, active: v.active || 'home' }; } catch (e) {}
    return { list: [], active: 'home' };
  });
  useEffect(() => { if (!standaloneId) { try { localStorage.setItem((ws === 'product' ? 'tasks-tabs' : 'tasks-tabs-' + ws), JSON.stringify(tabs)); } catch (e) {} } }, [tabs]);
  const openTab = id => setTabs(t => ({ list: t.list.includes(id) ? t.list : [...t.list, id], active: id }));
  const closeTab = id => setTabs(t => {
    const i = t.list.indexOf(id), list = t.list.filter(x => x !== id);
    return { list, active: t.active === id ? (list[i] || list[i - 1] || 'home') : t.active };
  });
  const setActiveTab = id => setTabs(t => ({ ...t, active: id }));
  const tabsRef = useRef(tabs); tabsRef.current = tabs;
  const tabClose = useRef(null), tabDrop = useRef(null);
  // Opens a task the way you chose: side panel, centered, full screen, or a new tab.
  const openTask = id => { if (!standaloneId && openMode === 'tab') openTab(id); else setSheet({ open: true, id }); };
  const [confirmId, setConfirmId] = useState(null);
  const storageOk = true;
  const [profileOpen, setProfileOpen] = useState(false);
  const [restoreSrc, setRestoreSrc] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const sheetDrop = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [addDocs, setAddDocs] = useState({ open: false, files: [] });
  const [fileConfirm, setFileConfirm] = useState(null);
  const tasksRef = useRef(tasks); tasksRef.current = tasks;

  const all = useMemo(() => Object.values(tasks).map(t => ({ createdAt: Date.now(), ...t, status: S[t.status] ? t.status : 'todo' })), [tasks]);
  const running = all.find(t => t.timerStartedAt);
  useEffect(() => { if (!running) return; const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, [!!running]);

  const people = useMemo(() => [...new Set([me.name, ...all.map(t => (t.assignee || '').trim())].filter(Boolean))].sort((a, b) => a.localeCompare(b)), [all, me.name]);
  // Managed projects, plus any project name still used by a task or automation.
  const projectList = useMemo(() => {
    const list = storedProjects.map(p => ({ ...p }));
    const have = new Set(list.map(p => norm(p.name)));
    const extra = [...(storedProjects.length || ws !== 'product' ? [] : DEFAULT_PROJECTS), ...all.map(t => t.project), ...rules.flatMap(r => [r.project, (r.action === 'copy' || r.action === 'move') ? r.target : ''])];
    extra.map(x => (x || '').trim()).filter(Boolean).forEach(name => {
      if (!have.has(norm(name))) { have.add(norm(name)); list.push({ id: 'auto-' + norm(name), name, color: autoColor(name) }); }
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [storedProjects, all, rules]);
  const projects = useMemo(() => projectList.map(p => p.name), [projectList]);
  const colorOf = name => PROJECT_COLORS[(projectList.find(p => norm(p.name) === norm(name)) || {}).color || autoColor(name)] || PROJECT_COLORS.slate;
  const saveProject = ({ name, color }) => {
    const old = projectEdit && projectEdit.project;
    const list = projectList.filter(p => !old || norm(p.name) !== norm(old.name));
    saveProjects([...list, { id: old ? old.id : 'p-' + newId(), name, color }]);
    if (old && old.name !== name) {
      const moved = Object.values(tasksRef.current).filter(t => norm(t.project) === norm(old.name)).map(t => ({ ...t, project: name }));
      if (moved.length) saveMany(moved);
      saveRules(rules.map(r => ({ ...r,
        project: norm(r.project) === norm(old.name) ? name : r.project,
        target: (r.action === 'copy' || r.action === 'move') && norm(r.target) === norm(old.name) ? name : r.target })));
      if (projectFilter === old.name) setProjectFilter(name);
    }
    setProjectEdit(null);
    toast(old ? `${labels.platform} renamed` : `${labels.platform} created`, name);
  };
  const deleteProject = () => {
    const p = projectDelete; setProjectDelete(null);
    const n = norm(p.name);
    const moved = Object.values(tasksRef.current).filter(t => norm(t.project) === n).map(t => ({ ...t, project: '' }));
    if (moved.length) saveMany(moved);
    saveRules(rules.filter(r => norm(r.project) !== n && !((r.action === 'copy' || r.action === 'move') && norm(r.target) === n)));
    saveProjects(projectList.filter(x => norm(x.name) !== n));
    if (projectFilter === p.name) setProjectFilter('all');
    toast(`${labels.platform} deleted`, p.name, { undo: true });
  };
  const ensureProject = name => {
    if (!name || projectList.some(p => norm(p.name) === norm(name))) return;
    saveProjects([...projectList, { id: 'p-' + newId(), name, color: autoColor(name) }]);
    toast(`${labels.platform} created`, name);
  };
  const addStage = (name, group) => {
    const found = stages.find(x => norm(x.name) === norm(name) && x.group === group);
    if (found) return found.id;
    const id = 'st-' + newId();
    const all = statusList(stages).map(({ builtin, ...x }) => x);
    const at = all.map(x => x.group).lastIndexOf(group) + 1;
    saveStages([...all.slice(0, at), { id, name, group, color: NEW_COLOR[group] }, ...all.slice(at)]);
    toast('Status created', `${name} (${GROUP_HEAD[group]})`);
    return id;
  };
  const deleteStage = id => {
    const sg = stages.find(x => x.id === id);
    saveStages(stages.filter(x => x.id !== id));
    if (sg) toast('Status deleted', `Tasks with “${sg.name}” now show ${S[sg.group].label}.`);
  };
  const openProject = name => { setProjectFilter(name); setFilter('all'); setView('tasks'); };
  // Buckets (what the work is for): one per task, managed on the Buckets page.
  const bucketList = useMemo(() => {
    const list = storedBuckets.map(b => ({ ...b }));
    const have = new Set(list.map(b => norm(b.name)));
    all.forEach(t => { const n = (t.bucket || '').trim(); if (n && !have.has(norm(n))) { have.add(norm(n)); list.push({ id: 'auto-' + norm(n), name: n }); } });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [storedBuckets, all]);
  const bucketNames = useMemo(() => bucketList.map(b => b.name), [bucketList]);
  const [bucketFilter, setBucketFilter] = useState('all');
  const [cleanUpOpen, setCleanUpOpen] = useState(false);
  const COLS_KEY = 'tasks-cols-' + ws;
  const [cols, setCols] = useState(() => { try { const v = JSON.parse(localStorage.getItem(COLS_KEY)); return { widths: (v && v.widths) || {}, hidden: (v && v.hidden) || [] }; } catch (e) { return { widths: {}, hidden: [] }; } });
  useEffect(() => { try { localStorage.setItem(COLS_KEY, JSON.stringify(cols)); } catch (e) {} }, [cols]);
  const visibleCols = TABLE_COLS.filter(c => c.key === 'task' || !cols.hidden.includes(c.key));
  const colW = c => cols.widths[c.key] || c.w;
  const setColWidth = (key, w) => setCols(c => { const widths = { ...c.widths }; if (w == null) delete widths[key]; else widths[key] = w; return { ...c, widths }; });
  const hideCol = (key, hide) => setCols(c => ({ ...c, hidden: hide ? [...new Set([...c.hidden, key])] : c.hidden.filter(k => k !== key) }));
  // Drag the line between two headings to resize a column; double-click it to reset.
  const startResize = (e, c) => {
    e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX, w0 = colW(c);
    const move = ev => setColWidth(c.key, Math.max(c.min, Math.round(w0 + ev.clientX - x0)));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.style.cursor = ''; };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const VM_KEY = 'tasks-view-mode-' + ws, GB_KEY = 'tasks-group-by-' + ws;
  const [viewMode, setViewMode] = useState(() => { try { return localStorage.getItem(VM_KEY) || 'table'; } catch (e) { return 'table'; } });
  const [groupBy, setGroupBy] = useState(() => { try { return localStorage.getItem(GB_KEY) || 'project'; } catch (e) { return 'project'; } });
  useEffect(() => { try { localStorage.setItem(VM_KEY, viewMode); localStorage.setItem(GB_KEY, groupBy); } catch (e) {} }, [viewMode, groupBy]);
  const openFromView = (id, e) => { if (e && (e.ctrlKey || e.metaKey)) openTab(id); else openTask(id); };
  const moveToColumn = (id, colId) => {
    const d = statusList(stages).find(x => x.id === colId); if (!d) return;
    const t = tasksRef.current[id]; if (!t || statusDef(t, stages).id === colId) return;
    updateTask(id, { status: d.group, stage: d.builtin ? '' : d.id });
  };
  const [purgeConfirm, setPurgeConfirm] = useState(null);
  const [bucketEdit, setBucketEdit] = useState(null);
  const [bucketDelete, setBucketDelete] = useState(null);
  const [platformsOpen, setPlatformsOpen] = useState(false);
  const [labelEdit, setLabelEdit] = useState(null); // a column key
  const [wsRename, setWsRename] = useState(false);
  const ensureBucket = name => {
    if (!name || bucketList.some(b => norm(b.name) === norm(name))) return;
    saveBuckets([...bucketList, { id: 'b-' + newId(), name }]);
    toast(`${labels.bucket} created`, name);
  };
  const saveBucket = ({ name }) => {
    const old = bucketEdit && bucketEdit.bucket;
    const list = bucketList.filter(b => !old || norm(b.name) !== norm(old.name));
    saveBuckets([...list, { id: old ? old.id : 'b-' + newId(), name }]);
    if (old && old.name !== name) {
      const moved = Object.values(tasksRef.current).filter(t => norm(t.bucket) === norm(old.name)).map(t => ({ ...t, bucket: name }));
      if (moved.length) saveMany(moved);
      if (bucketFilter === old.name) setBucketFilter(name);
    }
    setBucketEdit(null);
    toast(old ? `${labels.bucket} renamed` : `${labels.bucket} created`, name);
  };
  const deleteBucket = () => {
    const b = bucketDelete; setBucketDelete(null);
    const moved = Object.values(tasksRef.current).filter(t => norm(t.bucket) === norm(b.name)).map(t => ({ ...t, bucket: '' }));
    if (moved.length) saveMany(moved);
    saveBuckets(bucketList.filter(x => norm(x.name) !== norm(b.name)));
    if (bucketFilter === b.name) setBucketFilter('all');
    toast(`${labels.bucket} deleted`, b.name, { undo: true });
  };
  const openBucket = name => { setBucketFilter(name); setFilter('all'); setView('tasks'); };
  const scoped = useMemo(() => {
    const q = norm(query);
    return all.filter(t => (projectFilter === 'all' || (projectFilter === 'none' ? !t.project : t.project === projectFilter))
      && (bucketFilter === 'all' || (bucketFilter === 'none' ? !t.bucket : norm(t.bucket) === norm(bucketFilter)))
      && (!q || [t.title, t.description, t.assignee, t.project, t.bucket, statusLabel(t, stages), ...(t.checklist || []).map(c => c.text), ...(t.files || []).map(f => f.name)].some(v => norm(v).includes(q))));
  }, [all, projectFilter, bucketFilter, query]);
  const counts = useMemo(() => { const c = { all: scoped.length, open: scoped.filter(t => t.status !== 'done').length }; STATUSES.forEach(s => { c[s.id] = scoped.filter(t => t.status === s.id).length; }); return c; }, [scoped]);
  const overview = useMemo(() => {
    const open = scoped.filter(t => t.status !== 'done');
    return {
      open: open.length,
      week: open.filter(t => t.deadline && dayDiff(t.deadline) >= 0 && dayDiff(t.deadline) < 7).length,
      overdue: open.filter(t => t.deadline && dayDiff(t.deadline) < 0).length,
    };
  }, [scoped]);

  const shown = useMemo(() => {
    const by = {
      deadline: (a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999') || b.createdAt - a.createdAt,
      created: (a, b) => b.createdAt - a.createdAt,
      status: (a, b) => { const o = statusList(stages).map(x => x.id); return S[a.status].i - S[b.status].i || o.indexOf(statusDef(a, stages).id) - o.indexOf(statusDef(b, stages).id) || b.createdAt - a.createdAt; },
      assignee: (a, b) => (a.assignee || '~').localeCompare(b.assignee || '~') || b.createdAt - a.createdAt,
      project: (a, b) => (a.project || '~').localeCompare(b.project || '~') || b.createdAt - a.createdAt,
      bucket: (a, b) => (a.bucket || '~').localeCompare(b.bucket || '~') || b.createdAt - a.createdAt,
      priority: (a, b) => P[a.priority || 'normal'].i - P[b.priority || 'normal'].i || (a.deadline || '9999').localeCompare(b.deadline || '9999'),
    }[sortBy] || ((a, b) => b.createdAt - a.createdAt);
    // While searching, look through every task (finished ones too, in any project).
    const q = norm(query);
    const base = q ? all.filter(t => [t.title, t.description, t.assignee, t.project, t.bucket, statusLabel(t, stages), ...(t.checklist || []).map(c => c.text), ...(t.files || []).map(f => f.name)].some(v => norm(v).includes(q)))
      : scoped.filter(t => filter === 'all' || (filter === 'open' ? t.status !== 'done' : t.status === filter));
    return base.sort((a, b) => {
      if (sortBy !== 'status' && (a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1;
      return by(a, b);
    });
  }, [scoped, all, query, filter, sortBy, stages]);

  // When a task moves into In progress, whatever was in progress before becomes Blocked by it.
  const blockOthers = (next, prev) => {
    if (next.status !== 'doing' || (prev && prev.status === 'doing')) return [];
    return Object.values(tasks).filter(o => o.id !== next.id && o.status === 'doing')
      .map(o => ({ ...stopT(o), status: 'blocked', blockedBy: next.id }));
  };
  const merge = list => Object.values(list.reduce((m, t) => { m[t.id] = { ...(m[t.id] || {}), ...t }; return m; }, {}));
  const notifyBlocked = (list, by) => {
    if (!list.length) return;
    toast(list.length === 1 ? `“${list[0].title}” is now blocked` : `${list.length} tasks are now blocked`, `Blocked by “${by.title}”`);
  };
  // Automations. Each rule: for tasks in [project], when the task [trigger], [action] [target].
  const ruleMatches = (r, t) => r.enabled && (!r.project || norm(r.project) === norm(t.project));
  const triggered = (trigger, next, prev) => {
    if (trigger === 'created') return !prev;
    if (trigger === 'started') return next.status === 'doing' && (!prev || prev.status !== 'doing');
    if (trigger === 'blocked') return next.status === 'blocked' && (!prev || prev.status !== 'blocked');
    if (trigger === 'done') return next.status === 'done' && (!prev || prev.status !== 'done');
    if (trigger === 'unblocked') return !!prev && prev.status === 'blocked' && next.status !== 'blocked';
    if (trigger === 'reopened') return !!prev && prev.status === 'done' && next.status !== 'done';
    if (trigger === 'assigned') return !!(next.assignee || '').trim() && (!prev || norm(prev.assignee) !== norm(next.assignee));
    if (trigger === 'high') return next.priority === 'high' && (!prev || prev.priority !== 'high');
    if (trigger === 'file_added') return (next.files || []).length > ((prev && prev.files) || []).length;
    if (trigger === 'moved') return !!prev && !!next.project && norm(prev.project) !== norm(next.project);
    if (trigger === 'checklist') {
      const c = next.checklist || [], pc = (prev && prev.checklist) || [];
      return c.length > 0 && c.every(x => x.done) && !(pc.length > 0 && pc.every(x => x.done));
    }
    return false;
  };
  const runActions = (task, list) => {
    let t = { ...task }; const created = [], notes = [];
    for (const r of list) {
      if (r.action === 'copy') {
        if (!r.target || norm(r.target) === norm(t.project) || (t.followUps || {})[r.id]) continue;
        const c = {
          id: newId(), title: t.title, description: t.description || '', assignee: t.assignee || '', deadline: t.deadline || '',
          files: t.files || [], priority: t.priority || 'normal', checklist: (t.checklist || []).map(x => ({ ...x, id: newId(), done: false })),
          bucket: t.bucket || '', project: r.target, status: 'todo', createdAt: Date.now(), timeSpent: 0, timerStartedAt: null, blockedBy: null,
          generatedFrom: t.id, generatedBy: r.id,
        };
        created.push(c);
        t = { ...t, followUps: { ...(t.followUps || {}), [r.id]: c.id } };
      } else if (r.action === 'move' && r.target) t = { ...t, project: r.target };
      else if (r.action === 'status' && S[r.target]) {
        t = { ...t, status: r.target };
        if (r.target === 'done' || r.target === 'blocked') t = stopT(t);
        if (r.target !== 'blocked') t.blockedBy = null;
      } else if (r.action === 'priority' && P[r.target]) t = { ...t, priority: r.target };
      else if (r.action === 'assign' && r.target) t = { ...t, assignee: r.target };
      else if (r.action === 'unassign') t = { ...t, assignee: '' };
      else if (r.action === 'stop_timer') t = stopT(t);
      else if (r.action === 'deadline' && r.target) {
        // On "is created", only fill in a missing date; never overwrite one you chose.
        if (r.trigger === 'created' && t.deadline) continue;
        if (r.target === 'none') t = { ...t, deadline: '' };
        else { const d = new Date(); d.setDate(d.getDate() + Number(r.target)); t = { ...t, deadline: toISO(d), autoFired: {} }; }
      } else if (r.action === 'checklist' && r.target) {
        const have = new Set((t.checklist || []).map(c => norm(c.text)));
        const add = r.target.split(/[,\n]/).map(x => x.trim()).filter(x => x && !have.has(norm(x))).map(text => ({ id: newId(), text, done: false }));
        if (add.length) t = { ...t, checklist: [...(t.checklist || []), ...add] };
      } else if (r.action === 'notify') notes.push({ title: r.target || TRIG[r.trigger].short, body: t.title });
    }
    return { task: t, created, notes };
  };
  // A change made by one automation can set off others (a finished checklist marks the task done,
  // which then copies it), but each automation runs at most once per change, so nothing can loop.
  const automate = (next, prev) => {
    let task = next, before = prev;
    const created = [], fired = [], notes = [];
    for (let pass = 0; pass < 3; pass++) {
      const list = rules.filter(r => !TIME_TRIGGERS.includes(r.trigger) && !fired.includes(r) && ruleMatches(r, task) && triggered(r.trigger, task, before));
      if (!list.length) break;
      const res = runActions(task, list);
      before = task; task = res.task;
      created.push(...res.created); fired.push(...list); notes.push(...res.notes);
    }
    return { task, created, fired, notes };
  };
  // Returns true if it showed a message about the automation.
  const notifyAuto = auto => {
    (auto.notes || []).forEach(n => notifyDesktop(n.title, n.body));
    if (auto.created.length) {
      toast(auto.created.length === 1 ? `Follow-up created in ${auto.created[0].project}` : `${auto.created.length} follow-up tasks created`, `“${auto.created[0].title}” is waiting in To do.`);
      return true;
    }
    const visible = auto.fired.filter(r => r.trigger !== 'created' && r.action !== 'notify');
    if (visible.length) { toast('Automation ran', describeRule(visible[0]) + '.'); return true; }
    return false;
  };
  // Date-based automations ("is due tomorrow", "becomes overdue") are checked when the app opens
  // and every minute after. Each fires once per task, again only if you change its deadline.
  useEffect(() => {
    if (!loaded || standaloneId) return; // only the main window runs date-based automations
    const scan = () => {
      const list = rules.filter(r => r.enabled && TIME_TRIGGERS.includes(r.trigger));
      if (!list.length) return;
      const updates = [], made = [], notes = [];
      Object.values(tasksRef.current).forEach(t => {
        if (!t.deadline || t.status === 'done') return;
        const days = dayDiff(t.deadline);
        const fire = list.filter(r => ruleMatches(r, t) && !(t.autoFired || {})[r.id]
          && ((r.trigger === 'overdue' && days < 0) || (r.trigger === 'due_soon' && days >= 0 && days <= 1)));
        if (!fire.length) return;
        const res = runActions(t, fire);
        const autoFired = { ...(res.task.autoFired || {}) }; fire.forEach(r => { autoFired[r.id] = true; });
        updates.push({ ...res.task, autoFired }); made.push(...res.created); notes.push(...res.notes);
      });
      if (updates.length) {
        saveMany([...updates, ...made]);
        notes.forEach(n => notifyDesktop(n.title, n.body));
        if (!notes.length) toast(updates.length === 1 ? `Automation ran for “${updates[0].title}”` : `Automations ran for ${updates.length} tasks`, 'Because of their deadlines.');
      }
    };
    scan();
    const i = setInterval(scan, 60000);
    return () => clearInterval(i);
  }, [loaded, rules]);
  // Changes made directly in the table go through the same rules as the task panel.
  const updateTask = (id, p) => {
    const t = tasksRef.current[id]; if (!t) return;
    let next = { ...t, ...p };
    if ('status' in p && p.status !== t.status) {
      if (next.status !== 'blocked') next.blockedBy = null;
      if ((next.status === 'done' || next.status === 'blocked') && next.timerStartedAt) next = stopT(next);
    }
    if ('deadline' in p && p.deadline !== t.deadline) next.autoFired = {};
    const blocked = blockOthers(next, t);
    const auto = automate(next, t);
    saveMany(merge([...blocked, auto.task, ...auto.created]));
    if (!notifyAuto(auto) && blocked.length) notifyBlocked(blocked, auto.task);
  };
  const openCell = (id, field, el) => setCellEdit(c => (c && c.id === id && c.field === field ? null : { id, field, el }));
  const toggleTimer = id => {
    const t = tasks[id]; if (!t) return;
    if (t.timerStartedAt) { saveMany([stopT(t)]); return; }
    const others = Object.values(tasks).filter(o => o.id !== id && o.timerStartedAt).map(stopT);
    const next = { ...t, status: t.status === 'todo' ? 'doing' : t.status, timerStartedAt: Date.now() };
    const blocked = blockOthers(next, t);
    const auto = automate(next, t);
    saveMany(merge([...others, ...blocked, auto.task, ...auto.created]));
    if (!notifyAuto(auto)) notifyBlocked(blocked, next);
  };
  const resetTimer = id => { const t = tasks[id]; if (t) saveMany([{ ...t, timeSpent: 0, timerStartedAt: null, sessions: [] }]); };
  const markDone = id => {
    const t = tasks[id]; if (!t) return;
    const auto = automate({ ...stopT(t), status: 'done', blockedBy: null }, t);
    saveMany([auto.task, ...auto.created]);
    if (!notifyAuto(auto)) toast('Marked as done', t.title);
  };
  const addQuick = e => {
    e.preventDefault();
    const v = quick.trim();
    if (!v) { createTask(); return; }
    const auto = automate({ id: newId(), title: v, status: 'todo', assignee: me.name || '', deadline: '', description: '', priority: 'normal',
      project: projectFilter !== 'all' && projectFilter !== 'none' ? projectFilter : '', createdAt: Date.now(), timeSpent: 0, timerStartedAt: null }, null);
    saveMany([auto.task, ...auto.created]);
    setQuick('');
  };
  // The task panel saves each change as you make it, through the same rules as the table.
  const saveSheet = (id, patch) => updateTask(id, patch);
  // "Create task" and N make a real task straight away and open it, ready for a title.
  const createTask = (opts = {}) => {
    const auto = automate({
      id: newId(), title: '', status: 'todo', assignee: me.name || '', deadline: '', description: '', priority: 'normal', checklist: [],
      project: projectFilter !== 'all' && projectFilter !== 'none' ? projectFilter : '', bucket: bucketFilter !== 'all' && bucketFilter !== 'none' ? bucketFilter : '',
      ...(opts && opts.preset ? opts.preset : {}), createdAt: Date.now(), timeSpent: 0, timerStartedAt: null,
    }, null);
    saveMany([auto.task, ...auto.created]);
    if (opts && opts.tab === true) openTab(auto.task.id); else openTask(auto.task.id);
  };
  const createRef = useRef(createTask); createRef.current = createTask;
  // A new task you close without typing anything is removed again.
  const discardEmpty = id => remove(id);
  const doDelete = () => {
    const t = tasks[confirmId]; trashTasks([confirmId]); setConfirmId(null); setSheet({ open: false, id: null });
    toast('Moved to Trash', `You can restore “${(t && t.title) || 'Untitled'}” from the Trash for ${TRASH_DAYS} days.`, { undo: true });
  };
  const closeSheet = useCallback(() => setSheet({ open: false, id: null }), []);
  // Close tabs whose task was deleted.
  useEffect(() => {
    if (!loaded) return;
    setTabs(t => {
      const list = t.list.filter(id => tasks[id]);
      if (list.length === t.list.length) return t;
      return { list, active: t.active === 'home' || list.includes(t.active) ? t.active : 'home' };
    });
  }, [tasks, loaded]);
  // Ctrl+K opens the command palette from anywhere.
  useEffect(() => {
    if (standaloneId) return;
    const k = e => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o => !o); } };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, []);
  // Ctrl+W closes the tab, Ctrl+Tab moves to the next one, Ctrl+1 goes Home.
  useEffect(() => {
    if (standaloneId) return;
    const k = e => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const t = tabsRef.current, ids = ['home', ...t.list];
      if (e.key.toLowerCase() === 'w') {
        if (t.active !== 'home') { e.preventDefault(); if (tabClose.current) tabClose.current(); else closeTab(t.active); }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const i = ids.indexOf(t.active);
        setActiveTab(ids[(i + (e.shiftKey ? -1 : 1) + ids.length) % ids.length]);
      } else if (e.key === '1') { e.preventDefault(); setActiveTab('home'); }
    };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, []);
  const patch = (id, p) => {
    const t = tasksRef.current[id]; if (!t) return;
    const auto = automate({ ...t, ...p }, t);
    saveMany([auto.task, ...auto.created]);
    notifyAuto(auto);
  };

  /* ---- documents ---- */
  // Documents: from tasks, archived tasks, and files whose task is gone ("No task").
  // The document library: every file once, with the tasks it's linked to (many to many).
  const docs = useMemo(() => {
    const map = new Map();
    const add = (f, link) => { if (!map.has(f.id)) map.set(f.id, { ...f, links: [] }); if (link) map.get(f.id).links.push(link); };
    all.forEach(t => (t.files || []).forEach(f => add(f, { task: t })));
    Object.values(archived).forEach(t => (t.files || []).forEach(f => add(f, { task: t, archived: true })));
    looseDocs.forEach(f => add(f, null));
    return [...map.values()];
  }, [all, archived, looseDocs]);
  const [linkFor, setLinkFor] = useState(null);
  const [docDelete, setDocDelete] = useState(null);
  const stripMeta = f => { const { links, task, archived: _a, ...meta } = f; return meta; };
  // Removing a document from a task only unlinks it; if nothing else uses it, it stays in Documents as "Not linked".
  const unlinkDoc = (file, taskId) => {
    const t = tasksRef.current[taskId]; if (!t) return;
    saveMany([{ ...t, files: (t.files || []).filter(x => x.id !== file.id) }]);
    const elsewhere = [...Object.values(tasksRef.current).filter(o => o.id !== taskId), ...Object.values(archived), ...Object.values(trash)].some(o => (o.files || []).some(x => x.id === file.id));
    if (!elsewhere) saveLooseDocs(l => l.some(x => x.id === file.id) ? l : [...l, stripMeta(file)]);
    toast('Document unlinked', `“${file.name}” stays in Documents.`, { undo: true });
  };
  const [attachDoc, setAttachDoc] = useState(null);
  // Search extras: archived tasks, and tasks in your other workspaces.
  const [incArchived, setIncArchived] = useState(false);
  const [allWs, setAllWs] = useState(false);
  const [otherWs, setOtherWs] = useState({});
  useEffect(() => {
    if (!allWs) return;
    workspaces.filter(w => w.id !== ws && !otherWs[w.id]).forEach(w => {
      invoke('read_store', { name: storeFor('data', w.id) })
        .then(raw => setOtherWs(o => ({ ...o, [w.id]: raw ? Object.values(JSON.parse(raw).tasks || {}) : [] })))
        .catch(() => setOtherWs(o => ({ ...o, [w.id]: [] })));
    });
  }, [allWs]);
  const matchQ = t => { const q = norm(query); return q && [t.title, t.description, t.assignee, t.project, t.bucket, ...(t.checklist || []).map(c => c.text), ...(t.files || []).map(f => f.name)].some(v => norm(v).includes(q)); };
  const extraResults = query ? [
    ...(incArchived ? [{ key: 'archive', title: 'In the archive', items: Object.values(archived).filter(matchQ), onPick: () => setView('archive') }] : []),
    ...(allWs ? workspaces.filter(w => w.id !== ws).map(w => ({ key: w.id, title: `In ${w.name}`, items: (otherWs[w.id] || []).filter(matchQ), onPick: t => onSwitchWorkspace(w.id, t.id) })) : []),
  ] : [];
  // Opening a task found in another workspace: switch, then open it.
  useEffect(() => { if (loaded && openOnLoad && tasksRef.current[openOnLoad]) openTask(openOnLoad); }, [loaded]);
  // A file can be shared by a task and its automatic follow-up, so it's only deleted when no task uses it.
  const deleteIfUnused = (id, excludeIds) => { // id: the document record
    const used = [...Object.values(tasksRef.current), ...Object.values(archived), ...Object.values(trash)].some(o => !excludeIds.includes(o.id) && (o.files || []).some(x => x.id === id.id))
      || looseDocs.some(x => x.id === id.id && excludeIds.length);
    if (!used) deleteDoc(id);
  };
  const uploadMany = async files => {
    const bad = files.filter(f => !ALLOWED.includes(extOf(f.name)));
    const big = files.filter(f => ALLOWED.includes(extOf(f.name)) && f.size > MAX_FILE);
    const ok = files.filter(f => ALLOWED.includes(extOf(f.name)) && f.size <= MAX_FILE);
    if (bad.length) toast(bad.length === 1 ? `“${bad[0].name}” isn’t a supported file type` : `${bad.length} files aren’t a supported type`, 'Use PDF, Word (.docx), HTML, Excel, PowerPoint, images, text or zip. Save old .doc files as .docx first.');
    if (big.length) toast(big.length === 1 ? `“${big[0].name}” is too large` : `${big.length} files are too large`, 'Each file can be up to 200 MB.');
    if (!ok.length) return [];
    setBusy(true);
    const metas = [];
    for (const f of ok) {
      try { metas.push(await importDoc(f)); }
      catch (e) { toast(`Couldn’t add “${f.name}”`, String(e)); }
    }
    setBusy(false);
    return metas;
  };
  const attach = (taskId, metas) => {
    const t = tasksRef.current[taskId]; if (!t) return;
    const auto = automate({ ...t, files: [...(t.files || []), ...metas] }, t);
    saveMany([auto.task, ...auto.created]);
    notifyAuto(auto);
    toast(metas.length === 1 ? 'Document linked' : `${metas.length} documents linked`, t.title);
  };
  const submitDocs = async (files, { target, project }) => {
    const metas = await uploadMany(files);
    if (!metas.length) return;
    if (target === '__new') {
      const now = Date.now();
      saveMany(metas.flatMap((m, i) => {
        const auto = automate({
          id: newId(), title: m.name.replace(/\.[^.]+$/, ''), status: 'todo', assignee: me.name || '', deadline: '', description: '',
          project, priority: 'normal', checklist: [], files: [m], createdAt: now + i, timeSpent: 0, timerStartedAt: null,
        }, null);
        return [auto.task, ...auto.created];
      }));
      toast(metas.length === 1 ? 'Document added as a new task' : `${metas.length} documents added as new tasks`, 'Open a task to add details.');
    } else attach(target, metas);
    setAddDocs({ open: false, files: [] });
  };
  const doRemoveFile = () => {
    const { file, taskId } = fileConfirm; setFileConfirm(null);
    if (!taskId) { saveLooseDocs(l => l.filter(x => x.id !== file.id)); deleteIfUnused(file, []); toast('Document deleted', file.name); return; }
    const t = tasksRef.current[taskId]; if (!t) return;
    saveMany([{ ...t, files: (t.files || []).filter(x => x.id !== file.id) }]);
    deleteIfUnused(file, [taskId]);
    toast('Document removed', file.name);
  };
  // Files dragged onto the window (from WhatsApp, File Explorer…) arrive as file paths.
  const dropState = useRef({}); dropState.current = { sheetOpen: sheet.open, addOpen: addDocs.open, tab: tabs.active };
  useEffect(() => {
    let un = null, dead = false;
    getCurrentWebview().onDragDropEvent(async ev => {
      const p = ev.payload;
      if (p.type === 'enter' || p.type === 'over') setDragOver(true);
      else if (p.type === 'leave') setDragOver(false);
      else if (p.type === 'drop') {
        setDragOver(false);
        if (!p.paths || !p.paths.length) return;
        let infos = [];
        try { infos = await fileInfos(p.paths); } catch (e) {}
        if (!infos.length) return;
        const s = dropState.current;
        if (s.addOpen) setAddDocs(a => ({ ...a, files: [...a.files, ...infos] }));
        else if (s.sheetOpen && sheetDrop.current) sheetDrop.current(infos);
        else if (s.tab !== 'home' && tabDrop.current) tabDrop.current(infos);
        else setAddDocs({ open: true, files: infos });
      }
    }).then(f => { if (dead) f(); else un = f; });
    return () => { dead = true; try { un && un(); } catch (e) {} };
  }, []);

  /* ---- account & data ---- */
  const backup = async () => {
    const dest = await saveDialog({ defaultPath: `Tasks backup ${toISO(new Date())}.zip`, filters: [{ name: 'Backup', extensions: ['zip'] }] });
    if (!dest) return;
    try { await flushAll(); await invoke('backup', { dest }); toast('Backup saved', dest); }
    catch (e) { toast('Backup failed', String(e)); }
  };
  const chooseRestore = async () => {
    const src = await openDialog({ multiple: false, filters: [{ name: 'Backup', extensions: ['zip'] }] });
    if (src) setRestoreSrc(Array.isArray(src) ? src[0] : src);
  };
  const doRestore = async () => {
    const src = restoreSrc; setRestoreSrc(null);
    try { await flushAll(); await invoke('restore', { src }); window.location.reload(); }
    catch (e) { toast('Restore failed', String(e)); }
  };

  const duplicate = id => {
    const t = tasks[id]; if (!t) return;
    const c = {
      id: newId(), title: `${t.title} (copy)`, description: t.description || '', assignee: t.assignee || '', deadline: t.deadline || '',
      project: t.project || '', bucket: t.bucket || '', files: t.files || [], priority: t.priority || 'normal', checklist: (t.checklist || []).map(i => ({ ...i, id: newId(), done: false })),
      status: 'todo', createdAt: Date.now(), timeSpent: 0, timerStartedAt: null,
    };
    const auto = automate(c, null);
    saveMany([auto.task, ...auto.created]); openTask(c.id); toast('Task duplicated', 'Edit the copy, then save.');
  };
  useEffect(() => {
    const k = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      if (document.querySelector('[role=dialog],[role=alertdialog]') || standaloneId) return;
      if ((e.key === 'n' || e.key === 'N') && tabsRef.current.active === 'home') { e.preventDefault(); if (primaryRef.current) primaryRef.current.run(); }
      else if (e.key === '/') { e.preventDefault(); setSearchOpen(true); setTimeout(() => searchRef.current && searchRef.current.focus(), 0); }
      else if (e.key === '?') { e.preventDefault(); setKeysOpen(true); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);
  const sheetTask = sheet.id ? all.find(t => t.id === sheet.id) : null;
  const [searchOpen, setSearchOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [docFocus, setDocFocus] = useState(null);
  const toggleTheme = () => {
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches, cur = readTheme();
    const next = cur === 'dark' || (cur === 'system' && sysDark) ? 'light' : 'dark';
    saveTheme(next); applyTheme(next); window.dispatchEvent(new CustomEvent('tasks-theme', { detail: next }));
  };
  const paletteItems = !paletteOpen ? [] : [
    { id: 'a-task', group: 'Actions', label: 'Create task', hint: 'N', icon: <I.plus />, run: () => { setView('tasks'); createTask(); } },
    { id: 'a-bucket', group: 'Actions', label: `Create ${labels.bucket.toLowerCase()}`, icon: <I.layers />, run: () => { setView('projects'); setBucketEdit({ bucket: null }); } },
    { id: 'a-docs', group: 'Actions', label: 'Add documents', icon: <I.upload />, run: () => setAddDocs({ open: true, files: [] }) },
    ...(running ? [{ id: 'a-pause', group: 'Actions', label: `Pause timer: ${running.title || 'Untitled'}`, icon: <I.pause />, run: () => toggleTimer(running.id) }] : []),
    { id: 'v-tasks', group: 'Actions', label: 'Go to Tasks', icon: <I.listCheck />, run: () => { setActiveTab('home'); setView('tasks'); } },
    { id: 'v-buckets', group: 'Actions', label: `Go to ${plural(labels.bucket)}`, icon: <I.layers />, run: () => { setActiveTab('home'); setView('projects'); } },
    { id: 'v-docs', group: 'Actions', label: 'Go to Documents', icon: <I.file />, run: () => { setActiveTab('home'); setView('docs'); } },
    { id: 'v-table', group: 'Actions', label: 'Table view', icon: <I.table />, run: () => { setView('tasks'); setViewMode('table'); } },
    { id: 'v-list', group: 'Actions', label: 'List view', icon: <I.rows />, run: () => { setView('tasks'); setViewMode('list'); } },
    { id: 'v-board', group: 'Actions', label: 'Board view', icon: <I.kanban />, run: () => { setView('tasks'); setViewMode('board'); } },
    ...workspaces.filter(w => w.id !== ws).map(w => ({ id: 'ws-' + w.id, group: 'Actions', label: `Switch to ${w.name}`, keywords: 'workspace', icon: <I.layers />, run: () => onSwitchWorkspace(w.id) })),
    { id: 'a-archive', group: 'Actions', label: 'Open Archive', icon: <I.clipboard />, run: () => setView('archive') },
    { id: 'a-trash', group: 'Actions', label: 'Open Trash', icon: <I.trash />, run: () => setView('trash') },
    { id: 'a-auto', group: 'Actions', label: 'Automations', icon: <I.zap />, run: () => setRulesOpen(true) },
    { id: 'a-status', group: 'Actions', label: 'Edit statuses', icon: <I.sliders />, run: () => setStatusesOpen(true) },
    { id: 'a-plat', group: 'Actions', label: `Manage ${plural(labels.platform).toLowerCase()}`, icon: <I.folder />, run: () => setPlatformsOpen(true) },
    { id: 'a-theme', group: 'Actions', label: 'Switch light and dark mode', hint: 'Shift+D', icon: <I.moon />, run: toggleTheme },
    { id: 'a-undo', group: 'Actions', label: 'Undo', hint: 'Ctrl+Z', icon: <I.reset />, run: doUndo },
    { id: 'a-redo', group: 'Actions', label: 'Redo', hint: 'Ctrl+Shift+Z', icon: <I.reset />, run: doRedo },
    { id: 'a-backup', group: 'Actions', label: 'Back up data…', icon: <I.download />, run: backup },
    { id: 'a-keys', group: 'Actions', label: 'Keyboard shortcuts', hint: '?', icon: <I.keyboard />, run: () => setKeysOpen(true) },
    ...all.map(t => ({ id: 't-' + t.id, group: 'Tasks', label: t.title || 'Untitled', hint: [statusLabel(t, stages), t.bucket, t.project].filter(Boolean).join(', '), keywords: t.assignee, icon: <span className={cn('ml-1 mr-1 size-2 rounded-full', STATUS_COLORS[statusDef(t, stages).color])} />, run: () => openTask(t.id) })),
    ...bucketList.map(b => ({ id: 'b-' + b.name, group: 'Buckets', groupLabel: plural(labels.bucket), label: b.name, icon: <I.layers />, run: () => openBucket(b.name) })),
    ...docs.map(d => ({ id: 'd-' + d.id, group: 'Documents', label: d.name, hint: d.links.length ? d.links.map(l => l.task.title).filter(Boolean).slice(0, 2).join(', ') : 'Not linked', icon: <I.file />, run: () => { setActiveTab('home'); setView('docs'); setDocFocus(d.id); } })),
  ];
  const primary = view === 'tasks' ? { label: 'Create task', run: () => createTask() }
    : view === 'projects' ? { label: `Create ${labels.bucket.toLowerCase()}`, run: () => setBucketEdit({ bucket: null }) }
    : view === 'docs' ? { label: 'Add documents', run: () => setAddDocs({ open: true, files: [] }) } : null;
  const primaryRef = useRef(primary); primaryRef.current = primary;
  const popOut = () => { const t = sheetTask; setSheet({ open: false, id: null }); if (t) openTaskWindow(t.id, t.title || 'Untitled', ws); };
  const sheetToTab = () => { const id = sheet.id; setSheet({ open: false, id: null }); if (id) openTab(id); };
  const onSheetMode = m => { chooseMode(m); if (m === 'tab') sheetToTab(); };
  const tabTask = tabs.active !== 'home' ? all.find(t => t.id === tabs.active) : null;
  // In a task's own window: keep the title bar in step, and close the window when the task is closed or deleted.
  useEffect(() => {
    if (!standaloneId) return;
    if (loaded && (!sheet.open || !sheetTask)) { flushAll().then(() => getCurrentWindow().close()).catch(() => {}); return; }
    if (sheetTask) getCurrentWindow().setTitle(sheetTask.title || 'Untitled').catch(() => {});
  }, [standaloneId, loaded, sheet.open, sheetTask && sheetTask.title, !!sheetTask]);
  if (!loaded) return <div className="p-8 text-sm text-muted-foreground">Loading your tasks…</div>;

  if (standaloneId) return (
    <>
      <TaskSheet mode={standaloneId ? 'window' : openMode === 'tab' ? 'side' : openMode} onMode={onSheetMode} onPopOut={popOut} onNewTab={sheetToTab} open={sheet.open} task={sheetTask} people={people} stages={stages} labels={labels} buckets={bucketNames} defaultAssignee={me.name} dropRef={sheetDrop} projects={projects} rules={rules} defaultProject={projectFilter !== 'all' && projectFilter !== 'none' ? projectFilter : ''} allTasks={all} onOpen={id => openTask(id)} onPatch={patch} onClose={closeSheet}
        onSave={saveSheet} onDiscardEmpty={discardEmpty} onDelete={() => setConfirmId(sheet.id)} onToggle={toggleTimer} onReset={resetTimer}
        storageOk={storageOk} busy={busy} onUpload={uploadMany} onAttach={attach} onPreview={setPreview} onDownload={downloadFile}
        onRemoveFile={(file, taskId) => unlinkDoc(file, taskId)} onLinkExisting={id => setLinkFor(id)} onDiscard={fs => fs.forEach(f => deleteIfUnused(f, []))} />
      <PreviewDialog file={preview} onClose={() => setPreview(null)} onDownload={downloadFile} />
      <AlertDialog open={!!confirmId} title="Move this task to the Trash?"
        description={`“${(tasks[confirmId] || {}).title || 'Untitled'}” goes to the Trash, where you can restore it for ${TRASH_DAYS} days. After that it’s deleted for good. Its documents are kept.`}
        confirmLabel="Move to Trash" onConfirm={doDelete} onCancel={() => setConfirmId(null)} />
      <AlertDialog open={!!fileConfirm} title="Remove this document?"
        description={fileConfirm ? (fileConfirm.taskId ? `“${fileConfirm.file.name}” will be removed from this task.` : `“${fileConfirm.file.name}” will be deleted from this computer’s copy of your documents.`) : ''}
        confirmLabel={fileConfirm && !fileConfirm.taskId ? 'Delete document' : 'Remove document'} onConfirm={doRemoveFile} onCancel={() => setFileConfirm(null)} />
      {cellEdit && null}
    </>
  );

  return (
    <div className="flex h-screen flex-col">
      <TabStrip list={tabs.list} active={tabs.active} tasks={tasks} stages={stages}
        onSelect={setActiveTab} onNew={() => createTask({ tab: true })}
        onClose={id => { if (id === tabs.active && tabClose.current) tabClose.current(); else closeTab(id); }} />
      {tabs.active !== 'home' && tabTask ? (
        <TaskSheet key={tabTask.id} mode="tab" open task={tabTask} closeRef={tabClose} dropRef={tabDrop}
          onHome={() => setActiveTab('home')} onClose={() => closeTab(tabTask.id)}
          onPopOut={() => { const t = tabTask; closeTab(t.id); openTaskWindow(t.id, t.title || 'Untitled', ws); }}
          people={people} stages={stages} labels={labels} buckets={bucketNames} projects={projects} rules={rules} allTasks={all} onOpen={id => openTab(id)} onPatch={patch}
          onSave={saveSheet} onDiscardEmpty={discardEmpty} onDelete={() => setConfirmId(tabTask.id)} onToggle={toggleTimer} onReset={resetTimer}
          storageOk={storageOk} busy={busy} onUpload={uploadMany} onAttach={attach} onPreview={setPreview} onDownload={downloadFile}
          onRemoveFile={(file, taskId) => unlinkDoc(file, taskId)} onLinkExisting={id => setLinkFor(id)} onDiscard={fs => fs.forEach(f => deleteIfUnused(f, []))} />
      ) : (<>
      {/* Elevated top bar: workspace, sections as underlined tabs, tools and the main action */}
      <div className="shrink-0 border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4 md:px-6">
          <div className="flex min-w-0 shrink-0 items-center">
          <DropdownMenu align="start"
            trigger={p => (
              <button {...p} type="button" aria-label="Switch workspace" className="-ml-1.5 flex min-w-0 items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><I.check className="size-4" /></span>
                <span className="truncate text-[15px] font-semibold tracking-tight">{wsName}</span>
                <I.down className="size-4 shrink-0 text-muted-foreground" />
              </button>
            )}
            items={[
              ...workspaces.map(w => ({ label: w.name, icon: <I.layers />, shortcut: w.id === ws ? '✓' : undefined, onSelect: () => { if (w.id !== ws) onSwitchWorkspace(w.id); } })),
              'sep',
              { label: 'Rename workspace…', icon: <I.pencil />, onSelect: () => setWsRename(true) },
            ]} />
          </div>
          <nav aria-label="Sections" className="flex h-full items-stretch gap-5">
            {[{ id: 'tasks', label: 'Tasks', count: all.length }, { id: 'projects', label: plural(labels.bucket), count: bucketList.length }, { id: 'docs', label: 'Documents', count: docs.length }].map(v => (
              <button key={v.id} type="button" onClick={() => setView(v.id)} aria-current={view === v.id ? 'page' : undefined}
                className={cn('-mb-px inline-flex items-center gap-1.5 border-b-2 px-0.5 text-sm transition-colors focus-visible:outline-none focus-visible:text-foreground',
                  view === v.id ? 'border-foreground font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                {v.label}<span className="tnum text-[11px] font-normal text-muted-foreground">{v.count}</span>
              </button>
            ))}
          </nav>
          <div className="ml-auto flex min-w-0 items-center gap-2">
          {running && (
            <div className="flex min-w-0 items-center gap-2 rounded-full border bg-card py-1 pl-3 pr-1 text-xs" role="status">
              <span className="relative flex size-2 shrink-0">
                <span className="anim-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <button type="button" onClick={() => openTask(running.id)} title={running.title}
                className="hidden max-w-[12rem] truncate text-muted-foreground hover:text-foreground hover:underline underline-offset-4 min-[1440px]:block">{running.title || 'Untitled'}</button>
              <span className="tnum font-semibold">{fmt(elapsed(running))}</span>
              <button type="button" onClick={() => toggleTimer(running.id)} aria-label="Pause timer"
                className="flex size-6 items-center justify-center rounded-full hover:bg-muted"><I.pause className="size-3" /></button>
            </div>
          )}
          {searchOpen || query ? (
            <div className="relative w-56">
              <I.search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input ref={searchRef} autoFocus value={query} onChange={e => { setQuery(e.target.value); if (view !== 'tasks') setView('tasks'); }} placeholder="Search all tasks" aria-label="Search all tasks"
                className="h-9 rounded-full bg-background pl-9 pr-9 shadow-none"
                onBlur={() => { if (!query) setSearchOpen(false); }}
                onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setQuery(''); setSearchOpen(false); e.currentTarget.blur(); } }} />
              {query && <button type="button" onClick={() => { setQuery(''); setSearchOpen(false); }} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm opacity-60 hover:opacity-100"><I.x /></button>}
            </div>
          ) : (
            <Button variant="outline" size="icon" className="rounded-full bg-card shadow-none" aria-label="Search (/)" title="Search (/)" onClick={() => setSearchOpen(true)}><I.search /></Button>
          )}
          <ThemeToggle />
          <DropdownMenu
            trigger={p => <Button {...p} variant="outline" size="icon" className="rounded-full bg-card shadow-none" aria-label="More tools"><I.more /></Button>}
            items={[
              { label: 'Automations', icon: <I.zap />, shortcut: `${rules.filter(r => r.enabled).length} on`, onSelect: () => setRulesOpen(true) },
              { label: `Manage ${plural(labels.platform).toLowerCase()}`, icon: <I.folder />, onSelect: () => setPlatformsOpen(true) },
              { label: 'Archive', icon: <I.clipboard />, shortcut: String(Object.keys(archived).length), onSelect: () => setView('archive') },
              { label: 'Trash', icon: <I.trash />, shortcut: String(Object.keys(trash).length), onSelect: () => setView('trash') },
              'sep',
              { label: 'Edit statuses', icon: <I.sliders />, onSelect: () => setStatusesOpen(true) },
              { label: showSummary ? 'Hide time summary' : 'Show time summary', icon: <I.chart />, onSelect: () => setShowSummary(v => !v) },
              { label: 'Keyboard shortcuts', icon: <I.keyboard />, shortcut: '?', onSelect: () => setKeysOpen(true) },
            ]} />
          <DropdownMenu
            trigger={p => (
              <button {...p} type="button" aria-label="Your account" className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar name={me.name} picture={me.picture} className="h-9 w-9 bg-card ring-1 ring-border" />
              </button>
            )}
            items={[
              { label: 'Profile', icon: <I.user />, onSelect: () => setProfileOpen(true) },
              'sep',
              { label: 'Back up data…', icon: <I.download />, onSelect: backup },
              { label: 'Restore from backup…', icon: <I.upload />, onSelect: chooseRestore },
              { label: 'Open data folder', icon: <I.folder />, onSelect: () => invoke('open_data_folder').catch(e => toast('Couldn’t open the folder', String(e))) },
              'sep',
              { label: 'Check for updates', icon: <I.reset />, shortcut: up.version ? `v${up.version}` : undefined, onSelect: () => up.look(true) },
            ]} />
          {primary && <Button className="shrink-0 shadow-none" onClick={primary.run}><I.plus />{primary.label}</Button>}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 md:px-6">
      {view === 'tasks' && (
        <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-lg font-semibold tracking-tight">Tasks</h1>
          <span className="text-sm text-muted-foreground">{query ? `Searching for “${query}”` : `${overview.open} open${viewMode === 'list' ? `, grouped by ${(labels[groupBy === 'project' ? 'platform' : groupBy] || '').toLowerCase()}` : ''}`}</span>
        </div>
      )}

      {view === 'projects' ? (
        <BucketsView list={bucketList} tasks={all} noun={labels.bucket} onNew={() => setBucketEdit({ bucket: null })} onEdit={b => setBucketEdit({ bucket: b })}
          onDelete={b => setBucketDelete(b)} onOpen={n => openBucket(n === 'none' ? 'none' : n)} />
      ) : view === 'archive' ? (
        <ArchiveView items={archived} labels={labels} days={settings.archiveDays} onDays={d => saveSettings(x => ({ ...x, archiveDays: d }))}
          onRestore={id => { restoreTask(id); toast('Task restored'); }} onTrash={id => { trashTasks([id]); toast('Moved to Trash', undefined, { undo: true }); }} onCleanUp={() => setCleanUpOpen(true)} />
      ) : view === 'trash' ? (
        <TrashView items={trash} onRestore={id => { restoreTask(id); toast('Task restored'); }} onDeleteNow={t => setPurgeConfirm([t.id])} onEmpty={() => setPurgeConfirm(Object.keys(trash))} />
      ) : view === 'docs' ? (
        <DocumentsView docs={docs} tasks={all} focusId={docFocus} dragOver={dragOver && !sheet.open && !addDocs.open} onAdd={fs => setAddDocs({ open: true, files: fs })} onDownload={downloadFile}
          onRemove={(file, taskId) => unlinkDoc(file, taskId)} onDelete={f => setDocDelete(f)} onOpenTask={(id, isArchived) => { if (isArchived) setView('archive'); else openTask(id); }}
          onAttach={f => setAttachDoc(f)} />
      ) : (<>
      {showSummary && <TimeSummary tasks={all} onHide={() => setShowSummary(false)} />}

      {/* Status chips and the view switch; below, filters and a one-line summary */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {[{ id: 'open', label: 'Open', count: counts.open }, ...STATUSES.map(st => ({ id: st.id, label: GROUP_HEAD[st.id], count: counts[st.id], dot: st.dot })), { id: 'all', label: 'All', count: counts.all }].map(c => (
          <button key={c.id} type="button" onClick={() => { setFilter(c.id); if (query) setQuery(''); }} aria-pressed={filter === c.id && !query}
            className={cn('inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              filter === c.id && !query ? 'border-foreground/25 bg-card font-medium text-foreground' : 'bg-transparent text-muted-foreground hover:border-foreground/20 hover:text-foreground')}>
            {c.dot && <span className={cn('size-1.5 rounded-full', c.dot)} />}{c.label}<span className="tnum opacity-70">{c.count}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          {viewMode === 'table' && (
            <Popover align="end" className="w-56 p-1"
              trigger={p => <button {...p} type="button" aria-label="Show or hide columns" title="Columns"
                className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"><I.sliders className="size-3.5" />Columns{cols.hidden.length ? <span className="tnum">({cols.hidden.length} hidden)</span> : null}</button>}>
              <div className="px-2 py-1.5 text-xs text-muted-foreground">Show columns</div>
              {TABLE_COLS.filter(c => c.key !== 'task').map(c => (
                <label key={c.key} className="flex h-8 cursor-default items-center gap-2.5 rounded-sm px-2 text-sm hover:bg-accent">
                  <Checkbox checked={!cols.hidden.includes(c.key)} onChange={v => hideCol(c.key, !v)} label={labels[c.key]} />{labels[c.key]}
                </label>
              ))}
              <div className="mx-1 my-1 h-px bg-border" />
              <button type="button" onClick={() => setCols({ widths: {}, hidden: [] })} className="flex h-8 w-full items-center rounded-sm px-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground">Show all and reset widths</button>
            </Popover>
          )}
          <div role="group" aria-label="View" className="flex gap-0.5 rounded-lg bg-muted p-0.5">
          {[['table', 'Table', <I.table />], ['list', 'List', <I.rows />], ['board', 'Board', <I.kanban />]].map(([id, label, icon]) => (
            <button key={id} type="button" aria-pressed={viewMode === id} aria-label={`${label} view`} title={label} onClick={() => setViewMode(id)}
              className={cn('flex h-6 w-8 items-center justify-center rounded-md transition-colors [&_svg]:size-3.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                viewMode === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{icon}</button>
          ))}
        </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Select variant="chip" label={`Filter by ${labels.bucket.toLowerCase()}`} value={bucketFilter} onChange={setBucketFilter}
          className={bucketFilter !== 'all' ? 'border-foreground/25 font-medium text-foreground' : ''}
          icon={<I.layers className="size-3.5 shrink-0" />}
          options={[
            { value: 'all', label: `All ${plural(labels.bucket).toLowerCase()}` },
            ...bucketNames.map(b => ({ value: b, label: b, icon: <I.layers className="size-3.5 text-muted-foreground" /> })),
            { value: 'none', label: `No ${labels.bucket.toLowerCase()}`, divider: true, node: <span className="text-muted-foreground">No {labels.bucket.toLowerCase()}</span> },
          ]}
          footer={close => (
            <button type="button" onClick={() => { close(); setView('projects'); }}
              className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
              <I.sliders className="size-3.5" />Manage {plural(labels.bucket).toLowerCase()}
            </button>
          )} />
        <Select variant="chip" label={`Filter by ${labels.platform.toLowerCase()}`} value={projectFilter} onChange={setProjectFilter}
          className={projectFilter !== 'all' ? 'border-foreground/25 font-medium text-foreground' : ''}
          icon={<I.folder className="size-3.5 shrink-0" />}
          options={[
            { value: 'all', label: `All ${plural(labels.platform).toLowerCase()}` },
            ...projects.map(p => ({ value: p, label: p, icon: <I.folder className="size-3.5 text-muted-foreground" />, divider: false })),
            { value: 'none', label: `No ${labels.platform.toLowerCase()}`, divider: true, node: <span className="text-muted-foreground">No {labels.platform.toLowerCase()}</span> },
          ]}
          footer={close => (
            <button type="button" onClick={() => { close(); setPlatformsOpen(true); }}
              className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
              <I.sliders className="size-3.5" />Manage {plural(labels.platform).toLowerCase()}
            </button>
          )} />
        <Select variant="chip" label="Sort by" value={sortBy} onChange={setSortBy} searchable={false}
          icon={<I.updown className="size-3.5 shrink-0" />}
          renderValue={o => <span className="truncate">Sort: {o.label}</span>}
          options={[['deadline', labels.deadline], ['priority', labels.priority], ['created', 'Newest'], ['status', labels.status], ['bucket', labels.bucket], ['assignee', labels.assignee], ['project', labels.platform]].map(([value, label]) => ({ value, label }))} />
        {viewMode === 'list' && (
          <Select variant="chip" label="Group by" value={groupBy} onChange={setGroupBy} searchable={false}
            icon={<I.rows className="size-3.5 shrink-0" />}
            renderValue={o => <span className="truncate">Group: {o.label}</span>}
            options={GROUP_OPTIONS.map(k => ({ value: k, label: labels[k === 'project' ? 'platform' : k] }))} />
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {query ? (
            <span className="inline-flex flex-wrap items-center gap-3">
              <span>{shown.length} found</span>
              <label className="inline-flex items-center gap-1.5"><Checkbox checked={incArchived} onChange={setIncArchived} label="Include archived" />Include archived</label>
              {workspaces.length > 1 && <label className="inline-flex items-center gap-1.5"><Checkbox checked={allWs} onChange={setAllWs} label="All workspaces" />All workspaces</label>}
            </span>
          ) : <>{overview.week} due this week</>}
          {!query && overview.overdue > 0 && <>, <span className="font-medium text-red-600 dark:text-red-400">{overview.overdue} overdue</span></>}
        </span>
      </div>

      {showSummary && <TimeSummary tasks={all} onHide={() => setShowSummary(false)} />}

      {viewMode === 'list' && all.length > 0 ? (
        <ListView tasks={shown} stages={stages} labels={labels} groupBy={groupBy} onOpen={openFromView} onToggle={toggleTimer} onAdd={preset => createTask({ preset })} />
      ) : viewMode === 'board' && all.length > 0 ? (
        <BoardView tasks={!query && filter === 'open' ? scoped : shown} stages={stages} labels={labels} onOpen={openFromView} onToggle={toggleTimer} onMove={moveToColumn} onAdd={preset => createTask({ preset })} />
      ) : (
      <Card className="mt-3 overflow-hidden">
        {all.length === 0 ? (
          <Empty icon={<I.clipboard />} title="No tasks yet" description="Add one in the last row of the table, or use Create task to add an assignee, deadline and description.">
            <Button variant="outline" size="sm" onClick={createTask}><I.plus />Create task</Button>
          </Empty>
        ) : shown.length === 0 && query ? (
          <Empty icon={<I.search />} title={`No tasks match “${query}”`} description="Try a different word, or clear the search to see everything.">
            <Button variant="outline" size="sm" onClick={() => setQuery('')}>Clear search</Button>
          </Empty>
        ) : shown.length === 0 ? (
          <Empty icon={<I.clipboard />} title={filter === 'all' ? 'Nothing here yet' : filter === 'open' ? 'Nothing open' : `Nothing in ${GROUP_HEAD[filter].toLowerCase()}`} description="Try another filter or project to see the rest of your tasks.">
            <Button variant="outline" size="sm" onClick={() => { setFilter('all'); setProjectFilter('all'); }}>Show all tasks</Button>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-[13px]" style={{ minWidth: visibleCols.reduce((n, c) => n + (c.key === 'task' ? 320 : colW(c)), 36) }}>
              <colgroup>
                {visibleCols.map(c => <col key={c.key} style={c.key === 'task' ? undefined : { width: colW(c) }} />)}
                <col style={{ width: 36 }} />
              </colgroup>
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  {visibleCols.map(c => {
                    const icon = { task: <span className="text-[11px] font-semibold">Aa</span>, status: <I.loader />, bucket: <I.layers />, assignee: <I.user />, deadline: <I.calendar />, priority: <I.flag />, time: <I.timer /> }[c.key];
                    return (
                      <th key={c.key} className="relative h-8 border-r p-0 font-normal">
                        <DropdownMenu align="start"
                          trigger={p => (
                            <button {...p} type="button" title={`${labels[c.key]}: rename, hide or resize`}
                              className="flex h-8 w-full items-center gap-1.5 px-2.5 text-left hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:bg-muted/60 [&_svg]:size-3.5">
                              {icon}<span className="truncate">{labels[c.key]}</span>
                            </button>
                          )}
                          items={[
                            { label: 'Rename', icon: <I.pencil />, onSelect: () => setLabelEdit(c.key) },
                            ...(c.key === 'task' ? [] : [
                              { label: 'Hide column', icon: <I.eye />, onSelect: () => hideCol(c.key, true) },
                              ...(cols.widths[c.key] ? [{ label: 'Reset width', icon: <I.reset />, onSelect: () => setColWidth(c.key, null) }] : []),
                            ]),
                          ]} />
                        {c.key !== 'task' && (
                          <span role="separator" aria-orientation="vertical" aria-label={`Resize ${labels[c.key]}`} title="Drag to resize, double-click to reset"
                            onPointerDown={e => startResize(e, c)} onDoubleClick={() => setColWidth(c.key, null)}
                            className="absolute -right-1 top-0 z-10 h-full w-2 cursor-col-resize after:absolute after:inset-y-1 after:left-[3px] after:w-0.5 after:rounded after:bg-transparent hover:after:bg-foreground/30" />
                        )}
                      </th>
                    );
                  })}
                  <th className="h-8"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map(t => {
                  const d = due(t), on = !!t.timerStartedAt, done = t.status === 'done';
                  const blocker = t.status === 'blocked' && tasks[t.blockedBy];
                  const cell = 'h-[34px] border-r px-2.5 align-middle';
                  return (
                    <tr key={t.id} className={cn('group border-b transition-colors hover:bg-muted/40', on && 'bg-accent/60')}>
                      <td className={cn(cell, 'group/title')}>
                        {renaming === t.id ? (
                          <input autoFocus defaultValue={t.title} aria-label="Task title"
                            className="h-7 w-full rounded-md border bg-background px-1.5 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.stopPropagation(); setRenaming(null); } }}
                            onBlur={e => { const v = e.target.value.trim(); if (v && v !== t.title) updateTask(t.id, { title: v }); setRenaming(null); }} />
                        ) : (
                          <div className="flex min-w-0 items-center gap-2">
                            <I.file className="size-3.5 shrink-0 text-muted-foreground" />
                            <button type="button" title={t.title}
                              onClick={e => { if (e.ctrlKey || e.metaKey) openTab(t.id); else openTask(t.id); }}
                              onAuxClick={e => { if (e.button === 1) { e.preventDefault(); openTab(t.id); } }}
                              onMouseDown={e => { if (e.button === 1) e.preventDefault(); }}
                              className={cn('min-w-0 truncate text-left font-medium hover:underline underline-offset-4 focus-visible:outline-none focus-visible:underline', done && 'text-muted-foreground line-through', !t.title && 'font-normal text-muted-foreground')}>{t.title || 'Untitled'}</button>
                            {(() => {
                              const editing = cellEdit && cellEdit.id === t.id && cellEdit.field === 'project';
                              return t.project ? (
                                <button type="button" onClick={e => openCell(t.id, 'project', e.currentTarget)} title={`Change ${labels.platform.toLowerCase()}`}
                                  className={cn('inline-flex h-5 max-w-[11rem] shrink-0 items-center gap-1 rounded-md border bg-background px-1.5 text-[11px] text-foreground/75 transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', editing && 'border-foreground/30 bg-muted')}>
                                  <I.folder className="size-3 shrink-0 text-muted-foreground" /><span className="truncate">{t.project}</span>
                                </button>
                              ) : (
                                <button type="button" onClick={e => openCell(t.id, 'project', e.currentTarget)} title={`Add a ${labels.platform.toLowerCase()}`}
                                  className={cn('inline-flex h-5 shrink-0 items-center rounded-md border border-dashed px-1.5 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100 [@media(hover:none)]:opacity-100', editing && 'opacity-100')}>
                                  + {labels.platform}
                                </button>
                              );
                            })()}
                            <span className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                              {blocker && <button type="button" title={`Blocked by “${blocker.title}”`} onClick={() => openTask(t.blockedBy)} className="text-red-600 dark:text-red-400"><I.ban className="size-3" /></button>}
                              {(t.checklist || []).length > 0 && <span className="tnum inline-flex items-center gap-0.5" title="Checklist"><I.listCheck className="size-3" />{t.checklist.filter(c => c.done).length}/{t.checklist.length}</span>}
                              {(t.files || []).length > 0 && <span className="tnum inline-flex items-center gap-0.5" title="Documents"><I.paperclip className="size-3" />{t.files.length}</span>}
                              {t.generatedFrom && <span title="Created by an automation"><I.zap className="size-3" /></span>}
                            </span>
                            <button type="button" onClick={() => setRenaming(t.id)} aria-label={`Rename ${t.title}`} title="Rename"
                              className="ml-auto inline-flex size-6 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none group-hover/title:opacity-100 [@media(hover:none)]:opacity-100">
                              <I.pencil className="size-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      {[
                        ['status', <DefPill def={statusDef(t, stages)} />],
                        ['bucket', t.bucket
                          ? <span className="flex min-w-0 items-center gap-1.5"><I.layers className="size-3.5 shrink-0 text-muted-foreground/70" /><span className="truncate">{t.bucket}</span></span>
                          : <span className="text-muted-foreground/60">Empty</span>],
                        ['assignee', t.assignee
                          ? <span className="flex min-w-0 items-center gap-1.5"><Avatar name={t.assignee} className="h-5 w-5 [&_span]:text-[9px]" /><span className="truncate">{t.assignee}</span></span>
                          : <span className="text-muted-foreground/60">Empty</span>],
                        ['deadline', t.deadline ? <span className={cn('whitespace-nowrap', dueCls[d.tone])}>{d.text}</span> : <span className="text-muted-foreground/60">Empty</span>],
                        ['priority', <span className={cn(done && 'opacity-50')}><PriorityPill priority={t.priority} /></span>],
                      ].filter(([field]) => !cols.hidden.includes(field)).map(([field, content]) => {
                        const active = cellEdit && cellEdit.id === t.id && cellEdit.field === field;
                        return (
                          <td key={field} tabIndex={0} role="button" aria-label={`Change ${(labels[field] || field).toLowerCase()} of ${t.title || 'Untitled'}`}
                            onClick={e => openCell(t.id, field, e.currentTarget)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCell(t.id, field, e.currentTarget); } }}
                            className={cn(cell, 'cursor-pointer transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--ring))]', active && 'bg-muted/60 shadow-[inset_0_0_0_1px_hsl(var(--ring))]')}>
                            <div className="flex min-w-0 items-center">{content}</div>
                          </td>
                        );
                      })}
                      {!cols.hidden.includes('time') && <td className={cn(cell, 'px-1')}>
                        <button type="button" onClick={() => toggleTimer(t.id)} aria-label={`${on ? 'Pause' : 'Start'} timer for ${t.title}`}
                          className={cn('tnum inline-flex h-6 w-full items-center gap-1.5 rounded px-1.5 text-xs transition-colors hover:bg-muted', on ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                          {on ? <I.pause className="size-3" /> : <I.play className="size-3" />}{fmt(elapsed(t))}
                        </button>
                      </td>}
                      <td className="h-[34px] px-0.5 text-center">
                        <div className="opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                          <DropdownMenu
                            trigger={p => <Button {...p} variant="ghost" size="icon-sm" className="h-7 w-7" aria-label={`Actions for ${t.title}`}><I.more /></Button>}
                            items={[
                              { label: 'Open in new tab', icon: <I.tab />, shortcut: 'Ctrl+click', onSelect: () => openTab(t.id) },
                              { label: 'Open', icon: <I.pencil />, onSelect: () => openTask(t.id) },
                              { label: on ? 'Pause timer' : 'Start timer', icon: on ? <I.pause /> : <I.play />, onSelect: () => toggleTimer(t.id) },
                              ...(done ? [] : [{ label: 'Mark as done', icon: <I.check />, onSelect: () => markDone(t.id) }]),
                              { label: 'Duplicate', icon: <I.copy />, onSelect: () => duplicate(t.id) },
                              'sep',
                              { label: 'Delete', icon: <I.trash />, destructive: true, onSelect: () => setConfirmId(t.id) },
                            ]} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <form onSubmit={addQuick} className="flex h-9 items-center gap-2 px-2.5 text-[13px]" autoComplete="off">
          <I.plus className="size-3.5 text-muted-foreground" />
          <input value={quick} onChange={e => setQuick(e.target.value)} placeholder="New task" aria-label="New task title"
            className="h-8 min-w-0 flex-1 bg-transparent placeholder:text-muted-foreground focus-visible:outline-none" />
          {quick && <Kbd>Enter ↵</Kbd>}
        </form>
      </Card>
      )}
      {extraResults.map(r => (
        <div key={r.key} className="mt-4">
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">{r.title} ({r.items.length})</div>
          {r.items.length > 0 && (
            <Card className="divide-y overflow-hidden">
              {r.items.slice(0, 30).map(t => (
                <button key={t.id} type="button" onClick={() => r.onPick(t)} className="flex h-10 w-full items-center gap-3 px-4 text-left text-[13px] hover:bg-muted/50">
                  <span className={cn('size-2 shrink-0 rounded-full', STATUS_COLORS[statusDef(t, r.key === 'archive' ? stages : []).color])} />
                  <span className="min-w-0 flex-1 truncate font-medium">{t.title || 'Untitled'}</span>
                  {t.project && <span className="max-w-[10rem] truncate text-xs text-muted-foreground">{t.project}</span>}
                  <I.right className="size-3.5 text-muted-foreground" />
                </button>
              ))}
            </Card>
          )}
        </div>
      ))}
      </>)}

      </div>
      </div>
      </>)}

      <TaskSheet mode={standaloneId ? 'window' : openMode === 'tab' ? 'side' : openMode} onMode={onSheetMode} onPopOut={popOut} onNewTab={sheetToTab} open={sheet.open} task={sheetTask} people={people} stages={stages} labels={labels} buckets={bucketNames} defaultAssignee={me.name} dropRef={sheetDrop} projects={projects} rules={rules} defaultProject={projectFilter !== 'all' && projectFilter !== 'none' ? projectFilter : ''} allTasks={all} onOpen={id => openTask(id)} onPatch={patch} onClose={closeSheet}
        onSave={saveSheet} onDiscardEmpty={discardEmpty} onDelete={() => setConfirmId(sheet.id)} onToggle={toggleTimer} onReset={resetTimer}
        storageOk={storageOk} busy={busy} onUpload={uploadMany} onAttach={attach} onPreview={setPreview} onDownload={downloadFile}
        onRemoveFile={(file, taskId) => unlinkDoc(file, taskId)} onLinkExisting={id => setLinkFor(id)} onDiscard={fs => fs.forEach(f => deleteIfUnused(f, []))} />
      <AlertDialog open={!!confirmId} title="Move this task to the Trash?"
        description={`“${(tasks[confirmId] || {}).title || 'Untitled'}” goes to the Trash, where you can restore it for ${TRASH_DAYS} days. After that it’s deleted for good. Its documents are kept.`}
        confirmLabel="Move to Trash" onConfirm={doDelete} onCancel={() => setConfirmId(null)} />
      {cellEdit && tasks[cellEdit.id] && (
        <CellEditor key={cellEdit.id + cellEdit.field} edit={cellEdit} task={{ ...tasks[cellEdit.id], status: S[tasks[cellEdit.id].status] ? tasks[cellEdit.id].status : 'todo' }}
          ctx={{ update: updateTask, people, projects, buckets: bucketNames, ensureBucket, labels, stages, ensureProject, addStage, deleteStage, editStatuses: () => setStatusesOpen(true) }} onClose={() => setCellEdit(null)} />
      )}
      <StatusesDialog open={statusesOpen} stages={stages} tasks={all} onClose={() => setStatusesOpen(false)}
        onSave={list => { saveStages(list); setStatusesOpen(false); toast('Statuses saved'); }} />
      <ProjectDialog open={!!projectEdit} noun={labels.platform} project={projectEdit && projectEdit.project} names={projects} onClose={() => setProjectEdit(null)} onSave={saveProject} />
      <ProjectDialog open={!!bucketEdit} noun={labels.bucket} project={bucketEdit && bucketEdit.bucket} names={bucketNames} onClose={() => setBucketEdit(null)} onSave={saveBucket} />
      <AlertDialog open={!!bucketDelete} title={`Delete “${bucketDelete ? bucketDelete.name : ''}”?`}
        description={`The tasks stay; they just won’t have a ${labels.bucket.toLowerCase()} anymore.`}
        confirmLabel={`Delete ${labels.bucket.toLowerCase()}`} onConfirm={deleteBucket} onCancel={() => setBucketDelete(null)} />
      <PlatformsDialog open={platformsOpen} onClose={() => setPlatformsOpen(false)} list={projectList} tasks={all} noun={labels.platform}
        onNew={() => setProjectEdit({ project: null })} onEdit={p => setProjectEdit({ project: p })} onDelete={p => setProjectDelete(p)} />
      <NameDialog open={!!labelEdit} title="Rename column" value={labelEdit ? labels[labelEdit] : ''}
        defaultValue={labelEdit ? ({ ...LABEL_DEFAULTS, ...(WS_LABELS[ws] || {}) })[labelEdit] : ''}
        hint={`Used everywhere in ${wsName}: the table, filters and the task panel.`}
        onClose={() => setLabelEdit(null)} onSave={v => { saveLabels(l => ({ ...l, [labelEdit]: v })); setLabelEdit(null); }} />
      <NameDialog open={wsRename} title="Rename workspace" value={wsName} onClose={() => setWsRename(false)}
        onSave={v => { onRenameWorkspace(ws, v); setWsRename(false); }} />
      <CleanUpDialog open={cleanUpOpen} items={archived} onClose={() => setCleanUpOpen(false)}
        onConfirm={ids => { trashTasks(ids); setCleanUpOpen(false); toast(`${ids.length} ${ids.length === 1 ? 'task' : 'tasks'} moved to Trash`, `They’re deleted for good after ${TRASH_DAYS} days.`); }} />
      <AlertDialog open={!!purgeConfirm} title={purgeConfirm && purgeConfirm.length > 1 ? `Delete ${purgeConfirm.length} tasks for good?` : 'Delete this task for good?'}
        description="This can’t be undone. Their documents stay in Documents, marked “No task”."
        confirmLabel="Delete for good" onConfirm={() => { purgeTrash(purgeConfirm); setPurgeConfirm(null); toast('Deleted for good'); }} onCancel={() => setPurgeConfirm(null)} />
      <AlertDialog open={!!projectDelete} title={`Delete “${projectDelete ? projectDelete.name : ''}”?`}
        description={projectDelete ? (() => {
          const n = norm(projectDelete.name);
          const tc = all.filter(t => norm(t.project) === n).length;
          const rc = rules.filter(r => norm(r.project) === n || ((r.action === 'copy' || r.action === 'move') && norm(r.target) === n)).length;
          return `The tasks stay. ${tc ? `${tc} ${tc === 1 ? 'task moves' : 'tasks move'} to “No ${labels.platform.toLowerCase()}”. ` : ''}${rc ? `${rc} ${rc === 1 ? 'automation that uses' : 'automations that use'} this project will be removed.` : ''}`;
        })() : ''}
        confirmLabel="Delete project" onConfirm={deleteProject} onCancel={() => setProjectDelete(null)} />
      <AutomationsDialog open={rulesOpen} onClose={() => setRulesOpen(false)} rules={rules} projects={projects} people={people} me={me.name}
        onSave={list => { saveRules(list); setRulesOpen(false); toast('Automations saved'); }} />
      <ShortcutsDialog open={keysOpen} onClose={() => setKeysOpen(false)} />
      {paletteOpen && <CommandPalette open onClose={() => setPaletteOpen(false)} items={paletteItems} />}
      <AddDocsDialog open={addDocs.open} files={addDocs.files} setFiles={fn => setAddDocs(a => ({ ...a, files: typeof fn === 'function' ? fn(a.files) : fn }))} tasks={all} projects={projects} busy={busy}
        onClose={() => setAddDocs({ open: false, files: [] })} onSubmit={submitDocs} />
      <PreviewDialog file={preview} onClose={() => setPreview(null)} onDownload={downloadFile} />
      <AttachDocDialog file={attachDoc} tasks={all} onClose={() => setAttachDoc(null)}
        onAttach={(f, taskId) => { attach(taskId, [stripMeta(f)]); saveLooseDocs(l => l.filter(x => x.id !== f.id)); setAttachDoc(null); }} />
      <LinkDocsDialog taskId={linkFor} library={docs} linkedIds={linkFor && tasks[linkFor] ? (tasks[linkFor].files || []).map(f => f.id) : []} onClose={() => setLinkFor(null)}
        onLink={(taskId, picked) => { attach(taskId, picked.map(stripMeta)); const ids = picked.map(d => d.id); saveLooseDocs(l => l.filter(x => !ids.includes(x.id))); setLinkFor(null); }} />
      <AlertDialog open={!!docDelete} title={`Delete “${docDelete ? docDelete.name : ''}”?`}
        description={docDelete ? (docDelete.links.length ? `It will be removed from ${docDelete.links.length === 1 ? 'this task' : `these ${docDelete.links.length} tasks`}: ${docDelete.links.slice(0, 5).map(l => `“${l.task.title || 'Untitled'}”`).join(', ')}${docDelete.links.length > 5 ? ' and more' : ''}.` : 'It isn’t linked to any task.') : ''}
        confirmLabel="Delete document" onConfirm={() => { const f = docDelete; setDocDelete(null); deleteDocEverywhere(stripMeta(f)); toast('Document deleted', f.name, { undo: true }); }} onCancel={() => setDocDelete(null)} />
      <AlertDialog open={!!fileConfirm} title="Remove this document?"
        description={fileConfirm ? (fileConfirm.taskId ? `“${fileConfirm.file.name}” will be removed from this task.` : `“${fileConfirm.file.name}” will be deleted from this computer’s copy of your documents.`) : ''}
        confirmLabel={fileConfirm && !fileConfirm.taskId ? 'Delete document' : 'Remove document'} onConfirm={doRemoveFile} onCancel={() => setFileConfirm(null)} />
      {/* Update available: a small snackbar at the bottom left */}
      {up.update && (
        <div role="status" aria-live="polite"
          className="fixed left-4 z-[95] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-lg border bg-popover p-3 text-sm text-popover-foreground shadow-lg anim-toast"
          style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom,0px))' }}>
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted"><I.download className="size-3.5" /></span>
          <div className="min-w-0 flex-1">
            <div className="font-medium">Version {up.update.version} is ready</div>
            {up.update.body && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground" title={up.update.body}>{up.update.body}</div>}
            {up.progress === null ? (
              <div className="mt-2 flex gap-2">
                <Button size="sm" className="h-7 px-2.5" onClick={up.install}>Install and restart</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2.5" onClick={up.dismiss}>Later</Button>
              </div>
            ) : (
              <div className="mt-2">
                <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${up.progress === 'installing' ? 100 : up.progress === -1 ? 30 : up.progress}%` }} /></div>
                <div className="tnum mt-1 text-xs text-muted-foreground">{up.progress === 'installing' ? 'Installing…' : up.progress === -1 ? 'Downloading…' : `Downloading ${up.progress}%`}</div>
              </div>
            )}
          </div>
          {up.progress === null && <button type="button" onClick={up.dismiss} aria-label="Dismiss" className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"><I.x className="size-3.5" /></button>}
        </div>
      )}
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} prof={prof} />
      <AlertDialog open={!!restoreSrc} title="Restore from this backup?"
        description="Everything currently in the app (tasks, documents, automations and profile) will be replaced with the contents of the backup. Consider backing up first."
        confirmLabel="Replace and restore" onConfirm={doRestore} onCancel={() => setRestoreSrc(null)} />
      {dragOver && (
        <div className="pointer-events-none fixed inset-3 z-[95] flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-background/70 anim-fade">
          <div className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg">
            {sheet.open || tabs.active !== 'home' ? 'Drop to attach to this task' : addDocs.open ? 'Drop to add to the list' : 'Drop to add documents'}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Sign-in & profile
   ========================================================= */
function SignIn({ prof }) {
  const g = prof.data.google || {};
  const [setup, setSetup] = useState(!g.clientId);
  const [cid, setCid] = useState(g.clientId || '');
  const [secret, setSecret] = useState(g.clientSecret || '');
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const [name, setName] = useState('');
  const signIn = async () => {
    setBusy(true);
    try {
      const u = await invoke('google_sign_in', { clientId: g.clientId, clientSecret: g.clientSecret });
      prof.update({ user: { ...u, via: 'google', signedInAt: Date.now() } });
    } catch (e) { toast('Sign-in didn’t finish', String(e)); }
    setBusy(false);
  };
  const saveSetup = e => {
    e.preventDefault();
    if (!cid.trim() || !secret.trim()) { toast('Paste both the Client ID and the Client secret'); return; }
    prof.update({ google: { clientId: cid.trim(), clientSecret: secret.trim() } });
    setSetup(false);
  };
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><I.check className="size-6" /></div>
          <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in so your name and photo appear on your tasks.</p>
        </div>
        {manual ? (
          <form className="grid gap-4" onSubmit={e => { e.preventDefault(); if (name.trim()) prof.update({ user: { name: name.trim(), email: '', picture: '', via: 'local', signedInAt: Date.now() } }); }}>
            <Field label="Your name" htmlFor="m-name"><Input id="m-name" value={name} onChange={e => setName(e.target.value)} autoFocus /></Field>
            <Button type="submit" disabled={!name.trim()}>Continue</Button>
            <Button variant="ghost" onClick={() => setManual(false)}>Back</Button>
          </form>
        ) : setup ? (
          <form className="grid gap-4" onSubmit={saveSetup}>
            <p className="text-sm text-muted-foreground">One-time setup: paste the two values from your Google Cloud project. Step 2 of SETUP-GUIDE.md shows where to find them.</p>
            <Field label="Client ID" htmlFor="g-id"><Input id="g-id" value={cid} onChange={e => setCid(e.target.value)} placeholder="…apps.googleusercontent.com" /></Field>
            <Field label="Client secret" htmlFor="g-secret"><Input id="g-secret" type="password" value={secret} onChange={e => setSecret(e.target.value)} /></Field>
            <Button type="submit">Save</Button>
            {g.clientId && <Button variant="ghost" onClick={() => setSetup(false)}>Cancel</Button>}
          </form>
        ) : (
          <div className="grid gap-3">
            <Button className="h-10" onClick={signIn} disabled={busy}>{busy ? 'Waiting for Google in your browser…' : 'Sign in with Google'}</Button>
            {busy && <p className="text-center text-xs text-muted-foreground">Finish signing in in the browser window that opened, then come back here.</p>}
            <Button variant="ghost" size="sm" onClick={() => setSetup(true)} disabled={busy}>Change Google settings</Button>
          </div>
        )}
        {!manual && (
          <div className="mt-6 border-t pt-4 text-center">
            <button type="button" onClick={() => setManual(true)} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">Use without Google</button>
          </div>
        )}
      </Card>
    </div>
  );
}

function ProfileDialog({ open, onClose, prof }) {
  const u = prof.data.user || {};
  const [name, setName] = useState(u.name || '');
  const [phone, setPhone] = useState(u.phone || '');
  useEffect(() => { if (open) { setName(u.name || ''); setPhone(u.phone || ''); } }, [open]);
  const save = () => { prof.update({ user: { ...u, name: name.trim() || u.name, phone: phone.trim() } }); onClose(); toast('Profile saved'); };
  return (
    <Dialog open={open} onClose={onClose} title="Profile" className="max-w-md"
      footer={<>
        <Button variant="ghost" className="sm:mr-auto text-destructive hover:text-destructive" onClick={() => { onClose(); prof.update({ user: null }); }}>Sign out</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save}>Save</Button>
      </>}>
      <div className="flex items-center gap-4">
        <Avatar name={u.name} picture={u.picture} className="h-14 w-14 text-base" />
        <div className="min-w-0">
          <div className="truncate font-medium">{u.name}</div>
          <div className="truncate text-sm text-muted-foreground">{u.email || 'Not signed in with Google'}</div>
        </div>
      </div>
      <div className="grid gap-4">
        <Field label="Display name" htmlFor="p-name" hint="Used as your name in the Assignee list. If you rename yourself, tasks assigned to your old name keep that name."><Input id="p-name" value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Phone number" htmlFor="p-phone" hint="Optional. Stored only on this computer."><Input id="p-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+41 …" /></Field>
      </div>
    </Dialog>
  );
}

const HASH = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
const STANDALONE_ID = HASH.get('task');
const STANDALONE_WS = HASH.get('ws') || 'product';
const DEFAULT_WORKSPACES = [{ id: 'product', name: 'Product' }, { id: 'marketing', name: 'Marketing' }];

// Product and Marketing (and any you add later): each has its own tasks, statuses and settings.
function useWorkspaces() {
  const [list, setList] = useState(null);
  const [active, setActive] = useState(() => { try { return STANDALONE_ID ? STANDALONE_WS : (localStorage.getItem('tasks-ws') || 'product'); } catch (e) { return 'product'; } });
  useEffect(() => {
    invoke('read_store', { name: 'workspaces' }).then(raw => {
      const v = raw ? JSON.parse(raw) : null;
      if (v && Array.isArray(v.list) && v.list.length) setList(v.list);
      else { setList(DEFAULT_WORKSPACES); persist('workspaces', { version: 1, list: DEFAULT_WORKSPACES }); }
    }).catch(() => setList(DEFAULT_WORKSPACES));
  }, []);
  const switchTo = id => { setActive(id); if (!STANDALONE_ID) { try { localStorage.setItem('tasks-ws', id); } catch (e) {} } };
  const rename = (id, name) => setList(l => { const n = l.map(w => w.id === id ? { ...w, name } : w); persist('workspaces', { version: 1, list: n }); return n; });
  return { list: list || DEFAULT_WORKSPACES, ready: !!list, active: (list || DEFAULT_WORKSPACES).some(w => w.id === active) ? active : 'product', switchTo, rename };
}

export default function Root() {
  const prof = useProfile();
  const wsp = useWorkspaces();
  const [openOnLoad, setOpenOnLoad] = useState(null);
  return (
    <MeContext.Provider value={prof.data.user || null}>
      {!prof.loaded ? <div className="p-8 text-sm text-muted-foreground">Loading…</div>
        : !prof.data.user ? <SignIn prof={prof} />
        : !wsp.ready ? <div className="p-8 text-sm text-muted-foreground">Loading…</div>
        : <App key={wsp.active} prof={prof} standaloneId={STANDALONE_ID} ws={wsp.active} workspaces={wsp.list} openOnLoad={openOnLoad}
            onRenameWorkspace={wsp.rename}
            onSwitchWorkspace={(id, taskId) => { setOpenOnLoad(taskId || null); wsp.switchTo(id); }} />}
      <Toaster />
    </MeContext.Provider>
  );
}
