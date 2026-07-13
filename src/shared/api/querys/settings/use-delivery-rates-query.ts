import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { DeliveryRate } from '@/types/logistics/logistics.types';

export const DELIVERY_RATES_KEY = 'delivery-rates';

export function useDeliveryRatesQuery() {
  return useQuery<{ data: DeliveryRate[] }>({
    queryKey: [DELIVERY_RATES_KEY],
    queryFn: () => ApiServiceClient(env.API.BASE_URL).get('/delivery-rates'),
    staleTime: 1000 * 60 * 5,
  });
}
