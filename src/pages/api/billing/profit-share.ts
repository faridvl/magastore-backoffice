import type { NextApiRequest, NextApiResponse } from 'next';
import { BillingService } from '@/shared/api/services/billing.service';
import { CookiesManager } from '@/shared/utils/cookies-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = { req, res } as any;

  let token = CookiesManager.getAccessToken(context);
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'No autorizado: Sesión inválida' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: 'Los parámetros from y to son requeridos.' });
    }

    const data = await BillingService.getProfitShareReport(from as string, to as string);
    return res.status(200).json({ data });
  } catch (error: any) {
    console.error('[Profit Share Report Controller Error]:', error);
    return res.status(500).json({ message: error.message || 'Error interno' });
  }
}
