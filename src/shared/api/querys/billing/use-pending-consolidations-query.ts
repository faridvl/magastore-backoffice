import { ApiServiceClient } from '@/shared/api/api-service-client';
import { PendingConsolidation } from '@/types/logistics/logistics.types';
import { env } from '../../config';
import { useApiQuery, UseAPIQueryOptions, UseAPIQueryResult } from '../use-api-query-hook';
import { useApiQueryClient } from '../../query-hooks/use-api-client-query';

export const PENDING_CONSOLIDATIONS_KEY = 'pendingConsolidations';

async function fetchPendingConsolidations(): Promise<{ data: PendingConsolidation[] }> {
  return ApiServiceClient(env.API.BASE_URL).get('/billing?pending=true');
}

export function usePendingConsolidationsQuery() {
  const apiQueryClient = useApiQueryClient();

  const useQuery = (
    options?: UseAPIQueryOptions,
  ): UseAPIQueryResult<{ data: PendingConsolidation[] }> => {
    return useApiQuery({
      queryKey: [PENDING_CONSOLIDATIONS_KEY],
      queryFn: fetchPendingConsolidations,
      staleTime: 1000 * 60 * 5,
      ...options,
    } as any);
  };

  async function invalidate() {
    await apiQueryClient.invalidateQueries({ queryKey: [PENDING_CONSOLIDATIONS_KEY] });
  }

  return { useQuery, invalidate };
}
