import type { NextApiRequest, NextApiResponse } from 'next';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { CustomerRecipientsService } from '@/shared/api/services/customer-recipients.service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = { req, res } as unknown as Parameters<typeof CookiesManager.getAccessToken>[0];
  const token = CookiesManager.getAccessToken(context);
  if (!token) return res.status(401).json({ message: 'No autorizado' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'ID de cliente requerido' });

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ data: await CustomerRecipientsService.list(id) });
    }
    // PUT cubre alta y edición (con `id`); devuelve la lista completa actualizada.
    if (req.method === 'PUT') {
      return res.status(200).json({ data: await CustomerRecipientsService.save(id, req.body) });
    }
    if (req.method === 'DELETE') {
      const recipientId = (req.query.recipientId ?? req.body?.recipientId) as string;
      return res.status(200).json({ data: await CustomerRecipientsService.remove(id, recipientId) });
    }
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    const status = message.includes('requerid') ? 400 : /no existe|no encontrad/.test(message) ? 404 : 500;
    return res.status(status).json({ message });
  }
}
