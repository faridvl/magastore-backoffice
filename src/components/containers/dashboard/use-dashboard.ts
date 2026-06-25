import { useDashboardStatsQuery } from '@/shared/api/querys/dashboard/use-dashboard-stats-query';
import { DashboardStats } from '@/types/dashboard/dashboard.types';

const EMPTY_STATS: DashboardStats = {
  packagesThisMonth: 0,
  pendingBillingCRC: 0,
  activeCustomers: 0,
  recentPackages: [],
  revenueByMonth: [],
  topCustomers: [],
};

export function useDashboard() {
  const dashboardQuery = useDashboardStatsQuery();
  const { data, isLoading, isError } = dashboardQuery.useQuery();

  const stats: DashboardStats = data?.data ?? EMPTY_STATS;

  return {
    stats,
    isLoading,
    isError,
  };
}
