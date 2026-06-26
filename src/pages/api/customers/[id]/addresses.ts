import type { NextApiRequest, NextApiResponse } from 'next';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { getCustomerAddresses } from '@/shared/api/repositories/customers.repo';

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
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID de cliente requerido' });
    }

    const addresses = await getCustomerAddresses(id);
    return res.status(200).json({ data: addresses });
  } catch (error: any) {
    console.error('[Customer Addresses Error]:', error);
    return res.status(500).json({ message: error.message || 'Error interno' });
  }
}
