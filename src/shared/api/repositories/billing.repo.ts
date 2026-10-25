import sql from '@/lib/db';
import {
  BillingListItem,
  BillingListSummary,
  BillingDetail,
  BillingMonthlyReport,
  ProfitShareMonthlyReport,
  PaymentMethod,
} from '@/types/logistics/logistics.types';
import type { Actor } from '@/shared/api/get-actor';

// "F-0060", "0060", "f60": un número de factura, con o sin la F y los ceros.
const INVOICE_SEARCH_PATTERN = /^\s*F?-?0*(\d+)\s*$/i;
// Un número más largo que un int de Postgres no puede ser una factura.
const MAX_INVOICE_DIGITS = 9;

export const BillingRepository = {
  getPaginatedBilling: async (
    page: number,
    limit: number,
    search?: string,
    isPaid?: boolean,
    dateFrom?: string,
    dateTo?: string,
    paymentMethod?: string,
  ): Promise<{ data: BillingListItem[]; total: number; summary: BillingListSummary }> => {
    const offset = (page - 1) * limit;
    const searchTerm = search ? `%${search}%` : null;
    // "F-0060", "0060" o "f60" buscan esa factura exacta; el resto, por cliente o casillero.
    const invoiceMatch = search?.match(INVOICE_SEARCH_PATTERN);
    const invoiceNumber = invoiceMatch && invoiceMatch[1].length <= MAX_INVOICE_DIGITS ? Number(invoiceMatch[1]) : null;
    const isPaidFilter = isPaid !== undefined ? isPaid : null;
    const methodFilter = paymentMethod || null;
    const fromDate = dateFrom || null;
    const toDate = dateTo || null;

    // LEFT JOIN: una factura vieja sin orden o sin cliente aparece igual que en Reportes.
    // La búsqueda por número suma a la de nombre o casillero ("60" trae la F-0060 y también
    // al cliente cuyo casillero contiene 60); no excluye nada del resto de los filtros.
    const [rows, countResult] = await Promise.all([
      sql`
        SELECT
          b.uuid,
          b.invoice_number,
          con.uuid AS consolidation_uuid,
          con.status AS consolidation_status,
          con.current_step AS consolidation_step,
          COALESCE(c.first_name || ' ' || c.last_name, '') AS customer_name,
          c.customer_code,
          b.total_weight_charged,
          b.applied_rate_usd,
          b.applied_exchange,
          b.total_amount_crc,
          b.is_paid,
          b.paid_at,
          b.created_at,
          b.payment_method,
          b.delivery_method,
          COALESCE(b.delivery_fee_crc, 0) AS delivery_fee_crc
        FROM billing b
        LEFT JOIN consolidations con ON b.consolidation_id = con.id
        LEFT JOIN customers c ON con.customer_id = c.id
        WHERE
          (${searchTerm}::text IS NULL
            OR (${invoiceNumber}::int IS NOT NULL AND b.invoice_number = ${invoiceNumber}::int)
            OR c.first_name ILIKE ${searchTerm}
            OR c.last_name ILIKE ${searchTerm}
            OR c.customer_code ILIKE ${searchTerm}
            OR b.uuid::text ILIKE ${searchTerm})
          AND (${isPaidFilter}::boolean IS NULL OR b.is_paid = ${isPaidFilter})
          AND (${methodFilter}::text IS NULL OR b.payment_method = ${methodFilter})
          AND (${fromDate}::date IS NULL OR (b.created_at AT TIME ZONE 'America/Costa_Rica')::date >= ${fromDate}::date)
          AND (${toDate}::date IS NULL OR (b.created_at AT TIME ZONE 'America/Costa_Rica')::date <= ${toDate}::date)
        ORDER BY b.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(b.total_amount_crc), 0) AS total_amount_crc,
          COALESCE(SUM(CASE WHEN NOT b.is_paid THEN b.total_amount_crc ELSE 0 END), 0) AS pending_amount_crc
        FROM billing b
        LEFT JOIN consolidations con ON b.consolidation_id = con.id
        LEFT JOIN customers c ON con.customer_id = c.id
        WHERE
          (${searchTerm}::text IS NULL
            OR (${invoiceNumber}::int IS NOT NULL AND b.invoice_number = ${invoiceNumber}::int)
            OR c.first_name ILIKE ${searchTerm}
            OR c.last_name ILIKE ${searchTerm}
            OR c.customer_code ILIKE ${searchTerm}
            OR b.uuid::text ILIKE ${searchTerm})
          AND (${isPaidFilter}::boolean IS NULL OR b.is_paid = ${isPaidFilter})
          AND (${methodFilter}::text IS NULL OR b.payment_method = ${methodFilter})
          AND (${fromDate}::date IS NULL OR (b.created_at AT TIME ZONE 'America/Costa_Rica')::date >= ${fromDate}::date)
          AND (${toDate}::date IS NULL OR (b.created_at AT TIME ZONE 'America/Costa_Rica')::date <= ${toDate}::date)
      `,
    ]);

    return {
      data: rows as BillingListItem[],
      total: parseInt(countResult[0].total, 10),
      summary: {
        total_amount_crc: Number(countResult[0].total_amount_crc),
        pending_amount_crc: Number(countResult[0].pending_amount_crc),
      },
    };
  },

  getBillingDetail: async (uuid: string): Promise<Omit<BillingDetail, 'email_notifications_enabled'> | null> => {
    const rows = await sql`
      SELECT
        b.uuid,
        b.invoice_number,
        con.uuid AS consolidation_uuid,
        con.status AS consolidation_status,
        COALESCE(c.first_name || ' ' || c.last_name, '') AS customer_name,
        c.customer_code,
        c.email AS customer_email,
        c.first_name AS customer_first_name,
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
        b.payment_method,
        b.created_by_name,
        b.paid_by_name,
        b.authorship_backfilled AS created_by_backfilled,
        -- Un único flag cubre ambos autores; un pago registrado después de la
        -- migración 033 siempre trae método, así que sin método = pago del backfill.
        (b.authorship_backfilled AND b.payment_method IS NULL) AS paid_by_backfilled,
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
      LEFT JOIN consolidations con ON b.consolidation_id = con.id
      LEFT JOIN customers c ON con.customer_id = c.id
      LEFT JOIN customer_addresses ca ON ca.id = con.delivery_address_id
      WHERE b.uuid = ${uuid}
    `;

    return (rows[0] as Omit<BillingDetail, 'email_notifications_enabled'>) || null;
  },

  getBillingReports: async (
    from: string,
    to: string,
  ): Promise<BillingMonthlyReport[]> => {
    const rows = await sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', b.created_at AT TIME ZONE 'America/Costa_Rica'), 'YYYY-MM') AS month,
        COALESCE(SUM(b.total_amount_crc), 0)::numeric          AS total_invoiced_crc,
        COALESCE(SUM(CASE WHEN b.is_paid THEN b.total_amount_crc ELSE 0 END), 0)::numeric AS total_paid_crc,
        COALESCE(SUM(CASE WHEN NOT b.is_paid THEN b.total_amount_crc ELSE 0 END), 0)::numeric AS total_pending_crc,
        COALESCE(SUM(b.profit_crc), 0)::numeric                AS total_ganancia_crc,
        COUNT(*)::int                                          AS invoice_count,
        COUNT(CASE WHEN b.is_paid THEN 1 END)::int             AS paid_count,
        COUNT(CASE WHEN b.has_unknown_cost THEN 1 END)::int    AS unknown_cost_count
      FROM billing b
      WHERE (b.created_at AT TIME ZONE 'America/Costa_Rica')::date >= ${from}::date
        AND (b.created_at AT TIME ZONE 'America/Costa_Rica')::date <= ${to}::date
      GROUP BY DATE_TRUNC('month', b.created_at AT TIME ZONE 'America/Costa_Rica')
      ORDER BY DATE_TRUNC('month', b.created_at AT TIME ZONE 'America/Costa_Rica') ASC
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
  /**
   * Reparto por período. Sin `from`/`to` devuelve el historial completo, que es
   * como se muestra en pantalla: el reparto se liquida mes a mes y hay que ver
   * los meses anteriores para saber cuáles quedaron pendientes de pago.
   */
  getProfitShareReport: async (
    from?: string,
    to?: string,
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
      WHERE (${from ?? null}::text IS NULL OR ps.period >= ${from ?? null})
        AND (${to ?? null}::text IS NULL OR ps.period <= ${to ?? null})
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

  markBillingAsPaid: async (
    uuid: string,
    paymentMethod: PaymentMethod,
    actor: Actor,
  ): Promise<Partial<BillingListItem>> => {
    await sql`BEGIN`;
    try {
      const [billing] = await sql`
        UPDATE billing
        SET is_paid = true, paid_at = NOW(),
            payment_method = ${paymentMethod},
            paid_by_id = ${actor.id}, paid_by_name = ${actor.name}
        WHERE uuid = ${uuid} AND is_paid = false
        RETURNING uuid, is_paid, paid_at, consolidation_id
      `;

      if (!billing) throw new Error('Factura no encontrada o ya marcada como pagada.');

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

  markPaymentNotified: async (uuid: string): Promise<{ uuid: string; payment_notified_at: string } | null> => {
    const [row] = await sql`
      UPDATE billing
      SET payment_notified_at = NOW()
      WHERE uuid = ${uuid} AND is_paid = true
      RETURNING uuid, payment_notified_at
    `;
    return (row as { uuid: string; payment_notified_at: string }) ?? null;
  },
};
