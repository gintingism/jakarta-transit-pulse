'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900/95 border border-slate-200 dark:border-zinc-800" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md shadow-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition pointer-events-auto hover:scale-105 active:scale-95 cursor-pointer"
      title={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
      aria-label="Ganti tema tampilan"
    >
      {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
    </button>
  );
}
