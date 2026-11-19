/* Scroll bars and edge fades (0.19.12).
   - While an element scrolls, it gets data-sb-scroll, which widens and brightens its bar a little (index.css).
   - While the pointer is over an element's bar, or dragging it, the element gets data-sb-hover: wider and brighter.
   - .scroll-fade elements get data-fade-top / data-fade-bottom when there is more to scroll that way.
   Data attributes, not classes, so React re-renders never wipe them. */

const scrollTimers = new WeakMap();
const SCROLL_HOLD = 900; // ms the bar stays "awake" after the last scroll

export function updateFade(el) {
  if (!el || !el.classList || !el.classList.contains('scroll-fade')) return;
  const top = el.scrollTop > 1;
  const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
  if (top) el.setAttribute('data-fade-top', ''); else el.removeAttribute('data-fade-top');
  if (bottom) el.setAttribute('data-fade-bottom', ''); else el.removeAttribute('data-fade-bottom');
}

// The element whose scroll bar is under the point, if any.
function barOwner(target, x, y) {
  for (let el = target; el && el.nodeType === 1; el = el.parentElement) {
    const vw = el.offsetWidth - el.clientWidth, hh = el.offsetHeight - el.clientHeight;
    if (vw <= 0 && hh <= 0) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0;
    const vbar = el.scrollHeight > el.clientHeight && vw - bl * 2 > 2;
    const hbar = el.scrollWidth > el.clientWidth && hh - bt * 2 > 2;
    const inV = vbar && x >= r.left + bl + el.clientWidth && x <= r.right && y >= r.top && y <= r.bottom;
    const inH = hbar && y >= r.top + bt + el.clientHeight && y <= r.bottom && x >= r.left && x <= r.right;
    if (inV || inH) return el;
  }
  return null;
}

let installed = false;
export function installScrollbars() {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  document.addEventListener('scroll', e => {
    const el = e.target === document ? document.scrollingElement : e.target;
    if (!el || el.nodeType !== 1) return;
    el.setAttribute('data-sb-scroll', '');
    clearTimeout(scrollTimers.get(el));
    scrollTimers.set(el, setTimeout(() => el.removeAttribute('data-sb-scroll'), SCROLL_HOLD));
    updateFade(el);
  }, { capture: true, passive: true });

  let hovered = null, dragging = false;
  const setHover = el => {
    if (el === hovered) return;
    if (hovered) hovered.removeAttribute('data-sb-hover');
    hovered = el;
    if (el) el.setAttribute('data-sb-hover', '');
  };
  document.addEventListener('pointermove', e => {
    if (dragging || e.pointerType === 'touch') return;
    setHover(barOwner(e.target, e.clientX, e.clientY));
  }, { capture: true, passive: true });
  document.addEventListener('pointerdown', e => { if (hovered && barOwner(e.target, e.clientX, e.clientY) === hovered) dragging = true; }, { capture: true, passive: true });
  const end = e => { if (!dragging) return; dragging = false; setHover(e && e.clientX != null ? barOwner(document.elementFromPoint(e.clientX, e.clientY), e.clientX, e.clientY) : null); };
  document.addEventListener('pointerup', end, true);
  document.addEventListener('pointercancel', end, true);
  // mouseleave never fires on document itself; the root element gets it when the pointer leaves the window.
  document.documentElement.addEventListener('mouseleave', () => { if (!dragging) setHover(null); });
  window.addEventListener('blur', () => { dragging = false; setHover(null); });
}
