/* Full-text tooltips for cut-off text.
   Anywhere in the app, text that ends in "…" because it doesn't fit (Tailwind's `truncate`, any
   text-overflow: ellipsis, or a line-clamp) shows its full text in a small tooltip when you point at it
   or tab to it. Text that fits shows nothing.
   - One listener for the whole document, so every list, table, chip, menu and dialog gets it, including
     ones added later. Nothing to wire up per component.
   - A short delay (TIP_DELAY) before the first tooltip. Once one is showing, moving to the next cut-off
     text swaps it straight away, the way menu tooltips usually behave.
   - Same look as the app's label tooltips: the inverted chip (bg-foreground / text-background), see .trunc-tip in index.css.
   - If the element (or a parent) has a native title, that browser tooltip is held back while ours shows,
     and a title that says something other than the text is kept as a second, fainter line.
   - Opt out on any element with data-no-trunc-tip. */

const TIP_DELAY = 350; // ms of pointing before the first tooltip
const WARM_FOR = 400; // ms after one hides during which the next shows at once
const GAP = 6; // px between the text and the tooltip
const EDGE = 8; // px kept clear of the window edge
const MAX_DEPTH = 8; // how far up from the pointed-at node to look for the cut-off element

let tip = null; // the tooltip element (one per window)
let current = null; // element whose text is showing
let pending = null; // element waiting for the delay
let timer = 0;
let warmUntil = 0;
let heldTitle = null; // { el, title } native title held back while ours shows

const ellipsisLike = cs =>
  (cs.textOverflow === 'ellipsis' && cs.overflowX !== 'visible') ||
  (cs.webkitLineClamp && cs.webkitLineClamp !== 'none');

// True when the element's text doesn't fully fit. scrollWidth is rounded, so a Range check catches
// text that's cut off by less than a pixel.
function isCut(el, cs) {
  if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') return el.scrollHeight > el.clientHeight + 1;
  if (el.scrollWidth > el.clientWidth) return true;
  const box = el.getBoundingClientRect();
  if (!box.width) return false;
  const r = document.createRange(); r.selectNodeContents(el);
  const pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0;
  return r.getBoundingClientRect().width > box.width - pl - pr + 0.5;
}

// Hidden text (e.g. the closed sidebar's labels, faded to 0) doesn't count.
function isHidden(el) {
  for (let x = el; x && x !== document.body; x = x.parentElement) {
    const cs = getComputedStyle(x);
    if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.2) return true;
  }
  return false;
}

const fullText = el => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();

