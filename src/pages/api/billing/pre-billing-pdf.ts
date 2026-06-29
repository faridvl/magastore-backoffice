import type { NextApiRequest, NextApiResponse } from 'next';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { PreBillingInvoicePDF, PreBillingPDFData } from '@/components/pdf/pre-billing-invoice';
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
      COALESCE(
        json_agg(p.tracking_number ORDER BY p.created_at) FILTER (WHERE p.id IS NOT NULL),
        '[]'::json
      ) AS package_trackings
    FROM pre_billing pb
    JOIN consolidations con ON con.id = pb.consolidation_id
    JOIN customers c ON c.id = con.customer_id
    LEFT JOIN packages p ON p.consolidation_id = con.id
    WHERE pb.uuid = ${uuid}
    GROUP BY pb.uuid, pb.estimated_amount_crc, pb.delivery_method, pb.delivery_fee_crc,
             pb.applied_rate_usd, pb.applied_exchange, pb.total_weight_charged, pb.created_at,
             con.total_weight_lb, c.first_name, c.last_name, c.customer_code, c.email
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
    package_trackings: row.package_trackings ?? [],
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

    const buffer = await renderToBuffer(
      React.createElement(PreBillingInvoicePDF, { data }) as unknown as React.ReactElement<DocumentProps>,
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
