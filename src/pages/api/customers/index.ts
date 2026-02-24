import type { NextApiRequest, NextApiResponse } from 'next';
import { CustomerService } from '@/shared/api/services/customers.service';
import { CookiesManager } from '@/shared/utils/cookies-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = { req, res } as any;

  let token = CookiesManager.getAccessToken(context);

  if (!token && req.headers.authorization) {
    const [scheme, credentials] = req.headers.authorization.split(' ');
    if (scheme === 'Bearer') {
      token = credentials;
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'No autorizado: Token no encontrado' });
  }

  try {
    if (req.method === 'GET') {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const customersPaginated = await CustomerService.getAllCustomers(page, limit);
      return res.status(200).json(customersPaginated);
    }

    if (req.method === 'POST') {
      const newCustomer = await CustomerService.registerCustomer(req.body);
      return res.status(201).json(newCustomer);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: any) {
    console.error('[Customers Controller Error]:', error);

    const statusCode =
      error.message.includes('existe') || error.message.includes('debe tener') ? 400 : 500;

    return res.status(statusCode).json({
      message: error.message || 'Error interno en el servidor',
    });
  }
}
