import sql from '@/lib/db';
import { PackageStatus, ShipmentOrderStep } from '@/types/logistics/logistics.types';
import {
  CollectionsGroup,
  OperationsCollections,
  OperationsStats,
  OperationsTask,
  OperationsTaskKey,
  PendingCollection,
} from '@/types/dashboard/operations.types';
import {
  COLLECTIONS_PREVIEW_LIMIT,
  PAID_AWAITING_DISPATCH_STALE_DAYS,
} from '@/shared/constants/operations';
import {
  FOLLOW_UP_DELAY_DAYS,
  FOLLOW_UP_WINDOW_DAYS,
} from '@/shared/constants/post-delivery';

/** Orden en que se trabaja el día; también el orden de las filas en pantalla. */
const TASK_ORDER: OperationsTaskKey[] = [
  OperationsTaskKey.NOTIFY_PACKAGES,
  OperationsTaskKey.BUILD_ORDERS,
  OperationsTaskKey.GENERATE_ESTIMATES,
  OperationsTaskKey.CONFIRM_AND_COLLECT,
  OperationsTaskKey.DISPATCH,
  OperationsTaskKey.FINALIZE,
  OperationsTaskKey.FOLLOW_UP,
];

/**
 * Paso 2: el conteo es el de todas las órdenes del paso (igual que el listado), pero
 * las ya pagadas solo esperan el pase a despacho, así que no cuentan para "la más vieja
 * sin pagar"; su antigüedad se mide aparte, desde `paid_at` (`oldest_paid_days`).
 * Los tres grupos (sin factura / factura sin pagar / pagada) se excluyen entre sí.
 */
const getConfirmAndCollectTask = async (): Promise<OperationsTask> => {
  const [row] = await sql`
    WITH today AS (
      SELECT (NOW() AT TIME ZONE 'America/Costa_Rica')::date AS d
    )
    SELECT COUNT(*)::int AS total,
           MAX(t.d - (COALESCE(b.created_at, pb.created_at)
                      AT TIME ZONE 'America/Costa_Rica')::date)
             FILTER (WHERE b.is_paid IS NOT TRUE)::int AS oldest_days,
           COUNT(*) FILTER (WHERE b.uuid IS NULL)::int AS to_confirm,
           COUNT(*) FILTER (WHERE b.uuid IS NOT NULL AND b.is_paid IS NOT TRUE)::int AS to_collect,
           COUNT(*) FILTER (WHERE b.is_paid IS TRUE)::int AS paid,
           MAX(t.d - (b.paid_at AT TIME ZONE 'America/Costa_Rica')::date)
             FILTER (WHERE b.is_paid IS TRUE AND b.paid_at IS NOT NULL)::int AS oldest_paid_days,
           COUNT(*) FILTER (
             WHERE b.is_paid IS TRUE AND b.paid_at IS NOT NULL
               AND t.d - (b.paid_at AT TIME ZONE 'America/Costa_Rica')::date >= ${PAID_AWAITING_DISPATCH_STALE_DAYS}
           )::int AS paid_stale
    FROM consolidations con
    LEFT JOIN pre_billing pb ON pb.consolidation_id = con.id
    LEFT JOIN billing b ON b.consolidation_id = con.id
    CROSS JOIN today t
    WHERE con.current_step = ${ShipmentOrderStep.COBRO}
  `;
  return {
    key: OperationsTaskKey.CONFIRM_AND_COLLECT,
    count: Number(row?.total ?? 0),
    oldestDays: row?.oldest_days == null ? null : Number(row.oldest_days),
    breakdown: {
      toConfirm: Number(row?.to_confirm ?? 0),
      toCollect: Number(row?.to_collect ?? 0),
      paid: Number(row?.paid ?? 0),
      oldestPaidDays: row?.oldest_paid_days == null ? null : Number(row.oldest_paid_days),
      paidStaleCount: Number(row?.paid_stale ?? 0),
    },
  };
};

