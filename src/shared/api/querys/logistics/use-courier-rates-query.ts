import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { CourierRate } from '@/types/logistics/logistics.types';

export function useCourierRatesQuery() {
  return useQuery<CourierRate[]>({
    queryKey: ['courier-rates'],
    queryFn: async () => {
      return ApiServiceClient(env.API.BASE_URL).get('/logistics?action=courier-rates') as Promise<CourierRate[]>;
    },
    staleTime: 1000 * 60 * 10,
  });
}
