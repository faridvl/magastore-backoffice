import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { CustomerType } from '@/types/customer/customer.types';

export const CUSTOMER_TYPES_KEY = 'customer-types';

export function useCustomerTypesQuery() {
  return useQuery<{ data: CustomerType[] }>({
    queryKey: [CUSTOMER_TYPES_KEY],
    queryFn: () => ApiServiceClient(env.API.BASE_URL).get('/customer-types'),
    staleTime: 1000 * 60 * 5,
  });
}
