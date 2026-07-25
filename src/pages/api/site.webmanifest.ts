import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const host = req.headers.host ?? '';
  const isDev = host.includes('dev-portal');
  const backgroundColor = isDev ? '#10B981' : '#000000';

  const manifest = {
    id: '/',
    name: 'Magastore Backoffice',
    short_name: 'Magastore',
    description: 'Backoffice de Magastore: paquetes, órdenes de envío, facturación y seguimiento.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    lang: 'es',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    theme_color: '#111111',
    background_color: backgroundColor,
  };

  res.setHeader('Content-Type', 'application/manifest+json');
  res.status(200).json(manifest);
}
