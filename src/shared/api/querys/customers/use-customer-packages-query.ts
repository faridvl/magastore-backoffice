import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';

export interface CustomerPackage {
  tracking_number: string;
  weight_lb: string;
  status: string;
  arrival_date: string;
  courier_rate_name: string | null;
  courier_cost_usd: string | null;
  insurance_applied: boolean;
}

export function useCustomerPackagesQuery(customerId?: string) {
  return useQuery<{ data: CustomerPackage[] }>({
    queryKey: ['customer-packages', customerId],
    queryFn: () => ApiServiceClient(env.API.BASE_URL).get(`/customers/${customerId}/packages`),
    enabled: !!customerId,
    staleTime: 1000 * 60 * 5,
  });
}
