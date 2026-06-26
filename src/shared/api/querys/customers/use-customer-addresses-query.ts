import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { CustomerAddress } from '@/types/customer/customer.types';

export function useCustomerAddressesQuery(customerId?: string) {
  return useQuery<{ data: CustomerAddress[] }>({
    queryKey: ['customer-addresses', customerId],
    queryFn: () => ApiServiceClient(env.API.BASE_URL).get(`/customers/${customerId}/addresses`),
    enabled: !!customerId,
    staleTime: 1000 * 60 * 5,
  });
}
