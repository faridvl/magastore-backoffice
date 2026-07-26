import type { NextApiRequest, NextApiResponse } from 'next';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { WarehouseRoutesRepository } from '@/shared/api/repositories/warehouse-routes.repo';
import { CustomerService } from '@/shared/api/services/customers.service';

/**
 * Casilleros que un cliente tiene asignados, con el id de su ruta. El formulario
 * de paquetes lo usa para listar únicamente los couriers contra los que ese
 * cliente puede recibir mercancía.
 *
 * DELETE quita uno — la asignación se hace desde /api/customers/assign-warehouse-code.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = { req, res } as any;

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
    if (req.method === 'GET') {
      const routes = await WarehouseRoutesRepository.getCustomerRoutes(id);
      return res.status(200).json({ data: routes });
    }

    if (req.method === 'DELETE') {
      const raw = req.query.warehouseRouteId ?? req.body?.warehouseRouteId;
      const warehouseRouteId = Number(raw);
      if (!raw || Number.isNaN(warehouseRouteId)) {
        return res.status(400).json({ message: 'warehouseRouteId es requerido.' });
      }

      const customer = await CustomerService.removeCustomerWarehouseCode(id, warehouseRouteId);
      return res.status(200).json({ data: customer });
    }

    res.setHeader('Allow', ['GET', 'DELETE']);
    return res.status(405).json({ message: `Método ${req.method} no permitido.` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    console.error('[Customer Warehouse Codes Error]:', error);
    // "debe conservar" y "ya registró N paquete(s)" son reglas de negocio, no
    // fallas del servidor: el operador puede actuar sobre ellas.
    const status = message.includes('no encontrado') || message.includes('no tiene un casillero')
      ? 404
      : message.includes('requerid') || message.includes('debe conservar') || message.includes('No se puede quitar')
        ? 400
        : 500;
    return res.status(status).json({ message });
  }
}
