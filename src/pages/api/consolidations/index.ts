import type { NextApiRequest, NextApiResponse } from 'next';
import { ConsolidationsService } from '@/shared/api/services/consolidations.service';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { ConsolidationStatus } from '@/types/logistics/logistics.types';

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
      const { uuid, page, limit, search, status, availablePackages, dateFrom, dateTo, action, customerUuid } = req.query;

      if (action === 'check-open' && customerUuid) {
        const existing = await ConsolidationsService.getOpenConsolidationForCustomer(customerUuid as string);
        return res.status(200).json(
          existing
            ? { hasOpen: true, uuid: existing.uuid }
            : { hasOpen: false },
        );
      }

      if (uuid) {
        const detail = await ConsolidationsService.getConsolidationDetail(uuid as string);
        return res.status(200).json({ data: detail });
      }

      if (availablePackages) {
        const packages = await ConsolidationsService.getAvailablePackages(availablePackages as string);
        return res.status(200).json({ data: packages });
      }

      const p = parseInt(page as string) || 1;
      const l = parseInt(limit as string) || 10;
      const result = await ConsolidationsService.listConsolidations(
        p,
        l,
        search as string | undefined,
        status as string | undefined,
        dateFrom as string | undefined,
        dateTo as string | undefined,
      );
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const { customerUuid } = req.body;
      if (!customerUuid) {
        return res.status(400).json({ message: 'customerUuid es requerido.' });
      }
      const consolidation = await ConsolidationsService.createConsolidation(customerUuid);
      return res.status(201).json({ data: consolidation });
    }

    if (req.method === 'PATCH') {
      const { consolidationUuid, newStatus, currentStatus } = req.body;
      if (!consolidationUuid || !newStatus || !currentStatus) {
        return res.status(400).json({ message: 'consolidationUuid, newStatus y currentStatus son requeridos.' });
      }
      const updated = await ConsolidationsService.updateConsolidationStatus(
        consolidationUuid,
        newStatus as ConsolidationStatus,
        currentStatus as ConsolidationStatus,
      );
      return res.status(200).json({ data: updated });
    }

    if (req.method === 'DELETE') {
      const { uuid } = req.body;
      if (!uuid) return res.status(400).json({ message: 'uuid es requerido.' });
      await ConsolidationsService.deleteConsolidation(uuid);
      return res.status(200).json({ data: { deleted: true } });
    }

    return res.status(405).json({ message: 'Método no permitido.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor.';
    const status = message.includes('no encontrad') ? 404
      : message.includes('inválida') || message.includes('requerido') ? 400
      : 500;
    return res.status(status).json({ message });
  }
}
