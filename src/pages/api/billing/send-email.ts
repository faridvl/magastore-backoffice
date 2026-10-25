import type { NextApiRequest, NextApiResponse } from 'next';
import { BillingService, InvoiceEmailError } from '@/shared/api/services/billing.service';
import { getActor } from '@/shared/api/get-actor';
import { isUuid } from '@/shared/utils/is-uuid';

/** Envía al cliente el comprobante de una factura pagada. Le escribe a una persona real: exige sesión verificada. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const actor = await getActor({ req, res });
  if (!actor) return res.status(401).json({ message: 'No autorizado: Sesión inválida' });

  const { billingUuid } = req.body ?? {};
  if (typeof billingUuid !== 'string' || !isUuid(billingUuid)) {
    return res.status(400).json({ message: 'El identificador de la factura es inválido.' });
  }

  try {
    const result = await BillingService.sendInvoiceEmail(billingUuid);
    return res.status(200).json({ data: result });
  } catch (error: unknown) {
    if (error instanceof InvoiceEmailError) return res.status(error.status).json({ message: error.message });
    const message = error instanceof Error ? error.message : '';
    if (/no se encontr/i.test(message)) return res.status(404).json({ message: 'Factura no encontrada.' });
    console.error('[Billing send-email Error]:', message);
    return res.status(500).json({ message: 'No se pudo enviar el correo. Intenta de nuevo.' });
  }
}
