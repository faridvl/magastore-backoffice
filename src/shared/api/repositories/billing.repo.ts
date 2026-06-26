import sql from '@/lib/db';
import { BillingListItem, BillingDetail, BillingMonthlyReport, PendingConsolidation } from '@/types/logistics/logistics.types';

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
          con.uuid AS consolidation_uuid,
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
            OR b.uuid::text ILIKE ${searchTerm})
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
            OR b.uuid::text ILIKE ${searchTerm})
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
        con.uuid AS consolidation_uuid,
        con.status AS consolidation_status,
        c.first_name || ' ' || c.last_name AS customer_name,
        c.customer_code,
        c.email AS customer_email,
        con.total_weight_lb,
        b.total_weight_charged,
        b.applied_rate_usd,
        b.applied_exchange,
        b.total_amount_crc,
        b.is_paid,
        b.paid_at,
        b.created_at,
        b.delivery_method,
        COALESCE(b.delivery_fee_crc, 0) AS delivery_fee_crc,
        b.delivery_address_snapshot,
        COALESCE(
          (SELECT json_agg(p.tracking_number ORDER BY p.created_at)
           FROM packages p WHERE p.consolidation_id = con.id),
          '[]'::json
        ) AS package_trackings
      FROM billing b
      JOIN consolidations con ON b.consolidation_id = con.id
      JOIN customers c ON con.customer_id = c.id
      WHERE b.uuid = ${uuid}
    `;

    return (rows[0] as BillingDetail) || null;
  },

  getPendingConsolidations: async (): Promise<PendingConsolidation[]> => {
    const rows = await sql`
      SELECT
        con.uuid,
        con.customer_id,
        c.first_name || ' ' || c.last_name AS customer_name,
        c.customer_code,
        con.total_weight_lb,
        con.status,
        con.created_at,
        COUNT(p.id)::int AS package_count
      FROM consolidations con
      JOIN customers c ON con.customer_id = c.id
      LEFT JOIN packages p ON p.consolidation_id = con.id
      WHERE con.status IN ('CERRADO', 'DESPACHADO', 'ENTREGADO')
        AND NOT EXISTS (
          SELECT 1 FROM billing b WHERE b.consolidation_id = con.id
        )
      GROUP BY
        con.id, con.uuid, con.customer_id, con.total_weight_lb, con.status, con.created_at,
        c.first_name, c.last_name, c.customer_code
      ORDER BY con.created_at DESC
    `;

    return rows as PendingConsolidation[];
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
        COALESCE(
          SUM(b.total_weight_charged * s.profit_per_lb * s.exchange_rate), 0
        )::numeric AS total_ganancia_crc,
        COUNT(*)::int                                          AS invoice_count,
        COUNT(CASE WHEN b.is_paid THEN 1 END)::int             AS paid_count
      FROM billing b
      CROSS JOIN system_settings s
      WHERE b.created_at >= ${from}::timestamptz
        AND b.created_at <  ${to}::timestamptz
      GROUP BY DATE_TRUNC('month', b.created_at)
      ORDER BY DATE_TRUNC('month', b.created_at) ASC
    `;

    return rows as BillingMonthlyReport[];
  },

  markBillingAsPaid: async (uuid: string): Promise<Partial<BillingListItem>> => {
    const rows = await sql`
      UPDATE billing
      SET is_paid = true, paid_at = NOW()
      WHERE uuid = ${uuid} AND is_paid = false
      RETURNING uuid, is_paid, paid_at
    `;

    if (rows.length === 0) {
      throw new Error('Factura no encontrada o ya marcada como pagada.');
    }

    return rows[0];
  },
};
