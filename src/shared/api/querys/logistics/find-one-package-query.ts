import { ApiServiceClient } from '@/shared/api/api-service-client';
import { PackageDetail } from '@/types/logistics/logistics.types';
import { env } from '../../config';
import {
  useApiQuery,
  UseAPIQueryHook,
  UseAPIQueryOptions,
  UseAPIQueryResult,
} from '../use-api-query-hook';
import { useApiQueryClient } from '../../query-hooks/use-api-client-query';

/**
 * 1. Función de fetch pura.
 * Dado que tu ApiServiceClient retorna la data directamente (sin envoltorio 'result'),
 * simplemente retornamos el resultado del GET.
 */
export async function fetchGetPackageDetail(uuid: string): Promise<PackageDetail> {
  return await ApiServiceClient(env.API.BASE_URL).get(`/logistics?uuid=${uuid}`);
}

export async function fetchPackageByTracking(tracking: string): Promise<PackageDetail> {
  return await ApiServiceClient(env.API.BASE_URL).get(
    `/logistics?tracking=${encodeURIComponent(tracking)}`,
  );
}

/**
 * 2. Hook de Query siguiendo tu estándar de arquitectura.
 */
export function usePackageDetailQuery(uuid: string): UseAPIQueryHook<PackageDetail> {
  const USE_FETCH_PACKAGE_DETAIL_KEY = 'fetchPackageDetail';
  const apiQueryClient = useApiQueryClient();

  const useQuery = (options?: UseAPIQueryOptions): UseAPIQueryResult<PackageDetail> => {
    return useApiQuery({
      queryKey: [USE_FETCH_PACKAGE_DETAIL_KEY, uuid],
      queryFn: () => fetchGetPackageDetail(uuid),
      enabled: !!uuid,
      staleTime: 60 * 1000 * 5,
      ...options,
    } as any);
  };

  // Permite refrescar la información manualmente tras una edición
  async function invalidate() {
    await apiQueryClient.invalidateQueries({
      queryKey: [USE_FETCH_PACKAGE_DETAIL_KEY, uuid],
    });
  }

  return {
    useQuery,
    invalidate,
  };
}
