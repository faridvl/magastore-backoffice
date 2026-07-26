import type { NextApiRequest, NextApiResponse } from 'next';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { PreBillingInvoicePDF, PreBillingPDFData } from '@/components/pdf/pre-billing-invoice';
import { DeliveryMethodsRepository } from '@/shared/api/repositories/delivery-methods.repo';
import sql from '@/lib/db';

async function getPreBillingDetail(uuid: string): Promise<PreBillingPDFData | null> {
  const [row] = await sql`
    SELECT
      pb.uuid,
      pb.estimated_amount_crc,
      pb.delivery_method,
      pb.delivery_fee_crc,
      pb.applied_rate_usd,
      pb.applied_exchange,
      pb.total_weight_charged,
      pb.created_at,
      con.total_weight_lb,
      c.first_name || ' ' || c.last_name AS customer_name,
      c.customer_code,
      c.email AS customer_email,
      ca.exact_address AS delivery_exact_address,
      ca.district AS delivery_district,
      ca.canton AS delivery_canton,
      ca.province AS delivery_province,
      COALESCE(
        json_agg(
          json_build_object('tracking_number', p.tracking_number, 'weight_lb', p.weight_lb)
          ORDER BY p.created_at
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'::json
      ) AS packages
    FROM pre_billing pb
    JOIN consolidations con ON con.id = pb.consolidation_id
    JOIN customers c ON c.id = con.customer_id
    LEFT JOIN customer_addresses ca ON ca.id = con.delivery_address_id
    LEFT JOIN packages p ON p.consolidation_id = con.id
    WHERE pb.uuid = ${uuid}
    GROUP BY pb.uuid, pb.estimated_amount_crc, pb.delivery_method, pb.delivery_fee_crc,
             pb.applied_rate_usd, pb.applied_exchange, pb.total_weight_charged, pb.created_at,
             con.total_weight_lb, c.first_name, c.last_name, c.customer_code, c.email,
             ca.exact_address, ca.district, ca.canton, ca.province
  `;
  if (!row) return null;
  return {
    uuid: row.uuid,
    customer_name: row.customer_name,
    customer_code: row.customer_code,
    customer_email: row.customer_email,
    total_weight_lb: Number(row.total_weight_lb),
    total_weight_charged: Number(row.total_weight_charged),
    applied_rate_usd: Number(row.applied_rate_usd),
    applied_exchange: Number(row.applied_exchange),
    estimated_amount_crc: Number(row.estimated_amount_crc),
    delivery_method: row.delivery_method,
    delivery_fee_crc: Number(row.delivery_fee_crc ?? 0),
    created_at: row.created_at,
    packages: row.packages ?? [],
    delivery_exact_address: row.delivery_exact_address ?? null,
    delivery_district: row.delivery_district ?? null,
    delivery_canton: row.delivery_canton ?? null,
    delivery_province: row.delivery_province ?? null,
  };
}

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
    return res.status(400).json({ message: 'UUID de prefactura requerido.' });
  }

  try {
    const data = await getPreBillingDetail(uuid);
    if (!data) return res.status(404).json({ message: 'Prefactura no encontrada.' });

    const methods = await DeliveryMethodsRepository.getAll();
    const deliveryMethodLabel = data.delivery_method
      ? methods.find((m) => m.code === data.delivery_method)?.name ?? null
      : null;

    const buffer = await renderToBuffer(
      React.createElement(PreBillingInvoicePDF, { data, deliveryMethodLabel }) as unknown as React.ReactElement<DocumentProps>,
    );

    const shortId = uuid.slice(-8).toUpperCase();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="estimado-${shortId}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).end(buffer);
  } catch (error: any) {
    console.error('[PreBilling PDF Error]:', error);
    return res.status(500).json({ message: error.message || 'Error generando PDF' });
  }
}
