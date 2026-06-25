import type { NextApiRequest, NextApiResponse } from 'next';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { sendDeliveryNotification, sendInvoiceNotification } from '@/lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = { req, res } as any;

  let token = CookiesManager.getAccessToken(context);
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1];
  }
  if (!token) return res.status(401).json({ message: 'No autorizado: Sesión inválida' });

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { type, to } = req.body as { type?: string; to?: string };

  if (!to) {
    return res.status(400).json({ message: 'El campo "to" (dirección de destino) es requerido.' });
  }
  if (!type || !['delivery', 'invoice'].includes(type)) {
    return res.status(400).json({ message: 'El campo "type" debe ser "delivery" o "invoice".' });
  }

  try {
    let result;

    if (type === 'delivery') {
      result = await sendDeliveryNotification({
        to,
        firstName: 'Juan',
        trackingNumber: 'MGA-TEST-00123',
      });
    } else {
      result = await sendInvoiceNotification({
        to,
        firstName: 'Juan',
        totalAmountCRC: 18750,
        billingUuid: 'a1b2c3d4-0000-0000-0000-test00000000',
      });
    }

    return res.status(200).json({ data: result });
  } catch (error: any) {
    console.error('[Email Test Error]:', error);
    return res.status(500).json({ message: error.message || 'Error al enviar el email de prueba.' });
  }
}
