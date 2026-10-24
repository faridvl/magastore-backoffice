import { useDashboardStatsQuery } from '@/shared/api/querys/dashboard/use-dashboard-stats-query';
import { DashboardStats } from '@/types/dashboard/dashboard.types';
import { BUSINESS_TIMEZONE } from '@/shared/utils/timezone';

const EMPTY_STATS: DashboardStats = {
  packagesThisMonth: 0,
  weightLbThisMonth: 0,
  profitThisMonthCRC: 0,
  unknownCostCountThisMonth: 0,
  faridShareThisMonthCRC: 0,
  faridSharePercent: 0,
  pendingBillingCRC: 0,
  activeCustomers: 0,
  newCustomersThisMonth: 0,
  revenueThisMonthCRC: 0,
  recentPackages: [],
  revenueByMonth: [],
  topCustomers: [],
};

function currentMonthTitle(): string {
  const label = new Date().toLocaleDateString('es-CR', {
    month: 'long',
    year: 'numeric',
    timeZone: BUSINESS_TIMEZONE,
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function useDashboard() {
  const dashboardQuery = useDashboardStatsQuery();
  const { data, isLoading, isError, refetch, isRefetching } = dashboardQuery.useQuery();

  const stats: DashboardStats = data?.data ?? EMPTY_STATS;
  const topCustomerMax = stats.topCustomers.reduce((max, c) => Math.max(max, c.total), 0);

  return {
    stats,
    monthTitle: currentMonthTitle(),
    topCustomerMax,
    isLoading,
    isError,
    isRetrying: isRefetching,
    handleRetry: () => refetch(),
  };
}
