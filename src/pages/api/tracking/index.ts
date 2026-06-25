import type { NextApiRequest, NextApiResponse } from 'next';
import { LogisticsService } from '@/shared/api/services/logistics.service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ message: 'El número de tracking es requerido.' });
  }

  try {
    const data = await LogisticsService.getPackageByTrackingNumber(q);
    return res.status(200).json({ data });
  } catch (error: any) {
    if (error.message?.includes('No se encontró')) {
      return res.status(404).json({ message: error.message });
    }
    console.error('[Tracking Handler]:', error);
    return res.status(500).json({ message: 'Error interno al consultar el tracking.' });
  }
}
