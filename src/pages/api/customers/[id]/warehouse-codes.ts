import type { NextApiRequest, NextApiResponse } from 'next';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { WarehouseRoutesRepository } from '@/shared/api/repositories/warehouse-routes.repo';

/**
 * Casilleros que un cliente tiene asignados, con el id de su ruta. El formulario
 * de paquetes lo usa para listar únicamente los couriers contra los que ese
 * cliente puede recibir mercancía.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = { req, res } as any;

  let token = CookiesManager.getAccessToken(context);
  if (!token && req.headers.authorization) {
    const [scheme, credentials] = req.headers.authorization.split(' ');
    if (scheme === 'Bearer') token = credentials;
  }

  if (!token) return res.status(401).json({ message: 'No autorizado' });

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Método ${req.method} no permitido.` });
  }

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID de cliente requerido' });
    }

    const routes = await WarehouseRoutesRepository.getCustomerRoutes(id);
    return res.status(200).json({ data: routes });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    console.error('[Customer Warehouse Codes Error]:', error);
    return res.status(500).json({ message });
  }
}
