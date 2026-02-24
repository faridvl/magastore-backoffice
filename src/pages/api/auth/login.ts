import type { NextApiRequest, NextApiResponse } from 'next';
import { login } from '@/shared/api/services/auth.service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const { email, password } = req.body;

    const data = await login(email, password);

    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(401).json({ message: error.message });
  }
}
