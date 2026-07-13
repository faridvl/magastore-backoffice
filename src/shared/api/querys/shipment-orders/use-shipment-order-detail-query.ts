import { ApiServiceClient } from '@/shared/api/api-service-client';
import { ConsolidationDetail } from '@/types/logistics/logistics.types';
import { env } from '../../config';
import { useApiQuery, UseAPIQueryOptions, UseAPIQueryResult } from '../use-api-query-hook';
import { useApiQueryClient } from '../../query-hooks/use-api-client-query';

export const SHIPMENT_ORDER_DETAIL_KEY = 'shipmentOrderDetail';

async function fetchShipmentOrderDetail(uuid: string): Promise<{ data: ConsolidationDetail }> {
  return ApiServiceClient(env.API.BASE_URL).get(`/consolidations?uuid=${uuid}`);
}

export function useShipmentOrderDetailQuery(uuid: string) {
  const apiQueryClient = useApiQueryClient();

  const useQuery = (
    options?: UseAPIQueryOptions,
  ): UseAPIQueryResult<{ data: ConsolidationDetail }> => {
    return useApiQuery({
      queryKey: [SHIPMENT_ORDER_DETAIL_KEY, uuid],
      queryFn: () => fetchShipmentOrderDetail(uuid),
      staleTime: 1000 * 60 * 5,
      enabled: !!uuid,
      ...options,
    } as any);
  };

  async function invalidate() {
    await apiQueryClient.invalidateQueries({ queryKey: [SHIPMENT_ORDER_DETAIL_KEY, uuid] });
  }

  return { useQuery, invalidate };
}
