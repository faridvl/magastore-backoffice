import sql from '@/lib/db';
import {
  BillingListItem,
  BillingDetail,
  BillingMonthlyReport,
  ProfitShareMonthlyReport,
} from '@/types/logistics/logistics.types';

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
        AND b.created_at <  (${to}::date + INTERVAL '1 day')
      GROUP BY DATE_TRUNC('month', b.created_at)
      ORDER BY DATE_TRUNC('month', b.created_at) ASC
    `;

    return rows as BillingMonthlyReport[];
  },

  /**
   * Participación de Farid agregada por mes. Separa deliberadamente lo FACTURADO
   * (plata real, la que se le paga) de lo ESTIMADO (órdenes con estimado generado
   * pero aún sin facturar): sumarlas daría un total inflado con envíos que quizá
   * nunca se cobren.
   *
   * El LEFT JOIN a profit_share_periods hace que un mes sin fila sea un mes no
   * pagado, sin necesidad de precargar meses.
   */
  getProfitShareReport: async (
    from: string,
    to: string,
  ): Promise<ProfitShareMonthlyReport[]> => {
    const rows = await sql`
      SELECT
        ps.period,
        COALESCE(SUM(CASE WHEN ps.status = 'FACTURADO' THEN ps.share_crc ELSE 0 END), 0)::numeric      AS invoiced_share_crc,
        COALESCE(SUM(CASE WHEN ps.status = 'ESTIMADO'  THEN ps.share_crc ELSE 0 END), 0)::numeric      AS estimated_share_crc,
        COALESCE(SUM(CASE WHEN ps.status = 'FACTURADO' THEN ps.profit_base_crc ELSE 0 END), 0)::numeric AS invoiced_profit_crc,
        COALESCE(MAX(ps.share_percent), 0)::numeric                                                    AS share_percent,
        COUNT(CASE WHEN ps.status = 'FACTURADO' THEN 1 END)::int                                       AS invoiced_count,
        COUNT(CASE WHEN ps.status = 'ESTIMADO'  THEN 1 END)::int                                       AS estimated_count,
        COUNT(CASE WHEN ps.has_unknown_cost THEN 1 END)::int                                           AS unknown_cost_count,
        COALESCE(BOOL_OR(pp.is_paid), false)                                                           AS is_paid,
        MAX(pp.paid_at)                                                                                AS paid_at,
        MAX(pp.paid_by_name)                                                                           AS paid_by_name,
        MAX(pp.paid_amount_crc)::numeric                                                               AS paid_amount_crc
      FROM profit_shares ps
      LEFT JOIN profit_share_periods pp ON pp.period = ps.period
      WHERE ps.period >= ${from} AND ps.period <= ${to}
      GROUP BY ps.period
      ORDER BY ps.period ASC
    `;

    return rows as ProfitShareMonthlyReport[];
  },

  /**
   * Marca (o desmarca) un mes como pagado a Farid. Congela el monto pagado al
   * marcar, para que facturar una orden más tarde en ese mismo mes no reescriba
   * en silencio lo que ya se liquidó.
   */
  markProfitSharePeriodPaid: async (
    period: string,
    isPaid: boolean,
    userName: string,
  ): Promise<{ period: string; is_paid: boolean; paid_at: string | null }> => {
    const [totals] = await sql`
      SELECT COALESCE(SUM(share_crc), 0)::numeric AS total
      FROM profit_shares
      WHERE period = ${period} AND status = 'FACTURADO'
    `;

    const [row] = await sql`
      INSERT INTO profit_share_periods (period, is_paid, paid_at, paid_by_name, paid_amount_crc)
      VALUES (
        ${period}, ${isPaid},
        CASE WHEN ${isPaid}::boolean THEN NOW() ELSE NULL END,
        ${isPaid ? userName : null},
        ${isPaid ? Number(totals.total) : null}
      )
      ON CONFLICT (period) DO UPDATE SET
        is_paid         = EXCLUDED.is_paid,
        paid_at         = CASE WHEN EXCLUDED.is_paid THEN NOW() ELSE NULL END,
        paid_by_name    = CASE WHEN EXCLUDED.is_paid THEN EXCLUDED.paid_by_name ELSE NULL END,
        paid_amount_crc = CASE WHEN EXCLUDED.is_paid THEN EXCLUDED.paid_amount_crc ELSE NULL END,
        updated_at      = NOW()
      RETURNING period, is_paid, paid_at
    `;

    return row as { period: string; is_paid: boolean; paid_at: string | null };
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
