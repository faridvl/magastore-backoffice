import sql from '@/lib/db';
import {
  OperationsStats,
  OperationsInbox,
  PendingReceivable,
  MonthlyRevenuePoint,
} from '@/types/dashboard/operations.types';

/** Cuántos cobros pendientes se traen a la tabla. El resto se resume en un enlace. */
const PENDING_RECEIVABLES_LIMIT = 10;

/** Meses de historia en la serie facturado vs. cobrado (incluye el mes actual). */
const REVENUE_MONTHS = 6;

const MONTH_LABELS_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic',
];

/** `TO_CHAR` no traduce meses sin locale en la base; se etiqueta acá. */
function monthLabelEs(yyyyMm: string): string {
  const month = Number(yyyyMm.split('-')[1]);
  return MONTH_LABELS_ES[month - 1] ?? yyyyMm;
}

export const OperationsRepository = {
  /**
   * Todo el panel Operativo en una sola ida a la base. Son consultas de lectura
   * independientes entre sí, así que van en paralelo.
   */
  getOperationsStats: async (): Promise<OperationsStats> => {
    const [
      inboxResult,
      receivablesResult,
      receivablesCountResult,
      awaitingNotificationResult,
      awaitingNotificationCountResult,
      monthlyBillingResult,
      packageCountsResult,
      revenueResult,
    ] = await Promise.all([
      // Bandeja de pendientes. Se resuelve con subconsultas escalares en vez de
      // JOINs para que cada contador sea independiente: un cero en uno no puede
      // borrar filas de otro.
      sql`
        SELECT
          (SELECT COUNT(*) FROM packages
            WHERE courier_cost_usd IS NULL OR tc_banco IS NULL)::int
            AS packages_without_cost,
          (SELECT COUNT(*) FROM packages
            WHERE consolidation_id IS NULL)::int
            AS packages_without_order,
          (SELECT COUNT(DISTINCT customer_id) FROM packages
            WHERE consolidation_id IS NULL)::int
            AS customers_with_packages_without_order,
          (SELECT COUNT(*) FROM packages
            WHERE notified_at IS NULL AND consolidation_id IS NULL)::int
            AS packages_not_notified,
          (SELECT COUNT(DISTINCT customer_id) FROM packages
            WHERE notified_at IS NULL AND consolidation_id IS NULL)::int
            AS customers_with_packages_not_notified,
          (SELECT COUNT(*) FROM pre_billing pb
            LEFT JOIN billing b ON b.consolidation_id = pb.consolidation_id
            WHERE pb.notified_at IS NULL
              AND (b.uuid IS NULL OR b.is_paid = false))::int
            AS orders_not_notified,
          (SELECT COUNT(*) FROM billing WHERE is_paid = false)::int
            AS orders_pending_payment,
          (SELECT COALESCE(SUM(total_amount_crc), 0) FROM billing WHERE is_paid = false)::numeric
            AS pending_payment_crc
      `,

      // Cobros YA notificados y sin pagar — la bandeja de seguimiento.
      // Une facturas emitidas impagas con estimados enviados que todavía no
      // llegaron a factura; los estimados que ya tienen factura se excluyen para
      // no contar la misma orden dos veces.
      // `notified_at` vive solo en pre_billing, así que el aviso de una factura se
      // lee desde la prefactura de su misma orden.
      sql`
        (
          SELECT
            con.uuid::text                     AS consolidation_uuid,
            b.uuid::text                       AS billing_uuid,
            c.first_name || ' ' || c.last_name AS customer_name,
            c.customer_code,
            'FACTURA'                          AS kind,
            b.total_amount_crc::numeric        AS amount_crc,
            b.created_at                       AS issued_at
          FROM billing b
          JOIN consolidations con ON con.id = b.consolidation_id
          JOIN customers c ON c.id = con.customer_id
          JOIN pre_billing pb ON pb.consolidation_id = b.consolidation_id
          WHERE b.is_paid = false
            AND pb.notified_at IS NOT NULL
        )
        UNION ALL
        (
          SELECT
            con.uuid::text                     AS consolidation_uuid,
            NULL::text                         AS billing_uuid,
            c.first_name || ' ' || c.last_name AS customer_name,
            c.customer_code,
            'ESTIMADO'                         AS kind,
            pb.estimated_amount_crc::numeric   AS amount_crc,
            pb.created_at                      AS issued_at
          FROM pre_billing pb
          JOIN consolidations con ON con.id = pb.consolidation_id
          JOIN customers c ON c.id = con.customer_id
          LEFT JOIN billing b ON b.consolidation_id = pb.consolidation_id
          WHERE b.uuid IS NULL
            AND pb.notified_at IS NOT NULL
        )
        ORDER BY issued_at ASC
        LIMIT ${PENDING_RECEIVABLES_LIMIT}
      `,

      // Total de cobros notificados pendientes: la tabla muestra solo los más viejos.
      sql`
        SELECT (
          (SELECT COUNT(*) FROM billing b
            JOIN pre_billing pb ON pb.consolidation_id = b.consolidation_id
            WHERE b.is_paid = false AND pb.notified_at IS NOT NULL)
          +
          (SELECT COUNT(*) FROM pre_billing pb
            LEFT JOIN billing b ON b.consolidation_id = pb.consolidation_id
            WHERE b.uuid IS NULL AND pb.notified_at IS NOT NULL)
        )::int AS total
      `,

      // Cobros SIN notificar — la bandeja de aviso. Misma forma que la anterior
      // pero con `notified_at IS NULL`: una fila sale de acá en cuanto se envía
      // el WhatsApp, y entra a la bandeja de seguimiento.
      sql`
        (
          SELECT
            con.uuid::text                     AS consolidation_uuid,
            b.uuid::text                       AS billing_uuid,
            c.first_name || ' ' || c.last_name AS customer_name,
            c.customer_code,
            'FACTURA'                          AS kind,
            b.total_amount_crc::numeric        AS amount_crc,
            b.created_at                       AS issued_at
          FROM billing b
          JOIN consolidations con ON con.id = b.consolidation_id
          JOIN customers c ON c.id = con.customer_id
          LEFT JOIN pre_billing pb ON pb.consolidation_id = b.consolidation_id
          WHERE b.is_paid = false
            AND (pb.uuid IS NULL OR pb.notified_at IS NULL)
        )
        UNION ALL
        (
          SELECT
            con.uuid::text                     AS consolidation_uuid,
            NULL::text                         AS billing_uuid,
            c.first_name || ' ' || c.last_name AS customer_name,
            c.customer_code,
            'ESTIMADO'                         AS kind,
            pb.estimated_amount_crc::numeric   AS amount_crc,
            pb.created_at                      AS issued_at
          FROM pre_billing pb
          JOIN consolidations con ON con.id = pb.consolidation_id
          JOIN customers c ON c.id = con.customer_id
          LEFT JOIN billing b ON b.consolidation_id = pb.consolidation_id
          WHERE b.uuid IS NULL
            AND pb.notified_at IS NULL
        )
        ORDER BY issued_at ASC
        LIMIT ${PENDING_RECEIVABLES_LIMIT}
      `,

      // Total de cobros sin notificar.
      sql`
        SELECT (
          (SELECT COUNT(*) FROM billing b
            LEFT JOIN pre_billing pb ON pb.consolidation_id = b.consolidation_id
            WHERE b.is_paid = false AND (pb.uuid IS NULL OR pb.notified_at IS NULL))
          +
          (SELECT COUNT(*) FROM pre_billing pb
            LEFT JOIN billing b ON b.consolidation_id = pb.consolidation_id
            WHERE b.uuid IS NULL AND pb.notified_at IS NULL)
        )::int AS total
      `,

      // KPIs de facturación del mes calendario en curso. `profit_crc` ya es el
      // snapshot calculado al facturar — no se recalcula acá.
      sql`
        SELECT
          COALESCE(SUM(total_amount_crc), 0)::numeric AS invoiced_crc,
          COALESCE(SUM(CASE WHEN is_paid THEN total_amount_crc ELSE 0 END), 0)::numeric AS paid_crc,
          COALESCE(SUM(profit_crc), 0)::numeric AS profit_crc,
          COUNT(CASE WHEN has_unknown_cost THEN 1 END)::int AS unknown_cost_count
        FROM billing
        WHERE date_trunc('month', created_at) = date_trunc('month', NOW())
      `,

      // Paquetes del mes actual y del anterior, para el comparativo.
      sql`
        SELECT
          COUNT(*) FILTER (
            WHERE date_trunc('month', created_at) = date_trunc('month', NOW())
          )::int AS current_month,
          COUNT(*) FILTER (
            WHERE date_trunc('month', created_at)
                  = date_trunc('month', NOW() - INTERVAL '1 month')
          )::int AS previous_month
        FROM packages
        WHERE created_at >= date_trunc('month', NOW() - INTERVAL '1 month')
      `,

      // Serie facturado vs. cobrado. Se agrupa por fecha de emisión para que las
      // dos series hablen del mismo universo de facturas: "de lo facturado en
      // este mes, cuánto se cobró". Agrupar lo cobrado por `paid_at` mezclaría
      // meses y haría que las barras no se puedan comparar.
      sql`
        SELECT
          TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month,
          COALESCE(SUM(total_amount_crc), 0)::numeric AS invoiced,
          COALESCE(SUM(CASE WHEN is_paid THEN total_amount_crc ELSE 0 END), 0)::numeric AS paid
        FROM billing
        WHERE created_at >= date_trunc('month', NOW())
                            - (INTERVAL '1 month' * ${REVENUE_MONTHS - 1})
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at) ASC
      `,
    ]);

    const inboxRow = inboxResult[0];
    const inbox: OperationsInbox = {
      packagesWithoutCost: inboxRow?.packages_without_cost ?? 0,
      packagesWithoutOrder: inboxRow?.packages_without_order ?? 0,
      customersWithPackagesWithoutOrder:
        inboxRow?.customers_with_packages_without_order ?? 0,
      packagesNotNotified: inboxRow?.packages_not_notified ?? 0,
      customersWithPackagesNotNotified:
        inboxRow?.customers_with_packages_not_notified ?? 0,
      ordersNotNotified: inboxRow?.orders_not_notified ?? 0,
      ordersPendingPayment: inboxRow?.orders_pending_payment ?? 0,
      pendingPaymentCRC: Number(inboxRow?.pending_payment_crc ?? 0),
    };

    // La antigüedad se calcula en JS y no en SQL para que use el mismo reloj que
    // el resto de la respuesta y no dependa del huso de la base.
    const now = Date.now();
    const toReceivable = (
      row: Record<string, unknown>,
      isNotified: boolean,
    ): PendingReceivable => {
      const issuedAt = new Date(row.issued_at as string);
      const ageDays = Math.max(
        0,
        Math.floor((now - issuedAt.getTime()) / (1000 * 60 * 60 * 24)),
      );
      return {
        consolidationUuid: row.consolidation_uuid as string,
        billingUuid: (row.billing_uuid as string | null) ?? null,
        customerName: (row.customer_name as string) ?? 'Sin cliente',
        customerCode: (row.customer_code as string | null) ?? null,
        kind: row.kind === 'FACTURA' ? 'FACTURA' : 'ESTIMADO',
        amountCRC: Number(row.amount_crc ?? 0),
        issuedAt: issuedAt.toISOString(),
        ageDays,
        isNotified,
      };
    };

    const pendingReceivables = (receivablesResult as Record<string, unknown>[])
      .map((row) => toReceivable(row, true));

    const awaitingNotification = (awaitingNotificationResult as Record<string, unknown>[])
      .map((row) => toReceivable(row, false));

    const monthlyRow = monthlyBillingResult[0];
    const packageRow = packageCountsResult[0];

    const revenueByMonth: MonthlyRevenuePoint[] = (
      revenueResult as Record<string, unknown>[]
    ).map((row) => ({
      month: monthLabelEs(row.month as string),
      invoiced: Number(row.invoiced ?? 0),
      paid: Number(row.paid ?? 0),
    }));

    return {
      inbox,
      pendingReceivables,
      pendingReceivablesTotal: receivablesCountResult[0]?.total ?? 0,
      awaitingNotification,
      awaitingNotificationTotal: awaitingNotificationCountResult[0]?.total ?? 0,
      monthly: {
        invoicedCRC: Number(monthlyRow?.invoiced_crc ?? 0),
        paidCRC: Number(monthlyRow?.paid_crc ?? 0),
        profitCRC: Number(monthlyRow?.profit_crc ?? 0),
        unknownCostCount: monthlyRow?.unknown_cost_count ?? 0,
        packageCount: packageRow?.current_month ?? 0,
        packageCountPreviousMonth: packageRow?.previous_month ?? 0,
      },
      revenueByMonth,
    };
  },
};
