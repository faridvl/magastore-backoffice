import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';

export interface CustomerPackage {
  uuid: string;
  tracking_number: string;
  weight_lb: string;
  status: string;
  arrival_date: string;
  courier_rate_name: string | null;
  courier_cost_usd: string | null;
  insurance_applied: boolean;
  consolidation_uuid: string | null;
  consolidation_status: string | null;
}

export interface CustomerMetrics {
  package_count: number;
  total_weight_lb: number;
  first_package_date: string | null;
  last_package_date: string | null;
  total_billed_crc: number;
}

export function useCustomerPackagesQuery(customerId?: string) {
  return useQuery<{ data: CustomerPackage[]; metrics: CustomerMetrics }>({
    queryKey: ['customer-packages', customerId],
    queryFn: () => ApiServiceClient(env.API.BASE_URL).get(`/customers/${customerId}/packages`),
    enabled: !!customerId,
    staleTime: 1000 * 60 * 5,
  });
}
