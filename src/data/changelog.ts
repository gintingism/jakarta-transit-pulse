export interface ChangelogChange {
  type: 'feat' | 'fix' | 'perf';
  text: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: ChangelogChange[];
}

export const APP_VERSION = 'v1.1.0';

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: 'v1.1.0',
    date: '13 September 2026',
    title: 'Pembaruan Navigasi, Feedback Pengguna & Log Versi',
    changes: [
      {
        type: 'feat',
        text: 'Sistem formulir feedback & pelaporan kendala terintegrasi langsung dengan Discord Webhook.',
      },
      {
        type: 'feat',
        text: 'Dialog riwayat pembaruan (Changelog) dan deteksi versi baru otomatis di aplikasi.',
      },
      {
        type: 'feat',
        text: 'Tur panduan interaktif (Onboarding Coachmark) 4 langkah untuk pengguna baru.',
      },
      {
        type: 'fix',
        text: 'Perbaikan audio Web Speech API turn-by-turn navigasi dengan modul singleton.',
      },
      {
        type: 'perf',
        text: 'Optimasi performa render peta Leaflet dan sinkronisasi status rute URL.',
      },
    ],
  },
  {
    version: 'v1.0.1',
    date: '11 September 2026',
    title: 'Navigasi Fleksibel & Keamanan CARTO Basemap',
    changes: [
      {
        type: 'feat',
        text: 'Dynamic step auto-advance: navigasi otomatis loncat ke langkah berikutnya jika memotong jalan.',
      },
      {
        type: 'feat',
        text: 'Snap-to-route: proyeksi GPS ke polyline rute untuk deteksi keluar jalur yang lebih presisi.',
      },
      {
        type: 'perf',
        text: 'Proksi server-side tile CARTO Dark Matter via Next.js Route Handler untuk menyembunyikan API key.',
      },
      {
        type: 'fix',
        text: 'Penanganan background GPS dan Screen Wake Lock agar navigasi tidak tertidur saat layar mati.',
      },
    ],
  },
  {
    version: 'v1.0.0',
    date: '5 September 2026',
    title: 'Peluncuran Perdana Jakarta Transit Pulse',
    changes: [
      {
        type: 'feat',
        text: 'Perencana rute multimoda terpadu 5 moda: KRL Commuter Line, TransJakarta Koridor 1, MRT Jakarta, LRT Jabodebek, dan KA Bandara Basoetta.',
      },
      {
        type: 'feat',
        text: 'Geo-Alarm Web Audio: alarm anti-bablas ketiduran berbasis radius GPS dengan sintetis audio instan tanpa perlu streaming file.',
      },
      {
        type: 'feat',
        text: 'Kalkulator tarif riil multimoda, perbandingan hemat vs ojol, dan estimasi reduksi karbon.',
      },
    ],
  },
];
