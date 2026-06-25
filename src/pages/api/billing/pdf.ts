import type { NextApiRequest, NextApiResponse } from 'next';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { BillingService } from '@/shared/api/services/billing.service';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { BillingInvoicePDF } from '@/components/pdf/billing-invoice';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const context = { req, res } as any;
  let token = CookiesManager.getAccessToken(context);
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1];
  }
  if (!token) return res.status(401).json({ message: 'No autorizado: Sesion invalida' });

  const { uuid } = req.query;
  if (!uuid || typeof uuid !== 'string') {
    return res.status(400).json({ message: 'UUID de factura requerido.' });
  }

  try {
    const detail = await BillingService.getBillingDetail(uuid);
    if (!detail) return res.status(404).json({ message: 'Factura no encontrada.' });

    const buffer = await renderToBuffer(
      React.createElement(BillingInvoicePDF, { detail }),
    );

    const shortId = uuid.slice(-8).toUpperCase();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="factura-${shortId}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).end(buffer);
  } catch (error: any) {
    console.error('[Billing PDF Error]:', error);
    return res.status(500).json({ message: error.message || 'Error generando PDF' });
  }
}
