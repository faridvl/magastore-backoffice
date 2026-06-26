import { ApiServiceClient } from '@/shared/api/api-service-client';
import { BillingMonthlyReport } from '@/types/logistics/logistics.types';
import { env } from '../../config';
import { useApiQuery, UseAPIQueryOptions, UseAPIQueryResult } from '../use-api-query-hook';

export const BILLING_REPORTS_KEY = 'billingReports';

async function fetchBillingReports(
  from: string,
  to: string,
): Promise<{ data: BillingMonthlyReport[] }> {
  const params = new URLSearchParams({ from, to });
  return ApiServiceClient(env.API.BASE_URL).get(`/billing/reports?${params.toString()}`);
}

export function useBillingReportsQuery(from: string, to: string) {
  const useQuery = (
    options?: UseAPIQueryOptions,
  ): UseAPIQueryResult<{ data: BillingMonthlyReport[] }> => {
    return useApiQuery({
      queryKey: [BILLING_REPORTS_KEY, from, to],
      queryFn: () => fetchBillingReports(from, to),
      staleTime: 1000 * 60 * 5,
      enabled: Boolean(from && to),
      ...options,
    } as any);
  };

  return { useQuery };
}
