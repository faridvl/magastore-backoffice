import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const host = req.headers.host ?? '';
  const isDev = host.includes('dev-portal') || host.includes('localhost') || host.includes('127.0.0.1');
  const backgroundColor = isDev ? '#10B981' : '#000000';
  const iconSuffix = isDev ? '-dev' : '';

  const manifest = {
    id: '/',
    name: isDev ? '[DEV] Magastore Backoffice' : 'Magastore Backoffice',
    short_name: isDev ? '[DEV] Magastore' : 'Magastore',
    description: 'Backoffice de Magastore: paquetes, órdenes de envío, facturación y seguimiento.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    lang: 'es',
    icons: [
      { src: `/icon-192${iconSuffix}.png`, sizes: '192x192', type: 'image/png' },
      { src: `/icon-512${iconSuffix}.png`, sizes: '512x512', type: 'image/png' },
      { src: `/icon-512${iconSuffix}.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    theme_color: backgroundColor,
    background_color: backgroundColor,
  };

  res.setHeader('Content-Type', 'application/manifest+json');
  res.status(200).json(manifest);
}
