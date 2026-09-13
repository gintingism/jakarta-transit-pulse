import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Jakarta Transit Pulse (AntiBablas)',
    short_name: 'AntiBablas',
    description:
      'Navigasi Transit Multimoda Jabodetabek (KRL, TransJakarta, MRT, LRT, Bandara) & Geo-Alarm Anti-Bablas',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#090a0f',
    theme_color: '#090a0f',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
