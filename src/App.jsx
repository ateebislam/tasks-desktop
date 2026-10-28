
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
function Floating({ anchorRef, open, align = 'start', matchWidth, className, children, panelRef }) {
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
      setPos({ top, left, width: matchWidth ? r.width : undefined });
    };
    place();
    const id = requestAnimationFrame(place);
    window.addEventListener('scroll', place, true);
    return () => { cancelAnimationFrame(id); window.removeEventListener('scroll', place, true); };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div ref={panelRef} style={{ position: 'fixed', top: pos ? pos.top : -9999, left: pos ? pos.left : -9999, width: pos && pos.width }}
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
const toast = (title, description) => toastSubs.forEach(f => f({ title, description }));
function Toaster() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const f = t => { const id = Math.random(); setItems(p => [...p.slice(-2), { ...t, id }]); setTimeout(() => setItems(p => p.filter(x => x.id !== id)), 3000); };
    toastSubs.add(f); return () => toastSubs.delete(f);
  }, []);
  return (
    <div aria-live="polite" className="fixed right-4 z-[100] flex w-[calc(100%-2rem)] max-w-[356px] flex-col gap-2" style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom,0px))' }}>
      {items.map(t => (
        <div key={t.id} className="anim-toast rounded-lg border bg-background p-4 text-sm shadow-lg">
          <div className="font-medium">{t.title}</div>
          {t.description && <div className="text-muted-foreground mt-0.5">{t.description}</div>}
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
function useTasks() {
  const [loaded, setLoaded] = useState(false);
  const [tasks, setTasks] = useState({});
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [projects, setProjects] = useState(null);
  const [stages, setStages] = useState([]);
  const remote = useRef(null);
  useEffect(() => {
    let un = null, dead = false;
    listen('tasks-data', e => {
      if (!e.payload || e.payload.from === WINDOW_LABEL) return;
      const d = e.payload.data;
      remote.current = JSON.stringify(d);
      setTasks(d.tasks || {}); setRules((d.rules || []).map(normalizeRule)); setProjects(d.projects || []); setStages(d.stages || []);
    }).then(f => { if (dead) f(); else un = f; }).catch(() => {});
    return () => { dead = true; un && un(); };
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const raw = await invoke('read_store', { name: 'data' });
        if (raw) {
          const d = JSON.parse(raw);
          setTasks(d.tasks || {});
          if (Array.isArray(d.rules)) setRules(d.rules.map(normalizeRule));
          if (Array.isArray(d.projects)) setProjects(d.projects);
          if (Array.isArray(d.stages)) setStages(d.stages);
        }
      } catch (e) { toast('Couldn’t read your saved tasks', String(e)); }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const data = { version: 3, tasks, rules, projects: projects || [], stages };
    if (JSON.stringify(data) === remote.current) return; // came from another window, already saved there
    persist('data', data);
    emit('tasks-data', { from: WINDOW_LABEL, data }).catch(() => {});
  }, [tasks, rules, projects, stages, loaded]);
  const saveMany = useCallback(list => {
    const stamped = list.map(t => ({ ...t, updatedAt: Date.now() }));
    setTasks(p => { const n = { ...p }; stamped.forEach(t => { n[t.id] = t; }); return n; });
  }, []);
  const remove = useCallback(id => { setTasks(p => { const n = { ...p }; delete n[id]; return n; }); }, []);
  const saveRules = useCallback(list => setRules(list), []);
  return { tasks, saveMany, remove, rules, saveRules, projects: projects || [], saveProjects: setProjects, stages, saveStages: setStages, loaded };
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

function ThemeToggle() {
  const th = useTheme();
  return (
    <DropdownMenu
      trigger={p => <Button {...p} variant="outline" size="icon" className="bg-card shadow-none" aria-label={`Appearance: ${THEMES.find(t => t.id === th.mode).label}`} title="Appearance (Shift+D)">{th.dark ? <I.moon /> : <I.sun />}</Button>}
      items={THEMES.map(t => ({
        label: t.label,
        icon: t.id === 'light' ? <I.sun /> : t.id === 'dark' ? <I.moon /> : <I.monitor />,
        shortcut: th.mode === t.id ? '✓' : undefined,
        onSelect: () => th.choose(t.id),
      }))} />
  );
}

async function openTaskWindow(id, title) {
  const label = 'task-' + String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  try {
    const existing = await WebviewWindow.getByLabel(label);
    if (existing) { await existing.setFocus(); return; }
    const w = new WebviewWindow(label, { url: 'index.html#task=' + encodeURIComponent(id), title: title || 'Task', width: 780, height: 880, minWidth: 480, minHeight: 480 });
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

function PreviewDialog({ file, onClose, onDownload }) {
  const [st, setSt] = useState(null);
  useEffect(() => {
    if (!file) return;
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
  if (!file) return null;
  const msg = t => <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">{t}</div>;
  return (
    <Dialog open={!!file} onClose={onClose} className="max-w-4xl" title={file ? file.name : ''}
      description={file ? `${(KINDS[file.kind] || KINDS.other).label}, ${fmtSize(file.size)}` : ''}
      footer={file && <>
        <Button variant="outline" onClick={() => onDownload(file)}><I.download />Save a copy</Button>
        <Button onClick={() => openExternal(file)}>Open in its app</Button>
      </>}>
      <div className="h-[60vh] overflow-hidden rounded-md border bg-muted/30">
        {!st || st.loading ? msg('Loading preview…')
          : st.error ? msg('Couldn’t show a preview of this file. Use “Open in its app” instead.')
          : st.none ? msg('There’s no preview for this file type. Use “Open in its app” to view it.')
          : st.pdf ? <iframe title={file.name} src={st.pdf} className="h-full w-full bg-white" />
          : st.img ? <img src={st.img} alt={file.name} className="h-full w-full object-contain" />
          : st.html ? <iframe title={file.name} sandbox="" srcDoc={st.html} className="h-full w-full bg-white" />
          : st.text != null ? <pre className="h-full overflow-auto whitespace-pre-wrap p-4 font-mono text-xs">{st.text}</pre>
          : null}
      </div>
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
            <NativeSelect id="ad-target" value={target} onChange={e => setTarget(e.target.value)}>
              <option value="__new">A new task for each file</option>
              {openTasks.length > 0 && <optgroup label="Open tasks">{openTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</optgroup>}
              {doneTasks.length > 0 && <optgroup label="Done">{doneTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</optgroup>}
            </NativeSelect>
          </Field>
          {target === '__new' && (
            <Field label="Project" htmlFor="ad-project">
              <NativeSelect id="ad-project" value={project} onChange={e => setProject(e.target.value)}>
                <option value="">No project</option>
                {projects.map(p => <option key={p} value={p}>{p}</option>)}
              </NativeSelect>
            </Field>
          )}
        </div>
      </div>
    </Dialog>
  );
}

const DOC_FILTERS = [{ value: 'all', label: 'All' }, { value: 'pdf', label: 'PDF' }, { value: 'word', label: 'Word' }, { value: 'html', label: 'HTML' }, { value: 'other', label: 'Other' }];
function DocumentsView({ docs, onAdd, onPreview, onDownload, onRemove, onOpenTask, dragOver }) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const over = dragOver;
  const nq = norm(q);
  const list = docs
    .filter(d => (kind === 'all' || (kind === 'other' ? !['pdf', 'word', 'html'].includes(d.kind) : d.kind === kind))
      && (!nq || [d.name, d.task.title, d.task.project].some(v => norm(v).includes(nq))))
    .sort((a, b) => b.addedAt - a.addedAt);
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <I.search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search documents, tasks or projects" aria-label="Search documents" className="pl-9"
            onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setQ(''); e.currentTarget.blur(); } }} />
        </div>
        <Button onClick={() => onAdd([])}><I.upload />Add documents</Button>
      </div>
      <div className="mt-3 overflow-x-auto">
        <ToggleGroup label="File type" value={kind} onChange={setKind} items={DOC_FILTERS} />
      </div>
      <Card className={cn('mt-4 overflow-hidden transition-shadow', over && 'ring-2 ring-ring')}>
        {docs.length === 0 ? (
          <Empty icon={<I.file />} title="No documents yet"
            description="Collect the PDFs, Word files and HTML pages from your WhatsApp group here. Each one is attached to a task, so it’s one search away.">
            <Button variant="outline" size="sm" onClick={() => onAdd([])}><I.upload />Add documents</Button>
          </Empty>
        ) : list.length === 0 ? (
          <Empty icon={<I.search />} title="No documents match" description="Try another word or file type.">
            <Button variant="outline" size="sm" onClick={() => { setQ(''); setKind('all'); }}>Show all documents</Button>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Document</TableHead>
                <TableHead className="hidden sm:table-cell w-[34%]">Task</TableHead>
                <TableHead className="hidden md:table-cell w-[90px]">Added</TableHead>
                <TableHead className="w-[100px] pr-4"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map(d => (
                <TableRow key={d.id + d.task.id}>
                  <TableCell className="pl-4 max-w-0 w-full">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileBadge kind={d.kind} />
                      <div className="min-w-0">
                        <button type="button" onClick={() => onPreview(d)} className="block max-w-full truncate text-left font-medium hover:underline underline-offset-4 focus-visible:outline-none focus-visible:underline">{d.name}</button>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span className="tnum">{fmtSize(d.size)}</span>
                          <button type="button" onClick={() => onOpenTask(d.task.id)} className="truncate hover:underline underline-offset-4 sm:hidden">{d.task.title}</button>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell max-w-0">
                    <button type="button" onClick={() => onOpenTask(d.task.id)} className="block max-w-full truncate text-left hover:underline underline-offset-4">{d.task.title}</button>
                    {d.task.project && <div className="truncate text-xs text-muted-foreground">{d.task.project}</div>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell whitespace-nowrap text-muted-foreground">{fmtDay(d.addedAt)}</TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end gap-0.5">
                      <Button variant="ghost" size="icon-sm" aria-label={`Preview ${d.name}`} onClick={() => onPreview(d)}><I.eye /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Save a copy of ${d.name}`} onClick={() => onDownload(d)}><I.download /></Button>
                      <DropdownMenu
                        trigger={p => <Button {...p} variant="ghost" size="icon-sm" aria-label={`More for ${d.name}`}><I.more /></Button>}
                        items={[
                          { label: 'Open in its app', icon: <I.eye />, onSelect: () => openExternal(d) },
                          { label: 'Open task', icon: <I.pencil />, onSelect: () => onOpenTask(d.task.id) },
                          'sep',
                          { label: 'Remove from task', icon: <I.trash />, destructive: true, onSelect: () => onRemove(d, d.task.id) },
                        ]} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">Tip: drag files from WhatsApp or File Explorer anywhere onto this window.</p>
    </div>
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
  } else if (edit.field === 'project') {
    placeholder = 'Search or create a project…';
    items = [
      { key: '', text: 'No project', node: <span className="text-muted-foreground">No project</span>, on: !task.project, pick: () => set({ project: '' }) },
      ...ctx.projects.map(n => ({ key: n, text: n, node: <span className="flex min-w-0 items-center gap-1.5"><I.folder className="size-3.5 shrink-0 text-muted-foreground/70" /><span className="truncate">{n}</span></span>, on: norm(task.project) === norm(n), pick: () => set({ project: n }) })),
    ];
    creates = [{ key: 'new', text: name, node: <span className="flex min-w-0 items-center gap-1.5"><I.plus className="size-3.5 shrink-0 text-muted-foreground" /><span className="text-muted-foreground">Create project</span><I.folder className="size-3.5 shrink-0 text-muted-foreground/70" /><span className="truncate font-medium">{name}</span></span>,
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
  let lastSection = null;
  return (
    <Floating anchorRef={a} panelRef={p} open className={cn('p-1', edit.field === 'deadline' ? 'w-auto' : 'w-72')}>
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
];
function SheetFrame({ mode, open, onClose, children }) {
  if (mode === 'window') return <div className="flex h-screen flex-col bg-background" role="main" aria-labelledby="sheet-title">{children}</div>;
  return <Sheet open={open} onClose={onClose} labelledBy="sheet-title" variant={mode}>{children}</Sheet>;
}

const FORM_KEYS = ['title', 'project', 'status', 'stage', 'assignee', 'deadline', 'description', 'priority', 'checklist'];
const formFrom = (task, stages) => ({
  title: task.title || '', project: task.project || '', status: S[task.status] ? task.status : 'todo', stage: stageOf(task, stages) ? task.stage : '',
  assignee: task.assignee || '', deadline: task.deadline || '', description: task.description || '', priority: task.priority || 'normal', checklist: task.checklist || [],
});

// Every change is saved automatically: choices right away, typing after a short pause.
function TaskSheet({ mode = 'side', onMode, onPopOut, open, task, people, projects, stages = [], rules, defaultProject, defaultAssignee, dropRef, allTasks, onOpen, onPatch, onClose, onSave, onDelete, onDiscardEmpty, onToggle, onReset, storageOk, busy, onUpload, onAttach, onPreview, onDownload, onRemoveFile, onDiscard }) {
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
  const TYPED = ['title', 'description'];
  const set = k => v => change({ [k]: v && v.target ? v.target.value : v }, TYPED.includes(k));
  const isEmpty = () => !form.title.trim() && !form.description.trim() && !form.checklist.length && !(task.files || []).length;
  const close = () => {
    if (isEmpty()) { clearTimeout(timer.current); pending.current = {}; onDiscardEmpty(task.id); onClose(); return; }
    commit(); onClose();
  };
  const submit = e => { e && e.preventDefault(); close(); };
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
        <div className={cn('flex h-12 shrink-0 items-center gap-2 border-b px-3 text-xs text-muted-foreground', mode !== 'window' && 'pr-12')}>
          {mode !== 'window' && (
            <>
              <DropdownMenu align="start"
                trigger={p => <button {...p} type="button" aria-label="How tasks open" title="How tasks open" className="flex size-7 items-center justify-center rounded-md hover:bg-muted hover:text-foreground">{(OPEN_MODES.find(m => m.id === mode) || OPEN_MODES[0]).icon}</button>}
                items={[
                  ...OPEN_MODES.map(m => ({ label: m.label, icon: m.icon, shortcut: mode === m.id ? '✓' : undefined, onSelect: () => onMode(m.id) })),
                  'sep',
                  { label: 'Open in new window', icon: <I.external />, onSelect: () => { commit(); onPopOut(); } },
                ]} />
              <button type="button" onClick={() => { commit(); onPopOut(); }} aria-label="Open in new window" title="Open in new window"
                className="flex size-7 items-center justify-center rounded-md hover:bg-muted hover:text-foreground"><I.external className="size-3.5" /></button>
              <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
            </>
          )}
          <span id="sheet-title" className="text-sm font-medium text-foreground">{task.title || form.title ? 'Task' : 'New task'}</span>
          {task && <span>Created {fmtDay(task.createdAt)}</span>}
          {generatedFrom && <span className="inline-flex items-center gap-1"><I.zap className="size-3" />Auto</span>}
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
            <PropRow label="Status" htmlFor="t-status">
              <div className="relative">
                <span className={cn('pointer-events-none absolute left-2.5 top-1/2 size-2 -translate-y-1/2 rounded-full', STATUS_COLORS[statusDef(form, stages).color])} />
                <select id="t-status" value={form.stage ? `${form.status}|${form.stage}` : form.status}
                  onChange={e => { const [st, sg] = e.target.value.split('|'); change({ status: st, stage: sg || '' }); }}
                  className={cn(ghostField, 'cursor-pointer appearance-none pl-7')}>
                  {STATUSES.map(st => (
                    <optgroup key={st.id} label={GROUP_HEAD[st.id]}>
                      {statusList(stages).filter(x => x.group === st.id).map(x => <option key={x.id} value={x.builtin ? st.id : `${st.id}|${x.id}`}>{x.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
            </PropRow>
            <PropRow label="Priority">
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
            <PropRow label="Assignee" htmlFor="t-assignee">
              <Combobox id="t-assignee" value={form.assignee} onChange={set('assignee')} options={people} placeholder="Add assignee" hideIcon inputClassName={ghostField} />
            </PropRow>
            <PropRow label="Project" htmlFor="t-project">
              <Combobox id="t-project" value={form.project} onChange={set('project')} options={projects} placeholder="Add project" hideIcon inputClassName={ghostField}
                createLabel={v => `Use “${v}”`} icon={() => <I.folder className="text-muted-foreground" />} />
            </PropRow>
            <PropRow label="Deadline" htmlFor="t-deadline">
              <DatePicker id="t-deadline" value={form.deadline} onChange={set('deadline')} variant="ghost" icon={false} placeholder="Add deadline"
                format={{ weekday: 'short', month: 'short', day: 'numeric' }}
                className={cn('h-8 px-2 hover:bg-muted', overdue && 'text-red-600 dark:text-red-400 font-medium')} />
            </PropRow>
            {task && (
              <PropRow label="Time">
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
              <button type="button" onClick={chooseFiles} disabled={busy}
                className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">
                <I.paperclip className="size-3.5" />{busy ? 'Adding…' : 'Attach'}
              </button>
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
          <Button type="submit" variant="outline" size="sm">Close</Button>
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

const SHORTCUTS = [['New task', 'N'], ['Search tasks', '/'], ['Switch light and dark mode', 'Shift + D'], ['Clear search or close a panel', 'Esc'], ['Show this list', '?']];
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
    if (kind === 'project') return (
      <NativeSelect value={r.target} onChange={e => upd(r.id, { target: e.target.value })} aria-label="Project">
        <option value="">Choose a project…</option>
        {projects.map(p => <option key={p} value={p}>{p}</option>)}
      </NativeSelect>);
    if (kind === 'status') return (
      <NativeSelect value={r.target} onChange={e => upd(r.id, { target: e.target.value })} aria-label="Status">
        <option value="">Choose a status…</option>
        {STATUSES.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
      </NativeSelect>);
    if (kind === 'priority') return (
      <NativeSelect value={r.target} onChange={e => upd(r.id, { target: e.target.value })} aria-label="Priority">
        <option value="">Choose a priority…</option>
        {['high', 'normal', 'low'].map(x => <option key={x} value={x}>{P[x].label}</option>)}
      </NativeSelect>);
    if (kind === 'days') return (
      <NativeSelect value={r.target} onChange={e => upd(r.id, { target: e.target.value })} aria-label="Deadline">
        <option value="">Choose a date…</option>
        {DEADLINE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l[0].toUpperCase() + l.slice(1)}</option>)}
      </NativeSelect>);
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
                  <NativeSelect id={`p-${r.id}`} value={r.project} onChange={e => upd(r.id, { project: e.target.value })}>
                    <option value="">Any project</option>
                    {projects.map(p => <option key={p} value={p}>{p}</option>)}
                  </NativeSelect>
                </Field>
                <Field label="When the task" htmlFor={`w-${r.id}`}>
                  <NativeSelect id={`w-${r.id}`} value={r.trigger} onChange={e => upd(r.id, { trigger: e.target.value })}>
                    {['Status', 'Dates', 'Details'].map(g => (
                      <optgroup key={g} label={g}>{TRIGGERS.filter(t => t.group === g).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</optgroup>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Then" htmlFor={`a-${r.id}`}>
                  <NativeSelect id={`a-${r.id}`} value={r.action} onChange={e => upd(r.id, { action: e.target.value, target: '' })}>
                    {ACTIONS.map(a => <option key={a.id} value={a.id}>{a.label[0].toUpperCase() + a.label.slice(1)}</option>)}
                  </NativeSelect>
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
function ProjectDialog({ open, project, names, onClose, onSave }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('violet');
  useEffect(() => { if (open) { setName(project ? project.name : ''); setColor(project ? project.color : COLOR_KEYS[names.length % COLOR_KEYS.length]); } }, [open]);
  const clash = names.some(n => norm(n) === norm(name) && (!project || norm(n) !== norm(project.name)));
  const ok = name.trim() && !clash;
  return (
    <Dialog open={open} onClose={onClose} title={project ? 'Edit project' : 'New project'} className="max-w-md"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!ok} onClick={() => onSave({ name: name.trim(), color })}>{project ? 'Save' : 'Create project'}</Button>
      </>}>
      <form className="grid gap-4" onSubmit={e => { e.preventDefault(); if (ok) onSave({ name: name.trim(), color }); }}>
        <Field label="Name" htmlFor="pj-name" hint={clash ? 'A project with this name already exists.' : project ? 'Renaming updates every task and automation in this project.' : undefined}>
          <Input id="pj-name" value={name} onChange={e => setName(e.target.value)} placeholder="For example: Kaufes - Web" autoFocus />
        </Field>
        <div className="grid gap-2">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
            {COLOR_KEYS.map(c => (
              <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} onClick={() => setColor(c)}
                className={cn('flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition', PROJECT_COLORS[c].dot, color === c && 'ring-2 ring-ring')}>
                {color === c && <I.check className="size-4 text-white" />}
              </button>
            ))}
          </div>
        </div>
      </form>
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

function App({ prof, standaloneId }) {
  const me = prof.data.user;
  const { tasks, saveMany, remove, rules, saveRules, projects: storedProjects, saveProjects, stages, saveStages, loaded } = useTasks();
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
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState(savedView.sortBy || 'deadline');
  useEffect(() => { try { localStorage.setItem(LS_VIEW, JSON.stringify({ projectFilter, sortBy, showSummary, view })); } catch (e) {} }, [projectFilter, sortBy, showSummary, view]);
  const [quick, setQuick] = useState('');
  const [sheet, setSheet] = useState(standaloneId ? { open: true, id: standaloneId } : { open: false, id: null });
  const [openMode, setOpenMode] = useState(() => { try { return localStorage.getItem('tasks-open-mode') || 'side'; } catch (e) { return 'side'; } });
  const chooseMode = m => { setOpenMode(m); try { localStorage.setItem('tasks-open-mode', m); } catch (e) {} };
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
    const extra = [...(storedProjects.length ? [] : DEFAULT_PROJECTS), ...all.map(t => t.project), ...rules.flatMap(r => [r.project, (r.action === 'copy' || r.action === 'move') ? r.target : ''])];
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
    toast(old ? 'Project saved' : 'Project created', name);
  };
  const deleteProject = () => {
    const p = projectDelete; setProjectDelete(null);
    const n = norm(p.name);
    const moved = Object.values(tasksRef.current).filter(t => norm(t.project) === n).map(t => ({ ...t, project: '' }));
    if (moved.length) saveMany(moved);
    saveRules(rules.filter(r => norm(r.project) !== n && !((r.action === 'copy' || r.action === 'move') && norm(r.target) === n)));
    saveProjects(projectList.filter(x => norm(x.name) !== n));
    if (projectFilter === p.name) setProjectFilter('all');
    toast('Project deleted', p.name);
  };
  const ensureProject = name => {
    if (!name || projectList.some(p => norm(p.name) === norm(name))) return;
    saveProjects([...projectList, { id: 'p-' + newId(), name, color: autoColor(name) }]);
    toast('Project created', name);
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
  const scoped = useMemo(() => {
    const q = norm(query);
    return all.filter(t => (projectFilter === 'all' || (projectFilter === 'none' ? !t.project : t.project === projectFilter))
      && (!q || [t.title, t.description, t.assignee, t.project, statusLabel(t, stages), ...(t.checklist || []).map(c => c.text), ...(t.files || []).map(f => f.name)].some(v => norm(v).includes(q))));
  }, [all, projectFilter, query]);
  const counts = useMemo(() => { const c = { all: scoped.length }; STATUSES.forEach(s => { c[s.id] = scoped.filter(t => t.status === s.id).length; }); return c; }, [scoped]);
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
      priority: (a, b) => P[a.priority || 'normal'].i - P[b.priority || 'normal'].i || (a.deadline || '9999').localeCompare(b.deadline || '9999'),
    }[sortBy] || ((a, b) => b.createdAt - a.createdAt);
    return scoped.filter(t => filter === 'all' || t.status === filter).sort((a, b) => {
      if (sortBy !== 'status' && (a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1;
      return by(a, b);
    });
  }, [scoped, filter, sortBy, stages]);

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
          project: r.target, status: 'todo', createdAt: Date.now(), timeSpent: 0, timerStartedAt: null, blockedBy: null,
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
  const createTask = () => {
    const auto = automate({
      id: newId(), title: '', status: 'todo', assignee: me.name || '', deadline: '', description: '', priority: 'normal', checklist: [],
      project: projectFilter !== 'all' && projectFilter !== 'none' ? projectFilter : '', createdAt: Date.now(), timeSpent: 0, timerStartedAt: null,
    }, null);
    saveMany([auto.task, ...auto.created]);
    setSheet({ open: true, id: auto.task.id });
  };
  const createRef = useRef(createTask); createRef.current = createTask;
  // A new task you close without typing anything is removed again.
  const discardEmpty = id => remove(id);
  const doDelete = () => {
    const t = tasks[confirmId]; remove(confirmId); setConfirmId(null); setSheet({ open: false, id: null });
    if (t) (t.files || []).forEach(f => deleteIfUnused(f, [t.id]));
    toast('Task deleted', t && t.title);
  };
  const closeSheet = useCallback(() => setSheet({ open: false, id: null }), []);
  const patch = (id, p) => {
    const t = tasksRef.current[id]; if (!t) return;
    const auto = automate({ ...t, ...p }, t);
    saveMany([auto.task, ...auto.created]);
    notifyAuto(auto);
  };

  /* ---- documents ---- */
  const docs = useMemo(() => all.flatMap(t => (t.files || []).map(f => ({ ...f, task: t }))), [all]);
  // A file can be shared by a task and its automatic follow-up, so it's only deleted when no task uses it.
  const deleteIfUnused = (id, excludeIds) => { // id: the document record
    const used = Object.values(tasksRef.current).some(o => !excludeIds.includes(o.id) && (o.files || []).some(x => x.id === id.id));
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
    toast(metas.length === 1 ? 'Document attached' : `${metas.length} documents attached`, t.title);
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
    const t = tasksRef.current[taskId]; if (!t) return;
    saveMany([{ ...t, files: (t.files || []).filter(x => x.id !== file.id) }]);
    deleteIfUnused(file, [taskId]);
    toast('Document removed', file.name);
  };
  // Files dragged onto the window (from WhatsApp, File Explorer…) arrive as file paths.
  const dropState = useRef({}); dropState.current = { sheetOpen: sheet.open, addOpen: addDocs.open };
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
        else setAddDocs({ open: true, files: infos });
      }
    }).then(f => { if (dead) f(); else un = f; });
    return () => { dead = true; un && un(); };
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
      project: t.project || '', files: t.files || [], priority: t.priority || 'normal', checklist: (t.checklist || []).map(i => ({ ...i, id: newId(), done: false })),
      status: 'todo', createdAt: Date.now(), timeSpent: 0, timerStartedAt: null,
    };
    const auto = automate(c, null);
    saveMany([auto.task, ...auto.created]); setSheet({ open: true, id: c.id }); toast('Task duplicated', 'Edit the copy, then save.');
  };
  useEffect(() => {
    const k = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      if (document.querySelector('[role=dialog],[role=alertdialog]') || standaloneId) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); createRef.current(); }
      else if (e.key === '/' && searchRef.current) { e.preventDefault(); searchRef.current.focus(); }
      else if (e.key === '?') { e.preventDefault(); setKeysOpen(true); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);
  const sheetTask = sheet.id ? all.find(t => t.id === sheet.id) : null;
  const popOut = () => { const t = sheetTask; setSheet({ open: false, id: null }); if (t) openTaskWindow(t.id, t.title || 'Untitled'); };
  // In a task's own window: keep the title bar in step, and close the window when the task is closed or deleted.
  useEffect(() => {
    if (!standaloneId) return;
    if (loaded && (!sheet.open || !sheetTask)) { flushAll().then(() => getCurrentWindow().close()).catch(() => {}); return; }
    if (sheetTask) getCurrentWindow().setTitle(sheetTask.title || 'Untitled').catch(() => {});
  }, [standaloneId, loaded, sheet.open, sheetTask && sheetTask.title, !!sheetTask]);
  if (!loaded) return <div className="p-8 text-sm text-muted-foreground">Loading your tasks…</div>;

  if (standaloneId) return (
    <>
      <TaskSheet mode={standaloneId ? 'window' : openMode} onMode={chooseMode} onPopOut={popOut} open={sheet.open} task={sheetTask} people={people} stages={stages} defaultAssignee={me.name} dropRef={sheetDrop} projects={projects} rules={rules} defaultProject={projectFilter !== 'all' && projectFilter !== 'none' ? projectFilter : ''} allTasks={all} onOpen={id => setSheet({ open: true, id })} onPatch={patch} onClose={closeSheet}
        onSave={saveSheet} onDiscardEmpty={discardEmpty} onDelete={() => setConfirmId(sheet.id)} onToggle={toggleTimer} onReset={resetTimer}
        storageOk={storageOk} busy={busy} onUpload={uploadMany} onAttach={attach} onPreview={setPreview} onDownload={downloadFile}
        onRemoveFile={(file, taskId) => setFileConfirm({ file, taskId })} onDiscard={fs => fs.forEach(f => deleteIfUnused(f, []))} />
      <PreviewDialog file={preview} onClose={() => setPreview(null)} onDownload={downloadFile} />
      <AlertDialog open={!!confirmId} title="Delete this task?"
        description={`“${(tasks[confirmId] || {}).title || ''}” and its tracked time${((tasks[confirmId] || {}).files || []).length ? ' and attached documents' : ''} will be removed. This can’t be undone.`}
        confirmLabel="Delete task" onConfirm={doDelete} onCancel={() => setConfirmId(null)} />
      <AlertDialog open={!!fileConfirm} title="Remove this document?"
        description={fileConfirm ? `“${fileConfirm.file.name}” will be removed from this task.` : ''}
        confirmLabel="Remove document" onConfirm={doRemoveFile} onCancel={() => setFileConfirm(null)} />
      {cellEdit && null}
    </>
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-6 md:py-6">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-2">
        <div className="mr-auto min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">Welcome back, {(me.name || '').split(' ')[0] || 'there'}</h1>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="relative w-44 lg:w-64">
          <I.search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input ref={searchRef} value={query} onChange={e => { setQuery(e.target.value); if (view !== 'tasks') setView('tasks'); }} placeholder="Search tasks" aria-label="Search tasks"
            className="h-9 rounded-lg bg-card pl-9 pr-9 shadow-none"
            onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setQuery(''); e.currentTarget.blur(); } }} />
          {query
            ? <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm opacity-60 hover:opacity-100"><I.x /></button>
            : <Kbd className="absolute right-3 top-1/2 -translate-y-1/2">/</Kbd>}
        </div>
        <ThemeToggle />
        <DropdownMenu
          trigger={p => <Button {...p} variant="outline" size="icon" className="bg-card shadow-none" aria-label="More tools"><I.more /></Button>}
          items={[
            { label: 'Automations', icon: <I.zap />, shortcut: `${rules.filter(r => r.enabled).length} on`, onSelect: () => setRulesOpen(true) },
            { label: 'Manage projects', icon: <I.folder />, onSelect: () => setView('projects') },
            { label: 'Edit statuses', icon: <I.sliders />, onSelect: () => setStatusesOpen(true) },
            { label: showSummary ? 'Hide time summary' : 'Show time summary', icon: <I.chart />, onSelect: () => setShowSummary(v => !v) },
            { label: 'Keyboard shortcuts', icon: <I.keyboard />, shortcut: '?', onSelect: () => setKeysOpen(true) },
          ]} />
        <DropdownMenu
          trigger={p => (
            <button {...p} type="button" aria-label="Your account" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
        <Button className="shadow-none" onClick={createTask}><I.plus />Create task</Button>
      </header>

      {/* Sections, with the running timer on the right */}
      <div className="mt-5 flex items-end gap-3 border-b">
        <nav className="flex gap-5" aria-label="Sections">
          {[{ id: 'tasks', label: 'Tasks', count: all.length }, { id: 'projects', label: 'Projects', count: projectList.length }, { id: 'docs', label: 'Documents', count: docs.length }].map(v => (
            <button key={v.id} type="button" onClick={() => setView(v.id)} aria-current={view === v.id ? 'page' : undefined}
              className={cn('-mb-px flex items-center gap-1.5 border-b-2 pb-2 text-sm transition-colors focus-visible:outline-none focus-visible:text-foreground',
                view === v.id ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {v.label}<span className="tnum text-xs text-muted-foreground">{v.count}</span>
            </button>
          ))}
        </nav>
        {running && (
          <div className="mb-1.5 ml-auto flex min-w-0 items-center gap-2 rounded-full border bg-card py-0.5 pl-2.5 pr-0.5 text-xs" role="status">
            <span className="relative flex size-2 shrink-0">
              <span className="anim-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <button type="button" onClick={() => setSheet({ open: true, id: running.id })} title={running.title}
              className="max-w-[16rem] truncate text-muted-foreground hover:text-foreground hover:underline underline-offset-4">{running.title}</button>
            <span className="tnum font-semibold">{fmt(elapsed(running))}</span>
            <button type="button" onClick={() => toggleTimer(running.id)} aria-label="Pause timer"
              className="flex size-6 items-center justify-center rounded-full hover:bg-muted"><I.pause className="size-3" /></button>
          </div>
        )}
      </div>

      {view === 'projects' ? (
        <ProjectsView list={projectList} tasks={all} onNew={() => setProjectEdit({ project: null })} onEdit={p => setProjectEdit({ project: p })}
          onDelete={p => setProjectDelete(p)} onOpen={openProject} />
      ) : view === 'docs' ? (
        <DocumentsView docs={docs} dragOver={dragOver && !sheet.open && !addDocs.open} onAdd={fs => setAddDocs({ open: true, files: fs })} onPreview={setPreview} onDownload={downloadFile}
          onRemove={(file, taskId) => setFileConfirm({ file, taskId })} onOpenTask={id => setSheet({ open: true, id })} />
      ) : (<>
      {showSummary && <TimeSummary tasks={all} onHide={() => setShowSummary(false)} />}

      {/* Filters and a one-line summary */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {[{ id: 'all', label: 'All', count: counts.all }, ...STATUSES.map(st => ({ id: st.id, label: GROUP_HEAD[st.id], count: counts[st.id], dot: st.dot }))].map(c => (
          <button key={c.id} type="button" onClick={() => setFilter(c.id)} aria-pressed={filter === c.id}
            className={cn('inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              filter === c.id ? 'border-foreground/25 bg-card font-medium text-foreground' : 'bg-transparent text-muted-foreground hover:border-foreground/20 hover:text-foreground')}>
            {c.dot && <span className={cn('size-1.5 rounded-full', c.dot)} />}{c.label}<span className="tnum opacity-70">{c.count}</span>
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
        <label className={cn('relative inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-transparent pl-2.5 pr-6 text-xs transition-colors hover:border-foreground/20',
          projectFilter !== 'all' ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground')}>
          <I.folder className="size-3.5" />
          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} aria-label="Filter by project"
            className="cursor-pointer appearance-none bg-transparent focus-visible:outline-none">
            <option value="all">All projects</option>
            {projects.map(p => <option key={p} value={p}>{p}</option>)}
            <option value="none">No project</option>
          </select>
          <I.down className="pointer-events-none absolute right-2 size-3 opacity-60" />
        </label>
        <label className="relative inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-transparent pl-2.5 pr-6 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground">
          <I.updown className="size-3.5" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="Sort by" className="cursor-pointer appearance-none bg-transparent focus-visible:outline-none">
            <option value="deadline">Sort: Deadline</option>
            <option value="priority">Sort: Priority</option>
            <option value="created">Sort: Newest</option>
            <option value="status">Sort: Status</option>
            <option value="assignee">Sort: Assignee</option>
            <option value="project">Sort: Project</option>
          </select>
          <I.down className="pointer-events-none absolute right-2 size-3 opacity-60" />
        </label>
        <span className="ml-auto text-xs text-muted-foreground">
          {overview.open} open, {overview.week} due this week
          {overview.overdue > 0 && <>, <span className="font-medium text-red-600 dark:text-red-400">{overview.overdue} overdue</span></>}
        </span>
      </div>

      {showSummary && <TimeSummary tasks={all} onHide={() => setShowSummary(false)} />}

      {/* Table */}
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
          <Empty icon={<I.clipboard />} title={filter === 'all' ? 'Nothing here yet' : `Nothing in ${S[filter].label.toLowerCase()}`} description="Try another filter or project to see the rest of your tasks.">
            <Button variant="outline" size="sm" onClick={() => { setFilter('all'); setProjectFilter('all'); }}>Show all tasks</Button>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] table-fixed border-collapse text-[13px]">
              <colgroup>
                <col /><col className="w-[124px]" /><col className="w-[132px]" /><col className="w-[118px]" /><col className="w-[150px]" /><col className="w-[84px]" /><col className="w-[92px]" /><col className="w-[36px]" />
              </colgroup>
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  {[['Task', <span className="text-[11px] font-semibold">Aa</span>], ['Status', <I.loader />], ['Assignee', <I.user />], ['Deadline', <I.calendar />], ['Project', <I.folder />], ['Priority', <I.flag />], ['Time', <I.timer />]].map(([label, icon]) => (
                    <th key={label} className="h-8 border-r px-2.5 font-normal last:border-r-0">
                      <span className="flex items-center gap-1.5 [&_svg]:size-3.5">{icon}{label}</span>
                    </th>
                  ))}
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
                            <button type="button" onClick={() => setSheet({ open: true, id: t.id })} title={t.title}
                              className={cn('min-w-0 truncate text-left font-medium hover:underline underline-offset-4 focus-visible:outline-none focus-visible:underline', done && 'text-muted-foreground line-through', !t.title && 'font-normal text-muted-foreground')}>{t.title || 'Untitled'}</button>
                            <span className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                              {blocker && <button type="button" title={`Blocked by “${blocker.title}”`} onClick={() => setSheet({ open: true, id: t.blockedBy })} className="text-red-600 dark:text-red-400"><I.ban className="size-3" /></button>}
                              {(t.checklist || []).length > 0 && <span className="tnum inline-flex items-center gap-0.5" title="Checklist"><I.listCheck className="size-3" />{t.checklist.filter(c => c.done).length}/{t.checklist.length}</span>}
                              {(t.files || []).length > 0 && <span className="tnum inline-flex items-center gap-0.5" title="Documents"><I.paperclip className="size-3" />{t.files.length}</span>}
                              {t.generatedFrom && <span title="Created by an automation"><I.zap className="size-3" /></span>}
                            </span>
                            <button type="button" onClick={() => setRenaming(t.id)} aria-label={`Rename ${t.title}`} title="Rename"
                              className="ml-auto inline-flex h-6 shrink-0 items-center gap-1 rounded-md border bg-card px-1.5 text-[11px] font-medium text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none group-hover/title:opacity-100 [@media(hover:none)]:opacity-100">
                              <I.pencil className="size-3" />Edit
                            </button>
                          </div>
                        )}
                      </td>
                      {[
                        ['status', <DefPill def={statusDef(t, stages)} />],
                        ['assignee', t.assignee
                          ? <span className="flex min-w-0 items-center gap-1.5"><Avatar name={t.assignee} className="h-5 w-5 [&_span]:text-[9px]" /><span className="truncate">{t.assignee}</span></span>
                          : <span className="text-muted-foreground/60">Empty</span>],
                        ['deadline', t.deadline ? <span className={cn('whitespace-nowrap', dueCls[d.tone])}>{d.text}</span> : <span className="text-muted-foreground/60">Empty</span>],
                        ['project', t.project
                          ? <span className="flex min-w-0 items-center gap-1.5"><I.folder className="size-3.5 shrink-0 text-muted-foreground/70" /><span className="truncate">{t.project}</span></span>
                          : <span className="text-muted-foreground/60">Empty</span>],
                        ['priority', <span className={cn(done && 'opacity-50')}><PriorityPill priority={t.priority} /></span>],
                      ].map(([field, content]) => {
                        const active = cellEdit && cellEdit.id === t.id && cellEdit.field === field;
                        return (
                          <td key={field} tabIndex={0} role="button" aria-label={`Change ${field} of ${t.title}`}
                            onClick={e => openCell(t.id, field, e.currentTarget)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCell(t.id, field, e.currentTarget); } }}
                            className={cn(cell, 'cursor-pointer transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--ring))]', active && 'bg-muted/60 shadow-[inset_0_0_0_1px_hsl(var(--ring))]')}>
                            <div className="flex min-w-0 items-center">{content}</div>
                          </td>
                        );
                      })}
                      <td className={cn(cell, 'px-1')}>
                        <button type="button" onClick={() => toggleTimer(t.id)} aria-label={`${on ? 'Pause' : 'Start'} timer for ${t.title}`}
                          className={cn('tnum inline-flex h-6 w-full items-center gap-1.5 rounded px-1.5 text-xs transition-colors hover:bg-muted', on ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                          {on ? <I.pause className="size-3" /> : <I.play className="size-3" />}{fmt(elapsed(t))}
                        </button>
                      </td>
                      <td className="h-[34px] px-0.5 text-center">
                        <div className="opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                          <DropdownMenu
                            trigger={p => <Button {...p} variant="ghost" size="icon-sm" className="h-7 w-7" aria-label={`Actions for ${t.title}`}><I.more /></Button>}
                            items={[
                              { label: 'Edit', icon: <I.pencil />, onSelect: () => setSheet({ open: true, id: t.id }) },
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
      </>)}

      <TaskSheet mode={standaloneId ? 'window' : openMode} onMode={chooseMode} onPopOut={popOut} open={sheet.open} task={sheetTask} people={people} stages={stages} defaultAssignee={me.name} dropRef={sheetDrop} projects={projects} rules={rules} defaultProject={projectFilter !== 'all' && projectFilter !== 'none' ? projectFilter : ''} allTasks={all} onOpen={id => setSheet({ open: true, id })} onPatch={patch} onClose={closeSheet}
        onSave={saveSheet} onDiscardEmpty={discardEmpty} onDelete={() => setConfirmId(sheet.id)} onToggle={toggleTimer} onReset={resetTimer}
        storageOk={storageOk} busy={busy} onUpload={uploadMany} onAttach={attach} onPreview={setPreview} onDownload={downloadFile}
        onRemoveFile={(file, taskId) => setFileConfirm({ file, taskId })} onDiscard={fs => fs.forEach(f => deleteIfUnused(f, []))} />
      <AlertDialog open={!!confirmId} title="Delete this task?"
        description={`“${(tasks[confirmId] || {}).title || ''}” and its tracked time${((tasks[confirmId] || {}).files || []).length ? ' and attached documents' : ''} will be removed. This can’t be undone.`}
        confirmLabel="Delete task" onConfirm={doDelete} onCancel={() => setConfirmId(null)} />
      {cellEdit && tasks[cellEdit.id] && (
        <CellEditor key={cellEdit.id + cellEdit.field} edit={cellEdit} task={{ ...tasks[cellEdit.id], status: S[tasks[cellEdit.id].status] ? tasks[cellEdit.id].status : 'todo' }}
          ctx={{ update: updateTask, people, projects, stages, ensureProject, addStage, deleteStage, editStatuses: () => setStatusesOpen(true) }} onClose={() => setCellEdit(null)} />
      )}
      <StatusesDialog open={statusesOpen} stages={stages} tasks={all} onClose={() => setStatusesOpen(false)}
        onSave={list => { saveStages(list); setStatusesOpen(false); toast('Statuses saved'); }} />
      <ProjectDialog open={!!projectEdit} project={projectEdit && projectEdit.project} names={projects} onClose={() => setProjectEdit(null)} onSave={saveProject} />
      <AlertDialog open={!!projectDelete} title={`Delete “${projectDelete ? projectDelete.name : ''}”?`}
        description={projectDelete ? (() => {
          const n = norm(projectDelete.name);
          const tc = all.filter(t => norm(t.project) === n).length;
          const rc = rules.filter(r => norm(r.project) === n || ((r.action === 'copy' || r.action === 'move') && norm(r.target) === n)).length;
          return `The tasks stay. ${tc ? `${tc} ${tc === 1 ? 'task moves' : 'tasks move'} to “No project”. ` : ''}${rc ? `${rc} ${rc === 1 ? 'automation that uses' : 'automations that use'} this project will be removed.` : ''}`;
        })() : ''}
        confirmLabel="Delete project" onConfirm={deleteProject} onCancel={() => setProjectDelete(null)} />
      <AutomationsDialog open={rulesOpen} onClose={() => setRulesOpen(false)} rules={rules} projects={projects} people={people} me={me.name}
        onSave={list => { saveRules(list); setRulesOpen(false); toast('Automations saved'); }} />
      <ShortcutsDialog open={keysOpen} onClose={() => setKeysOpen(false)} />
      <AddDocsDialog open={addDocs.open} files={addDocs.files} setFiles={fn => setAddDocs(a => ({ ...a, files: typeof fn === 'function' ? fn(a.files) : fn }))} tasks={all} projects={projects} busy={busy}
        onClose={() => setAddDocs({ open: false, files: [] })} onSubmit={submitDocs} />
      <PreviewDialog file={preview} onClose={() => setPreview(null)} onDownload={downloadFile} />
      <AlertDialog open={!!fileConfirm} title="Remove this document?"
        description={fileConfirm ? `“${fileConfirm.file.name}” will be removed from this task.` : ''}
        confirmLabel="Remove document" onConfirm={doRemoveFile} onCancel={() => setFileConfirm(null)} />
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
            {sheet.open ? 'Drop to attach to this task' : addDocs.open ? 'Drop to add to the list' : 'Drop to add documents'}
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

const STANDALONE_ID = (() => { const m = (window.location.hash || '').match(/^#task=(.+)$/); return m ? decodeURIComponent(m[1]) : null; })();

export default function Root() {
  const prof = useProfile();
  return (
    <MeContext.Provider value={prof.data.user || null}>
      {!prof.loaded ? <div className="p-8 text-sm text-muted-foreground">Loading…</div>
        : !prof.data.user ? <SignIn prof={prof} />
        : <App prof={prof} standaloneId={STANDALONE_ID} />}
      <Toaster />
    </MeContext.Provider>
  );
}
