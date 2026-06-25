import { ApiServiceClient } from '@/shared/api/api-service-client';
import { AvailablePackage } from '@/types/logistics/logistics.types';
import { env } from '../../config';
import { useApiQuery, UseAPIQueryOptions, UseAPIQueryResult } from '../use-api-query-hook';
import { useApiQueryClient } from '../../query-hooks/use-api-client-query';

export const AVAILABLE_PACKAGES_KEY = 'availablePackages';

async function fetchAvailablePackages(customerUuid: string): Promise<{ data: AvailablePackage[] }> {
  return ApiServiceClient(env.API.BASE_URL).get(
    `/consolidations?availablePackages=${customerUuid}`,
  );
}

export function useAvailablePackagesQuery(customerUuid: string) {
  const apiQueryClient = useApiQueryClient();

  function useQuery(
    options?: UseAPIQueryOptions,
  ): UseAPIQueryResult<{ data: AvailablePackage[] }> {
    return useApiQuery({
      queryKey: [AVAILABLE_PACKAGES_KEY, customerUuid],
      queryFn: () => fetchAvailablePackages(customerUuid),
      staleTime: 1000 * 60 * 2,
      enabled: !!customerUuid,
      ...options,
    } as any);
  }

  async function invalidate() {
    await apiQueryClient.invalidateQueries({ queryKey: [AVAILABLE_PACKAGES_KEY] });
  }

  return { useQuery, invalidate };
}