// The nearest cut-off element at or above the node the pointer is over.
function findCut(node) {
  let el = node && node.nodeType === 1 ? node : node && node.parentElement;
  for (let i = 0; el && el !== document.body && i < MAX_DEPTH; i++, el = el.parentElement) {
    if (el.closest('[data-no-trunc-tip],.trunc-tip')) return null;
    if (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return null;
    const cs = getComputedStyle(el);
    if (ellipsisLike(cs) && isCut(el, cs) && fullText(el)) return isHidden(el) ? null : el;
  }
  return null;
}

// The native title the browser would show here: on the element or its nearest parent that has one.
function titleHolder(el) {
  for (let x = el; x && x !== document.body; x = x.parentElement) if (x.hasAttribute && x.hasAttribute('title')) return x;
  return null;
}

function ensureTip() {
  if (tip && tip.isConnected) return tip;
  tip = document.createElement('div');
  tip.className = 'trunc-tip';
  tip.setAttribute('role', 'tooltip');
  tip.setAttribute('aria-hidden', 'true'); // the full text is already in the page for screen readers
  document.body.appendChild(tip);
  return tip;
}

function place(el) {
  const t = ensureTip();
  const r = el.getBoundingClientRect();
  const w = t.offsetWidth, h = t.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
  let top = r.bottom + GAP;
  if (top + h > vh - EDGE) top = Math.max(EDGE, r.top - GAP - h); // no room below: above
  // Line the tooltip's text up with the cut-off text.
  const pl = parseFloat(getComputedStyle(el).paddingLeft) || 0;
  let left = r.left + pl - 8;
  left = Math.max(EDGE, Math.min(left, vw - EDGE - w));
  t.style.top = `${Math.round(top)}px`;
  t.style.left = `${Math.round(left)}px`;
}

function releaseTitle() {
  if (heldTitle) {
    if (heldTitle.el.isConnected && !heldTitle.el.hasAttribute('title')) heldTitle.el.setAttribute('title', heldTitle.title);
    heldTitle = null;
  }
}

function show(el) {
  clearTimeout(timer); pending = null;
  if (!el.isConnected) return;
  const cs = getComputedStyle(el);
  if (!isCut(el, cs) || isHidden(el)) { if (current) hide(); return; } // it changed during the delay (e.g. a panel finished opening)
  const text = fullText(el);
  if (!text) return;
  releaseTitle();
  const holder = titleHolder(el);
  let note = '';
  if (holder) {
    const title = holder.getAttribute('title') || '';
    if (title.replace(/\s+/g, ' ').trim() !== text) note = title;
    heldTitle = { el: holder, title };
    holder.removeAttribute('title');
  }
  const t = ensureTip();
  t.textContent = '';
  const main = document.createElement('span'); main.textContent = text; t.appendChild(main);
  if (note) { const n = document.createElement('span'); n.className = 'trunc-tip-note'; n.textContent = note; t.appendChild(n); }
  current = el;
  t.removeAttribute('data-open');
  t.style.display = 'flex';
  place(el);
  void t.offsetWidth; // start the fade from 0
  t.setAttribute('data-open', '');
}

function hide() {
  clearTimeout(timer); pending = null;
  if (current) warmUntil = Date.now() + WARM_FOR;
  current = null;
  releaseTitle();
  if (tip) { tip.removeAttribute('data-open'); tip.style.display = 'none'; }
}

function arm(el) {
  if (el === current || el === pending) return;
  if (current) { show(el); return; } // already showing one: swap at once
  clearTimeout(timer);
  pending = el;
  timer = setTimeout(() => show(el), Date.now() < warmUntil ? 0 : TIP_DELAY);
}

function onOver(e) {
  if (e.buttons) return; // dragging or selecting
  const el = findCut(e.target);
  if (el) arm(el);
  else if (current || pending) {
    // Still inside the element we're showing for (e.g. over its icon)? Keep it.
    const keep = current || pending;
    if (!(e.target instanceof Node && keep.contains(e.target))) hide();
  }
}

function onOut(e) {
  const keep = current || pending;
  if (!keep) return;
  const to = e.relatedTarget;
  if (to instanceof Node && keep.contains(to)) return;
  if (!to) hide(); // left the window
}

function onFocus(e) {
  const el = e.target;
  if (!(el instanceof Element)) return;
  let visible = false; try { visible = el.matches(':focus-visible'); } catch (err) {}
  if (!visible) return;
  const cut = findCut(el) || [...el.querySelectorAll('*')].slice(0, 20).map(findCut).find(Boolean);
  if (cut) arm(cut); else hide();
}

export function installTruncationTips() {
  if (typeof document === 'undefined' || window.__truncTips) return;
  window.__truncTips = true;
  document.addEventListener('mouseover', onOver, true);
  document.addEventListener('mouseout', onOut, true);
  document.addEventListener('focusin', onFocus, true);
  document.addEventListener('focusout', () => hide(), true);
  ['pointerdown', 'keydown', 'wheel'].forEach(t => document.addEventListener(t, hide, true));
  window.addEventListener('scroll', () => { if (current || pending) hide(); }, true);
  window.addEventListener('blur', hide);
  window.addEventListener('resize', hide);
  // If what we're pointing at re-renders away (a row is deleted, a menu closes), drop the tooltip.
  new MutationObserver(() => {
    if (current && !current.isConnected) hide();
    if (pending && !pending.isConnected) hide();
  }).observe(document.body, { childList: true, subtree: true });
}
