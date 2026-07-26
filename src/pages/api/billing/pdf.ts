import type { NextApiRequest, NextApiResponse } from 'next';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import { BillingService } from '@/shared/api/services/billing.service';
import { DeliveryMethodsRepository } from '@/shared/api/repositories/delivery-methods.repo';
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

    const methods = await DeliveryMethodsRepository.getAll();
    const deliveryMethodLabel = detail.delivery_method
      ? methods.find((m) => m.code === detail.delivery_method)?.name ?? null
      : null;

    const buffer = await renderToBuffer(
      React.createElement(BillingInvoicePDF, { detail, deliveryMethodLabel }) as unknown as React.ReactElement<DocumentProps>,
    );

    const invoiceLabel = `F-${String(detail.invoice_number).padStart(4, '0')}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="factura-${invoiceLabel}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).end(buffer);
  } catch (error: any) {
    console.error('[Billing PDF Error]:', error);
    return res.status(500).json({ message: error.message || 'Error generando PDF' });
  }
}