/**
 * Las condiciones de cada tarea son las mismas que aplican los listados a los que
 * lleva su botón (Logística por defecto: sin orden y en Panamá; Órdenes con
 * `step`, `paid`, `notified`). Si cambia un criterio allá, hay que cambiarlo acá.
 *
 * Los días se cuentan como días de calendario de Costa Rica: restar fechas ya
 * convertidas, no intervalos UTC, para que algo registrado a las 8pm no sume un día.
 *
 * `dispatched_at` se fija al pasar la orden al paso 3 y no se vuelve a tocar; sirve
 * de antigüedad para Despachar y Finalizar. El pago o el estimado confirmado no
 * sirven: pueden ocurrir antes o dentro del paso.
 */
const getTasks = async (): Promise<OperationsTask[]> => {
  const [rows, confirmAndCollect] = await Promise.all([
    sql`
    WITH today AS (
      SELECT (NOW() AT TIME ZONE 'America/Costa_Rica')::date AS d
    )
    SELECT 'NOTIFY_PACKAGES' AS task_key,
           COUNT(*)::int AS total,
           MAX(t.d - (p.created_at AT TIME ZONE 'America/Costa_Rica')::date)::int AS oldest_days,
           0 AS missing_count
    FROM packages p, today t
    WHERE p.consolidation_id IS NULL
      AND p.status = ${PackageStatus.PANAMA}
      AND p.notified_at IS NULL

    UNION ALL
    SELECT 'BUILD_ORDERS',
           COUNT(*)::int,
           MAX(t.d - (p.created_at AT TIME ZONE 'America/Costa_Rica')::date)::int,
           0
    FROM packages p, today t
    WHERE p.consolidation_id IS NULL
      AND p.status = ${PackageStatus.PANAMA}

    UNION ALL
    SELECT 'GENERATE_ESTIMATES',
           COUNT(*)::int,
           MAX(t.d - (con.created_at AT TIME ZONE 'America/Costa_Rica')::date)::int,
           0
    FROM consolidations con, today t
    WHERE con.current_step = ${ShipmentOrderStep.CONFIRMACION}

    UNION ALL
    SELECT 'DISPATCH',
           COUNT(*)::int,
           MAX(t.d - (con.dispatched_at AT TIME ZONE 'America/Costa_Rica')::date)::int,
           COUNT(*) FILTER (
             WHERE con.tracking_code IS NULL AND COALESCE(dm.is_pickup, false) = false
           )::int
    FROM consolidations con
    LEFT JOIN delivery_methods dm ON dm.code = con.delivery_method
    CROSS JOIN today t
    WHERE con.current_step = ${ShipmentOrderStep.DESPACHO}

    UNION ALL
    SELECT 'FINALIZE',
           COUNT(*)::int,
           MAX(t.d - (con.dispatched_at AT TIME ZONE 'America/Costa_Rica')::date)::int,
           0
    FROM consolidations con, today t
    WHERE con.current_step = ${ShipmentOrderStep.NOTIFICACION}

    UNION ALL
    SELECT 'FOLLOW_UP',
           COUNT(*)::int,
           MAX(t.d - (con.dispatched_at AT TIME ZONE 'America/Costa_Rica')::date)::int,
           0
    FROM consolidations con, today t
    WHERE con.current_step = ${ShipmentOrderStep.FINALIZADA}
      AND con.follow_up_sent_at IS NULL
      AND ((NOW() AT TIME ZONE 'America/Costa_Rica')::date - (con.dispatched_at AT TIME ZONE 'America/Costa_Rica')::date) BETWEEN ${FOLLOW_UP_DELAY_DAYS} AND ${FOLLOW_UP_WINDOW_DAYS}
  `,
    getConfirmAndCollectTask(),
  ]);

  const byKey = new Map(
    (rows as Record<string, unknown>[]).map((row) => [row.task_key as string, row]),
  );

  return TASK_ORDER.map((key) => {
    if (key === OperationsTaskKey.CONFIRM_AND_COLLECT) return confirmAndCollect;
    const row = byKey.get(key);
    const missingCount = Number(row?.missing_count ?? 0);
    return {
      key,
      count: Number(row?.total ?? 0),
      oldestDays: row?.oldest_days == null ? null : Number(row.oldest_days),
      ...(missingCount > 0 ? { missingCount } : {}),
    };
  });
};

