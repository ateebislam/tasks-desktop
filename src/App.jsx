
import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
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
  <button ref={ref} type={type} className={cn('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50', buttonVariants[variant], buttonSizes[size], className)} {...p} />
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

const Card = ({ className, ...p }) => <div className={cn('rounded-xl border bg-card text-card-foreground shadow', className)} {...p} />;

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
function Sheet({ open, onClose, children, labelledBy }) {
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
      <div className="fixed inset-0 z-50 bg-black/80 anim-fade" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy}
        className="fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l bg-background shadow-lg sm:max-w-md anim-sheet"
        style={{ paddingTop: 'env(safe-area-inset-top,0px)', paddingBottom: 'env(safe-area-inset-bottom,0px)' }}>
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
  { id: 'todo', label: 'To do', dot: 'bg-zinc-400' },
  { id: 'doing', label: 'In progress', dot: 'bg-blue-500' },
  { id: 'blocked', label: 'Blocked', dot: 'bg-red-500' },
  { id: 'done', label: 'Done', dot: 'bg-emerald-500' },
];
const S = Object.fromEntries(STATUSES.map((s, i) => [s.id, { ...s, i }]));
const LS = 'tasks-cache-v1';
const LS_RULES = 'tasks-rules-v1';
const RULES_DOC = '_rules';
const DEFAULT_PROJECTS = ['Kaufes - Mobile', 'Kaufes - Web'];
const DEFAULT_RULES = [{ id: 'r-kaufes', from: 'Kaufes - Mobile', to: 'Kaufes - Web', enabled: true }];
const norm = s => (s || '').trim().toLowerCase();
const LS_VIEW = 'tasks-view-v1';
const PRIORITIES = [{ id: 'low', label: 'Low', i: 2 }, { id: 'normal', label: 'Normal', i: 1 }, { id: 'high', label: 'High', i: 0 }];
const P = Object.fromEntries(PRIORITIES.map(p => [p.id, p]));
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

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

