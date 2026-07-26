import type { NextApiRequest, NextApiResponse } from 'next';
import { CustomerService, INACTIVITY_THRESHOLD_DAYS } from '@/shared/api/services/customers.service';

/**
 * Cron diario: marca como inactivo a todo cliente que lleve más de 40 días sin
 * registrar un paquete. Programado en vercel.json.
 *
 * No usa CookiesManager como el resto de handlers: no hay sesión de operador
 * detrás, lo dispara Vercel. Se autentica con CRON_SECRET, que Vercel envía en
 * el header Authorization de sus crons. Sin ese secreto configurado el endpoint
 * se niega a correr — es una escritura masiva y no puede quedar abierta.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[Cron deactivate-inactive-customers] Falta CRON_SECRET.');
    return res.status(500).json({ message: 'CRON_SECRET no está configurado en el entorno.' });
  }

  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  try {
    // ?days= permite correrlo a mano con otro umbral sin tocar código.
    const daysParam = req.query.days;
    const days = daysParam ? Number(daysParam) : INACTIVITY_THRESHOLD_DAYS;

    const result = await CustomerService.deactivateInactiveCustomers(days);

    // Queda en los logs de Vercel: es la única traza de una corrida automática.
    console.log(
      `[Cron deactivate-inactive-customers] ${result.count} cliente(s) desactivado(s) tras ${result.days} días sin paquetes.`,
      result.customers.map((c) => c.customer_code).join(', '),
    );

    return res.status(200).json({ data: result });
  } catch (error: any) {
    console.error('[Cron deactivate-inactive-customers]:', error);
    return res.status(500).json({ message: error.message || 'Error interno' });
  }
}
