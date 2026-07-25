import type { NextApiRequest, NextApiResponse } from 'next';
import { CourierRatesService } from '@/shared/api/services/courier-rates.service';
import { CookiesManager } from '@/shared/utils/cookies-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = { req, res } as any;

  let token = CookiesManager.getAccessToken(context);
  if (!token && req.headers.authorization) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ message: 'No autorizado: Sesión inválida' });
  }

  try {
    if (req.method === 'GET') {
      const rates = await CourierRatesService.getAll();
      return res.status(200).json({ data: rates });
    }

    if (req.method === 'POST') {
      const created = await CourierRatesService.create(req.body);
      return res.status(201).json({ data: created });
    }

    if (req.method === 'PATCH') {
      const { uuid, action } = req.body;
      if (!uuid) return res.status(400).json({ message: 'uuid es requerido.' });

      if (action === 'toggle-active') {
        const updated = await CourierRatesService.toggleActive(uuid, req.body.isActive);
        return res.status(200).json({ data: updated });
      }

      if (action === 'set-default') {
        const updated = await CourierRatesService.setDefault(uuid);
        return res.status(200).json({ data: updated });
      }

      const updated = await CourierRatesService.update(uuid, req.body);
      return res.status(200).json({ data: updated });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
    return res.status(405).json({ message: 'Método no permitido.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor.';
    const status = message.includes('no encontrad') ? 404
      : message.includes('requerido') || message.includes('debe ser') || message.includes('no puede ser') || message.includes('No se puede')
        ? 400
        : 500;
    return res.status(status).json({ message });
  }
}
