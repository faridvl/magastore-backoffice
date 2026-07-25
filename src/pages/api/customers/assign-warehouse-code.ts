import type { NextApiRequest, NextApiResponse } from 'next';
import { WarehouseRoutesRepository } from '@/shared/api/repositories/warehouse-routes.repo';
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
    const { customerId, warehouseRouteId } = req.body;
    if (!customerId || !warehouseRouteId) {
      return res.status(400).json({ message: 'customerId y warehouseRouteId son requeridos.' });
    }

    // Si ya lo tiene, se devuelve el existente en vez de generar uno nuevo —
    // evita códigos duplicados si el operador reintenta.
    const existing = await WarehouseRoutesRepository.getCustomerCodeForRoute(customerId, Number(warehouseRouteId));
    if (existing) {
      return res.status(200).json({ data: { code: existing, created: false } });
    }

    const code = await WarehouseRoutesRepository.assignNextCodeToCustomer(customerId, Number(warehouseRouteId));
    return res.status(201).json({ data: { code, created: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor.';
    return res.status(message.includes('no está activo') ? 400 : 500).json({ message });
  }
}
