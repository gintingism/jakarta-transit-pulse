import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

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
  authors: [{ name: 'Bonifasius Toto Neguisa Ginting', url: 'https://github.com/gintingism' }],
  creator: 'Bonifasius Toto Neguisa Ginting',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`h-full w-full ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="h-full w-full font-sans bg-white dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 antialiased overflow-hidden selection:bg-cyan-500 selection:text-black transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
