import sql from '@/lib/db';
import { BillingListItem, BillingDetail, BillingMonthlyReport } from '@/types/logistics/logistics.types';

export const BillingRepository = {
  getPaginatedBilling: async (
    page: number,
    limit: number,
    search?: string,
    isPaid?: boolean,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{ data: BillingListItem[]; total: number }> => {
    const offset = (page - 1) * limit;
    const searchTerm = search ? `%${search}%` : null;
    const isPaidFilter = isPaid !== undefined ? isPaid : null;
    const fromDate = dateFrom || null;
    const toDate = dateTo || null;

    const [rows, countResult] = await Promise.all([
      sql`
        SELECT
          b.uuid,
          b.invoice_number,
          con.uuid AS consolidation_uuid,
          con.status AS consolidation_status,
          c.first_name || ' ' || c.last_name AS customer_name,
          c.customer_code,
          b.total_weight_charged,
          b.applied_rate_usd,
          b.applied_exchange,
          b.total_amount_crc,
          b.is_paid,
          b.paid_at,
          b.created_at,
          b.delivery_method,
          COALESCE(b.delivery_fee_crc, 0) AS delivery_fee_crc
        FROM billing b
        JOIN consolidations con ON b.consolidation_id = con.id
        JOIN customers c ON con.customer_id = c.id
        WHERE
          (${searchTerm}::text IS NULL
            OR c.first_name ILIKE ${searchTerm}
            OR c.last_name ILIKE ${searchTerm}
            OR c.customer_code ILIKE ${searchTerm}
            OR b.uuid::text ILIKE ${searchTerm}
            OR b.invoice_number::text = ${search ?? null})
          AND (${isPaidFilter}::boolean IS NULL OR b.is_paid = ${isPaidFilter})
          AND (${fromDate}::date IS NULL OR b.created_at::date >= ${fromDate}::date)
          AND (${toDate}::date IS NULL OR b.created_at::date <= ${toDate}::date)
        ORDER BY b.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`
        SELECT COUNT(*) AS total
        FROM billing b
        JOIN consolidations con ON b.consolidation_id = con.id
        JOIN customers c ON con.customer_id = c.id
        WHERE
          (${searchTerm}::text IS NULL
            OR c.first_name ILIKE ${searchTerm}
            OR c.last_name ILIKE ${searchTerm}
            OR c.customer_code ILIKE ${searchTerm}
            OR b.uuid::text ILIKE ${searchTerm}
            OR b.invoice_number::text = ${search ?? null})
          AND (${isPaidFilter}::boolean IS NULL OR b.is_paid = ${isPaidFilter})
          AND (${fromDate}::date IS NULL OR b.created_at::date >= ${fromDate}::date)
          AND (${toDate}::date IS NULL OR b.created_at::date <= ${toDate}::date)
      `,
    ]);

    return {
      data: rows as BillingListItem[],
      total: parseInt(countResult[0].total, 10),
    };
  },

  getBillingDetail: async (uuid: string): Promise<BillingDetail | null> => {
    const rows = await sql`
      SELECT
        b.uuid,
        b.invoice_number,
        con.uuid AS consolidation_uuid,
        con.status AS consolidation_status,
        c.first_name || ' ' || c.last_name AS customer_name,
        c.customer_code,
        c.email AS customer_email,
        con.total_weight_lb,
        b.total_weight_charged,
        b.applied_rate_usd,
        b.applied_exchange,
        b.applied_billing_mode,
        b.applied_discount_percent,
        b.total_amount_crc,
        b.is_paid,
        b.paid_at,
        b.created_at,
        b.delivery_method,
        COALESCE(b.delivery_fee_crc, 0) AS delivery_fee_crc,
        b.delivery_address_snapshot,
        ca.exact_address AS delivery_exact_address,
        ca.district AS delivery_district,
        ca.canton AS delivery_canton,
        ca.province AS delivery_province,
        COALESCE(
          (SELECT json_agg(
             json_build_object('tracking_number', p.tracking_number, 'weight_lb', p.weight_lb)
             ORDER BY p.created_at
           )
           FROM packages p WHERE p.consolidation_id = con.id),
          '[]'::json
        ) AS packages
      FROM billing b
      JOIN consolidations con ON b.consolidation_id = con.id
      JOIN customers c ON con.customer_id = c.id
      LEFT JOIN customer_addresses ca ON ca.id = con.delivery_address_id
      WHERE b.uuid = ${uuid}
    `;

    return (rows[0] as BillingDetail) || null;
  },

  getBillingReports: async (
    from: string,
    to: string,
  ): Promise<BillingMonthlyReport[]> => {
    const rows = await sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', b.created_at), 'YYYY-MM') AS month,
        COALESCE(SUM(b.total_amount_crc), 0)::numeric          AS total_invoiced_crc,
        COALESCE(SUM(CASE WHEN b.is_paid THEN b.total_amount_crc ELSE 0 END), 0)::numeric AS total_paid_crc,
        COALESCE(SUM(CASE WHEN NOT b.is_paid THEN b.total_amount_crc ELSE 0 END), 0)::numeric AS total_pending_crc,
        COALESCE(SUM(b.profit_crc), 0)::numeric                AS total_ganancia_crc,
        COUNT(*)::int                                          AS invoice_count,
        COUNT(CASE WHEN b.is_paid THEN 1 END)::int             AS paid_count,
        COUNT(CASE WHEN b.has_unknown_cost THEN 1 END)::int    AS unknown_cost_count
      FROM billing b
      WHERE b.created_at >= ${from}::timestamptz
        AND b.created_at <  ${to}::timestamptz
      GROUP BY DATE_TRUNC('month', b.created_at)
      ORDER BY DATE_TRUNC('month', b.created_at) ASC
    `;

    return rows as BillingMonthlyReport[];
  },

  markBillingAsPaid: async (uuid: string): Promise<Partial<BillingListItem>> => {
    await sql`BEGIN`;
    try {
      const [billing] = await sql`
        UPDATE billing
        SET is_paid = true, paid_at = NOW()
        WHERE uuid = ${uuid} AND is_paid = false
        RETURNING uuid, is_paid, paid_at, consolidation_id
      `;

      if (!billing) throw new Error('Factura no encontrada o ya marcada como pagada.');

      // Mover paquetes de la orden de envío a EN_TRAMITE
      await sql`
        UPDATE packages
        SET status = 'EN_TRAMITE'
        WHERE consolidation_id = ${billing.consolidation_id}
          AND status = 'PANAMA'
      `;

      // Cerrar la orden de envío
      await sql`
        UPDATE consolidations
        SET status = 'CERRADO', updated_at = NOW()
        WHERE id = ${billing.consolidation_id}
          AND status = 'ABIERTO'
      `;

      await sql`COMMIT`;
      return { uuid: billing.uuid, is_paid: billing.is_paid, paid_at: billing.paid_at };
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  },
};
