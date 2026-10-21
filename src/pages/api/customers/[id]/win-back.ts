import type { NextApiRequest, NextApiResponse } from 'next';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { CustomerService } from '@/shared/api/services/customers.service';

/**
 * PATCH estampa customers.win_back_sent_at al abrir WhatsApp con la invitación
 * a volver. El mensaje lo arma el front con la plantilla CUSTOMER_WIN_BACK.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = { req, res } as unknown as Parameters<typeof CookiesManager.getAccessToken>[0];

  let token = CookiesManager.getAccessToken(context);
  if (!token && req.headers.authorization) {
    const [scheme, credentials] = req.headers.authorization.split(' ');
    if (scheme === 'Bearer') token = credentials;
  }

  if (!token) return res.status(401).json({ message: 'No autorizado' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID de cliente requerido' });
  }

  try {
    if (req.method === 'PATCH') {
      await CustomerService.markWinBackSent(id);
      return res.status(200).json({ data: { updated: true } });
    }

    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ message: `Método ${req.method} no permitido.` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    console.error('[Customer Win Back Error]:', error);
    const status = message.includes('no encontrado')
      ? 404
      : message.includes('requerido') || message.includes('inválida')
        ? 400
        : 500;
    return res.status(status).json({ message });
  }
}
