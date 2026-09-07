'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { Loader2 } from 'lucide-react';

const TransitMapInternal = dynamic(() => import('./TransitMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center text-slate-600 dark:text-zinc-400 gap-2.5">
      <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
      <div className="text-xs font-medium text-slate-700 dark:text-zinc-300">
        Memuat Peta Transit Jabodetabek...
      </div>
    </div>
  ),
});

export default function MapWrapper() {
  return <TransitMapInternal />;
}
