import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jakarta Transit Pulse (a.k.a. AntiBablas) | Navigasi Multimoda & Alarm Anti-Bablas',
  description:
    'Navigasi transit multimoda real-time Jabodetabek (KRL Commuterline, TransJakarta BRT, MRT, LRT, & Kereta Bandara) lengkap dengan Radar GPS Proximity Geo-Alarm anti-bablas ketiduran.',
  keywords: [
    'KRL Commuterline',
    'TransJakarta',
    'MRT Jakarta',
    'LRT Jabodebek',
    'KAI Bandara Railink',
    'Jakarta Transit',
    'Transit Tracker',
    'Geo-Alarm',
    'Journey Planner',
    'Manggarai',
    'Soekarno-Hatta',
  ],
  authors: [{ name: 'Senior Frontend & Systems Engineer' }],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Jakarta Transit Pulse',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#090a0f',
};

import { ThemeProvider } from '@/components/ThemeProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full w-full">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="h-full w-full bg-white dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 antialiased overflow-hidden selection:bg-cyan-500 selection:text-black transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
