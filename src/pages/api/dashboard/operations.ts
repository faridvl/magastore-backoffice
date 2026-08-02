import type { NextApiRequest, NextApiResponse } from 'next';
import { OperationsService } from '@/shared/api/services/operations.service';
import { CookiesManager } from '@/shared/utils/cookies-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const context = { req, res } as any;
  let token = CookiesManager.getAccessToken(context);
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'No autorizado: Sesión inválida' });
  }

  try {
    const stats = await OperationsService.getOperationsStats();
    return res.status(200).json({ data: stats });
  } catch (error: any) {
    console.error('[Operations Stats Handler]:', error);
    return res.status(500).json({ message: error.message || 'Error interno' });
  }
}
