import sql from '@/lib/db';
import { DashboardStats, RecentPackage, RevenueByMonth, TopCustomer } from '@/types/dashboard/dashboard.types';
import { currentMonthKey, monthLabelEs } from '@/shared/utils/timezone';

/**
 * La base corre en UTC. Al agrupar por mes hay que pasar los timestamps a hora
 * de Costa Rica primero: si no, todo lo registrado despues de las 18:00 locales
 * cae en el dia —y a fin de mes, en el mes— siguiente.
 *
 * La zona va escrita en el SQL y no como parametro: Postgres trata cada
 * placeholder como una expresion distinta y rechaza el GROUP BY aunque el
 * valor sea el mismo (error 42803).
 */

export const DashboardRepository = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const [
      packagesResult,
      pendingBillingResult,
      activeCustomersResult,
      recentPackagesResult,
      revenueByMonthResult,
      topCustomersResult,
    ] = await Promise.all([
      sql`
        SELECT COUNT(*)::int AS count
        FROM packages
        WHERE date_trunc('month', created_at AT TIME ZONE 'America/Costa_Rica')
            = date_trunc('month', NOW() AT TIME ZONE 'America/Costa_Rica')
      `,
      sql`
        SELECT COALESCE(SUM(total_amount_crc), 0)::bigint AS total
        FROM billing
        WHERE is_paid = false
      `,
      sql`
        SELECT
          COUNT(*) FILTER (WHERE is_active)::int AS active_count,
          COUNT(*) FILTER (
            WHERE date_trunc('month', created_at AT TIME ZONE 'America/Costa_Rica')
                = date_trunc('month', NOW() AT TIME ZONE 'America/Costa_Rica')
          )::int AS new_this_month
        FROM customers
      `,
      sql`
        SELECT
          p.uuid,
          p.tracking_number,
          p.status,
          p.created_at,
          c.first_name || ' ' || c.last_name AS customer_name,
          b.total_amount_crc
        FROM packages p
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN billing b ON b.consolidation_id = p.consolidation_id
        ORDER BY p.created_at DESC
        LIMIT 5
      `,
      sql`
        SELECT
          TO_CHAR(date_trunc('month', created_at AT TIME ZONE 'America/Costa_Rica'), 'Mon') AS month,
          TO_CHAR(date_trunc('month', created_at AT TIME ZONE 'America/Costa_Rica'), 'YYYY-MM') AS month_key,
          date_trunc('month', created_at AT TIME ZONE 'America/Costa_Rica') AS month_date,
          SUM(total_amount_crc)::bigint AS revenue
        FROM billing
        WHERE (created_at AT TIME ZONE 'America/Costa_Rica')
              >= date_trunc('month', NOW() AT TIME ZONE 'America/Costa_Rica') - INTERVAL '5 months'
        GROUP BY date_trunc('month', created_at AT TIME ZONE 'America/Costa_Rica')
        ORDER BY date_trunc('month', created_at AT TIME ZONE 'America/Costa_Rica')
      `,
      sql`
        SELECT
          c.first_name || ' ' || c.last_name AS name,
          SUM(b.total_amount_crc)::bigint AS total
        FROM billing b
        JOIN consolidations con ON b.consolidation_id = con.id
        JOIN customers c ON con.customer_id = c.id
        WHERE b.is_paid = true
        GROUP BY c.id, c.first_name, c.last_name
        ORDER BY total DESC
        LIMIT 4
      `,
    ]);

    const revenueByMonth: RevenueByMonth[] = (revenueByMonthResult as any[]).map((r) => ({
      month: monthLabelEs(r.month_key as string),
      monthKey: r.month_key as string,
      revenue: Number(r.revenue),
    }));

    // La serie agrupa por fecha de emisión, no de cobro: la tarjeta y la
    // gráfica hablan de lo facturado en el mes. Mezclar ambos criterios hacía
    // que una factura emitida en julio y cobrada en agosto sumara al mes
    // equivocado según dónde se mirara.
    //
    // El mes en curso puede no estar en la serie: si todavía no se facturó
    // nada, la consulta no devuelve esa fila. Buscarlo por clave evita mostrar
    // el total del mes anterior como si fuera el de este.
    const thisMonth = currentMonthKey();
    const revenueThisMonthCRC =
      revenueByMonth.find((r) => r.monthKey === thisMonth)?.revenue ?? 0;

    return {
      packagesThisMonth: packagesResult[0]?.count ?? 0,
      pendingBillingCRC: Number(pendingBillingResult[0]?.total ?? 0),
      activeCustomers: activeCustomersResult[0]?.active_count ?? 0,
      newCustomersThisMonth: activeCustomersResult[0]?.new_this_month ?? 0,
      revenueThisMonthCRC,
      recentPackages: recentPackagesResult as RecentPackage[],
      revenueByMonth,
      topCustomers: (topCustomersResult as any[]).map((r) => ({
        name: r.name as string,
        total: Number(r.total),
      })) as TopCustomer[],
    };
  },
};
