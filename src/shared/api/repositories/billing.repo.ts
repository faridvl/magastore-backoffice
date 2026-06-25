import sql from '@/lib/db';
import { BillingListItem, BillingDetail, PendingConsolidation } from '@/types/logistics/logistics.types';

export const BillingRepository = {
  getPaginatedBilling: async (
    page: number,
    limit: number,
    search?: string,
    isPaid?: boolean,
  ): Promise<{ data: BillingListItem[]; total: number }> => {
    const offset = (page - 1) * limit;
    const searchTerm = search ? `%${search}%` : null;
    const isPaidFilter = isPaid !== undefined ? isPaid : null;

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
