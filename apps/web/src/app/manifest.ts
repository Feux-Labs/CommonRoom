import type { MetadataRoute } from 'next';

/** Lets people install Common Room to their home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Common Room',
    short_name: 'Common Room',
    description: 'Say what you can’t say anywhere else.',
    start_url: '/anonymous',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3a47c4',
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
