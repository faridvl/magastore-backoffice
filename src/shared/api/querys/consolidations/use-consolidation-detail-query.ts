import { ApiServiceClient } from '@/shared/api/api-service-client';
import { ConsolidationDetail } from '@/types/logistics/logistics.types';
import { env } from '../../config';
import { useApiQuery, UseAPIQueryOptions, UseAPIQueryResult } from '../use-api-query-hook';
import { useApiQueryClient } from '../../query-hooks/use-api-client-query';

export const CONSOLIDATION_DETAIL_KEY = 'consolidationDetail';

async function fetchConsolidationDetail(uuid: string): Promise<{ data: ConsolidationDetail }> {
  return ApiServiceClient(env.API.BASE_URL).get(`/consolidations?uuid=${uuid}`);
}

export function useConsolidationDetailQuery(uuid: string) {
  const apiQueryClient = useApiQueryClient();

  function useQuery(
    options?: UseAPIQueryOptions,
  ): UseAPIQueryResult<{ data: ConsolidationDetail }> {
    return useApiQuery({
      queryKey: [CONSOLIDATION_DETAIL_KEY, uuid],
      queryFn: () => fetchConsolidationDetail(uuid),
      staleTime: 1000 * 60 * 5,
      enabled: !!uuid,
      ...options,
    } as any);
  }

  async function invalidate() {
    await apiQueryClient.invalidateQueries({ queryKey: [CONSOLIDATION_DETAIL_KEY, uuid] });
  }

  return { useQuery, invalidate };
}
