import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Intentamos hacer una consulta básica a la base de datos
    const result = await sql`SELECT NOW()`;
    return res.status(200).json({ message: 'Conexión exitosa', time: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
