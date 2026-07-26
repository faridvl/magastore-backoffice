import type { NextApiRequest, NextApiResponse } from 'next';
import { WarehouseRoutesRepository } from '@/shared/api/repositories/warehouse-routes.repo';
import { CourierRatesRepository } from '@/shared/api/repositories/courier-rates.repo';
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

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Método no permitido.' });
  }

  try {
    const { customerId, warehouseRouteId, courierRateUuid } = req.body;
    if (!customerId || (!warehouseRouteId && !courierRateUuid)) {
      return res.status(400).json({ message: 'customerId y la ruta (warehouseRouteId o courierRateUuid) son requeridos.' });
    }

    // La UI conoce el courier elegido, no su ruta de casillero: se resuelve
    // aquí en vez de exponer warehouse_route_id en el listado de tarifas.
    let routeId = warehouseRouteId ? Number(warehouseRouteId) : null;
    if (!routeId) {
      const rate = await CourierRatesRepository.getWarehouseRouteByUuid(courierRateUuid);
      if (!rate?.route_id) {
        return res.status(400).json({
          message: `El courier "${rate?.rate_name ?? 'seleccionado'}" no tiene casillero configurado.`,
        });
      }
      routeId = rate.route_id;
    }

    // Si ya lo tiene, se devuelve el existente en vez de generar uno nuevo —
    // evita códigos duplicados si el operador reintenta.
    const existing = await WarehouseRoutesRepository.getCustomerCodeForRoute(customerId, routeId);
    if (existing) {
      return res.status(200).json({ data: { code: existing, created: false } });
    }

    const code = await WarehouseRoutesRepository.assignNextCodeToCustomer(customerId, routeId);
    return res.status(201).json({ data: { code, created: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor.';
    return res.status(message.includes('no está activo') ? 400 : 500).json({ message });
  }
}