function useTasks() {
  const [loaded, setLoaded] = useState(false);
  const [tasks, setTasks] = useState({});
  const [rules, setRules] = useState(DEFAULT_RULES);
  useEffect(() => {
    (async () => {
      try {
        const raw = await invoke('read_store', { name: 'data' });
        if (raw) {
          const d = JSON.parse(raw);
          setTasks(d.tasks || {});
          if (Array.isArray(d.rules)) setRules(d.rules);
        }
      } catch (e) { toast('Couldn’t read your saved tasks', String(e)); }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => { if (loaded) persist('data', { version: 1, tasks, rules }); }, [tasks, rules, loaded]);
  const saveMany = useCallback(list => {
    const stamped = list.map(t => ({ ...t, updatedAt: Date.now() }));
    setTasks(p => { const n = { ...p }; stamped.forEach(t => { n[t.id] = t; }); return n; });
  }, []);
  const remove = useCallback(id => { setTasks(p => { const n = { ...p }; delete n[id]; return n; }); }, []);
  const saveRules = useCallback(list => setRules(list), []);
  return { tasks, saveMany, remove, rules, saveRules, loaded };
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
  pdf: { label: 'PDF', short: 'PDF', cls: 'border-red-200 bg-red-50 text-red-700' },
  word: { label: 'Word document', short: 'DOC', cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  html: { label: 'HTML page', short: 'HTML', cls: 'border-orange-200 bg-orange-50 text-orange-700' },
  image: { label: 'Image', short: 'IMG', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  sheet: { label: 'Spreadsheet', short: 'XLS', cls: 'border-green-200 bg-green-50 text-green-700' },
  slides: { label: 'Presentation', short: 'PPT', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  text: { label: 'Text file', short: 'TXT', cls: 'border-zinc-200 bg-zinc-50 text-zinc-600' },
  other: { label: 'File', short: 'FILE', cls: 'border-zinc-200 bg-zinc-50 text-zinc-600' },
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

function StatusBadge({ status }) {
  const s = S[status] || S.todo;
  return <Badge variant="outline" className="font-medium"><span className={cn('size-1.5 rounded-full', s.dot)} />{s.label}</Badge>;
}

function TimerButton({ task, onToggle }) {
  const on = !!task.timerStartedAt;
  return (
    <Button size="sm" variant={on ? 'default' : 'outline'} onClick={e => { e.stopPropagation(); onToggle(task.id); }}
      aria-label={`${on ? 'Pause' : 'Start'} timer for ${task.title}`} className="tnum w-[6.5rem] justify-start">
      {on ? <I.pause className="size-3.5" /> : <I.play className="size-3.5" />}{fmt(elapsed(task))}
    </Button>
  );
}

/* ---------- Compact task sheet ---------- */
const ghostField = 'h-8 w-full rounded-md border border-transparent bg-transparent px-2 text-sm shadow-none transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-0 focus-visible:border-input focus-visible:bg-background placeholder:text-muted-foreground';
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
  <div className={cn('flex items-start gap-2 rounded-md px-2.5 py-1.5 text-xs leading-relaxed', tone === 'amber' ? 'bg-amber-50 text-amber-900' : tone === 'red' ? 'bg-red-50 text-red-800' : 'bg-muted text-muted-foreground')}>
    {children}
  </div>
);
const MiniLink = ({ t, tone, onOpen }) => (
  <button type="button" onClick={() => onOpen(t.id)}
    className={cn('group flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', tone === 'red' && 'text-red-700')}>
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

function TaskSheet({ open, task, people, projects, rules, defaultProject, defaultAssignee, dropRef, allTasks, onOpen, onPatch, onClose, onSave, onDelete, onToggle, onReset, storageOk, busy, onUpload, onAttach, onPreview, onDownload, onRemoveFile, onDiscard }) {
  const [form, setForm] = useState(null);
  const titleRef = useRef(null);
  useEffect(() => {
    if (open) {
      const init = { title: task?.title || '', project: task ? (task.project || '') : (defaultProject || ''), status: task?.status || 'todo', assignee: task ? (task.assignee || '') : (defaultAssignee || ''), deadline: task?.deadline || '', description: task?.description || '', priority: task?.priority || 'normal', checklist: task?.checklist || [] };
      if (!task) init.files = [];
      setForm(init);
      if (!task) setTimeout(() => titleRef.current && titleRef.current.focus(), 50);
    }
  }, [open, task?.id]);
  if (!open || !form) return null;
  const set = k => v => setForm(f => ({ ...f, [k]: v && v.target ? v.target.value : v }));
  const submit = e => {
    e && e.preventDefault();
    if (!form.title.trim()) { titleRef.current.focus(); toast('Add a title to save this task'); return; }
    onSave({ ...form, title: form.title.trim(), assignee: form.assignee.trim(), project: form.project.trim() });
  };
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
  const cancel = () => { if (!task && (form.files || []).length) onDiscard(form.files); onClose(); };
  // Files dropped onto the window while this sheet is open get attached here.
  if (dropRef) dropRef.current = addFiles;
  const chooseFiles = () => pickFiles().then(fs => { if (fs.length) addFiles(fs); });
  const inProgress = allTasks.filter(o => o.status === 'doing' && o.id !== task?.id);
  const blocker = task?.status === 'blocked' && task.blockedBy ? allTasks.find(o => o.id === task.blockedBy) : null;
  const blocking = task ? allTasks.filter(o => o.status === 'blocked' && o.blockedBy === task.id) : [];
  const generatedFrom = task?.generatedFrom ? allTasks.find(o => o.id === task.generatedFrom) : null;
  const followUps = task ? allTasks.filter(o => o.generatedFrom === task.id) : [];
  const autoRules = rules.filter(r => r.enabled && r.from && norm(r.from) === norm(form.project) && norm(r.to) && norm(r.to) !== norm(r.from) && !(task?.followUps || {})[r.id]);
  const overdue = form.deadline && form.status !== 'done' && dayDiff(form.deadline) < 0;
  const doneCount = form.checklist.filter(c => c.done).length;
  const canUpload = storageOk !== false;

  return (
    <Sheet open={open} onClose={cancel} labelledBy="sheet-title">
      <form onSubmit={submit} className="flex h-full flex-col" autoComplete="off"
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }}>
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4 pr-12 text-xs text-muted-foreground">
          <span id="sheet-title" className="text-sm font-medium text-foreground">{task ? 'Task' : 'New task'}</span>
          {task && <span>Created {fmtDay(task.createdAt)}</span>}
          {generatedFrom && <span className="inline-flex items-center gap-1"><I.zap className="size-3" />Auto</span>}
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-y-auto px-3 py-4">

          <textarea ref={titleRef} rows={1} value={form.title} onChange={set('title')} placeholder="Task title" aria-label="Task title"
            onKeyDown={e => { if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) e.preventDefault(); }}
            style={{ fieldSizing: 'content' }}
            className="block w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1 text-lg font-semibold leading-snug placeholder:text-muted-foreground/60 hover:bg-muted/60 focus-visible:outline-none focus-visible:border-input focus-visible:bg-background" />

          {/* Properties */}
          <div className="mt-3 grid gap-0.5 px-2">
            <PropRow label="Status" htmlFor="t-status">
              <div className="relative">
                <span className={cn('pointer-events-none absolute left-2.5 top-1/2 size-2 -translate-y-1/2 rounded-full', S[form.status].dot)} />
                <select id="t-status" value={form.status} onChange={set('status')} className={cn(ghostField, 'cursor-pointer appearance-none pl-7')}>
                  {STATUSES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                </select>
              </div>
            </PropRow>
            <PropRow label="Priority">
              <div role="radiogroup" aria-label="Priority" className="inline-flex rounded-md bg-muted p-0.5 ml-1">
                {['low', 'normal', 'high'].map(pid => (
                  <button key={pid} type="button" role="radio" aria-checked={form.priority === pid} onClick={() => set('priority')(pid)}
                    className={cn('inline-flex h-7 items-center gap-1 rounded px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                      form.priority === pid ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                    {pid === 'high' && <I.flag className={cn('size-3', form.priority === 'high' && 'text-red-600')} />}{P[pid].label}
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
                className={cn('h-8 px-2 hover:bg-muted', overdue && 'text-red-600 font-medium')} />
            </PropRow>
            {task && (
              <PropRow label="Time">
                <div className="flex items-center gap-1 pl-2">
                  <span className={cn('tnum min-w-[4.5rem] text-sm font-medium', on && 'text-emerald-600')}>{fmt(elapsed(task))}</span>
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
                  <span>Saving blocks {inProgress.length === 1 ? `“${inProgress[0].title}”` : `${inProgress.length} in-progress tasks`}.</span></Note>
              )}
              {blocker && form.status !== 'blocked' && <Note><I.x className="mt-0.5 size-3 shrink-0" /><span>Saving removes the blocker.</span></Note>}
              {autoRules.length > 0 && form.status !== 'done' && (
                <Note><I.zap className="mt-0.5 size-3 shrink-0" /><span>When done, a copy is created in {autoRules.map(r => r.to).join(' and ')}.</span></Note>
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

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-2 border-t px-4 py-2.5">
          {task && <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={onDelete} aria-label="Delete task"><I.trash /></Button>}
          <span className="hidden text-xs text-muted-foreground sm:inline">Ctrl + Enter to save</span>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={cancel}>Cancel</Button>
          <Button type="submit" size="sm">{task ? 'Save' : 'Create task'}</Button>
        </div>
      </form>
    </Sheet>
  );
}

function Checklist({ items, onChange }) {
  const [text, setText] = useState('');
  const add = () => { const v = text.trim(); if (!v) return; onChange([...items, { id: newId(), text: v, done: false }]); setText(''); };
  return (
    <div className="grid">
      {items.map(it => (
        <div key={it.id} className="group flex min-h-8 items-center gap-2.5 rounded-md px-2 hover:bg-muted/60">
          <Checkbox checked={it.done} label={it.text} onChange={v => onChange(items.map(x => x.id === it.id ? { ...x, done: v } : x))} />
          <span className={cn('flex-1 py-1 text-sm', it.done && 'text-muted-foreground line-through')}>{it.text}</span>
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

const SHORTCUTS = [['New task', 'N'], ['Search tasks', '/'], ['Clear search or close a panel', 'Esc'], ['Show this list', '?']];
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

function AutomationsDialog({ open, onClose, rules, projects, onSave }) {
  const [draft, setDraft] = useState(rules);
  useEffect(() => { if (open) setDraft(rules); }, [open]);
  const upd = (id, patch) => setDraft(d => d.map(r => r.id === id ? { ...r, ...patch } : r));
  const valid = draft.every(r => r.from.trim() && r.to.trim() && norm(r.from) !== norm(r.to));
  const folder = () => <I.folder className="text-muted-foreground" />;
  return (
    <Dialog open={open} onClose={onClose} title="Automations"
      description="When a task in one project is marked done, a copy is created in another project with the same title, description, assignee and deadline. The copy starts in To do."
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!valid} onClick={() => onSave(draft.map(r => ({ ...r, from: r.from.trim(), to: r.to.trim() })))}>Save automations</Button>
      </>}>
      <div className="grid gap-3">
        {draft.length === 0 && <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No automations yet. Add one to copy finished tasks into another project.</p>}
        {draft.map(r => (
          <Card key={r.id} className={cn('p-4 shadow-none', !r.enabled && 'bg-muted/40')}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Switch checked={r.enabled} onChange={v => upd(r.id, { enabled: v })} label="Turn automation on or off" />
                {r.enabled ? 'On' : 'Off'}
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Delete automation" onClick={() => setDraft(d => d.filter(x => x.id !== r.id))}><I.trash /></Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <Field label="When a task in" htmlFor={`from-${r.id}`}>
                <Combobox id={`from-${r.id}`} value={r.from} onChange={v => upd(r.id, { from: v })} options={projects} placeholder="Project" createLabel={v => `Use “${v}”`} icon={folder} />
              </Field>
              <div className="hidden h-9 items-center text-muted-foreground sm:flex"><I.arrowRight /></div>
              <Field label="is done, create a copy in" htmlFor={`to-${r.id}`}>
                <Combobox id={`to-${r.id}`} value={r.to} onChange={v => upd(r.id, { to: v })} options={projects} placeholder="Project" createLabel={v => `Use “${v}”`} icon={folder} />
              </Field>
            </div>
            {r.from.trim() && r.to.trim() && norm(r.from) === norm(r.to) && <p className="mt-2 text-[0.8rem] text-destructive">Pick two different projects.</p>}
          </Card>
        ))}
        <Button variant="outline" className="justify-start border-dashed" onClick={() => setDraft(d => [...d, { id: 'r-' + newId(), from: '', to: '', enabled: true }])}><I.plus />Add automation</Button>
      </div>
    </Dialog>
  );
}

function App({ prof }) {
  const me = prof.data.user;
  const { tasks, saveMany, remove, rules, saveRules, loaded } = useTasks();
  const savedView = useMemo(() => { try { return JSON.parse(localStorage.getItem(LS_VIEW)) || {}; } catch (e) { return {}; } }, []);
  const [projectFilter, setProjectFilter] = useState(savedView.projectFilter || 'all');
  const [view, setView] = useState(savedView.view === 'docs' ? 'docs' : 'tasks');
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
  const [sheet, setSheet] = useState({ open: false, id: null });
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
  const projects = useMemo(() => [...new Set([...DEFAULT_PROJECTS, ...rules.flatMap(r => [r.from, r.to]), ...all.map(t => t.project)].map(p => (p || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [all, rules]);
  const scoped = useMemo(() => {
    const q = norm(query);
    return all.filter(t => (projectFilter === 'all' || (projectFilter === 'none' ? !t.project : t.project === projectFilter))
      && (!q || [t.title, t.description, t.assignee, t.project, ...(t.checklist || []).map(c => c.text), ...(t.files || []).map(f => f.name)].some(v => norm(v).includes(q))));
  }, [all, projectFilter, query]);
  const counts = useMemo(() => { const c = { all: scoped.length }; STATUSES.forEach(s => { c[s.id] = scoped.filter(t => t.status === s.id).length; }); return c; }, [scoped]);

  const shown = useMemo(() => {
    const by = {
      deadline: (a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999') || b.createdAt - a.createdAt,
      created: (a, b) => b.createdAt - a.createdAt,
      status: (a, b) => S[a.status].i - S[b.status].i || b.createdAt - a.createdAt,
      assignee: (a, b) => (a.assignee || '~').localeCompare(b.assignee || '~') || b.createdAt - a.createdAt,
      project: (a, b) => (a.project || '~').localeCompare(b.project || '~') || b.createdAt - a.createdAt,
      priority: (a, b) => P[a.priority || 'normal'].i - P[b.priority || 'normal'].i || (a.deadline || '9999').localeCompare(b.deadline || '9999'),
    }[sortBy] || ((a, b) => b.createdAt - a.createdAt);
    return scoped.filter(t => filter === 'all' || t.status === filter).sort((a, b) => {
      if (sortBy !== 'status' && (a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1;
      return by(a, b);
    });
  }, [scoped, filter, sortBy]);

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
  // Automations: when a task in a source project is marked done, copy it into the target project.
  const automate = (next, prev) => {
    if (next.status !== 'done' || (prev && prev.status === 'done')) return { task: next, created: [] };
    const already = next.followUps || {};
    const created = rules
      .filter(r => r.enabled && norm(r.from) && norm(r.from) === norm(next.project) && norm(r.to) && norm(r.to) !== norm(r.from) && !already[r.id])
      .map(r => ({
        id: newId(), title: next.title, description: next.description || '', assignee: next.assignee || '', deadline: next.deadline || '',
        files: next.files || [], priority: next.priority || 'normal', checklist: (next.checklist || []).map(c => ({ ...c, id: newId(), done: false })),
        project: r.to, status: 'todo', createdAt: Date.now(), timeSpent: 0, timerStartedAt: null, blockedBy: null,
        generatedFrom: next.id, generatedBy: r.id,
      }));
    if (!created.length) return { task: next, created };
    const followUps = { ...already }; created.forEach(c => { followUps[c.generatedBy] = c.id; });
    return { task: { ...next, followUps }, created };
  };
  const notifyCreated = list => toast(
    list.length === 1 ? `Follow-up created in ${list[0].project}` : `${list.length} follow-up tasks created`,
    `“${list[0].title}” is waiting in To do.`);
  const toggleTimer = id => {
    const t = tasks[id]; if (!t) return;
    if (t.timerStartedAt) { saveMany([stopT(t)]); return; }
    const others = Object.values(tasks).filter(o => o.id !== id && o.timerStartedAt).map(stopT);
    const next = { ...t, status: t.status === 'todo' ? 'doing' : t.status, timerStartedAt: Date.now() };
    const blocked = blockOthers(next, t);
    saveMany(merge([...others, ...blocked, next]));
    notifyBlocked(blocked, next);
  };
  const resetTimer = id => { const t = tasks[id]; if (t) saveMany([{ ...t, timeSpent: 0, timerStartedAt: null, sessions: [] }]); };
  const markDone = id => {
    const t = tasks[id]; if (!t) return;
    const auto = automate({ ...stopT(t), status: 'done', blockedBy: null }, t);
    saveMany([auto.task, ...auto.created]);
    if (auto.created.length) notifyCreated(auto.created); else toast('Marked as done', t.title);
  };
  const addQuick = e => {
    e.preventDefault();
    const v = quick.trim();
    if (!v) { setSheet({ open: true, id: null }); return; }
    saveMany([{ id: newId(), title: v, status: 'todo', assignee: me.name || '', deadline: '', description: '', createdAt: Date.now(), timeSpent: 0, timerStartedAt: null }]);
    setQuick('');
  };
  const saveSheet = form => {
    const existing = sheet.id && tasks[sheet.id];
    const base = existing || { id: newId(), createdAt: Date.now(), timeSpent: 0, timerStartedAt: null };
    let next = { ...base, ...form };
    if (next.status !== 'blocked') next.blockedBy = null;
    if ((form.status === 'done' || form.status === 'blocked') && next.timerStartedAt) next = stopT(next);
    const blocked = blockOthers(next, existing);
    const auto = automate(next, existing);
    next = auto.task;
    saveMany([...blocked, next, ...auto.created]);
    setSheet({ open: false, id: null });
    if (auto.created.length) notifyCreated(auto.created);
    else if (blocked.length) notifyBlocked(blocked, next);
    else toast(existing ? 'Task saved' : 'Task added', next.title);
  };
  const doDelete = () => {
    const t = tasks[confirmId]; remove(confirmId); setConfirmId(null); setSheet({ open: false, id: null });
    if (t) (t.files || []).forEach(f => deleteIfUnused(f, [t.id]));
    toast('Task deleted', t && t.title);
  };
  const closeSheet = useCallback(() => setSheet({ open: false, id: null }), []);
  const patch = (id, p) => { const t = tasksRef.current[id]; if (t) saveMany([{ ...t, ...p }]); };

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
    saveMany([{ ...t, files: [...(t.files || []), ...metas] }]);
    toast(metas.length === 1 ? 'Document attached' : `${metas.length} documents attached`, t.title);
  };
  const submitDocs = async (files, { target, project }) => {
    const metas = await uploadMany(files);
    if (!metas.length) return;
    if (target === '__new') {
      const now = Date.now();
      saveMany(metas.map((m, i) => ({
        id: newId(), title: m.name.replace(/\.[^.]+$/, ''), status: 'todo', assignee: me.name || '', deadline: '', description: '',
        project, priority: 'normal', checklist: [], files: [m], createdAt: now + i, timeSpent: 0, timerStartedAt: null,
      })));
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
    saveMany([c]); setSheet({ open: true, id: c.id }); toast('Task duplicated', 'Edit the copy, then save.');
  };
  useEffect(() => {
    const k = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      if (document.querySelector('[role=dialog],[role=alertdialog]')) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setSheet({ open: true, id: null }); }
      else if (e.key === '/' && searchRef.current) { e.preventDefault(); searchRef.current.focus(); }
      else if (e.key === '?') { e.preventDefault(); setKeysOpen(true); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);
  const sheetTask = sheet.id ? all.find(t => t.id === sheet.id) : null;
  if (!loaded) return <div className="p-8 text-sm text-muted-foreground">Loading your tasks…</div>;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <I.hdd className="size-3.5" />Saved on this computer
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setSheet({ open: true, id: null })}><I.plus />New task</Button>
          <DropdownMenu
            trigger={p => <Button {...p} variant="outline" size="icon" aria-label="More tools"><I.more /></Button>}
            items={[
              { label: 'Automations', icon: <I.zap />, shortcut: `${rules.filter(r => r.enabled).length} on`, onSelect: () => setRulesOpen(true) },
              { label: showSummary ? 'Hide time summary' : 'Show time summary', icon: <I.chart />, onSelect: () => setShowSummary(v => !v) },
              { label: 'Keyboard shortcuts', icon: <I.keyboard />, shortcut: '?', onSelect: () => setKeysOpen(true) },
            ]} />
          <DropdownMenu
            trigger={p => (
              <button {...p} type="button" aria-label="Your account" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar name={me.name} picture={me.picture} className="h-9 w-9" />
              </button>
            )}
            items={[
              { label: 'Profile', icon: <I.user />, onSelect: () => setProfileOpen(true) },
              'sep',
              { label: 'Back up data…', icon: <I.download />, onSelect: backup },
              { label: 'Restore from backup…', icon: <I.upload />, onSelect: chooseRestore },
              { label: 'Open data folder', icon: <I.folder />, onSelect: () => invoke('open_data_folder').catch(e => toast('Couldn’t open the folder', String(e))) },
            ]} />
        </div>
      </div>

      {/* View switch */}
      <nav className="mt-6 flex gap-6 border-b" aria-label="Sections">
        {[{ id: 'tasks', label: 'Tasks', count: all.length }, { id: 'docs', label: 'Documents', count: docs.length }].map(v => (
          <button key={v.id} type="button" onClick={() => setView(v.id)} aria-current={view === v.id ? 'page' : undefined}
            className={cn('-mb-px flex items-center gap-2 border-b-2 pb-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:text-foreground',
              view === v.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {v.label}<span className="tnum rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{v.count}</span>
          </button>
        ))}
      </nav>

      {/* Running timer */}
      {running && (
        <Alert className="sticky z-10 mt-6 flex items-center gap-4 bg-background shadow-sm" style={{ top: 'calc(0.75rem + env(safe-area-inset-top,0px))' }}>
          <span className="relative flex size-2.5 shrink-0">
            <span className="anim-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">Timing</div>
            <button type="button" onClick={() => setSheet({ open: true, id: running.id })} className="block max-w-full truncate text-left font-medium hover:underline underline-offset-4">{running.title}</button>
          </div>
          <span className="tnum text-2xl font-semibold tracking-tight sm:text-3xl">{fmt(elapsed(running))}</span>
          <Button variant="outline" size="sm" onClick={() => toggleTimer(running.id)}><I.pause className="size-3.5" />Pause</Button>
        </Alert>
      )}

      {view === 'docs' ? (
        <DocumentsView docs={docs} dragOver={dragOver && !sheet.open && !addDocs.open} onAdd={fs => setAddDocs({ open: true, files: fs })} onPreview={setPreview} onDownload={downloadFile}
          onRemove={(file, taskId) => setFileConfirm({ file, taskId })} onOpenTask={id => setSheet({ open: true, id })} />
      ) : (<>
      {showSummary && <TimeSummary tasks={all} onHide={() => setShowSummary(false)} />}

      {/* Quick add (Input Group) */}
      <form onSubmit={addQuick} className="mt-6 flex gap-2" autoComplete="off">
        <div className="relative flex-1">
          <Input value={quick} onChange={e => setQuick(e.target.value)} placeholder="Add a task…" aria-label="New task title" className="h-10 pr-16" />
          <Kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex">Enter ↵</Kbd>
        </div>
        <Button type="submit" variant="secondary" className="h-10">Add</Button>
      </form>

      {/* Toolbar */}
      <div className="mt-6 flex items-center gap-2">
        <div className="relative flex-1">
          <I.search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks" aria-label="Search tasks" className="pl-9 pr-10"
            onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setQuery(''); e.currentTarget.blur(); } }} />
          {query
            ? <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm opacity-60 hover:opacity-100"><I.x /></button>
            : <Kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex">/</Kbd>}
        </div>
        <Popover align="end" className="w-72 p-4"
          trigger={p => (
            <Button {...p} variant="outline">
              <I.sliders />View
              {projectFilter !== 'all' && <Badge variant="secondary" className="max-w-[9rem] truncate px-1.5 py-0">{projectFilter === 'none' ? 'No project' : projectFilter}</Badge>}
            </Button>
          )}>
          <div className="grid gap-4">
            <Field label="Project" htmlFor="v-project">
              <NativeSelect id="v-project" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
                <option value="all">All projects</option>
                {projects.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="none">No project</option>
              </NativeSelect>
            </Field>
            <Field label="Sort by" htmlFor="v-sort">
              <NativeSelect id="v-sort" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="deadline">Deadline</option>
                <option value="priority">Priority</option>
                <option value="created">Newest</option>
                <option value="status">Status</option>
                <option value="assignee">Assignee</option>
                <option value="project">Project</option>
              </NativeSelect>
            </Field>
            {(projectFilter !== 'all' || sortBy !== 'deadline') && (
              <Button variant="ghost" size="sm" className="justify-start px-2" onClick={() => { setProjectFilter('all'); setSortBy('deadline'); }}><I.reset />Reset view</Button>
            )}
          </div>
        </Popover>
      </div>
      <div className="mt-3">
        <Tabs value={filter} onChange={setFilter} items={[{ value: 'all', label: 'All', count: counts.all }, ...STATUSES.map(s => ({ value: s.id, label: s.label, count: counts[s.id] }))]} />
      </div>

      {/* Table */}
      <Card className="mt-4 overflow-hidden">
        {all.length === 0 ? (
          <Empty icon={<I.clipboard />} title="No tasks yet" description="Type a task above and press Enter, or open the full form to add an assignee, deadline and description.">
            <Button variant="outline" size="sm" onClick={() => setSheet({ open: true, id: null })}><I.plus />New task</Button>
          </Empty>
        ) : shown.length === 0 && query ? (
          <Empty icon={<I.search />} title={`No tasks match “${query}”`} description="Try a different word, or clear the search to see everything.">
            <Button variant="outline" size="sm" onClick={() => setQuery('')}>Clear search</Button>
          </Empty>
        ) : shown.length === 0 ? (
          <Empty icon={<I.clipboard />} title={`Nothing in ${S[filter].label.toLowerCase()}`} description="Switch to another tab to see the rest of your tasks.">
            <Button variant="outline" size="sm" onClick={() => setFilter('all')}>Show all tasks</Button>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 w-[130px] hidden sm:table-cell">Status</TableHead>
                <TableHead className="pl-4 sm:pl-2">Task</TableHead>
                <TableHead className="hidden md:table-cell w-[170px]">Assignee</TableHead>
                <TableHead className="hidden sm:table-cell w-[130px]">Deadline</TableHead>
                <TableHead className="w-[112px]">Time</TableHead>
                <TableHead className="w-[48px] pr-4"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map(t => {
                const d = due(t), on = !!t.timerStartedAt, done = t.status === 'done';
                const snippet = (t.description || '').split('\n').find(l => l.trim());
                return (
                  <TableRow key={t.id} data-state={on ? 'selected' : undefined} className="cursor-pointer" onClick={() => setSheet({ open: true, id: t.id })}>
                    <TableCell className="pl-4 hidden sm:table-cell"><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="pl-4 sm:pl-2 max-w-0 w-full">
                      <button type="button" className={cn('block max-w-full truncate text-left font-medium focus-visible:outline-none focus-visible:underline', done && 'text-muted-foreground line-through')}>{t.title}</button>
                      {(t.project || t.generatedFrom || t.priority === 'high' || (t.checklist || []).length > 0 || (t.files || []).length > 0) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {t.priority === 'high' && !done && <Badge variant="outline" className="border-red-200 bg-red-50 font-medium text-red-700"><I.flag className="size-3" />High</Badge>}
                          {(t.files || []).length > 0 && <Badge variant="outline" className="tnum font-medium text-muted-foreground"><I.paperclip className="size-3" />{t.files.length}</Badge>}
                          {(t.checklist || []).length > 0 && <Badge variant="outline" className="tnum font-medium text-muted-foreground"><I.listCheck className="size-3" />{t.checklist.filter(c => c.done).length}/{t.checklist.length}</Badge>}
                          {t.project && <Badge variant="secondary" className="font-medium"><I.folder className="size-3" />{t.project}</Badge>}
                          {t.generatedFrom && <Badge variant="outline" className="font-medium text-muted-foreground"><I.zap className="size-3" />Auto</Badge>}
                        </div>
                      )}
                      {t.status === 'blocked' && tasks[t.blockedBy] && (
                        <button type="button" onClick={e => { e.stopPropagation(); setSheet({ open: true, id: t.blockedBy }); }}
                          className="mt-0.5 block max-w-full truncate text-left text-xs text-red-600 hover:underline underline-offset-4">
                          Blocked by “{tasks[t.blockedBy].title}”
                        </button>
                      )}
                      {snippet && <div className="truncate text-xs text-muted-foreground mt-0.5">{snippet}</div>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:hidden">
                        <StatusBadge status={t.status} />
                        <span className={dueCls[d.tone]}>{d.text}</span>
                        {t.assignee && <span className="text-muted-foreground">{t.assignee}</span>}
                      </div>
                      {t.assignee && <div className="hidden sm:block md:hidden text-xs text-muted-foreground mt-0.5">{t.assignee}</div>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {t.assignee
                        ? <span className="flex items-center gap-2 min-w-0"><Avatar name={t.assignee} /><span className="truncate">{t.assignee}</span></span>
                        : <span className="text-muted-foreground">Unassigned</span>}
                    </TableCell>
                    <TableCell className={cn('hidden sm:table-cell whitespace-nowrap', dueCls[d.tone])}>{d.text}</TableCell>
                    <TableCell><TimerButton task={t} onToggle={toggleTimer} /></TableCell>
                    <TableCell className="pr-4 text-right">
                      <DropdownMenu
                        trigger={p => <Button {...p} variant="ghost" size="icon-sm" aria-label={`Actions for ${t.title}`}><I.more /></Button>}
                        items={[
                          { label: 'Edit', icon: <I.pencil />, onSelect: () => setSheet({ open: true, id: t.id }) },
                          { label: on ? 'Pause timer' : 'Start timer', icon: on ? <I.pause /> : <I.play />, onSelect: () => toggleTimer(t.id) },
                          ...(done ? [] : [{ label: 'Mark as done', icon: <I.check />, onSelect: () => markDone(t.id) }]),
                          { label: 'Duplicate', icon: <I.copy />, onSelect: () => duplicate(t.id) },
                          'sep',
                          { label: 'Delete', icon: <I.trash />, destructive: true, onSelect: () => setConfirmId(t.id) },
                        ]} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
      </>)}

      <TaskSheet open={sheet.open} task={sheetTask} people={people} defaultAssignee={me.name} dropRef={sheetDrop} projects={projects} rules={rules} defaultProject={projectFilter !== 'all' && projectFilter !== 'none' ? projectFilter : ''} allTasks={all} onOpen={id => setSheet({ open: true, id })} onPatch={patch} onClose={closeSheet}
        onSave={saveSheet} onDelete={() => setConfirmId(sheet.id)} onToggle={toggleTimer} onReset={resetTimer}
        storageOk={storageOk} busy={busy} onUpload={uploadMany} onAttach={attach} onPreview={setPreview} onDownload={downloadFile}
        onRemoveFile={(file, taskId) => setFileConfirm({ file, taskId })} onDiscard={fs => fs.forEach(f => deleteIfUnused(f, []))} />
      <AlertDialog open={!!confirmId} title="Delete this task?"
        description={`“${(tasks[confirmId] || {}).title || ''}” and its tracked time${((tasks[confirmId] || {}).files || []).length ? ' and attached documents' : ''} will be removed. This can’t be undone.`}
        confirmLabel="Delete task" onConfirm={doDelete} onCancel={() => setConfirmId(null)} />
      <AutomationsDialog open={rulesOpen} onClose={() => setRulesOpen(false)} rules={rules} projects={projects}
        onSave={list => { saveRules(list); setRulesOpen(false); toast('Automations saved'); }} />
      <ShortcutsDialog open={keysOpen} onClose={() => setKeysOpen(false)} />
      <AddDocsDialog open={addDocs.open} files={addDocs.files} setFiles={fn => setAddDocs(a => ({ ...a, files: typeof fn === 'function' ? fn(a.files) : fn }))} tasks={all} projects={projects} busy={busy}
        onClose={() => setAddDocs({ open: false, files: [] })} onSubmit={submitDocs} />
      <PreviewDialog file={preview} onClose={() => setPreview(null)} onDownload={downloadFile} />
      <AlertDialog open={!!fileConfirm} title="Remove this document?"
        description={fileConfirm ? `“${fileConfirm.file.name}” will be removed from this task.` : ''}
        confirmLabel="Remove document" onConfirm={doRemoveFile} onCancel={() => setFileConfirm(null)} />
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

export default function Root() {
  const prof = useProfile();
  return (
    <MeContext.Provider value={prof.data.user || null}>
      {!prof.loaded ? <div className="p-8 text-sm text-muted-foreground">Loading…</div>
        : !prof.data.user ? <SignIn prof={prof} />
        : <App prof={prof} />}
      <Toaster />
    </MeContext.Provider>
  );
}
