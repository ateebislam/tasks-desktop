// shadcn/ui Sonner toaster (https://ui.shadcn.com/docs/components/sonner), wired to this app's theme.
// The app has no next-themes; it sets data-theme on <html> (or follows Windows), so we watch that instead.
import { useEffect, useState } from 'react';
import { Toaster as Sonner } from 'sonner';

function currentTheme() {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function useAppTheme() {
  const [theme, setTheme] = useState(currentTheme);
  useEffect(() => {
    const on = () => setTheme(currentTheme());
    const mo = new MutationObserver(on);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', on);
    return () => { mo.disconnect(); mq.removeEventListener('change', on); };
  }, []);
  return theme;
}

// Every toast in the app is drawn with toast.custom using the app's own toast design,
// so Sonner only supplies the motion, stacking, swipe-to-dismiss and timing.
export function Toaster(props) {
  const theme = useAppTheme();
  return <Sonner theme={theme} position="bottom-right" offset={16} mobileOffset={16} gap={8} {...props} />;
}

export { toast } from 'sonner';
