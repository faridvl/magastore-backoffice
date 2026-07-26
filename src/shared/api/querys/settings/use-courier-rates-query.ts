import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { CourierRateWithWarehouse } from '@/types/logistics/logistics.types';

// Key propia: 'courier-rates' ya la usa querys/logistics/use-courier-rates-query,
// que devuelve el array plano del endpoint viejo. Compartir key haría que ambos
// hooks se pisen en caché y uno reciba la forma del otro.
export const COURIER_RATES_KEY = 'courier-rates-admin';

export function useCourierRatesQuery() {
  return useQuery<{ data: CourierRateWithWarehouse[] }>({
    queryKey: [COURIER_RATES_KEY],
    queryFn: () => ApiServiceClient(env.API.BASE_URL).get('/courier-rates'),
    staleTime: 1000 * 60 * 5,
  });
}
