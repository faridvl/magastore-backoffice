import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { PaginatedResponse } from '@/types/paginate.types';
import { LogisticsPackage } from '@/types/logistics/logistics.types';

export function useLogisticsQuery(
  page: number = 1,
  limit: number = 10,
  search: string = '',
  status: string = 'ALL',
  dateFrom?: string,
  dateTo?: string,
) {
  return useQuery<PaginatedResponse<LogisticsPackage>>({
    queryKey: ['logistics', page, limit, search, status, dateFrom ?? '', dateTo ?? ''],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(status !== 'ALL' && { status }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });

      const response = await ApiServiceClient(env.API.BASE_URL).get(
        `/logistics?${params.toString()}`,
      );
      return response;
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData,
  });
}
