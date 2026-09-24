'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white dark:bg-zinc-900/95 border border-slate-200 dark:border-zinc-800" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-9 h-9 min-w-[36px] min-h-[36px] p-2 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md shadow-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-transform duration-150 ease-out pointer-events-auto hover:scale-105 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none cursor-pointer"
      title={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
      aria-label="Ganti tema tampilan"
    >
      {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
    </button>
  );
}
