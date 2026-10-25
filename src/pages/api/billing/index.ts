import type { NextApiRequest, NextApiResponse } from 'next';
import { BillingService, isPaymentMethod } from '@/shared/api/services/billing.service';
import { isIsoDate } from '@/shared/utils/is-iso-date';
import { getActor } from '@/shared/api/get-actor';
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
      const { uuid, page, limit, search, isPaid, dateFrom, dateTo, paymentMethod } = req.query;

      if (uuid) {
        const detail = await BillingService.getBillingDetail(uuid as string);
        return res.status(200).json({ data: detail });
      }

      const p = parseInt(page as string) || 1;
      const l = parseInt(limit as string) || 10;
      const s = search as string | undefined;
      const paidFilter =
        isPaid === 'true' ? true : isPaid === 'false' ? false : undefined;
      const df = dateFrom as string | undefined;
      const dt = dateTo as string | undefined;

      if ((df !== undefined && !isIsoDate(df)) || (dt !== undefined && !isIsoDate(dt))) {
        return res.status(400).json({ message: 'Las fechas deben tener el formato AAAA-MM-DD.' });
      }
      if (df && dt && df > dt) {
        return res.status(400).json({ message: 'La fecha de inicio no puede ser posterior a la fecha final.' });
      }
      if (paymentMethod !== undefined && !isPaymentMethod(paymentMethod)) {
        return res.status(400).json({ message: 'El método de pago no es válido.' });
      }

      const result = await BillingService.getBillingList(p, l, s, paidFilter, df, dt, paymentMethod);
      return res.status(200).json(result);
    }

    if (req.method === 'PATCH') {
      const { uuid, action } = req.query;
      if (!uuid) return res.status(400).json({ message: 'UUID de factura requerido.' });

      if (action === 'mark-payment-notified') {
        const notified = await BillingService.markPaymentNotified(uuid as string);
        return res.status(200).json({ data: notified });
      }

      const { paymentMethod } = req.body ?? {};
      if (!isPaymentMethod(paymentMethod)) {
        return res.status(400).json({ message: 'Indica un método de pago válido.' });
      }

      const actor = await getActor({ req, res });
      if (!actor) return res.status(401).json({ message: 'No autorizado: Sesión inválida' });

      const updated = await BillingService.confirmPayment(uuid as string, paymentMethod, actor);
      return res.status(200).json({ data: updated });
    }

    res.setHeader('Allow', ['GET', 'PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: any) {
    console.error('[Billing Controller Error]:', error);
    const message: string = error.message || 'Error interno';
    const status = /no encontr/i.test(message) ? 404
      : /requerid|inválid/i.test(message) ? 400
      : /ya (está|marcada)|sin pagar|no está pagada/i.test(message) ? 409
      : 500;
    return res.status(status).json({ message });
  }
}
