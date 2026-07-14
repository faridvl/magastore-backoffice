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
      const { uuid, page, limit, search, status, availablePackages, dateFrom, dateTo, action, customerUuid, customersWithAvailablePackages } = req.query;

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

      if (customersWithAvailablePackages) {
        const customers = await ConsolidationsService.getCustomersWithAvailablePackages();
        return res.status(200).json({ data: customers });
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
      const { customerUuid, packageUuids, deliveryAddressId, deliveryMethod } = req.body;
      if (!customerUuid) {
        return res.status(400).json({ message: 'customerUuid es requerido.' });
      }
      const consolidation = packageUuids?.length
        ? await ConsolidationsService.createConsolidationWithPackages(customerUuid, packageUuids, deliveryAddressId, deliveryMethod)
        : await ConsolidationsService.createConsolidation(customerUuid);
      return res.status(201).json({ data: consolidation });
    }

    if (req.method === 'PATCH') {
      const { action, consolidationUuid, newStatus, currentStatus, addressId, packageUuids, deliveryMethod } = req.body;

      if (action === 'set-delivery-address') {
        if (!consolidationUuid || !addressId) {
          return res.status(400).json({ message: 'consolidationUuid y addressId son requeridos.' });
        }
        await ConsolidationsService.setDeliveryAddress(consolidationUuid, addressId);
        return res.status(200).json({ data: { updated: true } });
      }

      if (action === 'set-delivery-method') {
        if (!consolidationUuid || !deliveryMethod) {
          return res.status(400).json({ message: 'consolidationUuid y deliveryMethod son requeridos.' });
        }
        await ConsolidationsService.setDeliveryMethod(consolidationUuid, deliveryMethod);
        return res.status(200).json({ data: { updated: true } });
      }

      if (action === 'assign-packages') {
        if (!consolidationUuid || !packageUuids?.length) {
          return res.status(400).json({ message: 'consolidationUuid y packageUuids son requeridos.' });
        }
        await ConsolidationsService.assignPackages(consolidationUuid, packageUuids);
        return res.status(200).json({ data: { assigned: true } });
      }

      if (action === 'notify-pre-billing') {
        if (!consolidationUuid) {
          return res.status(400).json({ message: 'consolidationUuid es requerido.' });
        }
        await ConsolidationsService.markPreBillingNotified(consolidationUuid);
        return res.status(200).json({ data: { notified: true } });
      }

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
      const { uuid, action, packageUuid } = req.body;

      if (action === 'unassign-package') {
        if (!packageUuid) return res.status(400).json({ message: 'packageUuid es requerido.' });
        await ConsolidationsService.unassignPackage(packageUuid);
        return res.status(200).json({ data: { unassigned: true } });
      }

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
