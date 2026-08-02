import { ApiServiceClient } from '@/shared/api/api-service-client';
import { OperationsStats } from '@/types/dashboard/operations.types';
import { env } from '../../config';
import { useApiQuery, UseAPIQueryOptions, UseAPIQueryResult } from '../use-api-query-hook';
import { useApiQueryClient } from '../../query-hooks/use-api-client-query';

export const OPERATIONS_STATS_KEY = 'operationsStats';

async function fetchOperationsStats(): Promise<{ data: OperationsStats }> {
  return ApiServiceClient(env.API.BASE_URL).get('/dashboard/operations');
}

export function useOperationsQuery() {
  const apiQueryClient = useApiQueryClient();

  const useQuery = (options?: UseAPIQueryOptions): UseAPIQueryResult<{ data: OperationsStats }> => {
    return useApiQuery({
      queryKey: [OPERATIONS_STATS_KEY],
      // Es una bandeja de trabajo: se vacía a medida que el operador actúa, así
      // que se refresca más seguido que el panel clásico de métricas.
      staleTime: 1000 * 60,
      queryFn: fetchOperationsStats,
      ...options,
    } as any);
  };

  async function invalidate() {
    await apiQueryClient.invalidateQueries({ queryKey: [OPERATIONS_STATS_KEY] });
  }

  return { useQuery, invalidate };
}
