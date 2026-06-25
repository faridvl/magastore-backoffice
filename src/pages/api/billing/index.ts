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

  try {
    if (req.method === 'GET') {
      const { uuid, pending, page, limit, search, isPaid } = req.query;

      if (uuid) {
        const detail = await BillingService.getBillingDetail(uuid as string);
        return res.status(200).json({ data: detail });
      }

      if (pending === 'true') {
        const consolidations = await BillingService.getPendingConsolidations();
        return res.status(200).json({ data: consolidations });
      }

      const p = parseInt(page as string) || 1;
      const l = parseInt(limit as string) || 10;
      const s = search as string | undefined;
      const paidFilter =
        isPaid === 'true' ? true : isPaid === 'false' ? false : undefined;

      const result = await BillingService.getBillingList(p, l, s, paidFilter);
      return res.status(200).json(result);
    }

    if (req.method === 'PATCH') {
      const { uuid } = req.query;
      if (!uuid) return res.status(400).json({ message: 'UUID de factura requerido.' });

      const updated = await BillingService.confirmPayment(uuid as string);
      return res.status(200).json({ data: updated });
    }

    res.setHeader('Allow', ['GET', 'PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: any) {
    console.error('[Billing Controller Error]:', error);
    return res.status(500).json({ message: error.message || 'Error interno' });
  }
}
