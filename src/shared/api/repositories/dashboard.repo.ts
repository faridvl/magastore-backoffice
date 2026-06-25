import sql from '@/lib/db';
import { DashboardStats, RecentPackage, RevenueByMonth, TopCustomer } from '@/types/dashboard/dashboard.types';

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
        WHERE date_trunc('month', created_at) = date_trunc('month', NOW())
      `,
      sql`
        SELECT COALESCE(SUM(total_amount_crc), 0)::bigint AS total
        FROM billing
        WHERE is_paid = false
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM customers
        WHERE is_active = true
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
          TO_CHAR(date_trunc('month', paid_at), 'Mon') AS month,
          date_trunc('month', paid_at) AS month_date,
          SUM(total_amount_crc)::bigint AS revenue
        FROM billing
        WHERE is_paid = true
          AND paid_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
        GROUP BY date_trunc('month', paid_at)
        ORDER BY date_trunc('month', paid_at)
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

    return {
      packagesThisMonth: packagesResult[0]?.count ?? 0,
      pendingBillingCRC: Number(pendingBillingResult[0]?.total ?? 0),
      activeCustomers: activeCustomersResult[0]?.count ?? 0,
      recentPackages: recentPackagesResult as RecentPackage[],
      revenueByMonth: (revenueByMonthResult as any[]).map((r) => ({
        month: r.month as string,
        revenue: Number(r.revenue),
      })) as RevenueByMonth[],
      topCustomers: (topCustomersResult as any[]).map((r) => ({
        name: r.name as string,
        total: Number(r.total),
      })) as TopCustomer[],
    };
  },
};
