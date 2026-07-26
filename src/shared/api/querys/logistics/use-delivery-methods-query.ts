import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { DeliveryMethodEntity } from '@/types/logistics/logistics.types';

export const DELIVERY_METHODS_KEY = 'delivery-methods';

export function useDeliveryMethodsQuery() {
  return useQuery<{ data: DeliveryMethodEntity[] }>({
    queryKey: [DELIVERY_METHODS_KEY],
    queryFn: () => ApiServiceClient(env.API.BASE_URL).get('/delivery-methods'),
    staleTime: 1000 * 60 * 5,
  });
}
