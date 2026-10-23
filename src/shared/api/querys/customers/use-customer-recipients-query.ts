import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { CustomerRecipient } from '@/types/customer/customer.types';

export const CUSTOMER_RECIPIENTS_KEY = 'customer-recipients';

export function useCustomerRecipientsQuery(customerId?: string) {
  return useQuery<{ data: CustomerRecipient[] }>({
    queryKey: [CUSTOMER_RECIPIENTS_KEY, customerId],
    queryFn: () => ApiServiceClient(env.API.BASE_URL).get(`/customers/${customerId}/recipients`),
    enabled: !!customerId,
    staleTime: 1000 * 60 * 5,
  });
}
