import { ApiServiceClient } from '@/shared/api/api-service-client';
import { ProfitShareMonthlyReport } from '@/types/logistics/logistics.types';
import { env } from '../../config';
import { useApiQuery, UseAPIQueryOptions, UseAPIQueryResult } from '../use-api-query-hook';

export const PROFIT_SHARE_KEY = 'profitShareReport';

async function fetchProfitShareReport(
  from: string,
  to: string,
): Promise<{ data: ProfitShareMonthlyReport[] }> {
  const params = new URLSearchParams({ from, to });
  return ApiServiceClient(env.API.BASE_URL).get(`/billing/profit-share?${params.toString()}`);
}

export function useProfitShareQuery(from: string, to: string) {
  const useQuery = (
    options?: UseAPIQueryOptions,
  ): UseAPIQueryResult<{ data: ProfitShareMonthlyReport[] }> => {
    return useApiQuery({
      queryKey: [PROFIT_SHARE_KEY, from, to],
      queryFn: () => fetchProfitShareReport(from, to),
      staleTime: 1000 * 60 * 5,
      enabled: Boolean(from && to),
      ...options,
    } as any);
  };

  return { useQuery };
}
