'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/** Light / dark switch. The choice is saved in localStorage and applied by a tiny script in layout.tsx. */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('cn_theme', next ? 'dark' : 'light'); } catch {}
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
      className="flex h-9 w-9 items-center justify-center rounded bg-white/10 text-white transition hover:bg-white/20"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
