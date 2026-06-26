import type { NextApiRequest, NextApiResponse } from 'next';
import { CustomerService } from '@/shared/api/services/customers.service';
import { CookiesManager } from '@/shared/utils/cookies-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const context = { req, res } as any;
  let token = CookiesManager.getAccessToken(context);

  if (!token && req.headers.authorization) {
    const [scheme, credentials] = req.headers.authorization.split(' ');
    if (scheme === 'Bearer') token = credentials;
  }

  if (!token) {
    return res.status(401).json({ message: 'No autorizado: Token no encontrado' });
  }

  try {
    const { rows } = req.body;

    if (!Array.isArray(rows)) {
      return res.status(400).json({ message: 'El campo rows debe ser un arreglo.' });
    }

    const result = await CustomerService.importCustomers(rows);
    return res.status(200).json({ data: result });
  } catch (error: any) {
    console.error('[Customers Import Error]:', error);
    return res.status(400).json({ message: error.message || 'Error al importar clientes.' });
  }
}