const toCollectionsGroup = (rows: Record<string, unknown>[]): CollectionsGroup => ({
  items: rows.map(
    (row): PendingCollection => ({
      consolidationUuid: row.consolidation_uuid as string,
      currentStep: Number(row.current_step) as ShipmentOrderStep,
      billingUuid: row.billing_uuid as string,
      customerName: (row.customer_name as string | null) ?? 'Sin cliente',
      customerCode: (row.customer_code as string | null) ?? null,
      amountCRC: Number(row.amount_crc ?? 0),
      ageDays: Math.max(0, Number(row.age_days ?? 0)),
    }),
  ),
  total: Number(rows[0]?.total ?? 0),
  totalCRC: Number(rows[0]?.total_crc ?? 0),
});

/**
 * Cobros = facturas sin pagar. Una factura está "avisada" si se le mandó el estimado por
 * WhatsApp (`pre_billing.notified_at`) o el aviso del paso 3, que en una orden sin pagar lleva
 * el monto pendiente (`consolidations.customer_notified_shipment_at`). El correo automático
 * al confirmar la factura no cuenta. Se exige el estimado igual que lo hace el filtro del
 * listado de Órdenes; ese filtro usa este mismo criterio.
 */
const getCollections = async (): Promise<OperationsCollections> => {
  const [toNotifyRows, awaitingPaymentRows] = await Promise.all([
    // Por avisar: en cualquier paso con factura, finalizadas incluidas: la plata sigue sin entrar.
    sql`
      SELECT
        con.uuid::text                     AS consolidation_uuid,
        con.current_step                   AS current_step,
        b.uuid::text                       AS billing_uuid,
        c.first_name || ' ' || c.last_name AS customer_name,
        c.customer_code,
        b.total_amount_crc::numeric        AS amount_crc,
        ((NOW() AT TIME ZONE 'America/Costa_Rica')::date
          - (b.created_at AT TIME ZONE 'America/Costa_Rica')::date)::int AS age_days,
        COUNT(*) OVER ()::int              AS total,
        SUM(b.total_amount_crc) OVER ()::numeric AS total_crc
      FROM billing b
      JOIN consolidations con ON con.id = b.consolidation_id
      LEFT JOIN customers c ON c.id = con.customer_id
      WHERE b.is_paid = false
        AND EXISTS (SELECT 1 FROM pre_billing pb WHERE pb.consolidation_id = con.id)
        AND con.customer_notified_shipment_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM pre_billing pb
          WHERE pb.consolidation_id = con.id AND pb.notified_at IS NOT NULL
        )
      ORDER BY b.created_at ASC, b.id
      LIMIT ${COLLECTIONS_PREVIEW_LIMIT}
    `,
    // Esperando pago: ya avisadas. En cualquier paso, incluso finalizadas.
    sql`
      SELECT
        con.uuid::text                     AS consolidation_uuid,
        con.current_step                   AS current_step,
        b.uuid::text                       AS billing_uuid,
        c.first_name || ' ' || c.last_name AS customer_name,
        c.customer_code,
        b.total_amount_crc::numeric        AS amount_crc,
        ((NOW() AT TIME ZONE 'America/Costa_Rica')::date
          - (b.created_at AT TIME ZONE 'America/Costa_Rica')::date)::int AS age_days,
        COUNT(*) OVER ()::int              AS total,
        SUM(b.total_amount_crc) OVER ()::numeric AS total_crc
      FROM billing b
      JOIN consolidations con ON con.id = b.consolidation_id
      LEFT JOIN customers c ON c.id = con.customer_id
      WHERE b.is_paid = false
        AND EXISTS (
          SELECT 1 FROM pre_billing pb
          WHERE pb.consolidation_id = con.id
            AND (pb.notified_at IS NOT NULL OR con.customer_notified_shipment_at IS NOT NULL)
        )
      ORDER BY b.created_at ASC, b.id
      LIMIT ${COLLECTIONS_PREVIEW_LIMIT}
    `,
  ]);

  return {
    toNotify: toCollectionsGroup(toNotifyRows as Record<string, unknown>[]),
    awaitingPayment: toCollectionsGroup(awaitingPaymentRows as Record<string, unknown>[]),
  };
};

export const OperationsRepository = {
  /** Las dos secciones son lecturas independientes, así que van en paralelo. */
  getOperationsStats: async (): Promise<OperationsStats> => {
    const [tasks, collections] = await Promise.all([getTasks(), getCollections()]);
    return { tasks, collections };
  },
};
