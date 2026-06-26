import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import * as UserRepo from '@/shared/api/repositories/user.repo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const context = { req, res } as any;
  let token = CookiesManager.getAccessToken(context);
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1];
  }

  if (!token) return res.status(401).json({ message: 'No autorizado' });

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ message: 'Configuración de servidor incorrecta' });

  try {
    const payload = jwt.verify(token, secret) as { id: string; email: string };
    const user = await UserRepo.findByEmail(payload.email);
    if (!user) return res.status(401).json({ message: 'Usuario no encontrado' });

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.name,
        role: user.role ?? 'ADMIN',
      },
    });
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}
