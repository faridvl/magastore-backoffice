import { ApiServiceClient } from '@/shared/api/api-service-client';
import { ConsolidationListItem } from '@/types/logistics/logistics.types';
import { PaginatedResponse } from '@/types/paginate.types';
import { env } from '../../config';
import { useApiQuery, UseAPIQueryOptions, UseAPIQueryResult } from '../use-api-query-hook';
import { useApiQueryClient } from '../../query-hooks/use-api-client-query';

export const CONSOLIDATIONS_LIST_KEY = 'consolidationsList';

async function fetchConsolidations(
  page: number,
  limit: number,
  search?: string,
  status?: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<PaginatedResponse<ConsolidationListItem>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  if (status && status !== 'ALL') params.set('status', status);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  return ApiServiceClient(env.API.BASE_URL).get(`/consolidations?${params.toString()}`);
}

export function useConsolidationsQuery(
  page: number,
  limit: number,
  search?: string,
  status?: string,
  dateFrom?: string,
  dateTo?: string,
) {
  const apiQueryClient = useApiQueryClient();

  const useQuery = (
    options?: UseAPIQueryOptions,
  ): UseAPIQueryResult<PaginatedResponse<ConsolidationListItem>> => {
    return useApiQuery({
      queryKey: [CONSOLIDATIONS_LIST_KEY, page, limit, search ?? '', status ?? 'ALL', dateFrom ?? '', dateTo ?? ''],
      queryFn: () => fetchConsolidations(page, limit, search, status, dateFrom, dateTo),
      staleTime: 1000 * 60 * 5,
      placeholderData: (prev: unknown) => prev,
      ...options,
    } as any);
  };

  async function invalidate() {
    await apiQueryClient.invalidateQueries({ queryKey: [CONSOLIDATIONS_LIST_KEY] });
  }

  return { useQuery, invalidate };
}
