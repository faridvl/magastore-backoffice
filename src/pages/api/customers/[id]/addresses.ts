import type { NextApiRequest, NextApiResponse } from 'next';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { getCustomerAddresses } from '@/shared/api/repositories/customers.repo';
import { CustomerService } from '@/shared/api/services/customers.service';

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
      const addresses = await getCustomerAddresses(id);
      return res.status(200).json({ data: addresses });
    }

    // PUT cubre alta y edición: el cuerpo trae `id` cuando es una dirección
    // existente. Devuelve la lista completa ya normalizada para que el cliente
    // no tenga que recargar el perfil entero.
    if (req.method === 'PUT') {
      const addresses = await CustomerService.saveCustomerAddress(id, req.body);
      return res.status(200).json({ data: addresses });
    }

    if (req.method === 'DELETE') {
      const addressId = (req.query.addressId ?? req.body?.addressId) as string;
      const addresses = await CustomerService.removeCustomerAddress(id, addressId);
      return res.status(200).json({ data: addresses });
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error('[Customer Addresses Error]:', error);
    const message = error.message || 'Error interno';
    const status =
      message.includes('requerid') || message.includes('al menos') || message.includes('no coincide')
        ? 400
        : message.includes('no existe')
          ? 404
          : 500;
    return res.status(status).json({ message });
  }
}
