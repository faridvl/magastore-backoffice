import type { NextApiRequest, NextApiResponse } from 'next';
import { login } from '@/shared/api/services/auth.service';
import { isBlocked, recordFailedAttempt, clearAttempts } from '@/lib/rate-limiter';

function getIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress ?? 'unknown';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const ip = getIp(req);

  if (isBlocked(ip)) {
    return res.status(429).json({ message: 'Demasiados intentos fallidos. Intenta de nuevo en 1 minuto.' });
  }

  try {
    const { email, password } = req.body;

    const data = await login(email, password);

    clearAttempts(ip);

    return res.status(200).json(data);
  } catch (error: any) {
    recordFailedAttempt(ip);
    return res.status(401).json({ message: error.message });
  }
}
