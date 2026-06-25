import { ApiServiceClient } from '@/shared/api/api-service-client';
import { DashboardStats } from '@/types/dashboard/dashboard.types';
import { env } from '../../config';
import { useApiQuery, UseAPIQueryOptions, UseAPIQueryResult } from '../use-api-query-hook';
import { useApiQueryClient } from '../../query-hooks/use-api-client-query';

export const DASHBOARD_STATS_KEY = 'dashboardStats';

async function fetchDashboardStats(): Promise<{ data: DashboardStats }> {
  return ApiServiceClient(env.API.BASE_URL).get('/dashboard/stats');
}

export function useDashboardStatsQuery() {
  const apiQueryClient = useApiQueryClient();

  function useQuery(options?: UseAPIQueryOptions): UseAPIQueryResult<{ data: DashboardStats }> {
    return useApiQuery({
      queryKey: [DASHBOARD_STATS_KEY],
      queryFn: fetchDashboardStats,
      staleTime: 1000 * 60 * 2,
      ...options,
    } as any);
  }

  async function invalidate() {
    await apiQueryClient.invalidateQueries({ queryKey: [DASHBOARD_STATS_KEY] });
  }

  return { useQuery, invalidate };
}
