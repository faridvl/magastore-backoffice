import type { NextApiRequest, NextApiResponse } from 'next';
import * as SettingsService from '@/shared/api/services/settings.service';
import type { PublicDeliveryMethod } from '@/types/settings/settings.types';

const VALID_METHODS: PublicDeliveryMethod[] = ['CORREOS', 'RETIRO'];

/**
 * Endpoint público (sin token) que alimenta la calculadora del landing.
 * El cálculo vive aquí a propósito: el tipo de cambio nunca se envía al cliente.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const { weight_lb, delivery_method } = req.query;

  const weight = Number(weight_lb);
  if (!weight_lb || Number.isNaN(weight) || weight <= 0) {
    return res.status(400).json({ message: 'El peso es requerido y debe ser mayor a cero.' });
  }

  const method = (
    typeof delivery_method === 'string' ? delivery_method.toUpperCase() : 'RETIRO'
  ) as PublicDeliveryMethod;

  if (!VALID_METHODS.includes(method)) {
    return res.status(400).json({ message: 'El método de entrega no es válido.' });
  }

  try {
    const data = await SettingsService.getPublicQuote({
      weight_lb: weight,
      delivery_method: method,
    });
    return res.status(200).json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor.';
    console.error('[Public Quote Handler]:', error);

    if (message.includes('debe ser')) {
      return res.status(400).json({ message });
    }
    return res.status(500).json({ message: 'Error al calcular el estimado.' });
  }
}
