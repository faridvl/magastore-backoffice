import { ApiServiceClient } from '@/shared/api/api-service-client';
import { BillingDetail } from '@/types/logistics/logistics.types';
import { env } from '../../config';
import { useApiQuery, UseAPIQueryOptions, UseAPIQueryResult } from '../use-api-query-hook';
import { useApiQueryClient } from '../../query-hooks/use-api-client-query';

const BILLING_DETAIL_KEY = 'billingDetail';

async function fetchBillingDetail(uuid: string): Promise<{ data: BillingDetail }> {
  return ApiServiceClient(env.API.BASE_URL).get(`/billing?uuid=${uuid}`);
}

export function useBillingDetailQuery(uuid: string) {
  const apiQueryClient = useApiQueryClient();

  function useQuery(
    options?: UseAPIQueryOptions,
  ): UseAPIQueryResult<{ data: BillingDetail }> {
    return useApiQuery({
      queryKey: [BILLING_DETAIL_KEY, uuid],
      queryFn: () => fetchBillingDetail(uuid),
      enabled: !!uuid,
      staleTime: 1000 * 60 * 5,
      ...options,
    } as any);
  }

  async function invalidate() {
    await apiQueryClient.invalidateQueries({ queryKey: [BILLING_DETAIL_KEY, uuid] });
  }

  return { useQuery, invalidate };
}
